import { Queue } from "bullmq";
import { COLAS, type NombreCola } from "@santuario/shared";
import { REDIS_URL } from "./redis";

const globalForQueues = globalThis as unknown as {
  queues?: Map<NombreCola, Queue>;
};

/**
 * Colas BullMQ — los renders tardan minutos; ninguna request HTTP espera.
 * Las API routes encolan aquí y el worker (src/worker) procesa.
 */
export function getQueue(nombre: NombreCola): Queue {
  if (!globalForQueues.queues) globalForQueues.queues = new Map();
  let queue = globalForQueues.queues.get(nombre);
  if (!queue) {
    queue = new Queue(nombre, {
      connection: { url: REDIS_URL },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 500 },
      },
    });
    globalForQueues.queues.set(nombre, queue);
  }
  return queue;
}

export { COLAS };
