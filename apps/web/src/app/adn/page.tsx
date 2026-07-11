"use client";

import { useEffect, useState } from "react";
import { Panel, PanelHeader, Eyebrow } from "@/components/ui/panel";
import { Boton } from "@/components/ui/button";

interface ADN {
  id: string;
  nombre: string;
  version: number;
  data: {
    promptBase: string;
    paleta: string[];
    camara: string;
    iluminacion: string;
  };
  createdAt: string;
}

export default function BibliotecaADNPage() {
  const [adns, setAdns] = useState<ADN[] | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    const res = await fetch("/api/adn");
    if (!res.ok) return;
    const data = await res.json();
    setAdns(data.adns);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function crear() {
    if (!descripcion.trim()) return;
    setCreando(true);
    setError(null);
    try {
      const res = await fetch("/api/adn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descripcionEstilo: descripcion }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      setDescripcion("");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreando(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8">
        <Eyebrow>Biblioteca</Eyebrow>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          ADN de Estilo
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Cada ADN queda versionado para siempre — nunca se sobrescribe, solo
          se crean versiones nuevas.
        </p>
      </header>

      <Panel className="mb-8">
        <PanelHeader>
          <h2 className="font-display text-base font-medium">Crear ADN nuevo</h2>
        </PanelHeader>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="descripcion-adn" className="sr-only">
            Descripción del estilo
          </label>
          <input
            id="descripcion-adn"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            disabled={creando}
            placeholder="ej. cinemático cálido, luz dorada, grano de película sutil…"
            className="flex-1 rounded-lg border border-line bg-transparent px-3 py-2 text-base"
          />
          <Boton onClick={crear} disabled={creando || !descripcion.trim()}>
            {creando ? "Creando…" : "Crear"}
          </Boton>
        </div>
        {error && <p className="mt-2 text-sm text-error">{error}</p>}
      </Panel>

      {adns === null && <p className="text-sm text-ink-muted">Cargando…</p>}

      {adns?.length === 0 && (
        <p className="text-sm text-ink-muted">Todavía no hay ningún ADN guardado.</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {adns?.map((adn) => (
          <Panel key={adn.id}>
            <div className="mb-3 flex items-start justify-between gap-2">
              <h3 className="font-display text-base font-medium">{adn.nombre}</h3>
              <span className="shrink-0 rounded-full border border-line px-2 py-0.5 font-mono text-[11px] text-ink-muted">
                v{adn.version}
              </span>
            </div>
            <div className="mb-3 flex gap-1.5" aria-hidden="true">
              {adn.data.paleta?.map((color) => (
                <span
                  key={color}
                  className="size-6 rounded-full border border-line"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <p className="line-clamp-2 text-sm text-ink-muted">{adn.data.promptBase}</p>
            <p className="mt-2 font-mono text-[11px] text-ink-faint">
              {adn.data.camara} · {adn.data.iluminacion}
            </p>
          </Panel>
        ))}
      </div>
    </div>
  );
}
