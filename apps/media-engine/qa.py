"""QA visual automático — Fase 4, regla de consistencia 5: el QA compara
paleta dominante y presencia del personaje entre tomas consecutivas; si
detecta drift, el Director decide regenerar."""

from __future__ import annotations

from PIL import Image


def extraer_paleta(image_path: str, n_colores: int = 5) -> list[str]:
    """Paleta dominante ordenada de mayor a menor presencia, como hex."""
    img = Image.open(image_path).convert("RGB")
    img = img.resize((150, 150))
    cuantizada = img.quantize(colors=n_colores, method=Image.MEDIANCUT)
    paleta_rgb = cuantizada.getpalette()[: n_colores * 3]
    conteos = sorted(cuantizada.getcolors(), reverse=True)

    hex_ordenados = []
    for _, indice in conteos:
        r, g, b = paleta_rgb[indice * 3 : indice * 3 + 3]
        hex_ordenados.append(f"#{r:02X}{g:02X}{b:02X}")
    return hex_ordenados


def _hex_a_rgb(hexcolor: str) -> tuple[int, int, int]:
    h = hexcolor.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _distancia(a: str, b: str) -> float:
    ra, ga, ba = _hex_a_rgb(a)
    rb, gb, bb = _hex_a_rgb(b)
    return ((ra - rb) ** 2 + (ga - gb) ** 2 + (ba - bb) ** 2) ** 0.5


def similitud_paletas(paleta_a: list[str], paleta_b: list[str]) -> float:
    """1.0 = idénticas, 0.0 = totalmente distintas. Para cada color de A,
    toma la distancia al más cercano en B (matching tipo "earth mover"
    simplificado), normalizado por la distancia máxima posible en RGB."""
    if not paleta_a or not paleta_b:
        return 0.0
    distancia_max = (255**2 * 3) ** 0.5
    distancias = [min(_distancia(a, b) for b in paleta_b) for a in paleta_a]
    promedio = sum(distancias) / len(distancias)
    return max(0.0, 1.0 - promedio / distancia_max)
