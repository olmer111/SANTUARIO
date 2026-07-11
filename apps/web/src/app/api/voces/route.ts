import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const voces = await prisma.voice.findMany({ orderBy: [{ idioma: "asc" }, { nombre: "asc" }] });
  return NextResponse.json({ voces });
}
