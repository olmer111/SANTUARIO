import type { Job } from "bullmq";
import { prisma } from "../lib/db";
import { generarTTS, transcribir, renderizarSubtitulos } from "../lib/media-engine";

/**
 * Agente Voz y Subtítulos: TTS de la narración de la escena, transcripción
 * palabra-por-palabra y burn-in del preset elegido sobre la toma ya generada
 * — la voz y los subtítulos quedan sincronizados en un solo archivo
 * (criterio de aceptación de la Fase 3).
 */
export async function procesarTTS(job: Job<{ renderJobId: string }>) {
  const { renderJobId } = job.data;
  const renderJob = await prisma.renderJob.update({
    where: { id: renderJobId },
    data: { estado: "procesando", progreso: 5 },
  });

  const datos = renderJob.datos as {
    sceneId: string;
    voiceId: string;
    preset: string;
  };

  const scene = await prisma.scene.findUniqueOrThrow({
    where: { id: datos.sceneId },
    include: { takes: { where: { estado: "listo" }, orderBy: { intento: "desc" }, take: 1 } },
  });
  const take = scene.takes[0];
  if (!take?.archivo) {
    throw new Error("La escena no tiene una toma lista para agregarle voz y subtítulos");
  }

  const tts = await generarTTS({
    text: scene.textoNarracion || scene.descripcionVisual,
    voice: datos.voiceId,
    outputName: `narracion_${scene.id}_${Date.now()}`,
  });
  await job.updateProgress(40);
  await prisma.renderJob.update({ where: { id: renderJobId }, data: { progreso: 40 } });

  const transcripcion = await transcribir(tts.path);
  await job.updateProgress(70);
  await prisma.renderJob.update({ where: { id: renderJobId }, data: { progreso: 70 } });

  const render = await renderizarSubtitulos({
    videoPath: take.archivo,
    words: transcripcion.words,
    preset: datos.preset,
    audioPath: tts.path,
    outputName: `escena_${scene.id}_${Date.now()}`,
  });

  const asset = await prisma.asset.create({
    data: {
      projectId: scene.projectId,
      takeId: take.id,
      tipo: "video",
      ruta: render.path,
      metadatos: JSON.parse(
        JSON.stringify({
          preset: datos.preset,
          voiceId: datos.voiceId,
          duracionSeg: tts.duracion_seg,
          words: transcripcion.words,
        })
      ),
    },
  });

  await prisma.renderJob.update({
    where: { id: renderJobId },
    data: { estado: "listo", progreso: 100, datos: { ...datos, assetId: asset.id, path: render.path } },
  });

  await prisma.agentLog.create({
    data: {
      projectId: scene.projectId,
      agente: "voz_subtitulos",
      decision: `Voz (${datos.voiceId}) y subtítulos (${datos.preset}) aplicados a la escena ${scene.orden + 1}`,
      contexto: { renderJobId, assetId: asset.id },
    },
  });

  return { ok: true, assetId: asset.id, path: render.path };
}
