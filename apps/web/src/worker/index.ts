import { Worker, type Job } from "bullmq";
import { COLAS } from "@santuario/shared";

/**
 * Worker Node de BullMQ — proceso separado de Next.js.
 * Arranque: `pnpm worker` (o `pnpm --filter @santuario/web worker` desde la raíz).
 *
 * Fase 0: procesadores placeholder que validan el circuito cola→worker.
 * Fase 2+: generación de video, TTS, subtítulos y montaje reales.
 */
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const connection = { url: REDIS_URL };

async function procesarPlaceholder(job: Job): Promise<{ ok: boolean }> {
  console.log(`[worker] cola=${job.queueName} job=${job.id} datos=`, job.data);
  await job.updateProgress(100);
  return { ok: true };
}

const workers = Object.values(COLAS).map(
  (cola) =>
    new Worker(cola, procesarPlaceholder, {
      connection,
      concurrency: cola === "generar" ? 4 : 2,
    })
);

for (const worker of workers) {
  worker.on("completed", (job) =>
    console.log(`[worker] ✅ ${worker.name}#${job.id} completado`)
  );
  worker.on("failed", (job, err) =>
    console.error(`[worker] ❌ ${worker.name}#${job?.id} falló:`, err.message)
  );
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
