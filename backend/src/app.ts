import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { checkDatabaseHealth } from './db/client.js'
import { parseCorsOrigins } from './lib/env.js'
import { registerErrorHandlers } from './lib/errors.js'
import { checkRedisHealth } from './lib/queue.js'
import { createHarvestRouter, type HarvestDeps } from './routes/harvest.js'
import { createHealthRouter, type HealthDeps } from './routes/health.js'
import { createLocationsRouter, type LocationsDeps } from './routes/locations.js'

export interface AppDeps {
  health?: HealthDeps
  locations?: LocationsDeps
  harvest?: HarvestDeps
  corsOrigins?: string[]
}

/** Construit l'application Hono avec sécurité, CORS, routes et gestion d'erreurs. */
export function createApp(deps: AppDeps = {}): Hono {
  const app = new Hono()
  const allowedOrigins = deps.corsOrigins ?? parseCorsOrigins(process.env.CORS_ORIGINS)

  app.use('*', secureHeaders())
  app.use(
    '*',
    cors({
      origin: (origin) => (allowedOrigins.includes('*') || allowedOrigins.includes(origin) ? origin : null),
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    })
  )

  app.get('/', (c) =>
    c.json({ name: 'universal-stack-api', status: 'running', health: '/health', locations: '/api/locations' })
  )
  app.route('/', createHealthRouter(deps.health ?? { checkDb: checkDatabaseHealth, checkRedis: checkRedisHealth }))
  app.route('/', createLocationsRouter(deps.locations))
  app.route('/', createHarvestRouter(deps.harvest))

  registerErrorHandlers(app)
  return app
}
