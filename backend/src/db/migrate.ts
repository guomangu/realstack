import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getSql } from './client.js'

const MIGRATION_LOCK_KEY = 748_291_01

function migrationsDir(): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url))
  return path.join(currentDir, 'migrations')
}

/**
 * Applique de façon idempotente et sérialisée les migrations SQL du backend.
 * Un verrou consultatif PostgreSQL évite les courses si plusieurs instances démarrent ensemble.
 */
export async function runMigrations(): Promise<string[]> {
  const dir = migrationsDir()
  const entries = (await readdir(dir)).filter((name) => name.endsWith('.sql')).sort()
  if (entries.length === 0) return []

  const appliedNow: string[] = []
  await getSql().begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(${MIGRATION_LOCK_KEY})`
    await tx`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `
    const existing = await tx<{ id: string }[]>`SELECT id FROM schema_migrations`
    const known = new Set(existing.map((row) => row.id))

    for (const file of entries) {
      if (known.has(file)) continue
      const ddl = await readFile(path.join(dir, file), 'utf8')
      await tx.unsafe(ddl)
      await tx`INSERT INTO schema_migrations (id) VALUES (${file}) ON CONFLICT DO NOTHING`
      appliedNow.push(file)
    }
  })

  return appliedNow
}
