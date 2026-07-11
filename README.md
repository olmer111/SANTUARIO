# 🎬 SANTUARIO

Plataforma web multi-agente que produce **videos completos con IA** de principio a fin: entrevista conversacional, guion, tomas generadas en múltiples servicios de video con **consistencia visual absoluta** (ADN de Estilo), voz en off, subtítulos sincronizados palabra por palabra y montaje final.

> Documento fundacional: [`docs/PROMPT_MAESTRO.md`](docs/PROMPT_MAESTRO.md)

## Pilares no negociables

1. **Consistencia** — ninguna toma se genera sin el ADN de Estilo (JSONB versionado e inmutable).
2. **Costo cero primero** — free tiers y modelos locales antes que nada de pago.
3. **El agente pregunta** — checkpoints de aprobación humana (guion, ADN, render final).
4. **Todo se guarda** — prompts exactos, seeds, versiones → reproducibilidad total.
5. **UI que no parece genérica** — construida y auditada con los 5 skills de diseño.

## Estructura

```
/apps/web            → Next.js 15 (UI + API routes + agentes) + worker BullMQ
/apps/media-engine   → FastAPI (edge-tts, faster-whisper, FFmpeg)
/packages/providers  → Interfaz VideoProvider + registro/selector con fallback
/packages/shared     → Tipos y esquemas Zod (ADN de Estilo, escenas, colas)
/storage             → Assets generados (fuera del repo)
docker-compose.yml   → Postgres + Redis + media-engine
```

## Quick start

```bash
# 1. Dependencias
pnpm install

# 2. Variables de entorno
cp .env.example .env            # y apps/web/.env para Prisma CLI

# 3. Infraestructura (Postgres + Redis + media-engine con healthchecks)
docker compose up -d --wait

# 4. Base de datos
pnpm db:migrate

# 5. App + worker (terminales separadas)
pnpm dev        # http://localhost:3000
pnpm worker     # procesa las colas generar/tts/subtitulos/montaje
```

Healthchecks: `docker compose ps` (todo `healthy`) y `GET http://localhost:3000/api/health`.

## Skills de diseño (obligatorios antes de la UI real)

Ver [`scripts/setup-skills.sh`](scripts/setup-skills.sh). División del trabajo: ui-ux-pro-max (design system) · frontend-design (dirección estética) · emil-design-eng (animación) · huashu-design (prototipos) · web-design-guidelines (auditoría final).

## Plan de fases

| Fase | Entregable | Estado |
|---|---|---|
| **0 — Fundaciones** | Monorepo, Next.js + Prisma, Redis + BullMQ, media-engine, compose con healthchecks | ✅ |
| **1 — Cerebro** | Entrevistador + Guionista + storyboard persistido (`/estudio`) | ✅ |
| **2 — Primer video real** | ADN de Estilo + adaptador Higgsfield + Take end-to-end | ✅ |
| **3 — Audio y subtítulos** | edge-tts + faster-whisper + presets ASS + previews | ⏳ |
| **4 — Escala y consistencia** | Multi-proveedor, fallback, último-frame, QA automático | ⏳ |
| **5 — Producto** | UI completa con los 5 skills, biblioteca de ADN, montaje, export | ⏳ |
