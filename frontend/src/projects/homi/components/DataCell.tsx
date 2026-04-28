import type { ProviderResult } from '../lib/api'

export type DataCellProps = {
  result: ProviderResult
  /** Returns the value to render given a successful provider result, or undefined if the provider didn't supply this field. */
  pick: (data: NonNullable<Extract<ProviderResult, { ok: true }>['data']>) => string | number | undefined
}

export function DataCell({ result, pick }: DataCellProps) {
  if (!result.ok) {
    if (result.message === 'Not integrated') {
      return <span className="homi-cell homi-cell-disabled">Not integrated</span>
    }
    return <span className="homi-cell homi-cell-error">Error: {result.reason}</span>
  }
  const value = pick(result.data)
  if (value === undefined || value === '') {
    return <span className="homi-cell homi-cell-empty">—</span>
  }
  return <span className="homi-cell">{value}</span>
}
