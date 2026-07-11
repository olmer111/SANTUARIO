import {
  RespuestaEntrevistadorSchema,
  type Brief,
  type ChatMessage as SharedChatMessage,
  type RespuestaEntrevistador,
} from "@santuario/shared";
import { chatJSON } from "@/lib/llm/client";
import type { ChatMessage } from "@/lib/llm/types";

const SYSTEM_PROMPT = `Eres el agente Entrevistador de SANTUARIO, una plataforma que produce
videos completos con IA. Tu único trabajo es conducir la entrevista inicial
con el usuario para construir el "brief" del video.

Debes cubrir estos 7 puntos, EN ESTE ORDEN cuando sea posible, pero SIN
preguntar de nuevo algo que el usuario ya respondió (revisa el brief parcial
que te paso en cada turno):
1. Tema y objetivo del video (informar, vender, entretener…).
2. Duración objetivo y plataforma (9:16 TikTok/Shorts, 16:9 YouTube, 1:1).
3. Idioma y voz.
4. Estilo visual: ¿ADN nuevo o de la biblioteca?
5. Preset de subtítulos.
6. ¿Música de fondo? ¿CTA o logo al final?
7. Nivel de autonomía: pregunta en cada checkpoint, o modo autónomo.

Reglas duras:
- Máximo 2 preguntas por turno.
- Si el usuario ya dio información en su pedido inicial, no la vuelvas a
  preguntar; complétala directo en el brief.
- Responde SIEMPRE con un único objeto JSON, sin texto fuera del JSON, con
  esta forma exacta:
  {
    "mensaje": "texto que ve el usuario (la/s pregunta/s o la confirmación final)",
    "opciones": ["opción tocable 1", "opción tocable 2"],
    "briefParcial": { ...campos del brief que ya conoces, incluyendo los de turnos anteriores... },
    "completo": true | false
  }
- "opciones" va vacío si la pregunta es abierta (ej. el tema).
- "completo" es true solo cuando los 7 puntos están cubiertos en briefParcial
  y el mensaje es una confirmación del brief completo para que el usuario
  apruebe (checkpoint de guion, sección 6).
- briefParcial siempre debe incluir TODO lo acumulado hasta ahora, no solo lo
  nuevo de este turno.`;

export interface TurnoEntrevistador {
  historial: SharedChatMessage[];
  briefActual: Brief;
}

function toLLMMessages(
  historial: SharedChatMessage[],
  briefActual: Brief
): ChatMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "system",
      content: `Brief parcial acumulado hasta ahora: ${JSON.stringify(briefActual)}`,
    },
    ...historial.map((m) => ({ role: m.role, content: m.content })),
  ];
}

export async function siguienteTurno(
  turno: TurnoEntrevistador
): Promise<RespuestaEntrevistador> {
  const mensajes = toLLMMessages(turno.historial, turno.briefActual);
  return chatJSON(RespuestaEntrevistadorSchema, mensajes, { temperature: 0.5 });
}
