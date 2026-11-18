import { createServer } from 'node:http'
import { examplePhotoAdapter } from './adapters/example-photo.adapter.js'
import { exampleAdapter } from './adapters/example.adapter.js'
import type { BaseAdapter } from './core/base-adapter.js'
import { checkRedisHealth, closeQueues, startWorker } from './core/queue-manager.js'
import { checkDatabaseHealth, closeDb } from './db/client.js'
import { redisLabel } from './config/redis.js'

function parsePort(raw: string | undefined, fallback: number): number {
  const trimmed = raw?.trim()
  if (!trimmed) return fallback
  const port = Number(trimmed)
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`HARVESTER_PORT invalide : "${raw}"`)
  }
  return port
}

const adapters: BaseAdapter[] = []
if (process.env.HARVESTER_ENABLE_EXAMPLE === '1') {
  adapters.push(exampleAdapter, examplePhotoAdapter)
}

const workers = adapters.map((adapter) => startWorker(adapter))
const port = parsePort(process.env.HARVESTER_PORT, 3001)

const server = createServer(async (request, response) => {
  if (request.url === '/health') {
    const [dbOk, redisOk] = await Promise.all([checkDatabaseHealth(), checkRedisHealth()])
    const healthy = dbOk && redisOk
    response.writeHead(healthy ? 200 : 503, { 'content-type': 'application/json' })
    response.end(
      JSON.stringify({
        status: healthy ? 'ok' : 'degraded',
        service: 'harvester',
        redis: redisLabel(),
        checks: { database: dbOk ? 'ok' : 'down', redis: redisOk ? 'ok' : 'down' },
        adapters: adapters.map((adapter) => adapter.name),
        uptime: Math.round(process.uptime()),
      })
    )
    return
  }
  response.writeHead(404, { 'content-type': 'application/json' })
  response.end(JSON.stringify({ error: 'not_found' }))
})

server.listen(port, () => {
  console.log(`🌾 Harvester prêt sur :${port} (${adapters.length} adaptateur(s), redis ${redisLabel()})`)
  if (adapters.length === 0) {
    console.log('ℹ️  Aucun adaptateur actif : définissez HARVESTER_ENABLE_EXAMPLE=1 pour la démo.')
  }
})

let shuttingDown = false
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`\n🛑 ${signal} reçu : fin du job en cours puis arrêt propre…`)
  const guardrail = setTimeout(() => process.exit(1), 10_000)
  guardrail.unref()

  try {
    await Promise.all(workers.map((worker) => worker.close()))
    await closeQueues()
    await closeDb()
  } catch (error) {
    console.error('❌ Erreur lors de l’arrêt du harvester :', error)
  } finally {
    server.close(() => process.exit(0))
  }
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => void shutdown(signal))
}
