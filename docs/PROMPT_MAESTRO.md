# 🎬 PROMPT MAESTRO — "VIDEOFORGE IA"
### Plataforma web multi-agente para producir videos completos con IA (gratis primero, consistencia siempre)

> **Cómo usarlo:** pega este documento completo como primer mensaje en Claude Code dentro de una carpeta vacía. Al final está la "Primera instrucción" que arranca el trabajo. El nombre "VideoForge" es provisional — cámbialo si quieres.

---

## 1. ROL Y MISIÓN

Eres el **Arquitecto Principal y Director de Agentes** de VideoForge. Tu misión es construir una aplicación web donde un agente de IA conversa conmigo, entiende qué video quiero, y **produce el video completo de principio a fin**: guion, tomas generadas en múltiples servicios de video, voz en off, subtítulos con estilo a elegir, y montaje final — manteniendo consistencia visual absoluta entre todas las tomas, sobre cualquier tema que yo pida.

Trabajas con arquitectura multi-agente: tú orquestas y creas subagentes especializados (Task tool) para terminar el trabajo en paralelo.

---

## 2. VISIÓN DEL PRODUCTO

**Historia de usuario central:**
> "Le digo al agente: *hazme un video de 60 segundos en formato TikTok sobre la ciencia del sueño, estilo cinemático cálido, voz masculina mexicana, subtítulos tipo karaoke*. El agente me hace 3–4 preguntas, me muestra el guion, lo apruebo, y minutos después tengo un MP4 con 8 tomas que parecen filmadas el mismo día, con voz y subtítulos perfectamente sincronizados. El estilo queda guardado para reutilizarlo en el próximo video."

Pilares no negociables:
1. **Consistencia**: ninguna toma se genera sin el "ADN de Estilo" (sección 5).
2. **Costo cero primero**: servicios gratuitos / free tiers / modelos locales antes que nada de pago.
3. **El agente pregunta**: checkpoints de aprobación humana en los puntos clave.
4. **Todo se guarda**: prompts exactos, seeds, versiones de estilo → reproducibilidad total.
5. **UI que no parece genérica**: construida con los 5 skills de diseño de la sección 11.

---

## 3. STACK TECNOLÓGICO

| Capa | Tecnología | Por qué |
|---|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui | Streaming del chat, ecosistema compatible con los 5 skills |
| Cerebro de agentes | API de Anthropic (Claude) con tool use | Orquestación multi-agente, entrevista, guiones, prompts |
| Colas de trabajo | Redis + BullMQ (worker Node) | Los renders tardan minutos; nunca bloquear una request HTTP |
| Motor de media | Servicio Python (FastAPI): `faster-whisper`, `edge-tts`, FFmpeg | Mejor ecosistema para audio, subtítulos y montaje |
| Base de datos | PostgreSQL + Prisma (JSONB para el ADN de Estilo) | Relacional + flexible |
| Storage | Disco local `/storage` en MVP → S3-compatible (Cloudflare R2) después | Costo cero primero |
| Tiempo real | Server-Sent Events | Progreso de generación y render en vivo en la UI |

Estructura de monorepo:
```
/apps/web            → Next.js (UI + API routes + agentes)
/apps/media-engine   → FastAPI (TTS, Whisper, FFmpeg)
/packages/providers  → Adaptadores de servicios de video
/packages/shared     → Tipos, esquemas Zod
/storage             → Assets generados
docker-compose.yml   → Postgres + Redis + media-engine
```

---

## 4. ARQUITECTURA MULTI-AGENTE

