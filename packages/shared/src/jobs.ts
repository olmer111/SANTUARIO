import { z } from "zod";

/** Nombres de las colas BullMQ. Los renders nunca bloquean una request HTTP. */
export const COLAS = {
  generar: "generar",
  tts: "tts",
  subtitulos: "subtitulos",
  montaje: "montaje",
} as const;
export type NombreCola = (typeof COLAS)[keyof typeof COLAS];

/** Reporte estándar que todo subagente devuelve al Director (sección 4). */
export const ReporteSubagenteSchema = z.object({
  escena_id: z.string(),
  estado: z.enum(["ok", "error", "regenerar"]),
  archivo: z.string().nullable(),
  prompt_usado: z.string(),
  seed: z.number().int().nullable(),
  proveedor: z.string(),
  notas_qa: z.string().default(""),
});
export type ReporteSubagente = z.infer<typeof ReporteSubagenteSchema>;

export const ProgresoRenderSchema = z.object({
  jobId: z.string(),
  tipo: z.enum(["generar", "tts", "subtitulos", "montaje"]),
  progreso: z.number().min(0).max(100),
  mensaje: z.string().default(""),
});
export type ProgresoRender = z.infer<typeof ProgresoRenderSchema>;
