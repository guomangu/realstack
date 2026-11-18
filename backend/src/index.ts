import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { closeDb } from './db/client.js'
import { runMigrations } from './db/migrate.js'
import { parsePort } from './lib/env.js'
import { closeQueues } from './lib/queue.js'

const port = parsePort(process.env.API_PORT, 3000)

const applied = await runMigrations()
if (applied.length > 0) {
  console.log(`🗄️  Migrations appliquées : ${applied.join(', ')}`)
}

const app = createApp()
const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`🚀 API Hono prête sur http://localhost:${info.port}`)
})

let shuttingDown = false
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`\n🛑 ${signal} reçu : arrêt propre de l'API…`)

  const guardrail = setTimeout(() => process.exit(1), 10_000)
  guardrail.unref()

  try {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await closeQueues()
    await closeDb()
    process.exit(0)
  } catch (error) {
    console.error('❌ Erreur lors de l’arrêt propre :', error)
    process.exit(1)
  }
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => void shutdown(signal))
}
