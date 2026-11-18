import type { ConnectionOptions } from 'bullmq'

/** Lit un numéro de port positif valide (évite qu'une chaîne vide devienne `0`). */
export function parsePort(raw: string | undefined, fallback: number): number {
  const trimmed = raw?.trim()
  if (!trimmed) return fallback
  const port = Number(trimmed)
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Port invalide : "${raw}"`)
  }
  return port
}

/** Découpe `CORS_ORIGINS` (liste séparée par des virgules) en origines propres. */
export function parseCorsOrigins(raw: string | undefined): string[] {
  const value = raw?.trim()
  if (!value) return ['http://localhost:8081']
  return value
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean)
}

/** Convertit `REDIS_URL` en options de connexion BullMQ/ioredis. */
export function redisConnection(rawUrl = process.env.REDIS_URL): ConnectionOptions {
  const url = new URL(rawUrl?.trim() || 'redis://127.0.0.1:6379')
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
