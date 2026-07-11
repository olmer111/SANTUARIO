import { construirPromptEscena } from "@santuario/shared";
import { prisma } from "@/lib/db";
import { obtenerADN } from "@/lib/style-dna";

/**
 * Ingeniero de Prompts: arma el prompt final de una escena inyectando el
 * ADN de Estilo completo (regla dura 3 y 4 de la sección 5/7). No parafrasea
 * nada — usa construirPromptEscena, que concatena promptBase + descripciones
 * bloqueadas de los personajes presentes + acción de la escena.
 */
export async function armarPromptEscena(sceneId: string, adnId: string) {
  const escena = await prisma.scene.findUniqueOrThrow({
    where: { id: sceneId },
  });
  const { data: adn } = await obtenerADN(adnId);

  const { prompt, negativePrompt } = construirPromptEscena(
    adn,
    escena.descripcionVisual,
    escena.personajes
  );

  await prisma.agentLog.create({
    data: {
      projectId: escena.projectId,
      agente: "ingeniero_prompts",
      decision: `Prompt armado para escena ${escena.orden + 1}`,
      contexto: { sceneId, adnId, adnVersion: adn.version, prompt },
    },
  });

  return { prompt, negativePrompt, adnVersion: adn.version, escena };
}
