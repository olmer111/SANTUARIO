import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Voces edge-tts en español — gratis, sin límites (sección 9). */
const VOCES = [
  { nombre: "Jorge (México, masculino)", idioma: "es-MX", voiceId: "es-MX-JorgeNeural" },
  { nombre: "Dalia (México, femenino)", idioma: "es-MX", voiceId: "es-MX-DaliaNeural" },
  { nombre: "Gonzalo (Colombia, masculino)", idioma: "es-CO", voiceId: "es-CO-GonzaloNeural" },
  { nombre: "Salome (Colombia, femenino)", idioma: "es-CO", voiceId: "es-CO-SalomeNeural" },
  { nombre: "Alvaro (España, masculino)", idioma: "es-ES", voiceId: "es-ES-AlvaroNeural" },
  { nombre: "Elvira (España, femenino)", idioma: "es-ES", voiceId: "es-ES-ElviraNeural" },
  { nombre: "Tomas (Argentina, masculino)", idioma: "es-AR", voiceId: "es-AR-TomasNeural" },
  { nombre: "Elena (Argentina, femenino)", idioma: "es-AR", voiceId: "es-AR-ElenaNeural" },
];

/** Los 5 presets de subtítulos (sección 9) — la config completa vive en el
 * media-engine (presets.py); acá solo se guarda nombre/descripción para
 * el selector de la UI. */
const PRESETS = [
  { nombre: "impacto_tiktok", descripcion: "Palabra por palabra, bold gigante, blanco/amarillo con borde negro, animación pop" },
  { nombre: "karaoke", descripcion: "Frase visible, palabra activa resaltada en color progresivo" },
  { nombre: "minimal", descripcion: "Línea inferior, blanco, sombra suave, tipografía limpia" },
  { nombre: "neon", descripcion: "Glow de color, ideal gaming/tech" },
  { nombre: "documental", descripcion: "Tercio inferior, serif elegante, fondo semitransparente" },
];

async function main() {
  for (const voz of VOCES) {
    await prisma.voice.upsert({
      where: { motor_voiceId: { motor: "edge-tts", voiceId: voz.voiceId } },
      update: { nombre: voz.nombre, idioma: voz.idioma },
      create: { ...voz, motor: "edge-tts" },
    });
  }

  for (const preset of PRESETS) {
    await prisma.subtitlePreset.upsert({
      where: { nombre: preset.nombre },
      update: { config: { descripcion: preset.descripcion } },
      create: {
        nombre: preset.nombre,
        config: { descripcion: preset.descripcion },
        esSistema: true,
      },
    });
  }

  console.log(`Seed listo: ${VOCES.length} voces, ${PRESETS.length} presets de subtítulos.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
