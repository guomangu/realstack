import { Hono } from 'hono'

export interface HealthDeps {
  checkDb: () => Promise<boolean>
  checkRedis: () => Promise<boolean>
}

/**
 * Sonde de disponibilité et de préparation : vérifie PostgreSQL et Redis
 * avec un délai borné afin que `start.sh` et Compose voient l'état réel.
 */
export function createHealthRouter(deps: HealthDeps): Hono {
  const router = new Hono()

  router.get('/health', async (c) => {
    const [dbOk, redisOk] = await Promise.all([deps.checkDb(), deps.checkRedis()])
    const healthy = dbOk && redisOk
    return c.json(
      {
        status: healthy ? 'ok' : 'degraded',
        service: 'universal-stack-api',
        checks: {
          database: dbOk ? 'ok' : 'down',
          redis: redisOk ? 'ok' : 'down',
        },
        timestamp: new Date().toISOString(),
      },
      healthy ? 200 : 503
    )
  })

  return router
}
