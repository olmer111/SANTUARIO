import { z } from "zod";

/** Mensaje de la conversación con el Entrevistador (historial guiado por el cliente). */
export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
