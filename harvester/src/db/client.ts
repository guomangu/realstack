import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres, { type Sql } from 'postgres'
import * as schema from './schema.js'

let sqlInstance: Sql | null = null
let dbInstance: PostgresJsDatabase<typeof schema> | null = null

/** Pool volontairement petit : le débit est régulé par les files BullMQ. */
export function getSql(): Sql {
  if (!sqlInstance) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL est requis pour le harvester (PostgreSQL/PostGIS).')
    }
    sqlInstance = postgres(connectionString, {
      max: Number(process.env.HARVESTER_DB_POOL || 5),
      idle_timeout: 30,
      connect_timeout: 10,
      onnotice: () => {},
    })
  }
  return sqlInstance
}

export function getDb(): PostgresJsDatabase<typeof schema> {
  if (!dbInstance) dbInstance = drizzle(getSql(), { schema })
  return dbInstance
}

/** Vérifie rapidement la disponibilité de PostgreSQL. */
export async function checkDatabaseHealth(timeoutMs = 1_500): Promise<boolean> {
  try {
    await Promise.race([
      getSql()`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), timeoutMs)),
    ])
    return true
  } catch {
    return false
  }
}

/** Ferme proprement le pool lors du SIGINT/SIGTERM. */
export async function closeDb(): Promise<void> {
  if (!sqlInstance) return
  const current = sqlInstance
  sqlInstance = null
  dbInstance = null
  await current.end({ timeout: 5 })
}
