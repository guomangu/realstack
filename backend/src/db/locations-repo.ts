import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm'
import { getDb } from './client.js'
import { externalApiCache, locations } from './schema.js'

export interface LocationsFilter {
  q?: string
  source?: string
  lat?: number
  lng?: number
  radiusKm: number
  limit: number
  offset: number
}

const locationColumns = {
  id: locations.id,
  source: locations.source,
  externalId: locations.externalId,
  title: locations.title,
  description: locations.description,
  latitude: locations.latitude,
  longitude: locations.longitude,
  updatedAt: locations.updatedAt,
}

/** Recherche des entités géographiques en base locale (texte, source, rayon PostGIS). */
export async function queryLocations(filter: LocationsFilter) {
  const conditions: SQL[] = []
  if (filter.source) conditions.push(eq(locations.source, filter.source))
  if (filter.q) {
    const pattern = `%${filter.q}%`
    conditions.push(or(ilike(locations.title, pattern), ilike(locations.description, pattern))!)
  }

  const hasGeo = filter.lat !== undefined && filter.lng !== undefined
  const ref = hasGeo ? sql`ST_SetSRID(ST_MakePoint(${filter.lng}, ${filter.lat}), 4326)` : null
  if (hasGeo && ref) {
    conditions.push(sql`${locations.geom} IS NOT NULL`)
    conditions.push(sql`ST_DWithin(${locations.geom}::geography, ${ref}::geography, ${filter.radiusKm * 1000})`)
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined
  const distanceMeters =
    hasGeo && ref
      ? sql<number>`ROUND(ST_DistanceSphere(${locations.geom}, ${ref}))::double precision`
      : sql<null>`NULL`

  const [items, countRows] = await Promise.all([
    getDb()
      .select({ ...locationColumns, distanceMeters })
      .from(locations)
      .where(where)
      .orderBy(hasGeo && ref ? sql`ST_DistanceSphere(${locations.geom}, ${ref}) ASC` : desc(locations.updatedAt))
      .limit(filter.limit)
      .offset(filter.offset),
    getDb().select({ count: sql<number>`count(*)::int` }).from(locations).where(where),
  ])
  return { items, total: countRows[0]?.count ?? 0 }
}

/** Lit une entité normalisée et sa métadonnée de fraîcheur dans external_api_cache. */
export async function findLocationWithFreshness(source: string, externalId: string) {
  const [item] = await getDb()
    .select(locationColumns)
    .from(locations)
    .where(and(eq(locations.source, source), eq(locations.externalId, externalId)))
    .limit(1)
  if (!item) return null

  const [cache] = await getDb()
    .select({
      fetchedAt: externalApiCache.fetchedAt,
      expiresAt: externalApiCache.expiresAt,
      status: externalApiCache.status,
    })
    .from(externalApiCache)
    .where(eq(externalApiCache.cacheKey, `${source}:${externalId}`))
    .limit(1)

  const freshness = !cache
    ? 'unknown'
    : cache.expiresAt && cache.expiresAt.getTime() <= Date.now()
      ? 'stale'
      : 'fresh'
  return { item, freshness, cache: cache ?? null }
}
