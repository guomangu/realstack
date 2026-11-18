import { createHash } from 'node:crypto'
import { Queue, UnrecoverableError, Worker, type Job, type JobsOptions } from 'bullmq'
import { ZodError } from 'zod'
import { redisConnection } from '../config/redis.js'
import { AdapterError, type BaseAdapter, type JobPayload } from './base-adapter.js'
import { HttpError } from './http-client.js'

const DEFAULT_ATTEMPTS = 5
const DEFAULT_BACKOFF_MS = 2_000
const DEDUPE_WINDOW_MS = 60_000
const queues = new Map<string, Queue<JobPayload>>()

/** Chaque fournisseur obtient sa propre file (`harvest-<name>`). */
export function queueName(adapterName: string): string {
  return `harvest-${adapterName.replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

/** Identifiant idempotent dédupliqué sur 60 s sans collision de délimiteur. */
export function jobId(adapterName: string, payload: JobPayload, now = Date.now()): string {
  const bucket = Math.floor(now / DEDUPE_WINDOW_MS)
  const key = JSON.stringify([adapterName, payload.parentId ?? null, payload.externalId, bucket])
  return createHash('sha1').update(key).digest('hex')
}

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
    queue.on('error', (error) => console.error(`❌ File ${adapterName} :`, error.message))
    queues.set(adapterName, queue)
  }
  return queue
}

export async function dispatchNextJob(
  adapterName: string,
  payload: JobPayload,
  options: JobsOptions = {}
): Promise<void> {
  await getQueue(adapterName).add('harvest', payload, { jobId: jobId(adapterName, payload), ...options })
}

/** Démarre un worker calé sur le débit du fournisseur avec gestion 429 et erreurs fatales. */
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
          throw Worker.RateLimitError()
        }
        if (error instanceof ZodError || (error instanceof AdapterError && !error.retryable)) {
          throw new UnrecoverableError(error.message)
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
  worker.on('failed', (job, error) => console.error(`❌ ${adapter.name} ${job?.data.externalId ?? '?'} : ${error.message}`))
  worker.on('error', (error) => console.error(`❌ Worker ${adapter.name} :`, error.message))
  return worker
}

export async function checkRedisHealth(timeoutMs = 1_500): Promise<boolean> {
  try {
    const info = await Promise.race([
      getQueue('healthcheck').client.then((client) => client.info()),
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), timeoutMs)),
    ])
    return info.includes('redis_version') || info.length > 0
  } catch {
    return false
  }
}

export async function closeQueues(): Promise<void> {
  await Promise.all([...queues.values()].map((queue) => queue.close()))
  queues.clear()
}
