import Anthropic from '@anthropic-ai/sdk'
import type {
  ContentBlock,
  ContentBlockParam,
  ImageBlockParam,
  MessageParam,
  TextBlock,
} from '@anthropic-ai/sdk/resources/messages'
import type { SupabaseClient } from '@supabase/supabase-js'

import { fitImageForAnthropic } from './fitImageForAnthropic.js'
import type { MessageRow } from './embedTypes.js'

const BUCKET = 'home-services-embed'

// claude-3-5-sonnet-20241022 was retired 2025-10-28; use current Sonnet (see model deprecations in Claude docs).
const MODEL =
  process.env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-4-20250514'

function systemPrompt(companyName: string): string {
  return `You are the intake assistant for ${companyName}, a home services company (e.g. electrical work). Your job is to:
- Understand what service the customer needs and any safety-relevant context.
- Ask concise follow-up questions until you have enough detail for a technician to respond (scope, location in the home, timing, access constraints).
- When photos would materially help (panel labels, damage, room context), ask the customer to upload one or more clear pictures and explain what to capture.
- Stay practical and friendly; do not give legal advice or guarantee pricing.
- If the customer seems to describe an emergency (fire, smoke, someone hurt), tell them to call emergency services and their utility if relevant, then continue gathering details if appropriate.

When you have enough information for a human to triage the job, end your reply with a short summary bullet list of what you collected. You may still answer one more clarifying question if they ask.`
}

const allowedImageTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

export function validateImagePayload(
  images: unknown,
): { data: string; mediaType: string }[] {
  if (images == null) return []
  if (!Array.isArray(images)) {
    throw Object.assign(new Error('images must be an array'), { status: 400 })
  }
  const out: { data: string; mediaType: string }[] = []
  for (const item of images) {
    if (!item || typeof item !== 'object') {
      throw Object.assign(new Error('invalid image entry'), { status: 400 })
    }
    const data = (item as { data?: unknown }).data
    const mediaType = (item as { mediaType?: unknown }).mediaType
    if (typeof data !== 'string' || !data.trim()) {
      throw Object.assign(new Error('each image needs data (base64)'), {
        status: 400,
      })
    }
    if (typeof mediaType !== 'string' || !allowedImageTypes.has(mediaType)) {
      throw Object.assign(
        new Error('each image needs mediaType image/jpeg, png, webp, or gif'),
        { status: 400 },
      )
    }
    out.push({ data, mediaType })
  }
  if (out.length > 6) {
    throw Object.assign(new Error('at most 6 images per message'), {
      status: 400,
    })
  }
  return out
}

async function downloadImageAsBase64(
  supabase: SupabaseClient,
  path: string,
): Promise<{ mediaType: string; base64: string }> {
  const { data, error } = await supabase.storage.from(BUCKET).download(path)
  if (error || !data) {
    throw new Error(`storage download failed: ${error?.message ?? 'unknown'}`)
  }
  const buf = Buffer.from(await data.arrayBuffer())
  const fitted = await fitImageForAnthropic(buf)
  return {
    mediaType: 'image/jpeg',
    base64: fitted.toString('base64'),
  }
}

async function rowToUserContent(
  supabase: SupabaseClient,
  row: MessageRow,
): Promise<MessageParam> {
  const blocks: ImageBlockParam[] = []
  for (const p of row.image_paths ?? []) {
    const { base64 } = await downloadImageAsBase64(supabase, p)
    blocks.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: base64,
      },
    })
  }
  const text = row.content?.trim() ?? ''
  if (blocks.length === 0) {
    return { role: 'user', content: text || '(no text)' }
  }
  const content: ContentBlockParam[] = [...blocks]
  if (text) {
    content.push({ type: 'text', text })
  }
  return { role: 'user', content }
}

export async function buildClaudeMessages(
  supabase: SupabaseClient,
  rows: MessageRow[],
): Promise<MessageParam[]> {
  const out: MessageParam[] = []
  for (const row of rows) {
    if (row.role === 'assistant') {
      out.push({ role: 'assistant', content: row.content })
    } else {
      out.push(await rowToUserContent(supabase, row))
    }
  }
  return out
}

function extractText(blocks: ContentBlock[]): string {
  return blocks
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()
}

export async function runClaudeReply(options: {
  supabase: SupabaseClient
  companyName: string
  historyRows: MessageRow[]
  systemAddendum?: string
}): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY?.trim()
  if (!key) {
    throw Object.assign(new Error('ANTHROPIC_API_KEY is not configured'), {
      status: 503,
    })
  }
  const client = new Anthropic({ apiKey: key })
  const messages = await buildClaudeMessages(
    options.supabase,
    options.historyRows,
  )
  const base = systemPrompt(options.companyName)
  const system = options.systemAddendum
    ? `${base}\n\n---\n\n${options.systemAddendum}`
    : base
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system,
    messages,
  })
  const text = extractText(response.content)
  if (!text) {
    throw Object.assign(new Error('empty model response'), { status: 502 })
  }
  return text
}
