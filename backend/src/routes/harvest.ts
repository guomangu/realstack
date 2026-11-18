import { Hono } from 'hono'
import { z } from 'zod'
import { ApiError } from '../lib/errors.js'
import { enqueueHarvestJob } from '../lib/queue.js'

const AdapterParamSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9][a-z0-9-]{0,63}$/, 'Nom d’adaptateur invalide.')

const PayloadSchema = z.object({
  externalId: z.string().trim().min(1).max(256),
  parentId: z.string().trim().min(1).max(256).optional(),
})

export interface HarvestDeps {
  enqueue: typeof enqueueHarvestJob
}

/** Déclenche un rafraîchissement asynchrone vers le harvester via Redis/BullMQ (HTTP 202). */
export function createHarvestRouter(deps: HarvestDeps = { enqueue: enqueueHarvestJob }): Hono {
  const router = new Hono()

  router.post('/api/harvest/:adapter', async (c) => {
    const adapter = AdapterParamSchema.parse(c.req.param('adapter'))
    let rawBody: unknown
    try {
      rawBody = await c.req.json()
    } catch {
      throw new ApiError(400, 'INVALID_JSON', 'Corps JSON invalide ou manquant.')
    }
    const payload = PayloadSchema.parse(rawBody)
    const job = await deps.enqueue(adapter, payload)
    return c.json({ status: 'accepted', ...job, payload }, 202)
  })

  return router
}
