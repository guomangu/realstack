import { createHash } from 'node:crypto'
import { Queue, Worker } from 'bullmq'
import type { Job, JobsOptions } from 'bullmq'
import { redisConnection } from '../config/redis.js'
import type { BaseAdapter, JobPayload } from './base-adapter.js'
import { HttpError } from './http-client.js'

const DEFAULT_ATTEMPTS = 5
const DEFAULT_BACKOFF_MS = 2_000
const DEDUPE_WINDOW_MS = 60_000

/** Chaque fournisseur obtient sa propre file : les quotas restent isolés. */
export function queueName(adapterName: string): string {
  // BullMQ interdit `:` dans les noms de file.
  return `harvest-${adapterName.replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

/**
 * Identifiant idempotent et compact. BullMQ interdit `:` dans un jobId ; on
 * hache donc la clé métier. La fenêtre de 60 s déduplique les rafales sans
 * empêcher un rafraîchissement ultérieur de la même entité.
 */
export function jobId(adapterName: string, payload: JobPayload, now = Date.now()): string {
  const bucket = Math.floor(now / DEDUPE_WINDOW_MS)
  const key = `${adapterName}|${payload.parentId ?? 'root'}|${payload.externalId}|${bucket}`
  return createHash('sha1').update(key).digest('hex')
}

const queues = new Map<string, Queue<JobPayload>>()

export function getQueue(adapterName: string): Queue<JobPayload> {
  let queue = queues.get(adapterName)
  if (!queue) {
    queue = new Queue<JobPayload>(queueName(adapterName), {
      connection: redisConnection(),
      defaultJobOptions: {
        attempts: DEFAULT_ATTEMPTS,
        backoff: { type: 'exponential', delay: DEFAULT_BACKOFF_MS },
        removeOnComplete: { count: 1_000 },
        removeOnFail: { count: 5_000 },
      },
    })
    queues.set(adapterName, queue)
  }
  return queue
}

/** Programme une sous-tâche (ou une racine) sans bloquer le job courant. */
export async function dispatchNextJob(
  adapterName: string,
  payload: JobPayload,
  options: JobsOptions = {}
): Promise<void> {
  await getQueue(adapterName).add('harvest', payload, {
    jobId: jobId(adapterName, payload),
    ...options,
  })
}

/**
 * Démarre un worker calé sur le débit du fournisseur. Sur un 429 inattendu,
 * la file est mise en pause le temps indiqué par `Retry-After` avant retry.
 */
export function startWorker(adapter: BaseAdapter): Worker<JobPayload> {
  const worker = new Worker<JobPayload>(
    queueName(adapter.name),
    async (job: Job<JobPayload>) => {
      try {
        await adapter.execute(job.data)
      } catch (error) {
        if (error instanceof HttpError && error.status === 429) {
          const ms = Math.max(error.retryAfterMs ?? 60_000, 1_000)
          await getQueue(adapter.name).rateLimit(ms)
          console.warn(`⏸️  ${adapter.name} limité : reprise dans ${Math.ceil(ms / 1000)} s`)
        }
        throw error
      }
    },
    {
      connection: redisConnection(),
      concurrency: adapter.concurrency ?? 1,
      limiter: { max: adapter.rateLimit.max, duration: adapter.rateLimit.durationMs },
    }
  )

  worker.on('completed', (job) => console.log(`✅ ${adapter.name} ${job.data.externalId}`))
  worker.on('failed', (job, error) =>
    console.error(`❌ ${adapter.name} ${job?.data.externalId ?? '?'} : ${error.message}`)
  )

  return worker
}

/** Ferme toutes les files après la fin des jobs actifs. */
export async function closeQueues(): Promise<void> {
  await Promise.all([...queues.values()].map((queue) => queue.close()))
  queues.clear()
}
