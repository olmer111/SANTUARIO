"""SANTUARIO media-engine — servicio Python para audio, subtítulos y montaje.

Fase 3: TTS (edge-tts), transcripción palabra-por-palabra (faster-whisper) y
subtítulos ASS con burn-in FFmpeg, todos reales. Fase 4 (montaje/concat y
último-frame) sigue como stub.
"""

import importlib.util
import os
import shutil
import subprocess
import uuid

from fastapi import FastAPI, HTTPException

import tts as tts_mod
import transcribe as transcribe_mod
import subtitles as subtitles_mod
from models import (
    PresetInfo,
    SubtitlesAssRequest,
    SubtitlesAssResponse,
    SubtitlesRenderRequest,
    SubtitlesRenderResponse,
    TranscribeRequest,
    TranscribeResponse,
    TTSRequest,
    TTSResponse,
)
from presets import listar_presets

app = FastAPI(
    title="SANTUARIO media-engine",
    version="0.3.0",
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
        "faster_whisper": _modulo_disponible("faster_whisper"),
        "storage_escribible": os.access(STORAGE_DIR, os.W_OK),
    }


@app.get("/subtitles/presets", response_model=list[PresetInfo])
def subtitles_presets() -> list[PresetInfo]:
    return [PresetInfo(nombre=p.nombre, descripcion=p.descripcion) for p in listar_presets()]


@app.post("/tts", response_model=TTSResponse)
async def tts(req: TTSRequest) -> TTSResponse:
    nombre = req.output_name or f"tts_{uuid.uuid4().hex}"
    ruta = os.path.join(STORAGE_DIR, "audio", f"{nombre}.mp3")
    try:
        duracion = await tts_mod.generar_tts(req.text, req.voice, req.rate, req.pitch, ruta)
    except Exception as err:  # edge-tts lanza excepciones variadas de red/voz
        raise HTTPException(status_code=502, detail=f"edge-tts falló: {err}") from err
    return TTSResponse(path=ruta, duracion_seg=duracion)


@app.post("/transcribe", response_model=TranscribeResponse)
def transcribe(req: TranscribeRequest) -> TranscribeResponse:
    if not _modulo_disponible("faster_whisper"):
        raise HTTPException(
            status_code=503,
            detail="faster-whisper no está instalado (descomentar en requirements.txt)",
        )
    try:
        palabras, idioma, texto = transcribe_mod.transcribir(req.audio_path, req.idioma)
    except Exception as err:
        raise HTTPException(status_code=502, detail=f"faster-whisper falló: {err}") from err
    return TranscribeResponse(words=palabras, idioma=idioma, texto=texto)


@app.post("/subtitles/ass", response_model=SubtitlesAssResponse)
def subtitles_ass(req: SubtitlesAssRequest) -> SubtitlesAssResponse:
    try:
        contenido = subtitles_mod.generar_ass(
            req.words, req.preset, req.video_width, req.video_height
        )
    except KeyError as err:
        raise HTTPException(status_code=400, detail=str(err)) from err
    return SubtitlesAssResponse(ass=contenido)


@app.post("/subtitles/render", response_model=SubtitlesRenderResponse)
def subtitles_render(req: SubtitlesRenderRequest) -> SubtitlesRenderResponse:
    try:
        contenido = subtitles_mod.generar_ass(req.words, req.preset)
    except KeyError as err:
        raise HTTPException(status_code=400, detail=str(err)) from err

    nombre = req.output_name or f"subs_{uuid.uuid4().hex}"
    ass_path = os.path.join(STORAGE_DIR, "subtitles", f"{nombre}.ass")
    salida_path = os.path.join(STORAGE_DIR, "subtitles", f"{nombre}.mp4")
    os.makedirs(os.path.dirname(ass_path), exist_ok=True)
    with open(ass_path, "w", encoding="utf-8") as f:
        f.write(contenido)

    try:
        subtitles_mod.quemar_subtitulos(
            req.video_path, ass_path, salida_path, req.audio_path
        )
    except RuntimeError as err:
        raise HTTPException(status_code=502, detail=str(err)) from err

    return SubtitlesRenderResponse(path=salida_path, preset=req.preset)


# ---------- Stubs Fase 4 ----------


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
