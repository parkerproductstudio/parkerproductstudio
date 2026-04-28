import type { Address } from './providers/types.js'

/** Lowercased, hyphenated, punctuation-stripped, whitespace-collapsed cache key. */
export function normalizeAddressKey(addr: Address): string {
  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}\s]/gu, '') // strip punctuation
      .trim()
      .split(/\s+/)
      .join('-')

  return [clean(addr.street), clean(addr.city), clean(addr.state), clean(addr.zip)]
    .filter(Boolean)
    .join('-')
}
