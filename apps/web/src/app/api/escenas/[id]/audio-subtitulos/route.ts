import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getQueue } from "@/lib/queue";

const BodySchema = z.object({
  voiceId: z.string(),
  preset: z.string(),
});

/** Encola el agente Voz y Subtítulos para una escena que ya tiene una toma
 * lista. Ninguna request HTTP espera el resultado (regla de oro 5). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sceneId } = await params;
  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Body inválido", detalles: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const scene = await prisma.scene.findUnique({
    where: { id: sceneId },
    include: { takes: { where: { estado: "listo" }, take: 1 } },
  });
  if (!scene) {
    return NextResponse.json({ error: "Escena no encontrada" }, { status: 404 });
  }
  if (scene.takes.length === 0) {
    return NextResponse.json(
      { error: "La escena todavía no tiene una toma lista (Fase 2 primero)" },
      { status: 409 }
    );
  }

  const renderJob = await prisma.renderJob.create({
    data: {
      projectId: scene.projectId,
      tipo: "tts",
      estado: "cola",
      datos: { sceneId, voiceId: parsed.data.voiceId, preset: parsed.data.preset },
    },
  });

  await getQueue("tts").add("voz-subtitulos", { renderJobId: renderJob.id });

  return NextResponse.json({ renderJob }, { status: 202 });
}
