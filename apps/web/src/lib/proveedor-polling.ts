import type { VideoProvider } from "@santuario/providers";

const MAX_INTENTOS_POLL = 60;
const INTERVALO_POLL_MS = 5000;

export type ResultadoProveedor =
  | { ok: true; ruta: string }
  | { ok: false; error: string };

/** Consulta el estado del proveedor hasta que la toma esté lista o falle.
 * Compartido entre el job de una sola escena (Fase 2) y la orquestación
 * completa del Director (Fase 4). */
export async function esperarResultado(
  proveedor: VideoProvider,
  jobIdProveedor: string,
  onProgreso?: (pct: number) => void | Promise<void>
): Promise<ResultadoProveedor> {
  for (let intento = 0; intento < MAX_INTENTOS_POLL; intento++) {
    const estado = await proveedor.estado(jobIdProveedor);
    if (onProgreso) await onProgreso(Math.min(95, (intento * 100) / MAX_INTENTOS_POLL));

    if (estado === "listo") {
      const ruta = await proveedor.descargar(jobIdProveedor);
      return { ok: true, ruta };
    }
    if (estado === "error") {
      return { ok: false, error: "El proveedor reportó error o contenido nsfw" };
    }
    await new Promise((resolve) => setTimeout(resolve, INTERVALO_POLL_MS));
  }
  return { ok: false, error: "Tiempo de espera agotado" };
}
