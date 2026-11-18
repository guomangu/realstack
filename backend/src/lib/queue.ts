import { createHash } from 'node:crypto'
import { Queue } from 'bullmq'
import { redisConnection } from './env.js'

export interface HarvestJobPayload {
  externalId: string
  parentId?: string
}

const DEDUPE_WINDOW_MS = 60_000
const queues = new Map<string, Queue<HarvestJobPayload>>()

/** Même convention de nommage que le harvester (`harvest-<adapter>`). */
export function queueName(adapterName: string): string {
  return `harvest-${adapterName.replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

/** Identifiant idempotent dédupliqué sur une fenêtre de 60 s sans collision de délimiteur. */
export function jobId(adapterName: string, payload: HarvestJobPayload, now = Date.now()): string {
  const bucket = Math.floor(now / DEDUPE_WINDOW_MS)
  const key = JSON.stringify([adapterName, payload.parentId ?? null, payload.externalId, bucket])
  return createHash('sha1').update(key).digest('hex')
}

export function getQueue(adapterName: string): Queue<HarvestJobPayload> {
  let queue = queues.get(adapterName)
  if (!queue) {
    queue = new Queue<HarvestJobPayload>(queueName(adapterName), {
      connection: redisConnection(),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2_000 },
        removeOnComplete: { count: 1_000 },
        removeOnFail: { count: 5_000 },
      },
    })
    queue.on('error', (error) => console.error(`❌ File ${adapterName} :`, error.message))
    queues.set(adapterName, queue)
  }
  return queue
}

/** Pousse un job idempotent vers le worker harvester sans bloquer la requête HTTP. */
export async function enqueueHarvestJob(
  adapterName: string,
  payload: HarvestJobPayload
): Promise<{ queue: string; jobId: string }> {
  const id = jobId(adapterName, payload)
  const queue = getQueue(adapterName)
  await queue.add('harvest', payload, { jobId: id })
  return { queue: queueName(adapterName), jobId: id }
}

/** Vérifie la joignabilité de Redis via un appel INFO borné dans le temps. */
export async function checkRedisHealth(timeoutMs = 1_500): Promise<boolean> {
  try {
    const queue = getQueue('healthcheck')
    const info = await Promise.race([
      queue.client.then((client) => client.info()),
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), timeoutMs)),
    ])
    return info.includes('redis_version') || info.length > 0
  } catch {
    return false
  }
}

/** Ferme toutes les files ouvertes lors de l'arrêt du serveur. */
export async function closeQueues(): Promise<void> {
  await Promise.all([...queues.values()].map((queue) => queue.close()))
  queues.clear()
}
