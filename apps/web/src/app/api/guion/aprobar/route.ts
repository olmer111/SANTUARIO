import { NextResponse } from "next/server";
import { z } from "zod";
import { BriefSchema, GuionSalidaSchema } from "@santuario/shared";
import { persistirGuionAprobado } from "@/lib/storyboard";

const BodySchema = z.object({
  brief: BriefSchema,
  guion: GuionSalidaSchema,
});

/** Checkpoint de aprobación humana del guion: persiste Project + Script +
 * Scenes (storyboard) — criterio de aceptación de la Fase 1. */
export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Body inválido", detalles: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const resultado = await persistirGuionAprobado(
      parsed.data.brief,
      parsed.data.guion
    );
    return NextResponse.json(resultado, { status: 201 });
  } catch (err) {
    console.error("[api/guion/aprobar]", err);
    return NextResponse.json(
      {
        error: "No se pudo persistir el storyboard",
        detalle: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