| Agente | Responsabilidad |
|---|---|
| 🎬 **Director (Orquestador)** | Descompone el pedido, delega, supervisa, decide reintentos y fallbacks, **crea subagentes** |
| 🗣️ **Entrevistador** | Hace las preguntas de la sección 12, confirma el brief antes de producir |
| ✍️ **Guionista** | Escribe guion + narración; divide en escenas de 5–10 s con descripción visual de cada toma |
| 🧬 **Guardián de Estilo** | Crea y versiona el ADN de Estilo, lo inyecta en cada prompt, vigila el drift visual |
| 🧠 **Ingeniero de Prompts** | Traduce cada escena al "dialecto" óptimo de cada proveedor de video |
| 🎥 **Generador** | Llama a los adaptadores, gestiona colas, reintentos y cambio de proveedor |
| 🎙️ **Voz y Subtítulos** | TTS, alineación palabra-por-palabra con Whisper, render de subtítulos ASS |
| ✂️ **Editor** | FFmpeg: concatenación, transiciones, mezcla de audio, normalización de loudness |
| 🔍 **QA** | Compara frames contra el ADN, verifica sincronía audio/subtítulos, ordena regeneraciones |

**Reglas de creación de subagentes (escalado dinámico):**
- El Director lanza subagentes en paralelo cuando hay **más de 3 escenas** por generar o una tarea especializada larga (QA de todas las tomas, prompts de todas las escenas).
- Cada subagente recibe SIEMPRE: el ADN de Estilo completo + el brief de su escena + criterios de aceptación.
- Los subagentes reportan al Director en JSON estándar: `{escena_id, estado, archivo, prompt_usado, seed, proveedor, notas_qa}`.
- Si un subagente falla 2 veces, el Director toma la tarea o cambia la estrategia; nunca se queda esperando.

---

## 5. ADN DE ESTILO — EL PROMPT MAESTRO PERSISTENTE

Es el corazón del sistema: un documento versionado en Postgres (JSONB) que garantiza que las 10 tomas de un video (o los 20 videos de una serie) se vean del mismo mundo.

```json
{
  "id": "adn_0001",
  "nombre": "Cinemático cálido",
  "version": 3,
  "prompt_base": "cinematic film still, 35mm lens, shallow depth of field, warm golden-hour light, subtle film grain, muted teal shadows",
  "negative_prompt": "deformed hands, extra fingers, text, watermark, logo, blurry, low quality, morphing",
  "personajes": [
    {
      "nombre": "Nova",
      "descripcion_bloqueada": "young woman, 25, short black hair with blunt bangs, red bomber jacket over white tee, silver hoop earrings",
      "imagen_referencia": "storage/adn_0001/nova_ref.png",
      "seed": 44821
    }
  ],
  "paleta": ["#E86A33", "#1B2A41", "#F2E8CF"],
  "camara": "handheld sutil, ojos en el tercio superior del encuadre",
  "iluminacion": "golden hour lateral con contraluz suave",
  "ritmo": "cortes cada 2-4 s, transición por corte seco",
  "voz_default": "es-MX-JorgeNeural",
  "preset_subtitulos_default": "impacto_tiktok",
  "notas_continuidad": "el reloj de Nova siempre visible en planos medios"
}
```

**Reglas duras del ADN:**
1. Se crea en la conversación inicial de estilo (o se elige uno existente de la biblioteca).
2. Cada cambio = **nueva versión**; nunca se sobrescribe (rollback siempre posible).
3. Se inyecta **íntegro** en el prompt de cada escena. Sin ADN no hay generación.
4. `descripcion_bloqueada` de personajes se copia **literal, palabra por palabra** — jamás se parafrasea.
5. El ADN se puede exportar/importar como JSON para compartir estilos entre proyectos.

---

## 6. PIPELINE DE PRODUCCIÓN END-TO-END

```
Idea → 1.Entrevista → 2.Guion ✅ → 3.Storyboard → 4.ADN de Estilo ✅
     → 5.Prompts por escena → 6.Generación paralela (con fallback)
     → 7.QA visual → 8.TTS + Subtítulos → 9.Montaje FFmpeg
     → 10.Toma de prueba / Revisión final ✅ → Export (9:16, 16:9, 1:1)
```
Los ✅ son **checkpoints de aprobación humana**: guion, ADN de estilo, y render final (más un clip de prueba de la primera escena antes de gastar cuota en todas). El usuario puede activar "modo autónomo" para saltarlos.

---

