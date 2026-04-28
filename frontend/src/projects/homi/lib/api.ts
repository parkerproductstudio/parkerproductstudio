import { apiUrl } from '../../../lib/apiUrl'

export type ProviderName = 'rentcast' | 'attom' | 'realestateapi'

export type NormalizedProperty = {
  basics?: {
    propertyType?: string
    beds?: number
    baths?: number
    sqft?: number
    lotSizeSqft?: number
    yearBuilt?: number
  }
  ownership?: {
    currentOwner?: string
    lastSalePrice?: number
    lastSaleDate?: string
    priorSales?: Array<{ price: number; date: string }>
  }
  tax?: {
    assessedValue?: number
    taxAmount?: number
    taxYear?: number
    history?: Array<{ year: number; assessed: number; tax: number }>
  }
  permits?: Array<{
    type?: string
    description?: string
    status?: string
    issuedDate?: string
    value?: number
  }>
  hazards?: { floodZone?: string; fireRisk?: string; [k: string]: unknown }
  valuation?: {
    estimate?: number
    estimateLow?: number
    estimateHigh?: number
    asOf?: string
  }
}

export type ProviderResult =
  | { ok: true; data: NormalizedProperty; raw?: unknown }
  | { ok: false; reason: 'not_found' | 'rate_limited' | 'error'; message: string }

export type LookupEntry = {
  provider: ProviderName
  result: ProviderResult
  fromCache: boolean
}

export type LookupResponse = { searchId: string; results: LookupEntry[] }

export type AddressInput = { street: string; city: string; state: string; zip: string }

export async function postLookup(
  accessToken: string,
  addr: AddressInput,
): Promise<LookupResponse> {
  const res = await fetch(apiUrl('/api/projects/homi/lookup'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(addr),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `Lookup failed: HTTP ${res.status}`)
  }
  return (await res.json()) as LookupResponse
}
