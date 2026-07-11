"""Transcripción palabra-por-palabra con faster-whisper — Fase 3.

Nota: la primera llamada descarga los pesos del modelo desde Hugging Face
Hub (una vez, luego quedan cacheados). Requiere salida de red a
huggingface.co — puede estar bloqueada en entornos con egress restringido
(ver CLAUDE.md)."""

from __future__ import annotations

import os
from functools import lru_cache

from models import Word


@lru_cache(maxsize=1)
def _modelo():
    from faster_whisper import WhisperModel

    tamano = os.environ.get("WHISPER_MODEL_SIZE", "small")
    return WhisperModel(tamano, device="cpu", compute_type="int8")


def transcribir(
    audio_path: str, idioma: str | None = None
) -> tuple[list[Word], str, str]:
    modelo = _modelo()
    segmentos, info = modelo.transcribe(
        audio_path, language=idioma, word_timestamps=True
    )
    palabras: list[Word] = []
    texto_partes: list[str] = []
    for segmento in segmentos:
        texto_partes.append(segmento.text.strip())
        for palabra in segmento.words or []:
            palabras.append(
                Word(
                    word=palabra.word.strip(),
                    start=palabra.start,
                    end=palabra.end,
                )
            )
    return palabras, info.language, " ".join(texto_partes)
