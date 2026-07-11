import { NextResponse } from "next/server";
import { z } from "zod";
import { BriefSchema, ChatMessageSchema } from "@santuario/shared";
import { siguienteTurno } from "@/agents/entrevistador";
import { prisma } from "@/lib/db";

const BodySchema = z.object({
  historial: z.array(ChatMessageSchema).default([]),
  briefActual: BriefSchema.default({}),
});

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Body inválido", detalles: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const respuesta = await siguienteTurno({
      historial: parsed.data.historial,
      briefActual: parsed.data.briefActual,
    });

    await prisma.agentLog.create({
      data: {
        agente: "entrevistador",
        decision: respuesta.completo
          ? "Brief completo, listo para checkpoint de guion"
          : "Pregunta al usuario",
        contexto: { briefParcial: respuesta.briefParcial },
      },
    });

    return NextResponse.json(respuesta);
  } catch (err) {
    console.error("[api/entrevista]", err);
    return NextResponse.json(
      {
        error: "El Entrevistador falló repetidamente",
        detalle: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}
