import { serve } from '@hono/node-server'
import { Hono } from 'hono'

const app = new Hono()

/**
 * Sonde de disponibilité utilisée par start.sh et par les orchestrateurs.
 * Elle ne touche pas la base : elle confirme uniquement que le processus HTTP répond.
 */
app.get('/health', (c) =>
  c.json({ status: 'ok', service: 'universal-stack-api', timestamp: new Date().toISOString() })
)

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

const port = Number(process.env.API_PORT ?? 3000)

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`)
  }
)
