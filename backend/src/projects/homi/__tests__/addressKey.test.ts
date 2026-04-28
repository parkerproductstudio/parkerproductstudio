import { describe, expect, it } from 'vitest'

import { normalizeAddressKey } from '../addressKey.js'

describe('normalizeAddressKey', () => {
  it('lowercases, hyphenates, and joins all fields', () => {
    expect(
      normalizeAddressKey({
        street: '123 Main St',
        city: 'Austin',
        state: 'TX',
        zip: '78701',
      }),
    ).toBe('123-main-st-austin-tx-78701')
  })

  it('collapses repeated whitespace and strips punctuation', () => {
    expect(
      normalizeAddressKey({
        street: '123  Main St.',
        city: 'Austin',
        state: 'TX',
        zip: '78701',
      }),
    ).toBe('123-main-st-austin-tx-78701')
  })

  it('is case-insensitive', () => {
    const a = normalizeAddressKey({
      street: '123 main st',
      city: 'austin',
      state: 'tx',
      zip: '78701',
    })
    const b = normalizeAddressKey({
      street: '123 MAIN ST',
      city: 'AUSTIN',
      state: 'TX',
      zip: '78701',
    })
    expect(a).toBe(b)
  })

  it('trims leading and trailing whitespace from inputs', () => {
    expect(
      normalizeAddressKey({
        street: '  123 Main St  ',
        city: 'Austin',
        state: 'TX',
        zip: '78701',
      }),
    ).toBe('123-main-st-austin-tx-78701')
  })
})
