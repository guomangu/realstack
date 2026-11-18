import type { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { ZodError } from 'zod'

/** Erreur HTTP structurée et lisible pour le client et les agents IA. */
export class ApiError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
    readonly details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Enregistre les gestionnaires globaux 404 et erreurs typées sur l'app Hono. */
export function registerErrorHandlers(app: Hono): void {
  app.notFound((c) =>
    c.json(
      { error: { code: 'NOT_FOUND', message: `Route introuvable : ${c.req.method} ${c.req.path}` } },
      404
    )
  )

  app.onError((error, c) => {
    if (error instanceof ApiError) {
      return c.json(
        { error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) } },
        error.status
      )
    }
    if (error instanceof ZodError) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Paramètres de requête invalides.',
            details: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
          },
        },
        400
      )
    }
    if (error instanceof HTTPException) {
      return c.json({ error: { code: 'HTTP_ERROR', message: error.message } }, error.status)
    }
    console.error('❌ Erreur interne backend :', error)
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur.' } }, 500)
  })
}
