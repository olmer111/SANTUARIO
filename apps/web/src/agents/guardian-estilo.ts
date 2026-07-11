import { StyleDNASchema, type StyleDNA } from "@santuario/shared";
import { chatJSON } from "@/lib/llm/client";
import type { ChatMessage } from "@/lib/llm/types";

const SYSTEM_PROMPT = `Eres el agente Guardián de Estilo de SANTUARIO. A partir de una breve
descripción del look que el usuario quiere, generás el ADN de Estilo
completo: el documento persistente que garantiza que todas las tomas de un
video (o de una serie) se vean del mismo mundo.

Responde SIEMPRE con un único objeto JSON, sin texto fuera del JSON, con
esta forma exacta (sigue "cinematic film still" como ejemplo del nivel de
detalle esperado en promptBase):
{
  "nombre": "nombre corto y descriptivo del estilo",
  "version": 1,
  "promptBase": "descripción en inglés cinematográfico: lente, profundidad de campo, iluminación, grano, paleta tonal",
  "negativePrompt": "deformed hands, extra fingers, text, watermark, logo, blurry, low quality, morphing",
  "personajes": [
    {
      "nombre": "Nombre",
      "descripcionBloqueada": "descripción literal y detallada en inglés: edad, pelo, ropa, accesorios — esta frase se copia igual en cada escena donde aparezca"
    }
  ],
  "paleta": ["#HEXHEX", "#HEXHEX", "#HEXHEX"],
  "camara": "estilo de movimiento de cámara",
  "iluminacion": "descripción de la iluminación dominante",
  "ritmo": "duración típica de los cortes y tipo de transición",
  "vozDefault": "es-MX-JorgeNeural",
  "presetSubtitulosDefault": "impacto_tiktok",
  "notasContinuidad": "detalles que deben mantenerse iguales en todas las tomas"
}

Si el usuario no menciona personajes recurrentes, "personajes" puede ir
vacío. "version" siempre es 1 (el versionado posterior lo maneja el
sistema, no vos).`;

export async function generarADN(descripcionEstilo: string): Promise<StyleDNA> {
  const mensajes: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: descripcionEstilo },
  ];
  return chatJSON(StyleDNASchema, mensajes, { temperature: 0.6, maxTokens: 1200 });
}
