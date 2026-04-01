import Anthropic from '@anthropic-ai/sdk'

import type { MessageRow } from './embedTypes.js'

const MODEL =
  process.env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-4-20250514'

export const CONTACT_COLLECTION_ADDENDUM = `CONTACT DETAILS ARE NOT YET ON FILE FOR THIS CUSTOMER.

After acknowledging what they need, your immediate priority is to collect:
- Full name
- Service address (street, city, state/ZIP or equivalent)
- Phone number
- Email (optional — ask once; if they prefer phone only, skip email)

Ask for everything that is still missing in one concise, friendly message. Do not ask detailed technical or scheduling follow-ups about the job until name, phone, and service address are clearly provided in the thread. Email is optional; do not block the conversation on email.

If the customer already stated some of this in the thread, only ask for what is still missing. Once name, phone, and address are established, return to normal service intake questions.

Keep this turn brief and focused on contact collection; skip a long end-of-job summary until those details are on file.`

export type ExtractedContact = {
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  customer_address: string | null
}

export type ExtractedSessionInsights = ExtractedContact & {
  job_summary: string | null
  supplies: string[]
}

export function isContactRecordComplete(s: {
  customer_name?: string | null
  customer_phone?: string | null
  customer_address?: string | null
}): boolean {
  const n = s.customer_name?.trim()
  const p = s.customer_phone?.trim()
  const a = s.customer_address?.trim()
  return Boolean(n && p && a)
}

export function formatRowsAsTranscript(rows: MessageRow[]): string {
  const lines: string[] = []
  for (const row of rows) {
    const who = row.role === 'user' ? 'Customer' : 'Assistant'
    const text = row.content?.trim() ?? ''
    const imgs =
      row.image_paths?.length && row.role === 'user'
        ? ` [${row.image_paths.length} image(s) attached]`
        : ''
    if (text || imgs) {
      lines.push(`${who}: ${text}${imgs}`)
    }
  }
  return lines.join('\n\n')
}

/** Parsed supplies: always an array; empty if absent or invalid. */
function parseSupplies(v: unknown): string[] {
  if (v == null) return []
  if (!Array.isArray(v)) return []
  return v
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseJsonExtract(raw: string): ExtractedSessionInsights {
  const t = raw.trim()
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start === -1 || end <= start) {
    throw new Error('No JSON object in extract response')
  }
  const j = JSON.parse(t.slice(start, end + 1)) as Record<string, unknown>
  const str = (k: string) => {
    const v = j[k]
    if (v == null) return null
    if (typeof v !== 'string') return null
    const s = v.trim()
    return s.length ? s : null
  }
  return {
    customer_name: str('customer_name'),
    customer_phone: str('customer_phone'),
    customer_email: str('customer_email'),
    customer_address: str('customer_address'),
    job_summary: str('job_summary'),
    supplies: parseSupplies(j.supplies),
  }
}

export async function extractSessionInsightsFromTranscript(
  transcript: string,
): Promise<ExtractedSessionInsights> {
  const key = process.env.ANTHROPIC_API_KEY?.trim()
  if (!key) {
    throw Object.assign(new Error('ANTHROPIC_API_KEY is not configured'), {
      status: 503,
    })
  }
  const client = new Anthropic({ apiKey: key })

  const prompt = `Read this home-services intake chat transcript. Follow each field rule carefully.

Return ONLY valid JSON, no markdown, in this exact shape:
{"customer_name":string|null,"customer_phone":string|null,"customer_email":string|null,"customer_address":string|null,"job_summary":string|null,"supplies":string[]}

- Contact fields: only if the customer explicitly gave them (do not guess). Combine address into one string if split across messages.
- job_summary: one or two sentences summarizing the service work (scope, location in home, urgency). null if nothing substantive yet.
- supplies: always a JSON array (never null). Short strings only.

  DECIDE WHICH MODE FROM THE TRANSCRIPT:
  (A) If the customer has clearly provided full name, phone number, AND a service street address (city/state or ZIP may be included), treat intake contact as complete for this purpose. Then supplies must include: (1) anything explicitly mentioned in the thread, AND (2) typical materials and parts a licensed electrician would likely bring for the described work — aim for 3–14 items when job scope is clear (e.g. new kitchen outlet → GFCI or standard receptacle, wall plate, NM cable/Romex if a new run is implied, wire nuts, staples, voltage tester). Use generic descriptions; do not invent manufacturer part numbers or exact wire gauges unless stated.

  (B) If any of name, phone, or service address is still missing or only promised ("I'll text it"), only list supplies that were explicitly mentioned; use [] if none were mentioned.

Transcript:
---
${transcript}
---`

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  })
  const blocks = response.content.filter((b) => b.type === 'text')
  const raw = blocks.map((b) => (b as { text: string }).text).join('')
  return parseJsonExtract(raw)
}

/** @deprecated use extractSessionInsightsFromTranscript */
export async function extractContactFromTranscript(
  transcript: string,
): Promise<ExtractedContact> {
  const full = await extractSessionInsightsFromTranscript(transcript)
  return {
    customer_name: full.customer_name,
    customer_phone: full.customer_phone,
    customer_email: full.customer_email,
    customer_address: full.customer_address,
  }
}

export function mergeContact(
  existing: {
    customer_name?: string | null
    customer_phone?: string | null
    customer_email?: string | null
    customer_address?: string | null
    contact_collected_at?: string | null
  },
  extracted: ExtractedContact | ExtractedSessionInsights,
): {
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  customer_address: string | null
  contact_collected_at: string | null
} {
  const pick = (e: string | null, x: string | null | undefined) => {
    const ev = e?.trim()
    if (ev) return ev
    const xv = x?.trim()
    return xv ? xv : null
  }
  const name = pick(extracted.customer_name, existing.customer_name)
  const phone = pick(extracted.customer_phone, existing.customer_phone)
  const email = pick(extracted.customer_email, existing.customer_email)
  const address = pick(extracted.customer_address, existing.customer_address)
  const complete = isContactRecordComplete({
    customer_name: name,
    customer_phone: phone,
    customer_address: address,
  })
  const contact_collected_at = complete
    ? (existing.contact_collected_at ?? new Date().toISOString())
    : existing.contact_collected_at ?? null
  return {
    customer_name: name,
    customer_phone: phone,
    customer_email: email,
    customer_address: address,
    contact_collected_at,
  }
}

function normalizeSuppliesArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function mergeJobInsights(
  existing: { job_summary?: string | null; supplies?: unknown },
  extracted: ExtractedSessionInsights,
): { job_summary: string | null; supplies: string[] } {
  const prevSummary = existing.job_summary?.trim() || null
  const extSummary = extracted.job_summary?.trim() || null
  const job_summary = extSummary ?? prevSummary

  const prevList = normalizeSuppliesArray(existing.supplies)
  const set = new Set<string>(prevList)
  for (const s of extracted.supplies) {
    const t = s.trim()
    if (t) set.add(t)
  }
  return { job_summary, supplies: [...set] }
}
