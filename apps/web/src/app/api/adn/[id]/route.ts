import { NextResponse } from "next/server";
import { z } from "zod";
import { StyleDNASchema } from "@santuario/shared";
import { crearNuevaVersion, listarVersiones, obtenerADN } from "@/lib/style-dna";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const adn = await obtenerADN(id);
    const versiones = await listarVersiones(adn.nombre);
    return NextResponse.json({ adn, versiones });
  } catch {
    return NextResponse.json({ error: "ADN no encontrado" }, { status: 404 });
  }
}

const BodySchema = z.object({ cambios: StyleDNASchema.partial() });

/** Crea una nueva versión del ADN (nunca se sobrescribe la actual). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Body inválido", detalles: parsed.error.flatten() },
      { status: 400 }
    );
  }
  try {
    const nuevaVersion = await crearNuevaVersion(id, parsed.data.cambios);
    return NextResponse.json({ adn: nuevaVersion }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error: "No se pudo crear la nueva versión",
        detalle: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
