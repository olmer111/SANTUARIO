import { NextResponse } from "next/server";
import { z } from "zod";
import { armarPromptEscena } from "@/agents/ingeniero-prompts";
import { getProviderRegistry } from "@/lib/providers/registry";
import { getQueue } from "@/lib/queue";
import { obtenerADN } from "@/lib/style-dna";
import { prisma } from "@/lib/db";

const BodySchema = z.object({ adnId: z.string() });

/** Generador: arma el prompt (Ingeniero de Prompts), crea el Take con el
 * prompt exacto/seed/proveedor (regla de oro 2) y encola el job "generar"
 * — ninguna request HTTP espera el render (regla de oro 5). */
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

  const registry = getProviderRegistry();
  const proveedor = registry.obtener("higgsfield");
  if (!proveedor) {
    return NextResponse.json(
      {
        error: "Ningún proveedor de video configurado",
        detalle: "Falta HIGGSFIELD_API_KEY en .env (formato KEY_ID:KEY_SECRET)",
      },
      { status: 503 }
    );
  }

  try {
    const { prompt, negativePrompt, adnVersion, escena } =
      await armarPromptEscena(sceneId, parsed.data.adnId);

    const seed = Math.floor(Math.random() * 1_000_000);
    const intentosPrevios = await prisma.take.count({ where: { sceneId } });
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: escena.projectId },
    });
    const formato = project.formato as "9:16" | "16:9" | "1:1";

    const take = await prisma.take.create({
      data: {
        sceneId,
        intento: intentosPrevios + 1,
        promptExacto: prompt,
        negativePrompt,
        seed,
        proveedor: proveedor.id,
        adnVersion,
        estado: "cola",
      },
    });

    await prisma.scene.update({
      where: { id: sceneId },
      data: { estado: "generando" },
    });

    const { data: adn } = await obtenerADN(parsed.data.adnId);
    const jobIdProveedor = await proveedor.generar({
      escenaId: sceneId,
      prompt,
      negativePrompt,
      formato,
      duracionSeg: escena.duracionSeg,
      seed,
      adn,
    });

    const takeActualizado = await prisma.take.update({
      where: { id: take.id },
      data: { jobIdProveedor, estado: "procesando" },
    });

    await getQueue("generar").add("poll-take", { takeId: take.id });

    await prisma.agentLog.create({
      data: {
        projectId: escena.projectId,
        agente: "generador",
        decision: `Escena ${escena.orden + 1} enviada a ${proveedor.id}`,
        contexto: { takeId: take.id, jobIdProveedor },
      },
    });

    return NextResponse.json({ take: takeActualizado }, { status: 202 });
  } catch (err) {
    console.error("[api/escenas/generar]", err);
    return NextResponse.json(
      {
        error: "No se pudo iniciar la generación",
        detalle: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}
