import type { LookupEntry, NormalizedProperty } from '../lib/api'
import { DataCell } from './DataCell'

type Row = {
  label: string
  pick: (d: NormalizedProperty) => string | number | undefined
}

const fmtMoney = (v: number | undefined) =>
  typeof v === 'number' ? `$${v.toLocaleString()}` : undefined
const fmtSqft = (v: number | undefined) =>
  typeof v === 'number' ? `${v.toLocaleString()} sqft` : undefined
const fmtDate = (v: string | undefined) =>
  typeof v === 'string' ? v.slice(0, 10) : undefined

const SECTIONS: Array<{ heading: string; rows: Row[] }> = [
  {
    heading: 'Basics',
    rows: [
      { label: 'Property type', pick: (d) => d.basics?.propertyType },
      { label: 'Beds', pick: (d) => d.basics?.beds },
      { label: 'Baths', pick: (d) => d.basics?.baths },
      { label: 'Sqft', pick: (d) => fmtSqft(d.basics?.sqft) },
      { label: 'Lot size', pick: (d) => fmtSqft(d.basics?.lotSizeSqft) },
      { label: 'Year built', pick: (d) => d.basics?.yearBuilt },
    ],
  },
  {
    heading: 'Ownership & sale history',
    rows: [
      { label: 'Current owner', pick: (d) => d.ownership?.currentOwner },
      { label: 'Last sale price', pick: (d) => fmtMoney(d.ownership?.lastSalePrice) },
      { label: 'Last sale date', pick: (d) => fmtDate(d.ownership?.lastSaleDate) },
    ],
  },
  {
    heading: 'Tax & assessment',
    rows: [
      { label: 'Assessed value', pick: (d) => fmtMoney(d.tax?.assessedValue) },
      { label: 'Tax amount', pick: (d) => fmtMoney(d.tax?.taxAmount) },
      { label: 'Tax year', pick: (d) => d.tax?.taxYear },
    ],
  },
  {
    heading: 'Permits',
    rows: [
      {
        label: 'Permit count',
        pick: (d) => (d.permits ? d.permits.length : undefined),
      },
    ],
  },
  {
    heading: 'Hazards',
    rows: [
      { label: 'Flood zone', pick: (d) => d.hazards?.floodZone },
      { label: 'Fire risk', pick: (d) => d.hazards?.fireRisk },
    ],
  },
  {
    heading: 'Valuation',
    rows: [
      { label: 'Estimate', pick: (d) => fmtMoney(d.valuation?.estimate) },
      { label: 'Range low', pick: (d) => fmtMoney(d.valuation?.estimateLow) },
      { label: 'Range high', pick: (d) => fmtMoney(d.valuation?.estimateHigh) },
      { label: 'As of', pick: (d) => fmtDate(d.valuation?.asOf) },
    ],
  },
]

export function ComparisonGrid({ entries }: { entries: LookupEntry[] }) {
  return (
    <table className="homi-grid">
      <thead>
        <tr>
          <th />
          {entries.map((e) => (
            <th key={e.provider}>
              {e.provider}
              {e.fromCache ? <span className="homi-cache-badge"> (cache)</span> : null}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {SECTIONS.map((section) => (
          <Section key={section.heading} heading={section.heading} rows={section.rows} entries={entries} />
        ))}
      </tbody>
    </table>
  )
}

function Section({
  heading,
  rows,
  entries,
}: {
  heading: string
  rows: Row[]
  entries: LookupEntry[]
}) {
  return (
    <>
      <tr className="homi-grid-section">
        <th colSpan={entries.length + 1}>{heading}</th>
      </tr>
      {rows.map((row) => (
        <tr key={row.label}>
          <th scope="row">{row.label}</th>
          {entries.map((e) => (
            <td key={e.provider}>
              <DataCell result={e.result} pick={row.pick} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
