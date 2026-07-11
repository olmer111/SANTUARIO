export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-start justify-center gap-6 px-6">
      <p className="font-mono text-sm tracking-widest text-accent">
        FASE 0 — FUNDACIONES
      </p>
      <h1 className="text-5xl font-bold tracking-tight">SANTUARIO</h1>
      <p className="text-lg text-muted">
        Estudio multi-agente que produce videos completos con IA: entrevista,
        guion, tomas generadas con consistencia visual absoluta (ADN de
        Estilo), voz en off y subtítulos sincronizados palabra por palabra.
      </p>
      <ul className="space-y-1 font-mono text-sm text-muted">
        <li>
          <a className="underline hover:text-foreground" href="/api/health">
            /api/health
          </a>{" "}
          — estado de Postgres, Redis y media-engine
        </li>
        <li>
          <a className="underline hover:text-foreground" href="/estudio">
            /estudio
          </a>{" "}
          — Fase 1: chat con el Entrevistador y storyboard
        </li>
      </ul>
      <p className="text-sm text-muted">
        Las pantallas reales (Dashboard, Estudio, Storyboard, Biblioteca de
        ADN, Sala de montaje, Export) se construyen en las fases 1–5 con los 5
        skills de diseño.
      </p>
    </main>
  );
}
