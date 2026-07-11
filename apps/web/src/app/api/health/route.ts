import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";

type EstadoServicio = "ok" | "error";

async function checkPostgres(): Promise<EstadoServicio> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "ok";
  } catch {
    return "error";
  }
}

async function checkRedis(): Promise<EstadoServicio> {
  try {
    const pong = await getRedis().ping();
    return pong === "PONG" ? "ok" : "error";
  } catch {
    return "error";
  }
}

async function checkMediaEngine(): Promise<{
  estado: EstadoServicio;
  detalle?: unknown;
}> {
  const base = process.env.MEDIA_ENGINE_URL ?? "http://localhost:8001";
  try {
    const res = await fetch(`${base}/health`, {
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (!res.ok) return { estado: "error" };
    return { estado: "ok", detalle: await res.json() };
  } catch {
    return { estado: "error" };
  }
}

export async function GET() {
  const [postgres, redis, mediaEngine] = await Promise.all([
    checkPostgres(),
    checkRedis(),
    checkMediaEngine(),
  ]);

  const todoOk =
    postgres === "ok" && redis === "ok" && mediaEngine.estado === "ok";

  return NextResponse.json(
    {
      servicio: "santuario-web",
      estado: todoOk ? "ok" : "degradado",
      postgres,
      redis,
      mediaEngine,
      timestamp: new Date().toISOString(),
    },
    { status: todoOk ? 200 : 503 }
  );
}
