/**
 * Schéma Drizzle partagé entre le backend et le harvester.
 *
 * Le harvester monte ce fichier en lecture seule (`:ro,z`) afin qu'il ne
 * puisse jamais diverger du schéma utilisé par l'API. Toute évolution de
 * structure doit donc être faite ici, puis suivie d'une migration.
 */
import {
  doublePrecision,
  geometry,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

/** Cache brut immuable des réponses externes (règle 8.3). */
export const externalApiCache = pgTable(
  'external_api_cache',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    source: text('source').notNull(),
    cacheKey: text('cache_key').notNull(),
    payload: jsonb('payload').notNull(),
    etag: text('etag'),
    status: text('status').notNull().default('success'),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('external_api_cache_key_idx').on(table.cacheKey),
    index('external_api_cache_source_idx').on(table.source),
  ]
)

/** Entité métier normalisée, identifiée par (source, external_id). */
export const locations = pgTable(
  'locations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    source: text('source').notNull(),
    externalId: text('external_id').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    geom: geometry('geom', { type: 'point', srid: 4326 }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('locations_source_external_id_idx').on(table.source, table.externalId),
    index('locations_geom_idx').using('gist', table.geom),
  ]
)
