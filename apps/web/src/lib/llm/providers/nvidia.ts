import type { ChatMessage, ChatOptions, LLMProvider } from "../types";

/**
 * NVIDIA NIM (build.nvidia.com) — costo cero primero (regla de oro 4).
 * API compatible con OpenAI, sin necesidad de GPU local: corre en la nube.
 */
export class NvidiaProvider implements LLMProvider {
  readonly id = "nvidia";
  private apiKey: string;
  private model: string;
  private baseUrl = "https://integrate.api.nvidia.com/v1";

  constructor(apiKey: string, model = "meta/llama-3.3-70b-instruct") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.maxTokens ?? 1024,
        ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!res.ok) {
      const detalle = await res.text().catch(() => "");
      throw new Error(
        `NVIDIA NIM respondió ${res.status}: ${detalle.slice(0, 300)}`
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const contenido = data.choices?.[0]?.message?.content;
    if (!contenido) throw new Error("NVIDIA NIM devolvió una respuesta vacía");
    return contenido;
  }
}
