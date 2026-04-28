export type Address = {
  street: string
  city: string
  state: string // 2-letter
  zip: string
}

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
    lastSaleDate?: string // ISO
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
  hazards?: {
    floodZone?: string
    fireRisk?: string
    [k: string]: unknown
  }
  valuation?: {
    estimate?: number
    estimateLow?: number
    estimateHigh?: number
    asOf?: string
  }
}

export type ProviderName = 'rentcast' | 'attom' | 'realestateapi'

export type ProviderResult =
  | { ok: true; data: NormalizedProperty; raw: unknown }
  | { ok: false; reason: 'not_found' | 'rate_limited' | 'error'; message: string }

export interface PropertyProvider {
  name: ProviderName
  enabled: boolean
  lookup(addr: Address): Promise<ProviderResult>
}
