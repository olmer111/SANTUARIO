import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rutaRelativaDeStorage } from "@/lib/storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const renderJob = await prisma.renderJob.findUnique({ where: { id } });
  if (!renderJob) {
    return NextResponse.json({ error: "RenderJob no encontrado" }, { status: 404 });
  }

  const datos = renderJob.datos as { path?: string } | null;
  const url = datos?.path ? `/api/storage/${rutaRelativaDeStorage(datos.path)}` : null;

  return NextResponse.json({ renderJob: { ...renderJob, url } });
}
