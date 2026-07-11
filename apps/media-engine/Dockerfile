# --- Etapa "fonts": fuentes DejaVu (Sans/Serif) vía pip (paquete matplotlib,
# que las empaqueta), SIN necesitar apt/fontconfig del sistema. libass las
# usa directamente por directorio (fontsdir=), así que solo copiamos los
# .ttf al stage final — matplotlib no viaja a la imagen final.
FROM mirror.gcr.io/library/python:3.11-slim AS fonts
# misma CA opcional que la etapa final — cada etapa de build es un contexto
# de red aparte, así que esto tiene que repetirse aquí.
COPY ca-bundle*.crt /tmp/build/
RUN if [ -f /tmp/build/ca-bundle.crt ]; then \
      cp /tmp/build/ca-bundle.crt /usr/local/share/ca-certificates/egress-ca.crt \
      && update-ca-certificates; \
    fi
ENV PIP_CERT=/etc/ssl/certs/ca-certificates.crt \
    REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt \
    SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt
RUN pip install --no-cache-dir matplotlib \
    && mkdir -p /fonts \
    && cp /usr/local/lib/python3.11/site-packages/matplotlib/mpl-data/fonts/ttf/DejaVuSans*.ttf /fonts/ \
    && cp /usr/local/lib/python3.11/site-packages/matplotlib/mpl-data/fonts/ttf/DejaVuSerif*.ttf /fonts/

# mirror.gcr.io replica las imágenes oficiales de Docker Hub (evita límites
# de rate y CDNs bloqueados en algunos entornos); la imagen es idéntica.
FROM mirror.gcr.io/library/python:3.11-slim

COPY --from=fonts /fonts /fonts
ENV FONTS_DIR=/fonts

# CA opcional para entornos con proxy de egreso que re-termina TLS (CI/sandbox).
# Si no existe ca-bundle.crt en el contexto, el wildcard no copia nada.
COPY requirements.txt ca-bundle*.crt /tmp/build/
RUN if [ -f /tmp/build/ca-bundle.crt ]; then \
      cp /tmp/build/ca-bundle.crt /usr/local/share/ca-certificates/egress-ca.crt \
      && update-ca-certificates; \
    fi
ENV PIP_CERT=/etc/ssl/certs/ca-certificates.crt \
    REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt \
    SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt

# FFmpeg: concatenación, transiciones, subtítulos quemados, extracción de frames.
# Plan A: apt. Plan B (entornos donde deb.debian.org está bloqueado): binario
# estático empaquetado en el wheel de imageio-ffmpeg (PyPI).
RUN (apt-get update \
      && apt-get install -y --no-install-recommends ffmpeg \
      && rm -rf /var/lib/apt/lists/*) \
    || (pip install --no-cache-dir imageio-ffmpeg \
      && ln -sf "$(python -c 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())')" \
        /usr/local/bin/ffmpeg)

RUN pip install --no-cache-dir -r /tmp/build/requirements.txt

WORKDIR /app
COPY . .

RUN mkdir -p /storage

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
