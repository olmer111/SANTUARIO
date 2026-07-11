"use client";

import { useState } from "react";
import type {
  Brief,
  ChatMessage,
  EscenaGuion,
  GuionSalida,
  RespuestaEntrevistador,
} from "@santuario/shared";

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
      setResultado({
        projectId: data.project.id,
        escenas: data.scenes,
      });
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
        body: JSON.stringify({ descripcionEstilo }),
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
    const primeraEscena = [...resultado.escenas].sort(
      (a, b) => a.orden - b.orden
    )[0];
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
    <main className="mx-auto grid min-h-dvh max-w-5xl grid-cols-1 gap-8 px-6 py-10 md:grid-cols-[1fr_320px]">
      <section className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Estudio</h1>

        {fase === "entrevista" && (
          <>
            <div className="flex flex-col gap-3">
              {historial.length === 0 && (
                <p className="text-muted">
                  Contame qué video querés hacer (tema, duración, plataforma,
                  lo que ya sepas — no te lo voy a volver a preguntar).
                </p>
              )}
              {historial.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.role === "user"
                      ? "self-end rounded-lg bg-accent/20 px-3 py-2"
                      : "self-start rounded-lg bg-white/5 px-3 py-2"
                  }
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
                    className="rounded-full border border-white/20 px-3 py-1 text-sm hover:bg-white/10"
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
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={cargando}
                placeholder="Escribí tu respuesta…"
                className="flex-1 rounded-lg border border-white/20 bg-transparent px-3 py-2"
              />
              <button
                type="submit"
                disabled={cargando || !input.trim()}
                className="rounded-lg bg-accent px-4 py-2 font-medium disabled:opacity-50"
              >
                Enviar
              </button>
            </form>
          </>
        )}

        {fase === "revision_guion" && (
          <div className="flex flex-col gap-4">
            <p className="text-muted">
              Brief completo. Generá el guion propuesto para aprobarlo.
            </p>
            {!guion && (
              <button
                onClick={generarGuion}
                disabled={cargando}
                className="w-fit rounded-lg bg-accent px-4 py-2 font-medium disabled:opacity-50"
              >
                {cargando ? "Generando guion…" : "Generar guion"}
              </button>
            )}
            {guion && (
              <div className="flex flex-col gap-4">
                <h2 className="text-xl font-semibold">{guion.titulo}</h2>
                <pre className="whitespace-pre-wrap rounded-lg bg-white/5 p-3 text-sm">
                  {guion.guion}
                </pre>
                <div className="flex flex-col gap-2">
                  {guion.escenas.map((escena: EscenaGuion) => (
                    <div
                      key={escena.orden}
                      className="rounded-lg border border-white/10 p-3 text-sm"
                    >
                      <p className="font-mono text-xs text-muted">
                        Escena {escena.orden + 1} · {escena.duracionSeg}s
                      </p>
                      <p>{escena.descripcionVisual}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={aprobarGuion}
                  disabled={cargando}
                  className="w-fit rounded-lg bg-accent px-4 py-2 font-medium disabled:opacity-50"
                >
                  {cargando ? "Guardando…" : "Aprobar guion"}
                </button>
              </div>
            )}
          </div>
        )}

        {fase === "adn" && resultado && (
          <div className="flex flex-col gap-4">
            <p className="text-muted">
              Storyboard guardado — proyecto{" "}
              <code className="font-mono">{resultado.projectId}</code> con{" "}
              {resultado.escenas.length} escenas. Ahora creá el ADN de Estilo
              (obligatorio: sin ADN no hay generación).
            </p>

            {!adn && (
              <div className="flex gap-2">
                <input
                  value={descripcionEstilo}
                  onChange={(e) => setDescripcionEstilo(e.target.value)}
                  disabled={cargando}
                  placeholder="Describí el look: ej. cinemático cálido, luz dorada, grano sutil…"
                  className="flex-1 rounded-lg border border-white/20 bg-transparent px-3 py-2"
                />
                <button
                  onClick={crearADN}
                  disabled={cargando || !descripcionEstilo.trim()}
                  className="rounded-lg bg-accent px-4 py-2 font-medium disabled:opacity-50"
                >
                  {cargando ? "Creando…" : "Crear ADN"}
                </button>
              </div>
            )}

            {adn && !take && (
              <div className="flex flex-col gap-2">
                <p>
                  ADN <strong>{adn.nombre}</strong> creado (versión 1).
                </p>
                <button
                  onClick={generarTomaPrueba}
                  disabled={cargando}
                  className="w-fit rounded-lg bg-accent px-4 py-2 font-medium disabled:opacity-50"
                >
                  {cargando ? "Enviando…" : "Generar toma de prueba (escena 1)"}
                </button>
              </div>
            )}

            {take && (
              <div className="rounded-lg border border-white/10 p-4">
                <p className="font-mono text-sm">
                  Take <code>{take.id}</code> — estado: <strong>{take.estado}</strong>
                </p>
                {take.estado === "listo" && take.archivo && (
                  <p className="mt-2 text-sm text-muted">Archivo: {take.archivo}</p>
                )}
                {take.estado === "error" && (
                  <p className="mt-2 text-sm text-red-400">{take.notasQa}</p>
                )}
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}
      </section>

      <aside className="rounded-lg border border-white/10 p-4">
        <h2 className="mb-3 text-sm font-semibold tracking-widest text-muted">
          BRIEF
        </h2>
        <dl className="flex flex-col gap-2 text-sm">
          {Object.entries(brief).map(([k, v]) => (
            <div key={k}>
              <dt className="text-muted">{k}</dt>
              <dd>{String(v)}</dd>
            </div>
          ))}
          {Object.keys(brief).length === 0 && (
            <p className="text-muted">Aún vacío</p>
          )}
        </dl>
      </aside>
    </main>
  );
}
