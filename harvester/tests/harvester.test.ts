import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { RawPlaceSchema } from '../src/adapters/example.adapter.js'
import { redisConnection } from '../src/config/redis.js'
import { AdapterError, requireBaseUrl } from '../src/core/base-adapter.js'
import { fetchJson, HttpError, parseRetryAfter } from '../src/core/http-client.js'
import { jobId, queueName } from '../src/core/queue-manager.js'

describe('queue-manager', () => {
  it('sanitizes colons from queueName and keeps jobId collision-free', () => {
    assert.equal(queueName('sirene:v3'), 'harvest-sirene-v3')
    assert.notEqual(
      jobId('src', { externalId: 'c', parentId: 'a|b' }, 60_000),
      jobId('src', { externalId: 'b|c', parentId: 'a' }, 60_000)
    )
    assert.equal(
      jobId('src', { externalId: '42' }, 60_000),
      jobId('src', { externalId: '42' }, 119_999)
    )
  })
})

describe('http-client', () => {
  it('parses Retry-After seconds and HTTP dates safely', () => {
    assert.equal(parseRetryAfter('12'), 12_000)
    assert.equal(parseRetryAfter('invalid'), undefined)
    const future = new Date(Date.now() + 5_000).toUTCString()
    const parsed = parseRetryAfter(future)
    assert.ok(parsed !== undefined && parsed >= 3_000 && parsed <= 6_000)
  })

  it('retries 408/503 but fails fast on 404, 429, bad JSON, invalid protocol and caller abort', async () => {
    const originalFetch = globalThis.fetch
    try {
      let calls = 0
      globalThis.fetch = async () => {
        calls += 1
        if (calls < 3) return new Response('busy', { status: calls === 1 ? 408 : 503 })
        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      }
      const res = await fetchJson<{ ok: boolean }>('https://example.test/api', {
        attempts: 3,
        baseDelayMs: 1,
      })
      assert.deepEqual(res, { ok: true })
      assert.equal(calls, 3)

      let notFoundCalls = 0
      globalThis.fetch = async () => {
        notFoundCalls += 1
        return new Response('missing', { status: 404 })
      }
      await assert.rejects(
        () => fetchJson('https://example.test/missing', { attempts: 3, baseDelayMs: 1 }),
        (err: unknown) => err instanceof HttpError && err.status === 404 && !err.retryable
      )
      assert.equal(notFoundCalls, 1)

      globalThis.fetch = async () => new Response('too many', { status: 429, headers: { 'retry-after': '7' } })
      await assert.rejects(
        () => fetchJson('https://example.test/limit', { attempts: 3, baseDelayMs: 1 }),
        (err: unknown) => err instanceof HttpError && err.status === 429 && err.retryAfterMs === 7_000
      )

      globalThis.fetch = async () => new Response('<html>oops</html>', { status: 200 })
      await assert.rejects(
        () => fetchJson('https://example.test/html', { attempts: 3, baseDelayMs: 1 }),
        (err: unknown) => err instanceof HttpError && !err.retryable
      )

      const controller = new AbortController()
      controller.abort()
      await assert.rejects(() => fetchJson('https://example.test/abort', { signal: controller.signal }))
      await assert.rejects(() => fetchJson('file:///etc/passwd'), HttpError)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

describe('adapter validation & redis config', () => {
  it('validates base URLs and RawPlaceSchema bounds', () => {
    delete process.env.TEST_ADAPTER_URL
    assert.throws(
      () => requireBaseUrl('TEST_ADAPTER_URL'),
      (err: unknown) => err instanceof AdapterError && err.code === 'MISSING_CONFIG' && !err.retryable
    )
    process.env.TEST_ADAPTER_URL = 'not-a-url'
    assert.throws(
      () => requireBaseUrl('TEST_ADAPTER_URL'),
      (err: unknown) => err instanceof AdapterError && err.code === 'INVALID_CONFIG'
    )
    process.env.TEST_ADAPTER_URL = 'https://api.example.test/'
    assert.equal(requireBaseUrl('TEST_ADAPTER_URL'), 'https://api.example.test')

    assert.throws(() => RawPlaceSchema.parse({ id: '1', label: 'X', latitude: 95, longitude: 2 }))
    const parsed = RawPlaceSchema.parse({ id: '1', label: 'Gare', latitude: 48.8, longitude: 2.3 })
    assert.deepEqual(parsed.photos, [])

    process.env.REDIS_URL = 'redis://redis:6379'
    assert.deepEqual(redisConnection(), { host: 'redis', port: 6379 })
  })
})
