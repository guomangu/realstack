import { createServer } from 'node:http'
import { examplePhotoAdapter } from './adapters/example-photo.adapter.js'
import { exampleAdapter } from './adapters/example.adapter.js'
import type { BaseAdapter } from './core/base-adapter.js'
import { closeQueues, startWorker } from './core/queue-manager.js'
import { closeDb } from './db/client.js'
import { redisLabel } from './config/redis.js'

const adapters: BaseAdapter[] = []
if (process.env.HARVESTER_ENABLE_EXAMPLE === '1') {
  adapters.push(exampleAdapter, examplePhotoAdapter)
}

const workers = adapters.map((adapter) => startWorker(adapter))
const port = Number(process.env.HARVESTER_PORT ?? 3001)

const server = createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(
      JSON.stringify({
        status: 'ok',
        service: 'harvester',
        redis: redisLabel(),
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

  await Promise.all(workers.map((worker) => worker.close()))
  await closeQueues()
  await closeDb()
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 10_000).unref()
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => void shutdown(signal))
}
