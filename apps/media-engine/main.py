"""SANTUARIO media-engine — servicio Python para audio, subtítulos y montaje.

Fase 0: healthcheck real (FFmpeg, edge-tts, faster-whisper) + stubs de los
endpoints que se implementan en Fase 3 (TTS, transcripción palabra-por-palabra,
render de subtítulos ASS) y Fase 4 (montaje/concatenación).
"""

import importlib.util
import os
import shutil
import subprocess

from fastapi import FastAPI, HTTPException

app = FastAPI(
    title="SANTUARIO media-engine",
    version="0.1.0",
    description="TTS (edge-tts), subtítulos (faster-whisper + ASS) y montaje (FFmpeg).",
)

STORAGE_DIR = os.environ.get("STORAGE_DIR", "/storage")


def _version_ffmpeg() -> str | None:
    if not shutil.which("ffmpeg"):
        return None
    try:
        salida = subprocess.run(
            ["ffmpeg", "-version"], capture_output=True, text=True, timeout=5
        )
        return salida.stdout.splitlines()[0] if salida.returncode == 0 else None
    except (subprocess.SubprocessError, OSError):
        return None


def _modulo_disponible(nombre: str) -> bool:
    return importlib.util.find_spec(nombre) is not None


@app.get("/health")
def health() -> dict:
    ffmpeg = _version_ffmpeg()
    return {
        "servicio": "media-engine",
        "estado": "ok" if ffmpeg else "degradado",
        "ffmpeg": ffmpeg,
        "edge_tts": _modulo_disponible("edge_tts"),
        # faster-whisper se instala en Fase 3 (subtítulos palabra por palabra)
        "faster_whisper": _modulo_disponible("faster_whisper"),
        "storage_escribible": os.access(STORAGE_DIR, os.W_OK),
    }


# ---------- Stubs Fase 3/4 (documentan el contrato; devuelven 501) ----------


@app.post("/tts")
def tts() -> None:
    """Fase 3: texto → audio con edge-tts (voz, velocidad, tono, pausas)."""
    raise HTTPException(status_code=501, detail="Se implementa en Fase 3 (edge-tts).")


@app.post("/transcribe")
def transcribe() -> None:
    """Fase 3: audio → timestamps palabra por palabra con faster-whisper."""
    raise HTTPException(
        status_code=501, detail="Se implementa en Fase 3 (faster-whisper)."
    )


@app.post("/subtitles/render")
def subtitles_render() -> None:
    """Fase 3: timestamps + preset → subtítulos ASS quemados con FFmpeg."""
    raise HTTPException(status_code=501, detail="Se implementa en Fase 3 (ASS/FFmpeg).")


@app.post("/render/concat")
def render_concat() -> None:
    """Fase 4: concatenación de tomas, transiciones, mezcla y loudness."""
    raise HTTPException(status_code=501, detail="Se implementa en Fase 4 (montaje).")


@app.post("/frames/last")
def last_frame() -> None:
    """Fase 4: extrae el frame final de una toma para encadenar la siguiente."""
    raise HTTPException(
        status_code=501, detail="Se implementa en Fase 4 (continuidad último-frame)."
    )
