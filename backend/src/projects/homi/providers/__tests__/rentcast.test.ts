import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { createRentcastProvider } from '../rentcast.js'

const here = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  readFileSync(resolve(here, 'fixtures/rentcast-success.json'), 'utf8'),
)

describe('rentcast provider', () => {
  it('normalizes a successful response', async () => {
    const provider = createRentcastProvider({
      apiKey: 'test',
      fetcher: async () =>
        new Response(JSON.stringify(fixture), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    })

    const result = await provider.lookup({
      street: '123 Main St',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.basics).toEqual({
      propertyType: 'Single Family',
      beds: 3,
      baths: 2,
      sqft: 1820,
      lotSizeSqft: 6500,
      yearBuilt: 1968,
    })
    expect(result.data.ownership?.currentOwner).toBe('John Smith')
    expect(result.data.ownership?.lastSalePrice).toBe(425000)
    expect(result.data.ownership?.lastSaleDate).toBe('2021-05-14T00:00:00.000Z')
    expect(result.data.tax?.assessedValue).toBe(410000)
    expect(result.data.tax?.taxAmount).toBe(7820)
    expect(result.data.tax?.taxYear).toBe(2024)
    expect(result.data.hazards?.floodZone).toBe('X')
  })

  it('returns not_found when the API returns an empty array', async () => {
    const provider = createRentcastProvider({
      apiKey: 'test',
      fetcher: async () =>
        new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } }),
    })

    const result = await provider.lookup({
      street: 'Nowhere',
      city: 'Nowhere',
      state: 'TX',
      zip: '00000',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('not_found')
  })

  it('returns rate_limited on a 429 response', async () => {
    const provider = createRentcastProvider({
      apiKey: 'test',
      fetcher: async () => new Response('rate limit', { status: 429 }),
    })

    const result = await provider.lookup({
      street: '123 Main St',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('rate_limited')
  })

  it('is disabled when apiKey is empty', () => {
    const provider = createRentcastProvider({ apiKey: '' })
    expect(provider.enabled).toBe(false)
  })
})