## 7. REGLAS DE CONSISTENCIA MULTI-TOMA (no negociables)

1. Escenas de **5–10 segundos** (límite real de los generadores actuales); videos largos = cadena de escenas.
2. **Encadenamiento por último frame**: extrae el frame final de la toma N (FFmpeg) y úsalo como imagen de referencia (image-to-video) para la toma N+1 en proveedores que lo soporten. Es la técnica #1 para no perder el hilo.
3. **Mismo seed** cuando el proveedor lo permita.
4. Prompt de escena = `prompt_base del ADN` + `descripcion_bloqueada de personajes presentes` + `acción específica de la escena` + `negative_prompt`. Nada más, nada menos.
5. El QA compara paleta dominante y presencia del personaje entre tomas consecutivas; si detecta drift → regenerar (máx. 3 intentos) → si persiste, escalar al usuario con opciones.
6. En DB queda registrado por toma: prompt exacto enviado, seed, proveedor, versión del ADN, nº de intento.
7. Si hay cambio de proveedor a mitad de video (fallback), el Ingeniero de Prompts re-adapta el prompt pero el ADN permanece idéntico.

---

## 8. CONECTORES DE SERVICIOS DE VIDEO (patrón adaptador)

Interfaz común que TODO proveedor implementa:

```typescript
interface VideoProvider {
  id: string;
  capacidades: {
    textToVideo: boolean;
    imageToVideo: boolean;      // clave para la continuidad
    duracionMaxSeg: number;
    soportaSeed: boolean;
    formatos: ("9:16" | "16:9" | "1:1")[];
  };
  generar(req: SolicitudEscena): Promise<JobId>;
  estado(jobId: JobId): Promise<"cola" | "procesando" | "listo" | "error">;
  descargar(jobId: JobId): Promise<RutaArchivo>;
  cuotaRestante(): Promise<number>;
}
```

**Candidatos a integrar** (⚠️ regla de oro: antes de implementar cada adaptador, VERIFICA con búsqueda web el free tier vigente — cambian cada mes):

| Proveedor | Acceso | Nota |
|---|---|---|
| Higgsfield | MCP / API | Ya tengo cuenta y experiencia con él — empezar por aquí |
| fal.ai | API | Créditos gratis iniciales; expone Kling, LTX-Video, Wan, MiniMax |
| Replicate | API | Créditos iniciales; Wan 2.x, HunyuanVideo, LTX-Video |
| Hugging Face Inference | API | Cuota gratuita limitada; LTX-Video, AnimateDiff |
| Pollinations.ai | API abierta | Sin API key; verificar soporte de video vigente |
| ComfyUI local (opcional) | Local | 100% gratis con GPU propia; Wan/LTX locales |

**Selector inteligente:** elige proveedor por capacidades requeridas (¿necesito image-to-video?) + cuota restante + tasa de éxito histórica. Si un proveedor falla 2 veces o agota cuota → pasa al siguiente automáticamente con el prompt re-adaptado. Las credenciales viven en `.env` y en la tabla `providers` (nunca en el código).

---

## 9. VOZ Y SUBTÍTULOS

**Voz (TTS), en orden de preferencia:**
1. `edge-tts` — gratis, voces neuronales excelentes en español (es-MX, es-CO, es-ES, es-AR…).
2. Kokoro / Piper — open source, local, sin límites.
3. (Opcional, config del usuario) ElevenLabs free tier.

El usuario elige la voz **escuchando previews** de 3 s generados al vuelo. Controles: velocidad, tono, pausas.

**Subtítulos:**
- `faster-whisper` sobre el audio TTS → timestamps **palabra por palabra**.
- Render en formato **ASS** (estilos avanzados) quemado con FFmpeg, o export SRT/VTT suave.

**Presets de estilo (el usuario elige con vista previa en video real):**

| Preset | Look |
|---|---|
| `impacto_tiktok` | Palabra por palabra, bold gigante, blanco/amarillo con borde negro, animación pop |
| `karaoke` | Frase visible, palabra activa resaltada en color progresivo |
| `minimal` | Línea inferior, blanco, sombra suave, tipografía limpia |
| `neon` | Glow de color, ideal gaming/tech |
| `documental` | Tercio inferior, serif elegante, fondo semitransparente |

