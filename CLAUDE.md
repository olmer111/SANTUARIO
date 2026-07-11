# SANTUARIO — guía para agentes

Plataforma web multi-agente que produce videos completos con IA. **Lee
`docs/PROMPT_MAESTRO.md` antes de trabajar**: define la arquitectura, las
reglas duras del ADN de Estilo, el pipeline y el plan de fases.

## Estado de fases

- ✅ Fase 0 — Fundaciones (monorepo, Next.js+Prisma, BullMQ, media-engine, compose)
- ✅ Fase 1 — Cerebro (Entrevistador + Guionista + storyboard, cerebro NVIDIA NIM)
- ✅ Fase 2 — Primer video real (ADN + adaptador Higgsfield, sin credenciales aún)
- ✅ Fase 3 — Audio y subtítulos (edge-tts, faster-whisper, ASS, sin red en sandbox)
- ✅ Fase 4 — Escala y consistencia (Director, último-frame, QA, fallback — verificado con proveedor simulado)
- ⏳ Fase 5 — Producto (UI completa con los 5 skills de diseño)

## Contexto del usuario (respuestas a la entrevista inicial)

- Credenciales de proveedores de video: **ninguna todavía** (tiene cuenta
  Higgsfield; el MCP de Higgsfield puede estar disponible en la sesión).
- GPU local: **no** — solo proveedores en la nube; sin ComfyUI local.
- Nombre definitivo: **SANTUARIO**.
- Cerebro de agentes: **NVIDIA NIM** (`NVIDIA_API_KEY` en `.env`), no
  Anthropic — decisión del usuario por costo cero (sección 13, regla 4).
  `ANTHROPIC_API_KEY` queda como alternativa opcional de mayor calidad
  (`LLM_PROVIDER=anthropic`).

## Comandos

```bash
pnpm install                 # deps del monorepo
docker compose up -d --wait  # Postgres + Redis + media-engine (healthchecks)
pnpm db:migrate              # migraciones Prisma (requiere apps/web/.env)
pnpm dev                     # Next.js en :3000
pnpm worker                  # worker BullMQ (proceso separado)
pnpm -r typecheck            # TypeScript estricto en todos los paquetes
pnpm build                   # build completo
```

## Reglas de oro (resumen de la sección 13)

1. Verifica free tiers con búsqueda web antes de integrar un proveedor.
2. Todo prompt enviado a un proveedor queda guardado en DB (tabla `takes`).
3. El ADN de Estilo nunca se sobrescribe: cada cambio es nueva versión.
4. Costo cero primero; si sugieres algo de pago, di el costo.
5. Trabajos largos → colas BullMQ; ninguna request HTTP espera un render.
6. Cada agente registra sus decisiones en `agent_logs`.
7. TypeScript estricto, Zod en todas las fronteras, commits atómicos por fase.
8. Si algo falla 3 veces, repórtalo con opciones; no insistas en silencio.

## Notas del entorno remoto (sandbox)

- Docker Hub está bloqueado por el egress; usar `mirror.gcr.io/library/*`.
- `deb.debian.org` bloqueado → el Dockerfile del media-engine cae a
  `imageio-ffmpeg` (binario estático vía PyPI) automáticamente.
- Antes de `docker compose build` en sandbox: copiar el CA del proxy
  `cp /root/.ccr/ca-bundle.crt apps/media-engine/ca-bundle.crt` (gitignorado).
- Los 5 skills de diseño están vendorizados en `.claude/skills/` (ver
  `scripts/setup-skills.sh`). Antes de construir UI real: úsalos.
- `integrate.api.nvidia.com` (y otros hosts de LLM como Groq/OpenRouter) NO
  están en la lista blanca de egress del sandbox → las rutas `/api/entrevista`
  y `/api/guion` no se pueden probar en vivo aquí (sí devuelven 502 con el
  mensaje de error correcto). `generativelanguage.googleapis.com` sí es
  alcanzable, por si se agrega Gemini como alternativa. Verificar la llamada
  real fuera del sandbox.
- `platform.higgsfield.ai` tampoco está en la lista blanca → mismo patrón:
  el adaptador llega hasta la llamada HTTP real y falla limpio (502). El
  usuario todavía no tiene `HIGGSFIELD_API_KEY` (formato `KEY_ID:KEY_SECRET`
  del dashboard). El endpoint de texto→imagen (`/v1/text2image/soul`) no
  está 100% confirmado en documentación pública — solo `/v1/image2video/dop`
  y el patrón de auth lo están (ver comentarios en
  `apps/web/src/lib/providers/higgsfield.ts`); verificar contra el dashboard
  real antes de asumir que funciona en producción.
- `speech.platform.bing.com` (backend de edge-tts) y `huggingface.co`
  (descarga del modelo de faster-whisper) tampoco tienen salida — ni
  siquiera desde contenedores Docker enrutando por el proxy del host
  (`--network host` + `HTTPS_PROXY` tampoco funcionó: connection refused,
  el proxy del host no es alcanzable desde dentro del contenedor anidado).
  Lo que SÍ es 100% verificable en sandbox y quedó probado con capturas
  reales: generación de `.ass` y burn-in con FFmpeg/libass (los 5 presets).
  Nota para el próximo que toque esto: **libass no encuentra fuentes en
  `python:3.11-slim`** — sin `fontsdir=` apuntando a fuentes reales
  (DejaVu, empaquetadas vía matplotlib en un stage de build separado, ver
  `apps/media-engine/Dockerfile`), el texto queda invisible aunque FFmpeg
  termine con éxito y sin errores. Ya está resuelto, pero es la clase de
  bug que no se nota sin extraer un frame y mirarlo.
- El Director (Fase 4) se verificó de punta a punta con un `VideoProvider`
  simulado registrado temporalmente detrás de `MOCK_PROVIDER=1` (generaba
  clips reales con FFmpeg vía `docker exec`, sin red externa) — probé el
  camino feliz (3 escenas, continuidad por último frame, similitud 1.00,
  montaje final) y el camino de escalación (drift forzado, 3 intentos,
  mensaje claro al usuario). Encontré y arreglé un bug real en el proceso:
  un fallo de QA (drift de contenido) contaba como fallo de proveedor en
  `ProviderRegistry`, así que con un solo proveedor registrado el segundo
  intento fallido lo excluía por completo (`fallosConsecutivos >= 2`) antes
  de llegar al tercer intento, produciendo un error genérico en vez de la
  escalación real. `registrarResultado` ahora solo se llama para fallos de
  API/red, nunca para fallos de QA. El código de prueba (proveedor
  simulado + su registro condicional) se revirtió por completo antes de
  commitear — no queda rastro en el diff.
