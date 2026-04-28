import { describe, expect, it, vi } from 'vitest'

import { lookupProperty } from '../lookup.js'
import type { PropertyProvider } from '../providers/types.js'

const stubProvider = (
  name: PropertyProvider['name'],
  enabled: boolean,
  result: Awaited<ReturnType<PropertyProvider['lookup']>>,
): PropertyProvider => ({
  name,
  enabled,
  lookup: vi.fn().mockResolvedValue(result),
})

describe('lookupProperty', () => {
  it('runs all enabled providers in parallel and returns one entry per provider', async () => {
    const providers: PropertyProvider[] = [
      stubProvider('rentcast', true, { ok: true, data: { basics: { beds: 3 } }, raw: {} }),
      stubProvider('attom', false, { ok: false, reason: 'error', message: 'never called' }),
    ]

    const results = await lookupProperty(
      { street: '123 Main St', city: 'Austin', state: 'TX', zip: '78701' },
      {
        providers,
        readCache: async () => null,
        writeCache: async () => undefined,
      },
    )

    expect(results).toHaveLength(2)
    expect(results.find((r) => r.provider === 'rentcast')?.result.ok).toBe(true)
    const attom = results.find((r) => r.provider === 'attom')!
    expect(attom.result.ok).toBe(false)
    if (!attom.result.ok) {
      expect(attom.result.message).toBe('Not integrated')
    }
    expect(providers[1]!.lookup).not.toHaveBeenCalled()
  })

  it('uses the cache when a row exists and skips the provider call', async () => {
    const provider = stubProvider('rentcast', true, {
      ok: true,
      data: { basics: { beds: 99 } },
      raw: {},
    })

    const results = await lookupProperty(
      { street: '123 Main St', city: 'Austin', state: 'TX', zip: '78701' },
      {
        providers: [provider],
        readCache: async () => ({ ok: true, data: { basics: { beds: 3 } }, raw: {} }),
        writeCache: async () => undefined,
      },
    )

    expect(results[0]!.fromCache).toBe(true)
    expect(provider.lookup).not.toHaveBeenCalled()
    if (results[0]!.result.ok) {
      expect(results[0]!.result.data.basics?.beds).toBe(3)
    }
  })

  it('writes fresh provider responses to the cache', async () => {
    const writeCache = vi.fn(async () => undefined)
    const provider = stubProvider('rentcast', true, {
      ok: true,
      data: { basics: { beds: 4 } },
      raw: { x: 1 },
    })

    await lookupProperty(
      { street: '123 Main St', city: 'Austin', state: 'TX', zip: '78701' },
      {
        providers: [provider],
        readCache: async () => null,
        writeCache,
      },
    )

    expect(writeCache).toHaveBeenCalledOnce()
    expect(writeCache).toHaveBeenCalledWith(
      'rentcast',
      expect.anything(),
      expect.anything(),
      expect.anything(),
    )
  })
})
