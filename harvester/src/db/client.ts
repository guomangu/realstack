import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL est requis pour le harvester (PostgreSQL/PostGIS).')
}

/**
 * Pool volontairement petit : le débit est régulé par les files, pas par la
 * base. Un pool large ne ferait qu'ajouter de la contention PostgreSQL.
 */
export const sql = postgres(connectionString, {
  max: Number(process.env.HARVESTER_DB_POOL ?? 5),
  idle_timeout: 30,
  connect_timeout: 10,
  onnotice: () => {},
})

export const db = drizzle(sql, { schema })

/** Ferme proprement le pool lors du SIGINT/SIGTERM. */
export async function closeDb(): Promise<void> {
  await sql.end({ timeout: 5 })
}
