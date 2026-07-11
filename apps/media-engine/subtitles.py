"""Genera subtítulos ASS a partir de timestamps palabra-por-palabra y los
quema sobre un video con FFmpeg (Fase 3, sección 9 del prompt maestro)."""

from __future__ import annotations

import os
import subprocess
from pathlib import Path

from models import Word
from presets import SubtitlePreset, obtener_preset

FONTS_DIR = os.environ.get("FONTS_DIR", "/fonts")


def _hex_to_ass_color(hexcolor: str, alpha: int = 0) -> str:
    """"#RRGGBB" -> "&HAABBGGRR&" (formato de color ASS, alpha 00=opaco)."""
    h = hexcolor.lstrip("#")
    r, g, b = h[0:2], h[2:4], h[4:6]
    return f"&H{alpha:02X}{b}{g}{r}&".upper()


def _tiempo_ass(segundos: float) -> str:
    """Segundos -> "H:MM:SS.CC" (centisegundos, formato ASS)."""
    cs_total = round(segundos * 100)
    horas, resto = divmod(cs_total, 360000)
    minutos, resto = divmod(resto, 6000)
    segs, cs = divmod(resto, 100)
    return f"{horas}:{minutos:02d}:{segs:02d}.{cs:02d}"


def _cabecera_ass(preset: SubtitlePreset, ancho: int, alto: int) -> str:
    primario = _hex_to_ass_color(preset.color_primario)
    secundario = _hex_to_ass_color(preset.color_secundario)
    borde = _hex_to_ass_color(preset.color_borde)
    # BorderStyle 3 = caja opaca (documental); 1 = solo contorno+sombra
    border_style = 3 if preset.caja_fondo else 1
    fondo = _hex_to_ass_color("#000000", alpha=96) if preset.caja_fondo else borde

    return f"""[Script Info]
Title: SANTUARIO — {preset.nombre}
ScriptType: v4.00+
PlayResX: {ancho}
PlayResY: {alto}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{preset.fuente},{preset.tamano},{primario},{secundario},{borde},{fondo},{-1 if preset.negrita else 0},{-1 if preset.cursiva else 0},0,0,100,100,0,0,{border_style},{preset.borde},{preset.sombra},{preset.alineacion},40,40,{preset.margen_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def _agrupar(words: list[Word], tamano: int) -> list[list[Word]]:
    return [words[i : i + tamano] for i in range(0, len(words), tamano)]


def _lineas_palabra(words: list[Word], preset: SubtitlePreset) -> list[str]:
    """Modo "palabra": una palabra visible a la vez (impacto_tiktok, neon)."""
    lineas = []
    blur_tag = f"\\blur{preset.difuminado}" if preset.difuminado else ""
    for i, w in enumerate(words):
        texto = w.word.strip().upper() if preset.nombre == "impacto_tiktok" else w.word.strip()
        color = preset.color_secundario if i % 2 == 1 else preset.color_primario
        color_tag = f"\\c{_hex_to_ass_color(color)}"
        pop_tag = "\\t(0,100,\\fscx100\\fscy100)\\fscx80\\fscy80" if preset.pop else ""
        texto_tag = f"{{{color_tag}{blur_tag}{pop_tag}}}{texto}"
        lineas.append(
            f"Dialogue: 0,{_tiempo_ass(w.start)},{_tiempo_ass(w.end)},Default,,0,0,0,,{texto_tag}"
        )
    return lineas


def _lineas_frase(words: list[Word], preset: SubtitlePreset) -> list[str]:
    """Modo "frase": grupo de N palabras visible junto (minimal, documental)."""
    lineas = []
    for grupo in _agrupar(words, preset.palabras_por_frase):
        if not grupo:
            continue
        texto = " ".join(w.word.strip() for w in grupo)
        lineas.append(
            f"Dialogue: 0,{_tiempo_ass(grupo[0].start)},{_tiempo_ass(grupo[-1].end)},Default,,0,0,0,,{texto}"
        )
    return lineas


def _lineas_karaoke(words: list[Word], preset: SubtitlePreset) -> list[str]:
    """Modo "karaoke": frase visible, resaltado \\k progresivo por palabra."""
    lineas = []
    for grupo in _agrupar(words, preset.palabras_por_frase):
        if not grupo:
            continue
        partes = []
        for w in grupo:
            duracion_cs = max(1, round((w.end - w.start) * 100))
            partes.append(f"{{\\k{duracion_cs}}}{w.word.strip()} ")
        texto = "".join(partes).strip()
        lineas.append(
            f"Dialogue: 0,{_tiempo_ass(grupo[0].start)},{_tiempo_ass(grupo[-1].end)},Default,,0,0,0,,{texto}"
        )
    return lineas


def generar_ass(
    words: list[Word], nombre_preset: str, ancho: int = 1080, alto: int = 1920
) -> str:
    preset = obtener_preset(nombre_preset)
    cabecera = _cabecera_ass(preset, ancho, alto)

    if preset.modo == "palabra":
        lineas = _lineas_palabra(words, preset)
    elif preset.modo == "karaoke":
        lineas = _lineas_karaoke(words, preset)
    else:
        lineas = _lineas_frase(words, preset)

    return cabecera + "\n".join(lineas) + "\n"


def _escapar_para_filtro(ruta: str) -> str:
    return ruta.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")


def quemar_subtitulos(
    video_path: str, ass_path: str, salida_path: str, audio_path: str | None = None
) -> None:
    """Quema el .ass sobre el video con FFmpeg (filtro subtitles=). fontsdir=
    apunta a las fuentes DejaVu empaquetadas en la imagen — sin eso, libass
    no encuentra ninguna fuente en una imagen slim y el texto queda invisible
    aunque FFmpeg termine con éxito. Si se pasa audio_path (narración TTS),
    reemplaza la pista de audio original por esa (voz + subtítulos sincronizados
    en un solo archivo, criterio de aceptación de la Fase 3)."""
    Path(salida_path).parent.mkdir(parents=True, exist_ok=True)
    ass_escapado = _escapar_para_filtro(ass_path)
    fonts_escapado = _escapar_para_filtro(FONTS_DIR)
    filtro = f"subtitles='{ass_escapado}':fontsdir='{fonts_escapado}'"

    if audio_path:
        comando = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-i", audio_path,
            "-vf", filtro,
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-c:v", "libx264",
            "-c:a", "aac",
            "-shortest",
            salida_path,
        ]
    else:
        comando = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-vf", filtro,
            "-c:a", "copy",
            salida_path,
        ]

    resultado = subprocess.run(comando, capture_output=True, text=True, timeout=300)
    if resultado.returncode != 0:
        raise RuntimeError(f"FFmpeg falló al quemar subtítulos: {resultado.stderr[-2000:]}")
