import { Hono } from 'hono'
import { z } from 'zod'
import { findLocationWithFreshness, queryLocations, type LocationsFilter } from '../db/locations-repo.js'
import { ApiError } from '../lib/errors.js'

const QuerySchema = z
  .object({
    q: z.string().trim().min(1).max(120).optional(),
    source: z.string().trim().min(1).max(64).optional(),
    lat: z.coerce.number().finite().min(-90).max(90).optional(),
    lng: z.coerce.number().finite().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().finite().min(0.1).max(500).default(25),
    limit: z.coerce.number().int().min(1).default(50).transform((n) => Math.min(n, 200)),
    offset: z.coerce.number().int().min(0).max(10_000).default(0),
  })
  .refine((data) => (data.lat === undefined) === (data.lng === undefined), {
    message: 'lat et lng doivent être fournis ensemble.',
    path: ['lat'],
  })

const ParamsSchema = z.object({
  source: z.string().trim().min(1).max(64),
  externalId: z.string().trim().min(1).max(256),
})

export interface LocationsDeps {
  queryLocations: typeof queryLocations
  findLocationWithFreshness: typeof findLocationWithFreshness
}

const defaultDeps: LocationsDeps = { queryLocations, findLocationWithFreshness }

/** Routes de lecture des entités normalisées (PostgreSQL/PostGIS d'abord). */
export function createLocationsRouter(deps: LocationsDeps = defaultDeps): Hono {
  const router = new Hono()

  router.get('/api/locations', async (c) => {
    const filter: LocationsFilter = QuerySchema.parse(c.req.query())
    const result = await deps.queryLocations(filter)
    return c.json({ ...result, limit: filter.limit, offset: filter.offset })
  })

  router.get('/api/locations/:source/:externalId', async (c) => {
    const { source, externalId } = ParamsSchema.parse(c.req.param())
    const found = await deps.findLocationWithFreshness(source, externalId)
    if (!found) {
      throw new ApiError(404, 'LOCATION_NOT_FOUND', `Entité introuvable (${source}:${externalId}).`)
    }
    return c.json(found)
  })

  return router
}
