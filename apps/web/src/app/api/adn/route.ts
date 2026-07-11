import { NextResponse } from "next/server";
import { z } from "zod";
import { generarADN } from "@/agents/guardian-estilo";
import { crearADN, listarADNsUltimaVersion } from "@/lib/style-dna";
import { prisma } from "@/lib/db";

export async function GET() {
  const adns = await listarADNsUltimaVersion();
  return NextResponse.json({ adns });
}

const BodySchema = z.object({
  descripcionEstilo: z.string().min(1),
  projectId: z.string().optional(),
});

/** El Guardián de Estilo genera el ADN a partir de una descripción y lo
 * persiste como versión 1 (sección 5: sin ADN no hay generación). Si se
 * pasa projectId, lo deja asignado al proyecto (lo necesita el Director
 * en Fase 4 para generar todas las escenas). */
export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Body inválido", detalles: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const adn = await generarADN(parsed.data.descripcionEstilo);
    const fila = await crearADN(adn);
    if (parsed.data.projectId) {
      await prisma.project.update({
        where: { id: parsed.data.projectId },
        data: { adnId: fila.id },
      });
    }
    await prisma.agentLog.create({
      data: {
        projectId: parsed.data.projectId,
        agente: "guardian_estilo",
        decision: `ADN "${adn.nombre}" creado (versión 1)`,
        contexto: { adnId: fila.id },
      },
    });
    return NextResponse.json({ adn: fila }, { status: 201 });
  } catch (err) {
    console.error("[api/adn]", err);
    return NextResponse.json(
      {
        error: "El Guardián de Estilo falló repetidamente",
        detalle: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}
