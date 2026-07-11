import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const take = await prisma.take.findUnique({
    where: { id },
    include: { assets: true },
  });
  if (!take) return NextResponse.json({ error: "Take no encontrado" }, { status: 404 });
  return NextResponse.json({ take });
}
