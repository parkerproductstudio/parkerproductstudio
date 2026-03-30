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

function parseJsonExtract(raw: string): ExtractedContact {
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
  }
}

export async function extractContactFromTranscript(
  transcript: string,
): Promise<ExtractedContact> {
  const key = process.env.ANTHROPIC_API_KEY?.trim()
  if (!key) {
    throw Object.assign(new Error('ANTHROPIC_API_KEY is not configured'), {
      status: 503,
    })
  }
  const client = new Anthropic({ apiKey: key })
  const prompt = `Read this support chat transcript. Extract contact details the customer explicitly provided (not guesses).

Return ONLY valid JSON, no markdown, in this exact shape:
{"customer_name":string|null,"customer_phone":string|null,"customer_email":string|null,"customer_address":string|null}

Use null for anything not clearly stated. Combine address into one string if split across messages. Normalize phone to digits/plus/format as given.

Transcript:
---
${transcript}
---`

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  })
  const blocks = response.content.filter((b) => b.type === 'text')
  const raw = blocks.map((b) => (b as { text: string }).text).join('')
  return parseJsonExtract(raw)
}

export function mergeContact(
  existing: {
    customer_name?: string | null
    customer_phone?: string | null
    customer_email?: string | null
    customer_address?: string | null
    contact_collected_at?: string | null
  },
  extracted: ExtractedContact,
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
