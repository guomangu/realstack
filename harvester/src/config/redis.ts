import type { ConnectionOptions } from 'bullmq'

/**
 * Convertit `REDIS_URL` en options de connexion BullMQ.
 * BullMQ crée et ferme lui-même ses clients ioredis : aucun client global
 * n'est partagé, ce qui évite les connexions fantômes après un redémarrage.
 */
export function redisConnection(): ConnectionOptions {
  const url = new URL(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379')
  const database = url.pathname.replace('/', '')

  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    ...(database ? { db: Number(database) } : {}),
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
  }
}

/** URL lisible utilisée par les journaux (sans exposer le mot de passe). */
export function redisLabel(): string {
  try {
    const url = new URL(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379')
    return `${url.hostname}:${url.port || 6379}`
  } catch {
    return 'redis'
  }
}
