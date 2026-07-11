import Redis from "ioredis";

export const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

const globalForRedis = globalThis as unknown as { redis?: Redis };

export function getRedis(): Redis {
  if (!globalForRedis.redis) {
    globalForRedis.redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null, // requerido por BullMQ
      lazyConnect: true,
    });
  }
  return globalForRedis.redis;
}
