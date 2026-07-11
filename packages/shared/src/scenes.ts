import { z } from "zod";
import { StyleDNASchema } from "./style-dna.js";

export const FormatoSchema = z.enum(["9:16", "16:9", "1:1"]);
export type Formato = z.infer<typeof FormatoSchema>;

/** Lo que recibe un adaptador de proveedor para generar una toma. */
export const SolicitudEscenaSchema = z.object({
  escenaId: z.string(),
  /** Prompt final ya construido (ADN + personajes + acción). */
  prompt: z.string().min(1),
  negativePrompt: z.string().default(""),
  formato: FormatoSchema,
  duracionSeg: z.number().min(1).max(10),
  seed: z.number().int().optional(),
  /** Frame final de la toma anterior — técnica #1 de continuidad. */
  imagenReferencia: z.string().optional(),
  /** Versión exacta del ADN usada, para trazabilidad en DB. */
  adn: StyleDNASchema,
});
export type SolicitudEscena = z.infer<typeof SolicitudEscenaSchema>;

export const EstadoJobProveedorSchema = z.enum([
  "cola",
  "procesando",
  "listo",
  "error",
]);
export type EstadoJobProveedor = z.infer<typeof EstadoJobProveedorSchema>;
