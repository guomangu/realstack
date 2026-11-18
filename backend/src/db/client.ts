import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres, { type Sql } from 'postgres'
import * as schema from './schema.js'

let sqlInstance: Sql | null = null
let dbInstance: PostgresJsDatabase<typeof schema> | null = null

/** Retourne le pool PostgreSQL partagé (initialisé paresseusement). */
export function getSql(): Sql {
  if (!sqlInstance) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL est requis pour démarrer le backend.')
    }
    sqlInstance = postgres(connectionString, {
      max: Number(process.env.DB_POOL_MAX || 10),
      idle_timeout: 30,
      connect_timeout: 10,
      onnotice: () => {},
    })
  }
  return sqlInstance
}

/** Retourne l'instance Drizzle ORM liée au schéma partagé. */
export function getDb(): PostgresJsDatabase<typeof schema> {
  if (!dbInstance) {
    dbInstance = drizzle(getSql(), { schema })
  }
  return dbInstance
}

/** Vérifie rapidement que PostgreSQL répond dans le délai imparti. */
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

/** Ferme proprement le pool PostgreSQL à l'arrêt du serveur. */
export async function closeDb(): Promise<void> {
  if (!sqlInstance) return
  const current = sqlInstance
  sqlInstance = null
  dbInstance = null
  await current.end({ timeout: 5 })
}
