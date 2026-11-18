import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../db/client.js'
import { externalApiCache, locations } from '../db/schema.js'
import { requireBaseUrl, type BaseAdapter } from '../core/base-adapter.js'
import { fetchJson } from '../core/http-client.js'
import { dispatchNextJob } from '../core/queue-manager.js'

export const SOURCE = 'example'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

/** Format brut du fournisseur : validé avant toute écriture. */
export const RawPlaceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  photos: z.array(z.string().min(1)).default([]),
})

function point(longitude: number, latitude: number) {
  return sql`ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)`
}

/** Adaptateur de démonstration complet : cache brut, transaction PostGIS et hydratation enfants. */
export const exampleAdapter: BaseAdapter = {
  name: SOURCE,
  rateLimit: { max: 1, durationMs: 2_000 },
  concurrency: 1,

  async execute({ externalId }) {
    const base = requireBaseUrl('HARVESTER_EXAMPLE_URL')
    const raw = RawPlaceSchema.parse(
      await fetchJson(`${base}/items/${encodeURIComponent(externalId)}`)
    )
    const now = new Date()
    const expiresAt = new Date(now.getTime() + CACHE_TTL_MS)

    await getDb().transaction(async (tx) => {
      await tx
        .insert(externalApiCache)
        .values({ source: SOURCE, cacheKey: `${SOURCE}:${raw.id}`, payload: raw, fetchedAt: now, expiresAt, status: 'success' })
        .onConflictDoUpdate({
          target: externalApiCache.cacheKey,
          set: { payload: raw, fetchedAt: now, expiresAt, status: 'success' },
        })

      await tx
        .insert(locations)
        .values({
          source: SOURCE,
          externalId: raw.id,
          title: raw.label,
          latitude: raw.latitude,
          longitude: raw.longitude,
          geom: point(raw.longitude, raw.latitude),
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [locations.source, locations.externalId],
          set: {
            title: raw.label,
            latitude: raw.latitude,
            longitude: raw.longitude,
            geom: point(raw.longitude, raw.latitude),
            updatedAt: now,
          },
        })
    })

    for (const photoId of raw.photos) {
      await dispatchNextJob(`${SOURCE}-photos`, { externalId: photoId, parentId: raw.id })
    }
  },
}
