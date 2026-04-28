import { normalizeAddressKey } from './addressKey.js'
import { readCache as defaultReadCache, writeCache as defaultWriteCache } from './cache.js'
import { getProviders } from './providers/registry.js'
import type {
  Address,
  ProviderName,
  ProviderResult,
  PropertyProvider,
} from './providers/types.js'

export type LookupEntry = {
  provider: ProviderName
  result: ProviderResult
  fromCache: boolean
}

export type LookupDeps = {
  providers?: PropertyProvider[]
  readCache?: (provider: ProviderName, addressKey: string) => Promise<ProviderResult | null>
  writeCache?: (
    provider: ProviderName,
    addr: Address,
    addressKey: string,
    result: ProviderResult,
  ) => Promise<void>
}

export async function lookupProperty(
  addr: Address,
  deps: LookupDeps = {},
): Promise<LookupEntry[]> {
  const providers = deps.providers ?? getProviders()
  const readCache = deps.readCache ?? defaultReadCache
  const writeCache = deps.writeCache ?? defaultWriteCache
  const key = normalizeAddressKey(addr)

  return Promise.all(
    providers.map(async (p): Promise<LookupEntry> => {
      if (!p.enabled) {
        return {
          provider: p.name,
          result: { ok: false, reason: 'error', message: 'Not integrated' },
          fromCache: false,
        }
      }
      const cached = await readCache(p.name, key)
      if (cached) {
        return { provider: p.name, result: cached, fromCache: true }
      }
      const fresh = await p.lookup(addr)
      await writeCache(p.name, addr, key, fresh)
      return { provider: p.name, result: fresh, fromCache: false }
    }),
  )
}
