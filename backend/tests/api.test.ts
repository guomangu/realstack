import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createApp } from '../src/app.js'
import { parseCorsOrigins, parsePort, redisConnection } from '../src/lib/env.js'
import { jobId, queueName } from '../src/lib/queue.js'

describe('env helpers', () => {
  it('reuses fallback when port is missing or blank instead of binding port 0', () => {
    assert.equal(parsePort(undefined, 3000), 3000)
    assert.equal(parsePort('   ', 3000), 3000)
    assert.equal(parsePort('4001', 3000), 4001)
    assert.throws(() => parsePort('0', 3000))
    assert.throws(() => parsePort('abc', 3000))
  })

  it('parses CORS_ORIGINS and REDIS_URL cleanly', () => {
    assert.deepEqual(parseCorsOrigins('http://localhost:8081/, https://app.example.com '), [
      'http://localhost:8081',
      'https://app.example.com',
    ])
    const redis = redisConnection('redis://user:p%40ss@redis:6380/2')
    assert.deepEqual(redis, { host: 'redis', port: 6380, username: 'user', password: 'p@ss', db: 2 })
  })
})

describe('queue helpers', () => {
  it('normalizes queue names and avoids delimiter collisions in jobId', () => {
    assert.equal(queueName('api:partner'), 'harvest-api-partner')
    const idA = jobId('src', { externalId: 'c', parentId: 'a|b' }, 120_000)
    const idB = jobId('src', { externalId: 'b|c', parentId: 'a' }, 120_000)
    assert.notEqual(idA, idB)
    assert.equal(
      jobId('src', { externalId: '42' }, 60_000),
      jobId('src', { externalId: '42' }, 119_999)
    )
    assert.notEqual(
      jobId('src', { externalId: '42' }, 60_000),
      jobId('src', { externalId: '42' }, 120_000)
    )
  })
})

describe('HTTP API', () => {
  it('reports 200 on /health when db and redis are healthy, 503 when degraded', async () => {
    const okApp = createApp({
      health: { checkDb: async () => true, checkRedis: async () => true },
    })
    const okRes = await okApp.request('/health')
    assert.equal(okRes.status, 200)
    const okJson = (await okRes.json()) as { status: string; checks: { database: string; redis: string } }
    assert.equal(okJson.status, 'ok')
    assert.deepEqual(okJson.checks, { database: 'ok', redis: 'ok' })

    const degradedApp = createApp({
      health: { checkDb: async () => true, checkRedis: async () => false },
    })
    const degRes = await degradedApp.request('/health')
    assert.equal(degRes.status, 503)
    const degJson = (await degRes.json()) as { status: string; checks: { redis: string } }
    assert.equal(degJson.status, 'degraded')
    assert.equal(degJson.checks.redis, 'down')
  })

  it('clamps /api/locations limit <= 200 and rejects partial lat/lng pairs', async () => {
    let capturedLimit = 0
    const app = createApp({
      locations: {
        queryLocations: async (filter) => {
          capturedLimit = filter.limit
          return { items: [], total: 0 }
        },
        findLocationWithFreshness: async () => null,
      },
    })

    const res = await app.request('/api/locations?limit=999&q=gare')
    assert.equal(res.status, 200)
    assert.equal(capturedLimit, 200)

    const badGeo = await app.request('/api/locations?lat=48.85')
    assert.equal(badGeo.status, 400)

    const missing = await app.request('/api/locations/osm/123')
    assert.equal(missing.status, 404)
  })

  it('validates POST /api/harvest/:adapter and returns 202 Accepted', async () => {
    const app = createApp({
      harvest: {
        enqueue: async (adapter, payload) => ({ queue: `harvest-${adapter}`, jobId: `job-${payload.externalId}` }),
      },
    })

    const badAdapter = await app.request('/api/harvest/Bad:Adapter', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ externalId: '1' }),
    })
    assert.equal(badAdapter.status, 400)

    const ok = await app.request('/api/harvest/example', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ externalId: 'place-42' }),
    })
    assert.equal(ok.status, 202)
    const body = (await ok.json()) as { status: string; queue: string; jobId: string }
    assert.equal(body.status, 'accepted')
    assert.equal(body.queue, 'harvest-example')
  })

  it('applies CORS headers only for allowed origins', async () => {
    const app = createApp({ corsOrigins: ['http://localhost:8081'] })
    const allowed = await app.request('/', { headers: { Origin: 'http://localhost:8081' } })
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:8081')

    const denied = await app.request('/', { headers: { Origin: 'https://evil.example' } })
    assert.equal(denied.headers.get('access-control-allow-origin'), null)
  })
})
