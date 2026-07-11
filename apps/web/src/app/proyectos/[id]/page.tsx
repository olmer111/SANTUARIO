"use client";

import { use, useEffect, useState } from "react";
import { StatusDot } from "@/components/ui/status-dot";
import { Panel, PanelHeader, Eyebrow } from "@/components/ui/panel";
import { Boton } from "@/components/ui/button";

interface Take {
  id: string;
  estado: string;
  archivo: string | null;
  url: string | null;
  notasQa: string;
  proveedor: string;
  seed: number | null;
  intento: number;
}

interface Scene {
  id: string;
  orden: number;
  descripcionVisual: string;
  duracionSeg: number;
  estado: string;
  takes: Take[];
}

interface Project {
  id: string;
  titulo: string;
  tema: string;
  formato: string;
  estado: string;
  adn: { id: string; nombre: string; version: number } | null;
  scenes: Scene[];
  assets: { id: string; url: string | null }[];
  renderJobs: { id: string; tipo: string; estado: string; progreso: number; error: string | null }[];
}

export default function ProyectoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generandoTodo, setGenerandoTodo] = useState(false);
  const [regenerandoEscena, setRegenerandoEscena] = useState<string | null>(null);

  async function cargar() {
    const res = await fetch(`/api/proyectos/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setProject(data.project);
  }

  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, 4000);
    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function moverEscena(sceneId: string, direccion: -1 | 1) {
    if (!project) return;
    const escenas = [...project.scenes].sort((a, b) => a.orden - b.orden);
    const i = escenas.findIndex((s) => s.id === sceneId);
    const j = i + direccion;
    if (i < 0 || j < 0 || j >= escenas.length) return;
    const a = escenas[i];
    const b = escenas[j];
    if (!a || !b) return;
    escenas[i] = b;
    escenas[j] = a;

    const res = await fetch(`/api/proyectos/${id}/reordenar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sceneIds: escenas.map((s) => s.id) }),
    });
    if (res.ok) cargar();
  }

  async function regenerarEscena(sceneId: string) {
    if (!project?.adn) return;
    setRegenerandoEscena(sceneId);
    setError(null);
    try {
      const res = await fetch(`/api/escenas/${sceneId}/generar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adnId: project.adn.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRegenerandoEscena(null);
    }
  }

  async function generarTodo() {
    setGenerandoTodo(true);
    setError(null);
    try {
      const res = await fetch(`/api/proyectos/${id}/generar-todo`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerandoTodo(false);
    }
  }

  if (!project) {
    return <div className="px-6 py-10 text-sm text-ink-muted">Cargando…</div>;
  }

  const escenas = [...project.scenes].sort((a, b) => a.orden - b.orden);
  const exportFinal = project.assets[0] ?? null;
  const renderActivo = project.renderJobs.find((r) =>
    ["cola", "procesando"].includes(r.estado)
  );
  const ultimoErrorMontaje = project.renderJobs.find(
    (r) => r.tipo === "montaje" && r.estado === "error"
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8">
        <Eyebrow>Proyecto</Eyebrow>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {project.titulo}
          </h1>
          <StatusDot estado={renderActivo ? renderActivo.tipo : project.estado} />
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          {project.tema} · {project.formato} ·{" "}
          {project.adn ? `${project.adn.nombre} v${project.adn.version}` : "sin ADN"}
        </p>
      </header>

      {ultimoErrorMontaje && (
        <Panel className="mb-6 border-error/40 bg-error/5">
          <p className="text-sm font-medium text-error">El Director escaló esta escena</p>
          <p className="mt-1 text-sm text-ink-muted">{ultimoErrorMontaje.error}</p>
        </Panel>
      )}
      {error && <p className="mb-4 text-sm text-error">{error}</p>}

      <section aria-labelledby="storyboard-heading" className="mb-10">
        <PanelHeader>
          <h2 id="storyboard-heading" className="font-display text-lg font-medium">
            Storyboard y montaje
          </h2>
          <Boton onClick={generarTodo} disabled={generandoTodo || !project.adn}>
            {generandoTodo ? "Generando…" : "Generar todo el proyecto"}
          </Boton>
        </PanelHeader>

        <ol className="flex flex-col gap-3">
          {escenas.map((scene, i) => {
            const take = scene.takes[0];
            return (
              <li key={scene.id}>
                <Panel className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => moverEscena(scene.id, -1)}
                      disabled={i === 0}
                      aria-label={`Mover escena ${i + 1} hacia arriba`}
                      className="flex size-6 items-center justify-center rounded border border-line text-xs text-ink-muted hover:text-ink disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moverEscena(scene.id, 1)}
                      disabled={i === escenas.length - 1}
                      aria-label={`Mover escena ${i + 1} hacia abajo`}
                      className="flex size-6 items-center justify-center rounded border border-line text-xs text-ink-muted hover:text-ink disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </div>

                  {take?.url ? (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video
                      src={take.url}
                      controls
                      className="aspect-video w-full max-w-40 shrink-0 rounded-lg bg-canvas"
                    />
                  ) : (
                    <div className="flex aspect-video w-full max-w-40 shrink-0 items-center justify-center rounded-lg bg-canvas font-mono text-[10px] text-ink-faint">
                      sin toma
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11px] text-ink-faint">
                      Escena {i + 1} · {scene.duracionSeg}s
                    </p>
                    <p className="truncate text-sm">{scene.descripcionVisual}</p>
                    <div className="mt-1 flex items-center gap-3">
                      <StatusDot estado={take?.estado ?? scene.estado} />
                      {take?.notasQa && (
                        <span className="font-mono text-[11px] text-ink-faint">
                          {take.notasQa}
                        </span>
                      )}
                    </div>
                  </div>

                  <Boton
                    variante="secundaria"
                    onClick={() => regenerarEscena(scene.id)}
                    disabled={regenerandoEscena === scene.id || !project.adn}
                    className="shrink-0"
                  >
                    {regenerandoEscena === scene.id ? "Enviando…" : "Regenerar"}
                  </Boton>
                </Panel>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="export-heading">
        <PanelHeader>
          <h2 id="export-heading" className="font-display text-lg font-medium">
            Export
          </h2>
        </PanelHeader>
        <Panel>
          {exportFinal?.url ? (
            <div className="flex flex-col gap-3">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                src={exportFinal.url}
                controls
                className="max-w-xs rounded-lg bg-canvas"
              />
              <a href={exportFinal.url} download>
                <Boton variante="secundaria">Descargar video final</Boton>
              </a>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">
              Todavía no hay un video final montado. Generá el proyecto completo
              para producirlo.
            </p>
          )}
        </Panel>
      </section>
    </div>
  );
}
