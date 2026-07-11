import type { Job } from "bullmq";
import type { Formato } from "@santuario/shared";
import { prisma } from "../lib/db";
import { getProviderRegistry } from "../lib/providers/registry";
import { esperarResultado } from "../lib/proveedor-polling";
import { armarPromptEscena } from "../agents/ingeniero-prompts";
import { obtenerADN } from "../lib/style-dna";
import {
  compararFrames,
  concatenarTomas,
  extraerUltimoFrame,
} from "../lib/media-engine";

/**
 * Director: orquesta la generación de TODAS las escenas de un proyecto sin
 * intervención humana (criterio de aceptación de la Fase 4).
 *
 * Por cada escena, en orden:
 *  1. Arma el prompt (Ingeniero de Prompts) con el ADN completo.
 *  2. Selecciona proveedor (con el último frame de la escena anterior como
 *     imagen de referencia — encadenamiento de continuidad, regla 7.2) y el
 *     mismo seed para todo el proyecto (regla 7.3, cuando el proveedor lo permite).
 *  3. Genera y espera el resultado.
 *  4. QA: compara la paleta del frame nuevo contra la escena anterior
 *     (regla 7.5). Si hay drift, regenera — máx. 3 intentos por escena,
 *     probando otro proveedor si el actual falla (fallback, sección 8).
 *  5. Si persiste el drift tras 3 intentos, escala al usuario con opciones
 *     y detiene el proyecto (regla de oro 8 — nunca insiste en silencio).
 * Al final, concatena todas las tomas aprobadas en el video del proyecto.
 */

const UMBRAL_SIMILITUD_QA = 0.55;
const MAX_INTENTOS_ESCENA = 3;

