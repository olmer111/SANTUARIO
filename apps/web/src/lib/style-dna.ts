import { StyleDNASchema, type StyleDNA } from "@santuario/shared";
import { prisma } from "@/lib/db";

/**
 * Biblioteca de ADN de Estilo — persistencia con versionado inmutable
 * (regla dura 2 de la sección 5: cada cambio es una versión nueva, nunca se
 * sobrescribe; rollback siempre posible).
 */

export async function crearADN(adn: StyleDNA) {
  const validado = StyleDNASchema.parse({ ...adn, version: 1 });
  return prisma.styleDna.create({
    data: {
      nombre: validado.nombre,
      version: 1,
      data: validado,
    },
  });
}

export async function crearNuevaVersion(
  idVersionActual: string,
  cambios: Partial<StyleDNA>
) {
  const actual = await prisma.styleDna.findUniqueOrThrow({
    where: { id: idVersionActual },
  });
  const dataActual = StyleDNASchema.parse(actual.data);
  const nuevaVersion = StyleDNASchema.parse({
    ...dataActual,
    ...cambios,
    nombre: dataActual.nombre,
    version: actual.version + 1,
  });

  return prisma.styleDna.create({
    data: {
      nombre: nuevaVersion.nombre,
      version: nuevaVersion.version,
      parentId: actual.id,
      data: nuevaVersion,
    },
  });
}

/** Última versión de cada nombre de ADN (para la biblioteca). */
export async function listarADNsUltimaVersion() {
  const todos = await prisma.styleDna.findMany({
    orderBy: [{ nombre: "asc" }, { version: "desc" }],
  });
  const porNombre = new Map<string, (typeof todos)[number]>();
  for (const adn of todos) {
    if (!porNombre.has(adn.nombre)) porNombre.set(adn.nombre, adn);
  }
  return [...porNombre.values()];
}

export async function listarVersiones(nombre: string) {
  return prisma.styleDna.findMany({
    where: { nombre },
    orderBy: { version: "desc" },
  });
}

export async function obtenerADN(id: string) {
  const fila = await prisma.styleDna.findUniqueOrThrow({ where: { id } });
  return { ...fila, data: StyleDNASchema.parse(fila.data) };
}
