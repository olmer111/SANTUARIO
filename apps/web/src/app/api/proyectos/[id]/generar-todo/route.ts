import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getQueue } from "@/lib/queue";

/** Dispara al Director: genera todas las escenas del proyecto en orden,
 * con continuidad (último frame), mismo seed, QA automático y fallback de
 * proveedor — sin intervención humana (criterio de aceptación Fase 4). */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }
  if (!project.adnId) {
    return NextResponse.json(
      { error: "El proyecto no tiene ADN de Estilo asignado" },
      { status: 409 }
    );
  }

  const renderJob = await prisma.renderJob.create({
    data: {
      projectId,
      tipo: "montaje",
      estado: "cola",
      datos: { projectId },
    },
  });

  // sin reintentos automáticos del job completo: si el Director escala una
  // escena al usuario, reintentar todo desde cero no tiene sentido — el
  // propio Director ya deja el error y las opciones en el RenderJob.
  await getQueue("montaje").add(
    "generar-todo",
    { renderJobId: renderJob.id },
    { attempts: 1 }
  );

  return NextResponse.json({ renderJob }, { status: 202 });
}
