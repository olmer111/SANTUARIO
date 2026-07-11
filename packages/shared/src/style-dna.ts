import { z } from "zod";

/**
 * ADN de Estilo — el prompt maestro persistente (sección 5 del prompt maestro).
 *
 * Reglas duras:
 * - Cada cambio crea una NUEVA versión; nunca se sobrescribe.
 * - Se inyecta íntegro en el prompt de cada escena. Sin ADN no hay generación.
 * - `descripcionBloqueada` de personajes se copia literal, palabra por palabra.
 */
export const PersonajeSchema = z.object({
  nombre: z.string().min(1),
  /** Se copia LITERAL en cada prompt — jamás se parafrasea. */
  descripcionBloqueada: z.string().min(1),
  /** Ruta en storage a la imagen de referencia (image-to-video / identidad). */
  imagenReferencia: z.string().optional(),
  seed: z.number().int().optional(),
});
export type Personaje = z.infer<typeof PersonajeSchema>;

export const StyleDNASchema = z.object({
  nombre: z.string().min(1),
  version: z.number().int().positive(),
  promptBase: z.string().min(1),
  negativePrompt: z.string().default(""),
  personajes: z.array(PersonajeSchema).default([]),
  /** Paleta de colores dominante, hex. El QA compara contra ella. */
  paleta: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).default([]),
  camara: z.string().default(""),
  iluminacion: z.string().default(""),
  ritmo: z.string().default(""),
  vozDefault: z.string().default("es-MX-JorgeNeural"),
  presetSubtitulosDefault: z.string().default("impacto_tiktok"),
  notasContinuidad: z.string().default(""),
});
export type StyleDNA = z.infer<typeof StyleDNASchema>;

/**
 * Construye el prompt final de una escena según la regla 4 de consistencia:
 * prompt_base + descripciones bloqueadas de personajes presentes + acción
 * de la escena + negative_prompt. Nada más, nada menos.
 */
export function construirPromptEscena(
  adn: StyleDNA,
  accionEscena: string,
  personajesPresentes: string[]
): { prompt: string; negativePrompt: string } {
  const bloqueadas = adn.personajes
    .filter((p) => personajesPresentes.includes(p.nombre))
    .map((p) => p.descripcionBloqueada);
  const prompt = [adn.promptBase, ...bloqueadas, accionEscena]
    .filter(Boolean)
    .join(", ");
  return { prompt, negativePrompt: adn.negativePrompt };
}
