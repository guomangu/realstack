/**
 * Le schéma Drizzle n'est jamais dupliqué.
 *
 * - En local, `harvester/shared-db` pointe vers `backend/src/db`.
 * - Dans Compose, ce dossier est monté en lecture seule sur `/app/shared-db`.
 *
 * Toute évolution doit donc être faite dans `backend/src/db/schema.ts`.
 */
export * from '../../shared-db/schema.js'
