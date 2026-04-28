import { useState } from 'react'

import { useAuth } from '../../auth/useAuth'
import { ComparisonGrid } from './components/ComparisonGrid'
import { SearchForm } from './components/SearchForm'
import { postLookup, type AddressInput, type LookupResponse } from './lib/api'

export function HomiPage() {
  const { session } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<LookupResponse | null>(null)
  const [submittedAddr, setSubmittedAddr] = useState<AddressInput | null>(null)

  async function handleLookup(addr: AddressInput) {
    if (!session?.access_token) {
      setError('You must be signed in.')
      return
    }
    setLoading(true)
    setError(null)
    setResponse(null)
    setSubmittedAddr(addr)
    try {
      const result = await postLookup(session.access_token, addr)
      setResponse(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="homi-page">
      <h1>Homi</h1>
      <p>Carfax for homes — proof of concept. Look up a property to compare data across providers.</p>

      <SearchForm onSubmit={handleLookup} disabled={loading} />

      {error ? <p className="homi-error">{error}</p> : null}

      {submittedAddr && response ? (
        <section className="homi-results">
          <h2>
            {submittedAddr.street}, {submittedAddr.city}, {submittedAddr.state} {submittedAddr.zip}
          </h2>
          <ComparisonGrid entries={response.results} />
        </section>
      ) : null}
    </div>
  )
}
