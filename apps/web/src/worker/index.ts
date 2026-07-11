import { Worker, type Job } from "bullmq";
import { COLAS, type NombreCola } from "@santuario/shared";
import { procesarGenerar } from "./procesar-generar";
import { procesarTTS } from "./procesar-tts";
import { prisma } from "../lib/db";

/**
 * Worker Node de BullMQ — proceso separado de Next.js.
 * Arranque: `pnpm worker` (o `pnpm --filter @santuario/web worker` desde la raíz).
 *
 * Fase 2: "generar" tiene procesador real (Higgsfield).
 * Fase 3: "tts" tiene procesador real (voz + transcripción + subtítulos).
 * subtitulos/montaje siguen siendo placeholder hasta la Fase 4.
 */
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const connection = { url: REDIS_URL };

async function procesarPlaceholder(job: Job): Promise<{ ok: boolean }> {
  console.log(`[worker] cola=${job.queueName} job=${job.id} datos=`, job.data);
  await job.updateProgress(100);
  return { ok: true };
}

const procesadores: Record<NombreCola, (job: Job) => Promise<unknown>> = {
  generar: procesarGenerar,
  tts: procesarTTS,
  subtitulos: procesarPlaceholder,
  montaje: procesarPlaceholder,
};

const workers = Object.values(COLAS).map(
  (cola) =>
    new Worker(cola, procesadores[cola], {
      connection,
      concurrency: cola === "generar" ? 4 : 2,
    })
);

for (const worker of workers) {
  worker.on("completed", (job) =>
    console.log(`[worker] ✅ ${worker.name}#${job.id} completado`)
  );
  worker.on("failed", async (job, err) => {
    console.error(`[worker] ❌ ${worker.name}#${job?.id} falló:`, err.message);
    const agotado = job && job.attemptsMade >= (job.opts.attempts ?? 1);
    if (!agotado) return;

    if (worker.name === "generar") {
      const takeId = (job?.data as { takeId?: string })?.takeId;
      if (takeId) {
        await prisma.agentLog
          .create({
            data: {
              agente: "generador",
              decision: `Job "generar" agotó reintentos para take ${takeId}`,
              contexto: { takeId, error: err.message },
            },
          })
          .catch(() => {});
      }
    }

    if (worker.name === "tts") {
      const renderJobId = (job?.data as { renderJobId?: string })?.renderJobId;
      if (renderJobId) {
        await prisma.renderJob
          .update({
            where: { id: renderJobId },
            data: { estado: "error", error: err.message },
          })
          .catch(() => {});
        await prisma.agentLog
          .create({
            data: {
              agente: "voz_subtitulos",
              decision: `Job "tts" agotó reintentos para renderJob ${renderJobId}`,
              contexto: { renderJobId, error: err.message },
            },
          })
          .catch(() => {});
      }
    }
  });
}

console.log(
  `[worker] escuchando colas: ${Object.values(COLAS).join(", ")} en ${REDIS_URL}`
);

async function cerrar() {
  console.log("[worker] cerrando…");
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
}
process.on("SIGINT", cerrar);
process.on("SIGTERM", cerrar);
