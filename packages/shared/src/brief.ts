import { z } from "zod";
import { FormatoSchema } from "./scenes";

/**
 * Brief del proyecto — lo que construye el Entrevistador siguiendo los 7
 * puntos de la sección 12. Todos los campos son opcionales hasta que el
 * Entrevistador los completa; `completo` indica que ya se puede pasar al
 * checkpoint de aprobación y luego al Guionista.
 */
export const BriefSchema = z.object({
  tema: z.string().optional(),
  objetivo: z.string().optional(), // informar, vender, entretener…
  duracionObjetivoSeg: z.number().int().positive().optional(),
  formato: FormatoSchema.optional(),
  idioma: z.string().optional(),
  voz: z.string().optional(),
  estiloVisual: z.string().optional(), // "nuevo" o nombre de ADN existente
  presetSubtitulos: z.string().optional(),
  musicaFondo: z.boolean().optional(),
  ctaFinal: z.string().optional(),
  modoAutonomo: z.boolean().optional(),
});
export type Brief = z.infer<typeof BriefSchema>;

/** Respuesta estructurada que el Entrevistador devuelve en cada turno. */
export const RespuestaEntrevistadorSchema = z.object({
  mensaje: z.string().min(1), // lo que se le muestra al usuario (máx 2 preguntas)
  opciones: z.array(z.string()).default([]), // opciones tocables, si aplica
  briefParcial: BriefSchema,
  completo: z.boolean(), // true cuando los 7 puntos están cubiertos
});
export type RespuestaEntrevistador = z.infer<
  typeof RespuestaEntrevistadorSchema
>;
