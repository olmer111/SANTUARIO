import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const presets = await prisma.subtitlePreset.findMany({ orderBy: { nombre: "asc" } });
  return NextResponse.json({ presets });
}
