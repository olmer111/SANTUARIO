import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rutaRelativaDeStorage } from "@/lib/storage";

function aUrl(ruta: string | null): string | null {
  return ruta ? `/api/storage/${rutaRelativaDeStorage(ruta)}` : null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      adn: true,
      scripts: { orderBy: { revision: "desc" }, take: 1 },
      scenes: {
        orderBy: { orden: "asc" },
        include: {
          takes: { orderBy: { intento: "desc" }, take: 1 },
        },
      },
      assets: { where: { tipo: "export_final" }, orderBy: { createdAt: "desc" }, take: 1 },
      renderJobs: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    project: {
      ...project,
      scenes: project.scenes.map((s) => ({
        ...s,
        takes: s.takes.map((t) => ({ ...t, url: aUrl(t.archivo) })),
      })),
      assets: project.assets.map((a) => ({ ...a, url: aUrl(a.ruta) })),
    },
  });
}
