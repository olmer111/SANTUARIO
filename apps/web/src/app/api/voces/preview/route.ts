import { NextResponse } from "next/server";
import { z } from "zod";
import { generarTTS } from "@/lib/media-engine";
import { rutaRelativaDeStorage } from "@/lib/storage";

const BodySchema = z.object({
  voiceId: z.string(),
  texto: z.string().default("Hola, así sueno yo. Este es un preview de voz de SANTUARIO."),
});

/** Preview de 3s generado al vuelo (sección 9): el usuario elige voz
 * escuchando audio real, no un catálogo estático. */
export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Body inválido", detalles: parsed.error.flatten() },
      { status: 400 }
    );
  }
  try {
    const tts = await generarTTS({
      text: parsed.data.texto,
      voice: parsed.data.voiceId,
      outputName: `preview_${parsed.data.voiceId}_${Date.now()}`,
    });
    return NextResponse.json({
      ...tts,
      url: `/api/storage/${rutaRelativaDeStorage(tts.path)}`,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "No se pudo generar el preview de voz",
        detalle: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}
