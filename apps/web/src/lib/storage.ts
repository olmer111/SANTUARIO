import path from "node:path";

const STORAGE_DIR = process.env.STORAGE_DIR ?? "./storage";

/** El media-engine devuelve rutas absolutas dentro de su propio contenedor
 * ("/storage/audio/x.mp3" — la raíz del volumen que comparte con apps/web).
 * Esto las convierte en una ruta relativa servible por /api/storage/[...]. */
export function rutaRelativaDeStorage(rutaMediaEngine: string): string {
  return rutaMediaEngine.replace(/^\/?storage\//, "");
}

export function rutaAbsolutaLocal(rutaRelativa: string): string {
  return path.join(STORAGE_DIR, rutaRelativa);
}
