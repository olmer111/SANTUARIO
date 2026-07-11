"""Continuidad y montaje — Fase 4: extracción de último frame (encadenamiento
por último frame, técnica #1 de consistencia, sección 7.2) y concatenación de
tomas con mezcla de audio y normalización de loudness (sección 6, paso 9)."""

from __future__ import annotations

import subprocess
from pathlib import Path


def extraer_ultimo_frame(video_path: str, salida_path: str) -> None:
    """-sseof busca desde el final sin necesitar la duración total (no
    depende de ffprobe, que el binario estático de imageio-ffmpeg no trae).
    -update 1 con un solo nombre de archivo hace que FFmpeg sobreescriba y
    quede solo el último frame decodificado."""
    Path(salida_path).parent.mkdir(parents=True, exist_ok=True)
    resultado = subprocess.run(
        [
            "ffmpeg", "-y",
            "-sseof", "-3",
            "-i", video_path,
            "-update", "1",
            "-q:v", "2",
            salida_path,
        ],
        capture_output=True,
        text=True,
        timeout=60,
    )
    if resultado.returncode != 0:
        raise RuntimeError(f"FFmpeg falló al extraer el último frame: {resultado.stderr[-2000:]}")


def concatenar_tomas(
    video_paths: list[str], salida_path: str, normalizar_loudness: bool = True
) -> None:
    """Concatena tomas con corte seco (ritmo por defecto del ADN, sección 5)
    vía el filtro concat — re-encoda, así que también sirve para unificar
    framerate/resolución entre tomas de proveedores distintos."""
    if not video_paths:
        raise ValueError("No hay tomas para concatenar")
    Path(salida_path).parent.mkdir(parents=True, exist_ok=True)

    entradas: list[str] = []
    for v in video_paths:
        entradas += ["-i", v]

    n = len(video_paths)
    streams = "".join(f"[{i}:v:0][{i}:a:0]" for i in range(n))
    filtro = f"{streams}concat=n={n}:v=1:a=1[v][a_concat]"
    if normalizar_loudness:
        filtro += ";[a_concat]loudnorm[a]"
        map_audio = "[a]"
    else:
        map_audio = "[a_concat]"

    comando = [
        "ffmpeg", "-y",
        *entradas,
        "-filter_complex", filtro,
        "-map", "[v]",
        "-map", map_audio,
        "-c:v", "libx264",
        "-c:a", "aac",
        salida_path,
    ]
    resultado = subprocess.run(comando, capture_output=True, text=True, timeout=600)
    if resultado.returncode != 0:
        raise RuntimeError(f"FFmpeg falló al concatenar tomas: {resultado.stderr[-2000:]}")
