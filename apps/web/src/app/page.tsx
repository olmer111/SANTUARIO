"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusDot } from "@/components/ui/status-dot";
import { Panel, Eyebrow } from "@/components/ui/panel";
import { Boton } from "@/components/ui/button";

interface Proyecto {
  id: string;
  titulo: string;
  tema: string;
  formato: string;
  estado: string;
  adn: { nombre: string; version: number } | null;
  totalEscenas: number;
  escenasListas: number;
  renderEnCurso: { id: string; progreso: number; tipo: string } | null;
  updatedAt: string;
}

function tiempoRelativo(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "ahora mismo";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  return `hace ${Math.round(diffH / 24)} d`;
}

export default function DashboardPage() {
  const [proyectos, setProyectos] = useState<Proyecto[] | null>(null);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      const res = await fetch("/api/proyectos");
      if (!activo || !res.ok) return;
      const data = await res.json();
      setProyectos(data.proyectos);
    }
    cargar();
    const intervalo = setInterval(cargar, 5000); // cola en vivo por polling
    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <Eyebrow>Dashboard</Eyebrow>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Proyectos
          </h1>
        </div>
        <Link href="/estudio">
          <Boton>Nuevo proyecto</Boton>
        </Link>
      </header>

      {proyectos === null && (
        <p className="text-sm text-ink-muted">Cargando…</p>
      )}

      {proyectos?.length === 0 && (
        <Panel className="flex flex-col items-start gap-3 py-12 text-center sm:items-center">
          <p className="font-display text-xl">Todavía no hay ningún video</p>
          <p className="max-w-sm text-sm text-ink-muted">
            Contale al Entrevistador qué querés hacer y en minutos vas a tener
            un guion, un ADN de estilo y las primeras tomas.
          </p>
          <Link href="/estudio">
            <Boton className="mt-2">Empezar en el Estudio</Boton>
          </Link>
        </Panel>
      )}

      {proyectos && proyectos.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {proyectos.map((p) => (
            <Link key={p.id} href={`/proyectos/${p.id}`}>
              <Panel className="h-full transition-colors duration-150 hover:border-ink-faint">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <h2 className="font-display text-lg font-medium leading-tight">
                    {p.titulo}
                  </h2>
                  <span className="shrink-0 rounded-full border border-line px-2 py-0.5 font-mono text-[11px] text-ink-muted">
                    {p.formato}
                  </span>
                </div>
                <p className="mb-4 line-clamp-2 text-sm text-ink-muted">{p.tema}</p>

                <div className="flex items-center justify-between text-xs">
                  <StatusDot
                    estado={p.renderEnCurso ? p.renderEnCurso.tipo : p.estado}
                  />
                  <span className="font-mono text-ink-faint">
                    {p.escenasListas}/{p.totalEscenas} escenas
                  </span>
                </div>

                {p.renderEnCurso && (
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-canvas-overlay">
                    <div
                      className="h-full rounded-full bg-tungsteno transition-[width] duration-500"
                      style={{ width: `${p.renderEnCurso.progreso}%` }}
                    />
                  </div>
                )}

                <p className="mt-4 font-mono text-[11px] text-ink-faint">
                  {p.adn ? `${p.adn.nombre} v${p.adn.version}` : "sin ADN"} ·{" "}
                  {tiempoRelativo(p.updatedAt)}
                </p>
              </Panel>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
