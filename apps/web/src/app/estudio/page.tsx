"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type {
  Brief,
  ChatMessage,
  EscenaGuion,
  GuionSalida,
  RespuestaEntrevistador,
} from "@santuario/shared";
import { Panel, Eyebrow } from "@/components/ui/panel";
import { Boton } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import { cn } from "@/lib/utils";

type Fase = "entrevista" | "revision_guion" | "adn" | "listo";

interface EscenaPersistida {
  id: string;
  orden: number;
  descripcionVisual: string;
  duracionSeg: number;
}

interface TakeEstado {
  id: string;
  estado: string;
  archivo: string | null;
  notasQa: string;
}

interface Voz {
  id: string;
  nombre: string;
  idioma: string;
  voiceId: string;
}

interface SubtitlePresetInfo {
  id: string;
  nombre: string;
  config: { descripcion?: string };
}

interface RenderJobEstado {
  id: string;
  estado: string;
  progreso: number;
  error: string | null;
  url: string | null;
}

export default function EstudioPage() {
  const [fase, setFase] = useState<Fase>("entrevista");
  const [historial, setHistorial] = useState<ChatMessage[]>([]);
  const [brief, setBrief] = useState<Brief>({});
  const [opciones, setOpciones] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [guion, setGuion] = useState<GuionSalida | null>(null);
  const [resultado, setResultado] = useState<{
    projectId: string;
    escenas: EscenaPersistida[];
  } | null>(null);

  const [descripcionEstilo, setDescripcionEstilo] = useState("");
  const [adn, setAdn] = useState<{ id: string; nombre: string } | null>(null);
  const [take, setTake] = useState<TakeEstado | null>(null);

  const [voces, setVoces] = useState<Voz[]>([]);
  const [presets, setPresets] = useState<SubtitlePresetInfo[]>([]);
  const [vozElegida, setVozElegida] = useState<string>("");
  const [presetElegido, setPresetElegido] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewCargando, setPreviewCargando] = useState(false);
  const [renderJob, setRenderJob] = useState<RenderJobEstado | null>(null);

  useEffect(() => {
    fetch("/api/voces")
      .then((r) => r.json())
      .then((d) => {
        setVoces(d.voces ?? []);
        if (d.voces?.[0]) setVozElegida(d.voces[0].voiceId);
      })
      .catch(() => {});
    fetch("/api/subtitulos/presets")
      .then((r) => r.json())
      .then((d) => {
        setPresets(d.presets ?? []);
        if (d.presets?.[0]) setPresetElegido(d.presets[0].nombre);
      })
      .catch(() => {});
  }, []);

  async function previsualizarVoz() {
    if (!vozElegida) return;
    setPreviewCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/voces/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId: vozElegida }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      const data: { url: string } = await res.json();
      setPreviewUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPreviewCargando(false);
    }
  }

  async function aplicarVozYSubtitulos() {
    if (!take || take.estado !== "listo") return;
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/escenas/${sceneIdDeTake()}/audio-subtitulos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId: vozElegida, preset: presetElegido }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      const data: { renderJob: RenderJobEstado } = await res.json();
      setRenderJob(data.renderJob);
      pollRenderJob(data.renderJob.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCargando(false);
    }
  }

  function sceneIdDeTake(): string {
    const primeraEscena = [...(resultado?.escenas ?? [])].sort(
      (a, b) => a.orden - b.orden
    )[0];
    return primeraEscena?.id ?? "";
  }

  function pollRenderJob(id: string) {
    const intervalo = setInterval(async () => {
      const res = await fetch(`/api/render-jobs/${id}`);
      if (!res.ok) return;
      const data: { renderJob: RenderJobEstado } = await res.json();
      setRenderJob(data.renderJob);
      if (data.renderJob.estado === "listo" || data.renderJob.estado === "error") {
        clearInterval(intervalo);
      }
    }, 4000);
  }

  async function enviarTurno(texto: string) {
    const nuevoHistorial: ChatMessage[] = [
      ...historial,
      { role: "user", content: texto },
    ];
    setHistorial(nuevoHistorial);
    setInput("");
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/entrevista", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historial: nuevoHistorial, briefActual: brief }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      const data: RespuestaEntrevistador = await res.json();
      setHistorial([
        ...nuevoHistorial,
        { role: "assistant", content: data.mensaje },
      ]);
      setBrief(data.briefParcial);
      setOpciones(data.opciones);
      if (data.completo) setFase("revision_guion");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCargando(false);
    }
  }

  async function generarGuion() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/guion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brief),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      const data: { guion: GuionSalida } = await res.json();
      setGuion(data.guion);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCargando(false);
    }
  }

  async function aprobarGuion() {
    if (!guion) return;
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/guion/aprobar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, guion }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      const data = await res.json();
      setResultado({ projectId: data.project.id, escenas: data.scenes });
      setFase("adn");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCargando(false);
    }
  }

  async function crearADN() {
    if (!descripcionEstilo.trim()) return;
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/adn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descripcionEstilo, projectId: resultado?.projectId }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      const data = await res.json();
      setAdn({ id: data.adn.id, nombre: data.adn.nombre });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCargando(false);
    }
  }

  async function generarTomaPrueba() {
    if (!adn || !resultado) return;
    const primeraEscena = [...resultado.escenas].sort((a, b) => a.orden - b.orden)[0];
    if (!primeraEscena) return;
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/escenas/${primeraEscena.id}/generar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adnId: adn.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      const data: { take: TakeEstado } = await res.json();
      setTake(data.take);
      pollTake(data.take.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCargando(false);
    }
  }

  function pollTake(takeId: string) {
    const intervalo = setInterval(async () => {
      const res = await fetch(`/api/takes/${takeId}`);
      if (!res.ok) return;
      const data: { take: TakeEstado } = await res.json();
      setTake(data.take);
      if (data.take.estado === "listo" || data.take.estado === "error") {
        clearInterval(intervalo);
      }
    }, 4000);
  }

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-6 py-10 md:grid-cols-[1fr_300px]">
      <section className="flex flex-col gap-4">
        <header>
          <Eyebrow>Estudio</Eyebrow>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Nuevo video
          </h1>
        </header>

        {fase === "entrevista" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              {historial.length === 0 && (
                <p className="text-sm text-ink-muted">
                  Contame qué video querés hacer (tema, duración, plataforma,
                  lo que ya sepas — no te lo voy a volver a preguntar).
                </p>
              )}
              {historial.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm",
                    m.role === "user"
                      ? "self-end bg-tungsteno/15 text-ink"
                      : "self-start bg-canvas-raised text-ink"
                  )}
                >
                  {m.content}
                </div>
              ))}
            </div>

            {opciones.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {opciones.map((op) => (
                  <button
                    key={op}
                    onClick={() => enviarTurno(op)}
                    disabled={cargando}
                    className="rounded-full border border-line px-3 py-1.5 text-sm text-ink-muted transition-colors hover:border-ink-faint hover:text-ink disabled:opacity-40"
                  >
                    {op}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (input.trim()) enviarTurno(input.trim());
              }}
              className="flex gap-2"
            >
              <label htmlFor="chat-input" className="sr-only">
                Tu respuesta
              </label>
              <input
                id="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={cargando}
                placeholder="Escribí tu respuesta…"
                className="flex-1 rounded-lg border border-line bg-transparent px-3 py-2 text-base"
              />
              <Boton type="submit" disabled={cargando || !input.trim()}>
                Enviar
              </Boton>
            </form>
          </div>
        )}

        {fase === "revision_guion" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-muted">
              Brief completo. Generá el guion propuesto para aprobarlo.
            </p>
            {!guion && (
              <Boton onClick={generarGuion} disabled={cargando} className="w-fit">
                {cargando ? "Generando guion…" : "Generar guion"}
              </Boton>
            )}
            {guion && (
              <div className="flex flex-col gap-4">
                <h2 className="font-display text-xl font-medium">{guion.titulo}</h2>
                <Panel>
                  <pre className="whitespace-pre-wrap font-mono text-xs text-ink-muted">
                    {guion.guion}
                  </pre>
                </Panel>
                <div className="flex flex-col gap-2">
                  {guion.escenas.map((escena: EscenaGuion) => (
                    <Panel key={escena.orden} className="p-3">
                      <p className="font-mono text-[11px] text-ink-faint">
                        Escena {escena.orden + 1} · {escena.duracionSeg}s
                      </p>
                      <p className="text-sm">{escena.descripcionVisual}</p>
                    </Panel>
                  ))}
                </div>
                <Boton onClick={aprobarGuion} disabled={cargando} className="w-fit">
                  {cargando ? "Guardando…" : "Aprobar guion"}
                </Boton>
              </div>
            )}
          </div>
        )}

        {fase === "adn" && resultado && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-muted">
              Storyboard guardado con {resultado.escenas.length} escenas. Ahora
              creá el ADN de Estilo — sin ADN no hay generación.
            </p>

            {!adn && (
              <Panel className="flex flex-col gap-3 sm:flex-row">
                <label htmlFor="descripcion-estilo" className="sr-only">
                  Descripción del estilo
                </label>
                <input
                  id="descripcion-estilo"
                  value={descripcionEstilo}
                  onChange={(e) => setDescripcionEstilo(e.target.value)}
                  disabled={cargando}
                  placeholder="Describí el look: ej. cinemático cálido, luz dorada, grano sutil…"
                  className="flex-1 rounded-lg border border-line bg-transparent px-3 py-2 text-base"
                />
                <Boton onClick={crearADN} disabled={cargando || !descripcionEstilo.trim()}>
                  {cargando ? "Creando…" : "Crear ADN"}
                </Boton>
              </Panel>
            )}

            {adn && !take && (
              <Panel className="flex flex-col gap-3">
                <p className="text-sm">
                  ADN <strong className="font-medium">{adn.nombre}</strong> creado
                  (versión 1).
                </p>
                <Boton onClick={generarTomaPrueba} disabled={cargando} className="w-fit">
                  {cargando ? "Enviando…" : "Generar toma de prueba (escena 1)"}
                </Boton>
              </Panel>
            )}

            {take && (
              <Panel>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-ink-faint">{take.id}</span>
                  <StatusDot estado={take.estado} />
                </div>
                {take.estado === "error" && (
                  <p className="mt-2 text-sm text-error">{take.notasQa}</p>
                )}
              </Panel>
            )}

            {take?.estado === "listo" && !renderJob && (
              <Panel className="flex flex-col gap-4">
                <h3 className="font-display text-base font-medium">Voz y subtítulos</h3>

                <div className="flex flex-col gap-2">
                  <label htmlFor="select-voz" className="text-sm text-ink-muted">
                    Voz
                  </label>
                  <div className="flex gap-2">
                    <select
                      id="select-voz"
                      value={vozElegida}
                      onChange={(e) => setVozElegida(e.target.value)}
                      className="flex-1 rounded-lg border border-line bg-transparent px-3 py-2 text-base"
                    >
                      {voces.map((v) => (
                        <option key={v.id} value={v.voiceId} className="bg-canvas">
                          {v.nombre}
                        </option>
                      ))}
                    </select>
                    <Boton
                      variante="secundaria"
                      onClick={previsualizarVoz}
                      disabled={previewCargando || !vozElegida}
                    >
                      {previewCargando ? "Generando…" : "Escuchar preview"}
                    </Boton>
                  </div>
                  {previewUrl && (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <audio controls src={previewUrl} className="w-full" />
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="select-preset" className="text-sm text-ink-muted">
                    Preset de subtítulos
                  </label>
                  <select
                    id="select-preset"
                    value={presetElegido}
                    onChange={(e) => setPresetElegido(e.target.value)}
                    className="rounded-lg border border-line bg-transparent px-3 py-2 text-base"
                  >
                    {presets.map((p) => (
                      <option key={p.id} value={p.nombre} className="bg-canvas">
                        {p.nombre} — {p.config.descripcion}
                      </option>
                    ))}
                  </select>
                </div>

                <Boton
                  onClick={aplicarVozYSubtitulos}
                  disabled={cargando || !vozElegida || !presetElegido}
                  className="w-fit"
                >
                  {cargando ? "Enviando…" : "Aplicar voz y subtítulos"}
                </Boton>
              </Panel>
            )}

            {renderJob && (
              <Panel className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-ink-faint">{renderJob.id}</span>
                  <StatusDot estado={renderJob.estado === "listo" ? "listo" : renderJob.estado} />
                </div>
                {renderJob.estado === "listo" && renderJob.url && (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video controls src={renderJob.url} className="max-w-xs rounded-lg" />
                )}
                {renderJob.estado === "error" && (
                  <p className="text-sm text-error">{renderJob.error}</p>
                )}
                {resultado && (
                  <Link href={`/proyectos/${resultado.projectId}`} className="w-fit">
                    <Boton variante="secundaria">Ver proyecto completo</Boton>
                  </Link>
                )}
              </Panel>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}
      </section>

      <aside>
        <Panel>
          <Eyebrow className="mb-3">Brief</Eyebrow>
          <dl className="flex flex-col gap-2.5 text-sm">
            {Object.entries(brief).map(([k, v]) => (
              <div key={k}>
                <dt className="font-mono text-[11px] text-ink-faint">{k}</dt>
                <dd>{String(v)}</dd>
              </div>
            ))}
            {Object.keys(brief).length === 0 && (
              <p className="text-ink-faint">Aún vacío</p>
            )}
          </dl>
        </Panel>
      </aside>
    </div>
  );
}
