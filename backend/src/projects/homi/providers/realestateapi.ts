import type { Address, PropertyProvider, ProviderResult } from './types.js'

export function createRealEstateApiProvider(opts: { apiKey: string }): PropertyProvider {
  const apiKey = opts.apiKey.trim()
  return {
    name: 'realestateapi',
    enabled: apiKey.length > 0,
    async lookup(_addr: Address): Promise<ProviderResult> {
      return {
        ok: false,
        reason: 'error',
        message: 'RealEstate API integration not implemented yet',
      }
    },
  }
}