export async function procesarDirector(job: Job<{ renderJobId: string }>) {
  const { renderJobId } = job.data;
  const renderJobInicial = await prisma.renderJob.update({
    where: { id: renderJobId },
    data: { estado: "procesando", progreso: 0 },
  });
  const { projectId } = renderJobInicial.datos as { projectId: string };

  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  if (!project.adnId) {
    throw new Error("El proyecto no tiene ADN de Estilo asignado — sin ADN no hay generación");
  }
  const { data: adn } = await obtenerADN(project.adnId);
  const formato = project.formato as Formato;

  const scenes = await prisma.scene.findMany({
    where: { projectId },
    orderBy: { orden: "asc" },
  });
  if (scenes.length === 0) throw new Error("El proyecto no tiene escenas");

  const seedProyecto = Math.floor(Math.random() * 1_000_000);
  let frameAnterior: string | null = null;
  const rutasFinales: string[] = [];

  for (const [indice, scene] of scenes.entries()) {
    let intento = 0;
    let escenaLista = false;

    while (!escenaLista && intento < MAX_INTENTOS_ESCENA) {
      intento++;
      const { prompt, negativePrompt, adnVersion } = await armarPromptEscena(
        scene.id,
        project.adnId
      );

      const registry = getProviderRegistry();
      const candidatos = await registry.seleccionar(
        frameAnterior
          ? { imageToVideo: true, formatos: [formato] }
          : { textToVideo: true, formatos: [formato] }
      );
      const proveedor = candidatos[0];
      if (!proveedor) {
        throw new Error(
          "No hay proveedor de video disponible que cumpla los requisitos (¿faltan credenciales?)"
        );
      }

      const take = await prisma.take.create({
        data: {
          sceneId: scene.id,
          intento,
          promptExacto: prompt,
          negativePrompt,
          seed: seedProyecto,
          proveedor: proveedor.id,
          adnVersion,
          estado: "cola",
        },
      });

      let jobIdProveedor: string;
      try {
        jobIdProveedor = await proveedor.generar({
          escenaId: scene.id,
          prompt,
          negativePrompt,
          formato,
          duracionSeg: scene.duracionSeg,
          seed: proveedor.capacidades.soportaSeed ? seedProyecto : undefined,
          imagenReferencia: frameAnterior ?? undefined,
          adn,
        });
      } catch (err) {
        registry.registrarResultado(proveedor.id, false);
        await prisma.take.update({
          where: { id: take.id },
          data: { estado: "error", notasQa: err instanceof Error ? err.message : String(err) },
        });
        continue;
      }

      await prisma.take.update({
        where: { id: take.id },
        data: { jobIdProveedor, estado: "procesando" },
      });

      const resultado = await esperarResultado(proveedor, jobIdProveedor);
      if (!resultado.ok) {
        registry.registrarResultado(proveedor.id, false);
        await prisma.take.update({
          where: { id: take.id },
          data: { estado: "error", notasQa: resultado.error },
        });
        continue;
      }

      const frameNuevo = await extraerUltimoFrame(
        resultado.ruta,
        `${scene.id}_intento${intento}`
      ).then((r) => r.path);

      let notasQa = "primera escena — sin comparación previa";
      let pasaQa = true;
      if (frameAnterior) {
        const { similitud } = await compararFrames(frameAnterior, frameNuevo);
        notasQa = `similitud con toma anterior: ${similitud.toFixed(2)}`;
        pasaQa = similitud >= UMBRAL_SIMILITUD_QA;
      }

      if (!pasaQa) {
        // el drift es un problema de CONTENIDO, no de salud del proveedor —
        // no cuenta como fallo en el registry (eso reserva la exclusión por
        // 2 fallos consecutivos para errores reales de API/red, sección 8).
        await prisma.take.update({
          where: { id: take.id },
          data: { estado: "qa_fallo", archivo: resultado.ruta, notasQa },
        });
        await prisma.agentLog.create({
          data: {
            projectId,
            agente: "qa",
            decision: `Drift visual detectado en escena ${scene.orden + 1}, intento ${intento}`,
            contexto: { takeId: take.id, notasQa },
          },
        });
        continue;
      }

      registry.registrarResultado(proveedor.id, true);
      await prisma.take.update({
        where: { id: take.id },
        data: { estado: "listo", archivo: resultado.ruta, notasQa },
      });
      await prisma.scene.update({ where: { id: scene.id }, data: { estado: "lista" } });
      await prisma.asset.create({
        data: { projectId, takeId: take.id, tipo: "video", ruta: resultado.ruta },
      });
      await prisma.agentLog.create({
        data: {
          projectId,
          agente: "director",
          decision: `Escena ${scene.orden + 1} generada y aprobada por QA (${proveedor.id}, intento ${intento})`,
          contexto: { takeId: take.id },
        },
      });

      frameAnterior = frameNuevo;
      rutasFinales.push(resultado.ruta);
      escenaLista = true;

      await prisma.renderJob.update({
        where: { id: renderJobId },
        data: { progreso: Math.round(((indice + 1) / scenes.length) * 90) },
      });
    }

    if (!escenaLista) {
      const mensaje = `La escena ${scene.orden + 1} no logró consistencia visual tras ${MAX_INTENTOS_ESCENA} intentos. Opciones: revisar/cambiar el ADN de Estilo, regenerar manualmente esa escena, o bajar el umbral de QA.`;
      await prisma.project.update({ where: { id: projectId }, data: { estado: "error" } });
      await prisma.agentLog.create({
        data: {
          projectId,
          agente: "director",
          decision: `Escena ${scene.orden + 1} escalada al usuario tras agotar reintentos`,
          contexto: { sceneId: scene.id, mensaje },
        },
      });
      await prisma.renderJob.update({
        where: { id: renderJobId },
        data: { estado: "error", error: mensaje },
      });
      throw new Error(mensaje);
    }
  }

  const montaje = await concatenarTomas(rutasFinales, `proyecto_${projectId}`);
  const assetFinal = await prisma.asset.create({
    data: { projectId, tipo: "export_final", ruta: montaje.path },
  });
  await prisma.project.update({ where: { id: projectId }, data: { estado: "listo" } });
  await prisma.renderJob.update({
    where: { id: renderJobId },
    data: {
      estado: "listo",
      progreso: 100,
      datos: { projectId, path: montaje.path, assetId: assetFinal.id },
    },
  });
  await prisma.agentLog.create({
    data: {
      projectId,
      agente: "director",
      decision: `Video final montado — ${scenes.length} escenas, sin intervención humana`,
      contexto: { assetId: assetFinal.id },
    },
  });

  return { ok: true, path: montaje.path };
}