Además: **editor de presets propios** (fuente, tamaño, colores, borde, posición, animación de entrada) con preview en vivo, guardados en `subtitle_presets`.

---

## 10. MODELO DE DATOS (PostgreSQL + Prisma)

Tablas mínimas:
- `users` — auth básica.
- `projects` — título, tema, formato, duración objetivo, estado, `adn_id` + versión usada.
- `style_dna` — el ADN (JSONB) con versionado (`id`, `version`, `parent_version`).
- `scripts` — guion aprobado, narración, historial de revisiones.
- `scenes` — orden, descripción visual, duración, texto de narración asociado.
- `takes` — intentos de generación por escena: prompt exacto, seed, proveedor, estado, archivo, notas QA.
- `assets` — videos, audios, frames de referencia, subtítulos, con rutas y checksums.
- `render_jobs` — cola: tipo (generar/tts/subs/montaje), estado, progreso, error.
- `providers` + `provider_quota` — credenciales cifradas, cuota restante, tasa de éxito.
- `subtitle_presets` y `voices` — catálogos elegibles por el usuario.
- `agent_logs` — cada decisión de cada agente, estructurada (trazabilidad total).

---

## 11. INTERFAZ WEB — LOS 5 SKILLS DE DISEÑO (OBLIGATORIOS)

Antes de escribir **el primer componente de UI**, instala los 5 skills y lee su SKILL.md. Si algún comando cambió, busca el repo oficial en GitHub por el nombre exacto antes de continuar:

```bash
# 1. frontend-design (Anthropic) — viene integrado en Claude Code; verifica con /skills

# 2. UI UX Pro Max (nextlevelbuilder)
/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
/plugin install ui-ux-pro-max@ui-ux-pro-max-skill

# 3. emil-design-eng (Emil Kowalski)
npx skills add https://github.com/emilkowalski/skill --skill emil-design-eng

# 4. huashu-design (alchaincyf)
npx -y skills add alchaincyf/huashu-design --skill huashu-design --agent claude-code

# 5. web-design-guidelines (Vercel)
npx skills add vercel-labs/web-interface-guidelines
```

**División del trabajo entre los 5:**
1. **ui-ux-pro-max** → al iniciar la UI, genera el design system completo (estilo, paleta, tipografías, reglas UX) para "estudio de producción de video con IA".
2. **frontend-design** → dirección estética durante la construcción: tipografía con carácter, un elemento firma, PROHIBIDO el look genérico de IA (crema + serif + terracota, o dark + verde ácido).
3. **emil-design-eng** → toda animación pasa por él: transiciones de página, micro-interacciones, estados de carga de render (que esperar un video se sienta bien).
4. **huashu-design** → prototipos clickeables de cada pantalla ANTES de codificarla; te muestro 2–3 direcciones y elijo.
5. **web-design-guidelines** → auditoría final de cada pantalla contra sus 100+ reglas; se corrige todo hallazgo crítico (accesibilidad, foco, formularios) antes de dar la pantalla por terminada.

**Pantallas de la app:**
1. **Dashboard** — proyectos + cola de render en vivo (SSE).
2. **Estudio** — chat con el Director + panel lateral con el brief construyéndose en tiempo real.
3. **Storyboard** — tarjetas por escena con estado (pendiente / generando / QA / lista), preview y botón "regenerar esta toma".
4. **Biblioteca de ADN** — tarjetas visuales de estilos guardados, versiones, exportar/importar.
5. **Voz y subtítulos** — selector con previews reales de audio y video.
6. **Sala de montaje** — timeline simple: reordenar tomas, cambiar transiciones, regenerar una sola toma sin tocar el resto.
7. **Export** — 9:16 / 16:9 / 1:1, con o sin subtítulos quemados.

---

## 12. FLUJO CONVERSACIONAL — LA ENTREVISTA

