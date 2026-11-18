/**
 * Contrat unique que doit implémenter chaque source externe.
 * Les jobs ne transportent que des identifiants : jamais de payload métier,
 * afin que Redis reste léger et que les reprises soient idempotentes.
 */
export interface JobPayload {
  /** Identifiant stable chez le fournisseur. */
  externalId: string
  /** Identifiant du parent lorsque le job hydrate une sous-ressource. */
  parentId?: string
}

export interface RateLimit {
  /** Nombre maximum de jobs exécutés dans la fenêtre. */
  max: number
  /** Durée de la fenêtre en millisecondes. */
  durationMs: number
}

export interface BaseAdapter {
  /** Nom court et stable : sert de nom de file BullMQ. */
  name: string
  /** Cadence imposée par le fournisseur. */
  rateLimit: RateLimit
  /** Parallélisme local (défaut : 1). */
  concurrency?: number
  /** Une tentative = un job ; les retries sont gérés par BullMQ. */
  execute(payload: JobPayload): Promise<void>
}

/** Erreur métier levée par un adaptateur quand la source est invalide. */
export class AdapterError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly retryable = false
  ) {
    super(message)
    this.name = 'AdapterError'
  }
}

/** Lit et valide une URL de base depuis une variable d'environnement. */
export function requireBaseUrl(envVar: string): string {
  const raw = process.env[envVar]?.trim()
  if (!raw) throw new AdapterError(`${envVar} absent`, 'MISSING_CONFIG')
  try {
    const url = new URL(raw)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('protocol')
    return url.toString().replace(/\/$/, '')
  } catch {
    throw new AdapterError(`${envVar} invalide`, 'INVALID_CONFIG')
  }
}
