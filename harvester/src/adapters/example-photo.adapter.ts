import { z } from 'zod'
import { getDb } from '../db/client.js'
import { externalApiCache } from '../db/schema.js'
import { requireBaseUrl, type BaseAdapter } from '../core/base-adapter.js'
import { fetchJson } from '../core/http-client.js'

export const SOURCE = 'example-photos'
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

const RawPhotoSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
})

/** Sous-ressource enfant : hydrate et met en cache sans créer d'entité métier. */
export const examplePhotoAdapter: BaseAdapter = {
  name: SOURCE,
  rateLimit: { max: 4, durationMs: 1_000 },
  concurrency: 2,

  async execute({ externalId }) {
    const base = requireBaseUrl('HARVESTER_EXAMPLE_URL')
    const raw = RawPhotoSchema.parse(
      await fetchJson(`${base}/photos/${encodeURIComponent(externalId)}`)
    )
    const now = new Date()
    const expiresAt = new Date(now.getTime() + CACHE_TTL_MS)

    await getDb()
      .insert(externalApiCache)
      .values({ source: SOURCE, cacheKey: `${SOURCE}:${raw.id}`, payload: raw, fetchedAt: now, expiresAt, status: 'success' })
      .onConflictDoUpdate({
        target: externalApiCache.cacheKey,
        set: { payload: raw, fetchedAt: now, expiresAt, status: 'success' },
      })
  },
}
