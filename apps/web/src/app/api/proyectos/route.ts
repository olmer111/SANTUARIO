import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Dashboard (pantalla 1, sección 11): proyectos con su estado y, si hay
 * un render en curso, la cola en vivo. */
export async function GET() {
  const proyectos = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      adn: { select: { nombre: true, version: true } },
      scenes: { select: { estado: true } },
      renderJobs: {
        where: { estado: { in: ["cola", "procesando"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return NextResponse.json({
    proyectos: proyectos.map((p) => ({
      id: p.id,
      titulo: p.titulo,
      tema: p.tema,
      formato: p.formato,
      estado: p.estado,
      adn: p.adn,
      totalEscenas: p.scenes.length,
      escenasListas: p.scenes.filter((s) => s.estado === "lista").length,
      renderEnCurso: p.renderJobs[0] ?? null,
      updatedAt: p.updatedAt,
    })),
  });
}
