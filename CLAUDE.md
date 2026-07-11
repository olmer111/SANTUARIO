# SANTUARIO — guía para agentes

Plataforma web multi-agente que produce videos completos con IA. **Lee
`docs/PROMPT_MAESTRO.md` antes de trabajar**: define la arquitectura, las
reglas duras del ADN de Estilo, el pipeline y el plan de fases.

## Estado de fases

- ✅ Fase 0 — Fundaciones (monorepo, Next.js+Prisma, BullMQ, media-engine, compose)
- ✅ Fase 1 — Cerebro (Entrevistador + Guionista + storyboard, cerebro NVIDIA NIM)
- ⏳ Fase 2 — Primer video real (ADN + adaptador Higgsfield)
- ⏳ Fase 3 — Audio y subtítulos (edge-tts, faster-whisper, ASS)
- ⏳ Fase 4 — Escala y consistencia (multi-proveedor, último-frame, QA)
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
