import { createAttomProvider } from './attom.js'
import { createRealEstateApiProvider } from './realestateapi.js'
import { createRentcastProvider } from './rentcast.js'
import type { PropertyProvider } from './types.js'

let cached: PropertyProvider[] | null = null

export function getProviders(): PropertyProvider[] {
  if (cached) return cached
  cached = [
    createRentcastProvider({ apiKey: process.env.RENTCAST_API_KEY ?? '' }),
    createAttomProvider({ apiKey: process.env.ATTOM_API_KEY ?? '' }),
    createRealEstateApiProvider({ apiKey: process.env.REALESTATEAPI_KEY ?? '' }),
  ]
  return cached
}

/** Test-only: reset the cached registry so env-var changes take effect. */
export function _resetProvidersForTest(): void {
  cached = null
}
