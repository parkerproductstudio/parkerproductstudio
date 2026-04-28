import type {
  Address,
  NormalizedProperty,
  PropertyProvider,
  ProviderResult,
} from './types.js'

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>

type RentcastOpts = {
  apiKey: string
  fetcher?: Fetcher
}

export function createRentcastProvider(opts: RentcastOpts): PropertyProvider {
  const fetcher: Fetcher = opts.fetcher ?? ((url, init) => fetch(url, init))
  const apiKey = opts.apiKey.trim()

  return {
    name: 'rentcast',
    enabled: apiKey.length > 0,
    async lookup(addr: Address): Promise<ProviderResult> {
      if (!apiKey) {
        return { ok: false, reason: 'error', message: 'RentCast API key not set' }
      }

      const params = new URLSearchParams({
        address: `${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}`,
      })
      const url = `https://api.rentcast.io/v1/properties?${params.toString()}`

      let res: Response
      try {
        res = await fetcher(url, {
          method: 'GET',
          headers: { 'X-Api-Key': apiKey, accept: 'application/json' },
        })
      } catch (err) {
        return {
          ok: false,
          reason: 'error',
          message: err instanceof Error ? err.message : 'Network error',
        }
      }

      if (res.status === 429) {
        return { ok: false, reason: 'rate_limited', message: 'RentCast rate limit hit' }
      }
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        return {
          ok: false,
          reason: 'error',
          message: `RentCast HTTP ${res.status}: ${body.slice(0, 200)}`,
        }
      }

      const json = (await res.json().catch(() => null)) as unknown
      if (!Array.isArray(json) || json.length === 0) {
        return { ok: false, reason: 'not_found', message: 'No property record found' }
      }

      const record = json[0] as Record<string, unknown>
      return { ok: true, data: normalize(record), raw: record }
    },
  }
}

function normalize(r: Record<string, unknown>): NormalizedProperty {
  const out: NormalizedProperty = {}

  const basics = {
    propertyType: str(r.propertyType),
    beds: num(r.bedrooms),
    baths: num(r.bathrooms),
    sqft: num(r.squareFootage),
    lotSizeSqft: num(r.lotSize),
    yearBuilt: num(r.yearBuilt),
  }
  if (anyDefined(basics)) out.basics = basics

  const owner = r.owner as { names?: unknown } | undefined
  const ownerName = Array.isArray(owner?.names) ? owner!.names!.join(', ') : undefined
  const ownership = {
    currentOwner: ownerName && ownerName.length > 0 ? ownerName : undefined,
    lastSalePrice: num(r.lastSalePrice),
    lastSaleDate: str(r.lastSaleDate),
  }
  if (anyDefined(ownership)) out.ownership = ownership

  const assessments = (r.taxAssessments ?? {}) as Record<string, { value?: number; year?: number }>
  const taxes = (r.propertyTaxes ?? {}) as Record<string, { total?: number; year?: number }>
  const latestAssessmentYear = pickLatestYear(Object.keys(assessments))
  const latestTaxYear = pickLatestYear(Object.keys(taxes))
  const tax = {
    assessedValue: latestAssessmentYear ? num(assessments[latestAssessmentYear]?.value) : undefined,
    taxAmount: latestTaxYear ? num(taxes[latestTaxYear]?.total) : undefined,
    taxYear: latestTaxYear ? Number(latestTaxYear) : undefined,
    history: buildTaxHistory(assessments, taxes),
  }
  if (anyDefined(tax)) out.tax = tax

  const features = (r.features ?? {}) as Record<string, unknown>
  const hazards = { floodZone: str(features.floodZone) }
  if (anyDefined(hazards)) out.hazards = hazards

  return out
}

function pickLatestYear(years: string[]): string | undefined {
  if (years.length === 0) return undefined
  return [...years].sort().at(-1)
}

function buildTaxHistory(
  assessments: Record<string, { value?: number; year?: number }>,
  taxes: Record<string, { total?: number; year?: number }>,
): Array<{ year: number; assessed: number; tax: number }> | undefined {
  const years = new Set([...Object.keys(assessments), ...Object.keys(taxes)])
  const rows: Array<{ year: number; assessed: number; tax: number }> = []
  for (const y of years) {
    const assessed = assessments[y]?.value
    const tax = taxes[y]?.total
    if (typeof assessed === 'number' && typeof tax === 'number') {
      rows.push({ year: Number(y), assessed, tax })
    }
  }
  return rows.length > 0 ? rows.sort((a, b) => b.year - a.year) : undefined
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined
}

function anyDefined(obj: Record<string, unknown>): boolean {
  return Object.values(obj).some((v) => v !== undefined)
}
