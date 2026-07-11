import { NextResponse } from "next/server";
import { BriefSchema } from "@santuario/shared";
import { generarGuion } from "@/agents/guionista";

/** Genera un guion a partir del brief SIN persistirlo — es la propuesta que
 * el usuario revisa en el checkpoint de aprobación (sección 6). */
export async function POST(req: Request) {
  const parsed = BriefSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Brief inválido", detalles: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const guion = await generarGuion(parsed.data);
    return NextResponse.json({ brief: parsed.data, guion });
  } catch (err) {
    console.error("[api/guion]", err);
    return NextResponse.json(
      {
        error: "El Guionista falló repetidamente",
        detalle: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}
