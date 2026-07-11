import type { Brief, GuionSalida } from "@santuario/shared";
import { prisma } from "@/lib/db";

/**
 * Persiste el guion aprobado como Project + Script + Scenes (regla de oro 7:
 * commits atómicos — todo en una transacción). Se llama solo después del
 * checkpoint de aprobación humana del guion (sección 6 del prompt maestro).
 */
export async function persistirGuionAprobado(brief: Brief, guion: GuionSalida) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        titulo: guion.titulo,
        tema: brief.tema ?? guion.titulo,
        formato: brief.formato ?? "9:16",
        duracionObjetivoSeg: brief.duracionObjetivoSeg ?? 60,
        modoAutonomo: brief.modoAutonomo ?? false,
        estado: "storyboard",
      },
    });

    const script = await tx.script.create({
      data: {
        projectId: project.id,
        revision: 1,
        guion: guion.guion,
        narracion: guion.narracionCompleta,
        aprobado: true,
      },
    });

    const scenes = await Promise.all(
      guion.escenas.map((escena) =>
        tx.scene.create({
          data: {
            projectId: project.id,
            scriptId: script.id,
            orden: escena.orden,
            descripcionVisual: escena.descripcionVisual,
            duracionSeg: escena.duracionSeg,
            textoNarracion: escena.textoNarracion,
            personajes: escena.personajes,
          },
        })
      )
    );

    await tx.agentLog.create({
      data: {
        projectId: project.id,
        agente: "guionista",
        decision: "Guion aprobado y storyboard persistido",
        contexto: { escenas: scenes.length, brief },
      },
    });

    return { project, script, scenes };
  });
}
