"""Los 5 presets de subtítulos de la sección 9 del prompt maestro, con vista
previa real en video (no son solo nombres — cada uno define un estilo ASS
completo y un modo de agrupación de palabras)."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SubtitlePreset:
    nombre: str
    descripcion: str
    modo: str  # "palabra" | "frase" | "karaoke"
    fuente: str
    tamano: int
    color_primario: str  # "#RRGGBB"
    color_secundario: str  # resaltado (karaoke) / color alterno (palabra)
    color_borde: str
    negrita: bool = True
    cursiva: bool = False
    borde: float = 3.0
    sombra: float = 0.0
    difuminado: float = 0.0  # blur (glow del preset "neon")
    alineacion: int = 2  # numpad ASS: 2 = inferior centrado, 5 = centro
    margen_v: int = 60
    caja_fondo: bool = False  # BorderStyle=3, fondo semitransparente
    palabras_por_frase: int = 5
    pop: bool = False  # animación de entrada "pop" (word-by-word)


PRESETS: dict[str, SubtitlePreset] = {
    "impacto_tiktok": SubtitlePreset(
        nombre="impacto_tiktok",
        descripcion="Palabra por palabra, bold gigante, blanco/amarillo con borde negro, animación pop",
        modo="palabra",
        fuente="DejaVu Sans",
        tamano=96,
        color_primario="#FFFFFF",
        color_secundario="#FFE600",
        color_borde="#000000",
        borde=5,
        alineacion=2,
        margen_v=140,
        pop=True,
    ),
    "karaoke": SubtitlePreset(
        nombre="karaoke",
        descripcion="Frase visible, palabra activa resaltada en color progresivo",
        modo="karaoke",
        fuente="DejaVu Sans",
        tamano=64,
        color_primario="#FFFFFF",
        color_secundario="#E86A33",
        color_borde="#000000",
        borde=3,
        alineacion=2,
        margen_v=110,
        palabras_por_frase=6,
    ),
    "minimal": SubtitlePreset(
        nombre="minimal",
        descripcion="Línea inferior, blanco, sombra suave, tipografía limpia",
        modo="frase",
        fuente="DejaVu Sans",
        tamano=52,
        color_primario="#FFFFFF",
        color_secundario="#FFFFFF",
        color_borde="#000000",
        negrita=False,
        borde=1.5,
        sombra=1.5,
        alineacion=2,
        margen_v=80,
        palabras_por_frase=8,
    ),
    "neon": SubtitlePreset(
        nombre="neon",
        descripcion="Glow de color, ideal gaming/tech",
        modo="palabra",
        fuente="DejaVu Sans",
        tamano=80,
        color_primario="#00F0FF",
        color_secundario="#FF2FD0",
        color_borde="#00F0FF",
        borde=2,
        difuminado=6,
        alineacion=2,
        margen_v=120,
    ),
    "documental": SubtitlePreset(
        nombre="documental",
        descripcion="Tercio inferior, serif elegante, fondo semitransparente",
        modo="frase",
        fuente="DejaVu Serif",
        tamano=48,
        color_primario="#F2F2F2",
        color_secundario="#F2F2F2",
        color_borde="#000000",
        negrita=False,
        # con BorderStyle=3 (caja_fondo), "Outline" es el padding de la caja
        # detrás del texto, no un trazo — en 0 la caja no se ve.
        borde=18,
        alineacion=2,
        margen_v=160,
        caja_fondo=True,
        palabras_por_frase=10,
    ),
}


def listar_presets() -> list[SubtitlePreset]:
    return list(PRESETS.values())


def obtener_preset(nombre: str) -> SubtitlePreset:
    if nombre not in PRESETS:
        disponibles = ", ".join(PRESETS)
        raise KeyError(f'Preset "{nombre}" no existe. Disponibles: {disponibles}')
    return PRESETS[nombre]
