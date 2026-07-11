import type { Job } from "bullmq";
import { prisma } from "../lib/db";
import { getProviderRegistry } from "../lib/providers/registry";
import { esperarResultado } from "../lib/proveedor-polling";

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

  const resultado = await esperarResultado(proveedor, take.jobIdProveedor, (pct) =>
    job.updateProgress(pct)
  );

  if (!resultado.ok) {
    getProviderRegistry().registrarResultado(proveedor.id, false);
    await prisma.take.update({
      where: { id: take.id },
      data: { estado: "error", notasQa: resultado.error },
    });
    await prisma.scene.update({ where: { id: take.sceneId }, data: { estado: "error" } });
    throw new Error(resultado.error);
  }

  getProviderRegistry().registrarResultado(proveedor.id, true);
  const scene = await prisma.scene.update({
    where: { id: take.sceneId },
    data: { estado: "lista" },
  });
  await prisma.take.update({
    where: { id: take.id },
    data: { estado: "listo", archivo: resultado.ruta },
  });
  await prisma.asset.create({
    data: { projectId: scene.projectId, takeId: take.id, tipo: "video", ruta: resultado.ruta },
  });
  await prisma.agentLog.create({
    data: {
      projectId: scene.projectId,
      agente: "generador",
      decision: `Toma ${take.intento} de la escena lista`,
      contexto: { takeId: take.id, ruta: resultado.ruta },
    },
  });
  return { ok: true, ruta: resultado.ruta };
}
