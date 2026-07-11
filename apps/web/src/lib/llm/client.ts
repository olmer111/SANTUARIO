import { z } from "zod";
import type { ChatMessage, ChatOptions, LLMProvider } from "./types";
import { NvidiaProvider } from "./providers/nvidia";
import { AnthropicProvider } from "./providers/anthropic";

let cachedProvider: LLMProvider | undefined;

/**
 * Resuelve el proveedor configurado en LLM_PROVIDER (costo cero primero:
 * NVIDIA NIM por defecto). ANTHROPIC_API_KEY queda disponible como
 * alternativa de mayor calidad para partes críticas del pipeline.
 */
export function getLLMProvider(): LLMProvider {
  if (cachedProvider) return cachedProvider;

  const nombre = process.env.LLM_PROVIDER ?? "nvidia";

  if (nombre === "anthropic") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Falta ANTHROPIC_API_KEY en .env");
    cachedProvider = new AnthropicProvider(apiKey);
    return cachedProvider;
  }

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error("Falta NVIDIA_API_KEY en .env");
  cachedProvider = new NvidiaProvider(apiKey, process.env.NVIDIA_MODEL);
  return cachedProvider;
}

function extraerJSON(texto: string): unknown {
  const limpio = texto
    .trim()
    .replace(/^```(?:json)?\n?/i, "")
    .replace(/```$/, "");
  const inicio = limpio.indexOf("{");
  const fin = limpio.lastIndexOf("}");
  const candidato =
    inicio >= 0 && fin > inicio ? limpio.slice(inicio, fin + 1) : limpio;
  return JSON.parse(candidato);
}

/**
 * Llama al LLM pidiendo JSON y valida la respuesta con el esquema Zod dado.
 * Si falla el parseo/la validación, reintenta hasta 3 intentos en total
 * (regla de oro 8: si algo falla 3 veces, repórtalo con opciones).
 */
export async function chatJSON<S extends z.ZodTypeAny>(
  schema: S,
  messages: ChatMessage[],
  opts: ChatOptions = {}
): Promise<z.infer<S>> {
  const provider = getLLMProvider();
  const intentosMax = 3;
  let ultimoError: unknown;

  for (let intento = 1; intento <= intentosMax; intento++) {
    try {
      const respuesta = await provider.chat(messages, {
        ...opts,
        jsonMode: true,
      });
      const json = extraerJSON(respuesta);
      return schema.parse(json);
    } catch (err) {
      ultimoError = err;
      if (intento < intentosMax) {
        messages = [
          ...messages,
          {
            role: "user",
            content:
              "Tu respuesta anterior no era JSON válido según el esquema esperado. Responde ÚNICAMENTE con el objeto JSON, sin texto adicional.",
          },
        ];
      }
    }
  }

  throw new Error(
    `El LLM (${provider.id}) falló ${intentosMax} veces en devolver JSON válido: ${
      ultimoError instanceof Error ? ultimoError.message : String(ultimoError)
    }`
  );
}
