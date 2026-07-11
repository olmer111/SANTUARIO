import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const BodySchema = z.object({ sceneIds: z.array(z.string()).min(1) });

/** Sala de montaje: reordenar tomas sin regenerar nada — solo cambia
 * Scene.orden según el nuevo orden recibido. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Body inválido", detalles: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await prisma.$transaction(
    parsed.data.sceneIds.map((sceneId, orden) =>
      prisma.scene.update({
        where: { id: sceneId, projectId },
        data: { orden },
      })
    )
  );

  const scenes = await prisma.scene.findMany({
    where: { projectId },
    orderBy: { orden: "asc" },
  });
  return NextResponse.json({ scenes });
}
