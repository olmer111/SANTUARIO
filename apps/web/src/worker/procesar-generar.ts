import type { Job } from "bullmq";
import { prisma } from "../lib/db";
import { getProviderRegistry } from "../lib/providers/registry";

const MAX_INTENTOS_POLL = 60;
const INTERVALO_POLL_MS = 5000;

/**
 * Procesa un job de la cola "generar": consulta el estado del proveedor
 * hasta que la toma esté lista, la descarga a storage y crea el Asset.
 * BullMQ reintenta el job completo hasta 3 veces (regla de oro 8) si algo
 * lanza una excepción antes de completar.
 */
export async function procesarGenerar(job: Job<{ takeId: string }>) {
  const { takeId } = job.data;
  const take = await prisma.take.findUniqueOrThrow({ where: { id: takeId } });
  const proveedor = getProviderRegistry().obtener(take.proveedor);
  if (!proveedor) throw new Error(`Proveedor ${take.proveedor} no está registrado`);
  if (!take.jobIdProveedor) throw new Error("Take sin jobIdProveedor");

  for (let intento = 0; intento < MAX_INTENTOS_POLL; intento++) {
    const estado = await proveedor.estado(take.jobIdProveedor);
    await job.updateProgress(Math.min(95, (intento * 100) / MAX_INTENTOS_POLL));

    if (estado === "listo") {
      const ruta = await proveedor.descargar(take.jobIdProveedor);
      const scene = await prisma.scene.update({
        where: { id: take.sceneId },
        data: { estado: "lista" },
      });
      await prisma.take.update({
        where: { id: take.id },
        data: { estado: "listo", archivo: ruta },
      });
      await prisma.asset.create({
        data: { projectId: scene.projectId, takeId: take.id, tipo: "video", ruta },
      });
      await prisma.agentLog.create({
        data: {
          projectId: scene.projectId,
          agente: "generador",
          decision: `Toma ${take.intento} de la escena lista`,
          contexto: { takeId: take.id, ruta },
        },
      });
      return { ok: true, ruta };
    }

    if (estado === "error") {
      await prisma.take.update({
        where: { id: take.id },
        data: { estado: "error", notasQa: "El proveedor reportó error o contenido nsfw" },
      });
      await prisma.scene.update({
        where: { id: take.sceneId },
        data: { estado: "error" },
      });
      throw new Error(`El proveedor reportó error para el take ${take.id}`);
    }

    await new Promise((resolve) => setTimeout(resolve, INTERVALO_POLL_MS));
  }

  await prisma.take.update({
    where: { id: take.id },
    data: { estado: "error", notasQa: "Tiempo de espera agotado" },
  });
  throw new Error(`Tiempo de espera agotado para el take ${take.id}`);
}
