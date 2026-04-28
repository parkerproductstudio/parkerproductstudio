import { useState, type FormEvent } from 'react'

import type { AddressInput } from '../lib/api'

export type SearchFormProps = {
  onSubmit: (addr: AddressInput) => void
  disabled?: boolean
}

export function SearchForm({ onSubmit, disabled }: SearchFormProps) {
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handle(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!street.trim()) return setError('Street is required')
    if (!city.trim()) return setError('City is required')
    if (!/^[A-Za-z]{2}$/.test(state.trim())) return setError('State must be a 2-letter code')
    if (!/^\d{5}(-\d{4})?$/.test(zip.trim())) return setError('Zip must be 5 or 9 digits')
    onSubmit({
      street: street.trim(),
      city: city.trim(),
      state: state.trim().toUpperCase(),
      zip: zip.trim(),
    })
  }

  return (
    <form onSubmit={handle} className="homi-search-form">
      <label>
        Street
        <input value={street} onChange={(e) => setStreet(e.target.value)} disabled={disabled} />
      </label>
      <label>
        City
        <input value={city} onChange={(e) => setCity(e.target.value)} disabled={disabled} />
      </label>
      <label>
        State
        <input
          value={state}
          onChange={(e) => setState(e.target.value)}
          maxLength={2}
          disabled={disabled}
        />
      </label>
      <label>
        Zip
        <input value={zip} onChange={(e) => setZip(e.target.value)} disabled={disabled} />
      </label>
      {error ? <p className="homi-error">{error}</p> : null}
      <button type="submit" disabled={disabled}>
        {disabled ? 'Looking up…' : 'Look up property'}
      </button>
    </form>
  )
}
