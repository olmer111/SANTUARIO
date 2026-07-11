"""TTS con edge-tts — gratis, voces neuronales es-MX/es-CO/es-ES/es-AR…
(orden de preferencia de la sección 9 del prompt maestro)."""

from __future__ import annotations

from pathlib import Path

import edge_tts
from mutagen.mp3 import MP3


async def generar_tts(
    texto: str, voz: str, rate: str, pitch: str, ruta_salida: str
) -> float:
    """Genera el audio y devuelve su duración en segundos."""
    Path(ruta_salida).parent.mkdir(parents=True, exist_ok=True)
    communicate = edge_tts.Communicate(texto, voz, rate=rate, pitch=pitch)
    await communicate.save(ruta_salida)
    try:
        return MP3(ruta_salida).info.length
    except Exception:
        return 0.0
