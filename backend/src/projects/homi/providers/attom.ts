import type { Address, PropertyProvider, ProviderResult } from './types.js'

export function createAttomProvider(opts: { apiKey: string }): PropertyProvider {
  const apiKey = opts.apiKey.trim()
  return {
    name: 'attom',
    enabled: apiKey.length > 0,
    async lookup(_addr: Address): Promise<ProviderResult> {
      return {
        ok: false,
        reason: 'error',
        message: 'Attom integration not implemented yet',
      }
    },
  }
}
