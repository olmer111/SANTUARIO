import { NextResponse } from "next/server";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { rutaAbsolutaLocal } from "@/lib/storage";

const TIPOS: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ass": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

/** Sirve archivos de STORAGE_DIR al navegador (previews de voz, tomas
 * generadas, video con subtítulos). Ruta relativa, sin ".." — evita path
 * traversal fuera del directorio de storage. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segmentos } = await params;
  if (segmentos.some((s) => s === ".." || s.includes("\0"))) {
    return NextResponse.json({ error: "Ruta inválida" }, { status: 400 });
  }

  const rutaRelativa = segmentos.join("/");
  const rutaAbsoluta = rutaAbsolutaLocal(rutaRelativa);

  if (!existsSync(rutaAbsoluta) || !statSync(rutaAbsoluta).isFile()) {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  }

  const contentType = TIPOS[path.extname(rutaAbsoluta).toLowerCase()] ?? "application/octet-stream";
  const stream = Readable.toWeb(
    createReadStream(rutaAbsoluta)
  ) as ReadableStream<Uint8Array>;

  return new NextResponse(stream, {
    headers: { "Content-Type": contentType, "Cache-Control": "no-store" },
  });
}