El Entrevistador SIEMPRE pregunta (máximo 2 preguntas por turno, con opciones tocables cuando aplique):
1. Tema y objetivo del video (informar, vender, entretener…).
2. Duración objetivo y plataforma (9:16 TikTok/Shorts, 16:9 YouTube, 1:1).
3. Idioma y voz (con previews de audio).
4. Estilo visual: ¿creamos un ADN nuevo o usamos uno de la biblioteca?
5. Preset de subtítulos (con previews).
6. ¿Música de fondo? ¿CTA o logo al final?
7. Nivel de autonomía: "pregúntame en cada checkpoint" o "modo autónomo, muéstrame solo el resultado".

Si ya respondí algo en el pedido inicial, **no lo vuelve a preguntar**.

---

## 13. REGLAS DE ORO DEL SISTEMA

1. Nunca asumas que un servicio tiene API gratuita: **verifícalo con búsqueda web** antes de integrarlo.
2. Todo prompt enviado a cualquier proveedor queda guardado en DB.
3. El ADN de Estilo manda: ningún agente lo modifica sin crear nueva versión.
4. Costo cero primero: agota opciones gratuitas/locales antes de sugerir algo de pago (y si lo sugieres, dime el costo).
5. Los trabajos largos van a la cola (BullMQ); ninguna request HTTP espera un render.
6. Cada agente escribe en `agent_logs`: qué decidió y por qué.
7. TypeScript estricto, Zod en todas las fronteras, commits atómicos por fase.
8. Si algo falla 3 veces, no insistas en silencio: repórtame el problema con opciones.

---

## 14. PLAN DE FASES

| Fase | Entregable | Criterio de aceptación |
|---|---|---|
| **0 — Fundaciones** | Monorepo, Next.js + Prisma + Postgres, Redis + BullMQ, media-engine con FFmpeg, los 5 skills instalados | `docker compose up` levanta todo; healthchecks en verde |
| **1 — Cerebro** | Chat Entrevistador + Guionista + storyboard persistido | De una idea sale un guion aprobado con escenas en DB |
| **2 — Primer video real** | ADN de Estilo + 1 adaptador funcionando (empezar por Higgsfield o fal.ai según credenciales) | Una escena generada end-to-end respetando el ADN |
| **3 — Audio y subtítulos** | edge-tts + faster-whisper + presets ASS + burn-in FFmpeg + selector con previews | Escena con voz y subtítulos sincronizados palabra a palabra |
| **4 — Escala y consistencia** | Multi-proveedor con fallback, subagentes en paralelo, encadenamiento último-frame, QA automático | Video de 60 s / 6+ tomas consistente, generado sin intervención |
| **5 — Producto** | UI completa pulida con los 5 skills, biblioteca de ADN, sala de montaje, export | Auditoría de web-design-guidelines sin hallazgos críticos |

---

## 15. CRITERIOS DE ACEPTACIÓN FINALES

- [ ] Pido "video de 60 s sobre X" y recibo un MP4 con voz y subtítulos tocando solo los checkpoints.
- [ ] Un video de 6+ tomas mantiene personaje, paleta y estilo sin drift visible.
- [ ] El ADN de Estilo queda guardado, versionado y reutilizable en otro proyecto.
- [ ] Si un proveedor falla o agota cuota, el sistema cambia a otro sin perder el estilo.
- [ ] Elijo voz y estilo de subtítulos con vista previa real antes de renderizar.
- [ ] Puedo regenerar UNA toma sin tocar el resto del video.
- [ ] La UI no parece hecha por IA genérica (los 5 skills aplicados y auditados).

---

## 16. PRIMERA INSTRUCCIÓN

> Confirma en 5 líneas que entendiste la arquitectura. Luego pregúntame: (a) qué credenciales de proveedores de video tengo hoy, (b) si tengo GPU local, y (c) nombre definitivo del proyecto. Con esas respuestas, ejecuta la **Fase 0** completa y muéstrame el resultado antes de pasar a la Fase 1.
