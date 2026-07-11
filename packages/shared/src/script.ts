import { z } from "zod";

/**
 * Salida estructurada del Guionista: guion + narración + escenas de 5–10 s
 * con descripción visual (secciones 6 y 7 del prompt maestro).
 */
export const EscenaGuionSchema = z.object({
  orden: z.number().int().nonnegative(),
  descripcionVisual: z.string().min(1),
  duracionSeg: z.number().min(5).max(10),
  textoNarracion: z.string().default(""),
  personajes: z.array(z.string()).default([]),
});
export type EscenaGuion = z.infer<typeof EscenaGuionSchema>;

export const GuionSalidaSchema = z.object({
  titulo: z.string().min(1),
  guion: z.string().min(1),
  narracionCompleta: z.string().min(1),
  escenas: z.array(EscenaGuionSchema).min(1),
});
export type GuionSalida = z.infer<typeof GuionSalidaSchema>;
