const USER_AGENTS = [
  'UniversalStackHarvester/0.1 (+https://github.com/universal-stack)',
  'Mozilla/5.0 (compatible; UniversalStackHarvester/0.1; +https://github.com/universal-stack)',
]

export interface FetchJsonOptions {
  headers?: Record<string, string>
  /** Nombre total de tentatives (défaut : 4). */
  attempts?: number
  baseDelayMs?: number
  timeoutMs?: number
  signal?: AbortSignal
}

/** Erreur HTTP typée : `retryAfterMs` est renseigné sur un 429. */
export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterMs?: number,
    readonly retryable = status === 408 || status === 425 || status >= 500
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000)
  const date = Date.parse(value)
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now())
}

function backoff(attempt: number, baseDelayMs: number): number {
  const ceiling = Math.min(baseDelayMs * 2 ** (attempt - 1), 30_000)
  return ceiling + Math.floor(Math.random() * 250)
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function validateHttpUrl(rawUrl: string): void {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new HttpError(`URL invalide : ${rawUrl}`, 400, undefined, false)
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new HttpError(`Protocole non supporté : ${parsed.protocol}`, 400, undefined, false)
  }
}

/**
 * Fetcher résilient : retries exponentiels, timeout, user-agent rotatif et
 * respect de `Retry-After`. Un 429 est renvoyé tel quel pour que le worker
 * puisse geler la file du fournisseur au lieu de marteler l'API.
 */
export async function fetchJson<T>(url: string, options: FetchJsonOptions = {}): Promise<T> {
  validateHttpUrl(url)
  const attempts = Math.max(1, options.attempts ?? 4)
  const timeoutMs = options.timeoutMs ?? 15_000
  const baseDelayMs = options.baseDelayMs ?? 500

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (options.signal?.aborted) throw options.signal.reason ?? new DOMException('Aborted', 'AbortError')
    try {
      const timeout = AbortSignal.timeout(timeoutMs)
      const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout
      const headers = new Headers(options.headers)
      if (!headers.has('accept')) headers.set('accept', 'application/json')
      if (!headers.has('user-agent')) headers.set('user-agent', USER_AGENTS[attempt % USER_AGENTS.length]!)

      const response = await fetch(url, { headers, signal })
      if (response.status === 429) {
        throw new HttpError('RATE_LIMIT_HIT', 429, parseRetryAfter(response.headers.get('retry-after')), false)
      }
      if (!response.ok) {
        throw new HttpError(`HTTP ${response.status} sur ${url}`, response.status)
      }
      try {
        return (await response.json()) as T
      } catch {
        throw new HttpError(`Réponse JSON invalide depuis ${url}`, response.status, undefined, false)
      }
    } catch (error) {
      if (options.signal?.aborted) throw error
      if (error instanceof HttpError && !error.retryable) throw error
      if (attempt === attempts) throw error
      await sleep(backoff(attempt, baseDelayMs))
    }
  }

  throw new Error('fetchJson : état de retry impossible')
}
