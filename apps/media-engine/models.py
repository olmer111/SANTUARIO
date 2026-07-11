"""Esquemas Pydantic de request/response del media-engine (Fase 3)."""

from __future__ import annotations

from pydantic import BaseModel, Field


class TTSRequest(BaseModel):
    text: str
    voice: str = "es-MX-JorgeNeural"
    rate: str = "+0%"  # p.ej. "+15%", "-10%"
    pitch: str = "+0Hz"  # p.ej. "+20Hz", "-10Hz"
    output_name: str | None = None  # nombre de archivo sin extensión


class TTSResponse(BaseModel):
    path: str
    duracion_seg: float


class Word(BaseModel):
    word: str
    start: float
    end: float


class TranscribeRequest(BaseModel):
    audio_path: str
    idioma: str | None = None  # None = autodetectar


class TranscribeResponse(BaseModel):
    words: list[Word]
    idioma: str
    texto: str


class SubtitlesAssRequest(BaseModel):
    words: list[Word]
    preset: str = "impacto_tiktok"
    video_width: int = 1080
    video_height: int = 1920


class SubtitlesAssResponse(BaseModel):
    ass: str


class SubtitlesRenderRequest(BaseModel):
    video_path: str
    words: list[Word]
    preset: str = "impacto_tiktok"
    output_name: str | None = None
    # si se pasa, reemplaza la pista de audio del video por esta (narración TTS)
    audio_path: str | None = None


class SubtitlesRenderResponse(BaseModel):
    path: str
    preset: str


class PresetInfo(BaseModel):
    nombre: str
    descripcion: str
