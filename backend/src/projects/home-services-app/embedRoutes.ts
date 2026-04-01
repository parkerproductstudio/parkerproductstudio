import { randomUUID } from 'node:crypto'

import { Router, type Request } from 'express'

import { getSupabaseAdmin } from '../../lib/supabaseAdmin.js'
import { runClaudeReply, validateImagePayload } from './claudeChat.js'
import { fitImageForAnthropic } from './fitImageForAnthropic.js'
import {
  CONTACT_COLLECTION_ADDENDUM,
  extractSessionInsightsFromTranscript,
  formatRowsAsTranscript,
  isContactRecordComplete,
  mergeContact,
  mergeJobInsights,
} from './contactExtract.js'
import { isAllowedEmbedStoragePath } from './embedStoragePath.js'
import type { EmbedCompany, MessageRow, SessionRow } from './embedTypes.js'

export const homeServicesEmbedRouter = Router()

type ReqWithCompany = Request & { embedCompany?: EmbedCompany }

function openingMessage(company: EmbedCompany): string {
  return `Thanks for contacting ${company.name}. I'm here to help you request service. In a sentence or two, what do you need help with today?`
}

function getEmbedKey(req: Request): string | null {
  const h = req.headers['x-embed-key']
  if (typeof h === 'string' && h.trim()) return h.trim()
  const q = req.query.embedKey
  if (typeof q === 'string' && q.trim()) return q.trim()
  return null
}

function assertEmbedOrigin(req: Request, company: EmbedCompany): void {
  const list = company.allowed_origins ?? []
  if (list.length === 0) return
  const origin = req.headers.origin
  if (!origin) return
  if (!list.includes(origin)) {
    throw Object.assign(new Error('Origin is not allowed for this embed key'), {
      status: 403,
    })
  }
}

async function loadCompanyByKey(key: string): Promise<EmbedCompany | null> {
  const supabase = getSupabaseAdmin()
  if (!supabase) return null
  const { data, error } = await supabase
    .from('home_services_companies')
    .select('id, slug, name, allowed_origins')
    .eq('embed_public_key', key)
    .maybeSingle()
  if (error || !data) return null
  return {
    id: data.id as string,
    slug: data.slug as string,
    name: data.name as string,
    allowed_origins: (data.allowed_origins as string[]) ?? [],
  }
}

homeServicesEmbedRouter.use(async (req, res, next) => {
  if (req.method === 'OPTIONS') {
    next()
    return
  }
  try {
    const key = getEmbedKey(req)
    if (!key) {
      res.status(401).json({ error: 'Missing X-Embed-Key header or embedKey query' })
      return
    }
    const company = await loadCompanyByKey(key)
    if (!company) {
      res.status(401).json({ error: 'Invalid embed key' })
      return
    }
    assertEmbedOrigin(req, company)
    ;(req as ReqWithCompany).embedCompany = company
    next()
  } catch (e: unknown) {
    const status = (e as { status?: number }).status ?? 500
    const msg = e instanceof Error ? e.message : 'Error'
    res.status(status).json({ error: msg })
  }
})

homeServicesEmbedRouter.post('/sessions', async (req, res) => {
  const supabase = getSupabaseAdmin()
  const company = (req as ReqWithCompany).embedCompany
  if (!supabase || !company) {
    res.status(503).json({ error: 'Server data store is not configured' })
    return
  }
  const { data: session, error: sErr } = await supabase
    .from('home_services_sessions')
    .insert({ company_id: company.id })
    .select('id, company_id, status, created_at, updated_at')
    .single()
  if (sErr || !session) {
    res.status(500).json({ error: sErr?.message ?? 'Could not create session' })
    return
  }
  const row = session as SessionRow
  const welcome = openingMessage(company)
  const { error: mErr } = await supabase.from('home_services_messages').insert({
    session_id: row.id,
    role: 'assistant',
    content: welcome,
    image_paths: [],
  })
  if (mErr) {
    res.status(500).json({ error: mErr.message })
    return
  }
  res.status(201).json({
    sessionId: row.id,
    company: { slug: company.slug, name: company.name },
    openingMessage: welcome,
  })
})

homeServicesEmbedRouter.get('/sessions/:sessionId/messages', async (req, res) => {
  const supabase = getSupabaseAdmin()
  const company = (req as ReqWithCompany).embedCompany
  if (!supabase || !company) {
    res.status(503).json({ error: 'Server data store is not configured' })
    return
  }
  const sessionId = req.params.sessionId
  const { data: sess, error: se } = await supabase
    .from('home_services_sessions')
    .select('id, company_id')
    .eq('id', sessionId)
    .maybeSingle()
  if (se || !sess || (sess as { company_id: string }).company_id !== company.id) {
    res.status(404).json({ error: 'Session not found' })
    return
  }
  const { data: rows, error: me } = await supabase
    .from('home_services_messages')
    .select('id, session_id, role, content, image_paths, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
  if (me) {
    res.status(500).json({ error: me.message })
    return
  }
  res.json({ messages: rows ?? [] })
})

homeServicesEmbedRouter.get('/sessions/:sessionId/image-url', async (req, res) => {
  const supabase = getSupabaseAdmin()
  const company = (req as ReqWithCompany).embedCompany
  if (!supabase || !company) {
    res.status(503).json({ error: 'Server data store is not configured' })
    return
  }
  const sessionId = req.params.sessionId
  const raw = req.query.path
  if (typeof raw !== 'string' || !raw.trim()) {
    res.status(400).json({ error: 'Missing path query parameter' })
    return
  }
  const objectPath = decodeURIComponent(raw.trim())

  const { data: sess, error: se } = await supabase
    .from('home_services_sessions')
    .select('id, company_id')
    .eq('id', sessionId)
    .maybeSingle()
  if (se || !sess || (sess as { company_id: string }).company_id !== company.id) {
    res.status(404).json({ error: 'Session not found' })
    return
  }

  if (!isAllowedEmbedStoragePath(company.id, sessionId, objectPath)) {
    res.status(400).json({ error: 'Invalid image path' })
    return
  }

  const { data, error } = await supabase.storage
    .from('home-services-embed')
    .createSignedUrl(objectPath, 3600)
  if (error || !data?.signedUrl) {
    res.status(404).json({ error: error?.message ?? 'Could not sign image URL' })
    return
  }
  res.json({ url: data.signedUrl })
})

homeServicesEmbedRouter.post('/sessions/:sessionId/messages', async (req, res) => {
  const supabase = getSupabaseAdmin()
  const company = (req as ReqWithCompany).embedCompany
  if (!supabase || !company) {
    res.status(503).json({ error: 'Server data store is not configured' })
    return
  }
  const sessionId = req.params.sessionId
  const text =
    typeof req.body?.text === 'string' ? req.body.text.trim() : ''
  let images: { data: string; mediaType: string }[] = []
  try {
    images = validateImagePayload(req.body?.images)
  } catch (e: unknown) {
    const status = (e as { status?: number }).status ?? 400
    const msg = e instanceof Error ? e.message : 'Bad request'
    res.status(status).json({ error: msg })
    return
  }
  if (!text && images.length === 0) {
    res.status(400).json({ error: 'Send text and/or images' })
    return
  }

  const { data: sess, error: se } = await supabase
    .from('home_services_sessions')
    .select(
      'id, company_id, status, customer_name, customer_phone, customer_email, customer_address, contact_collected_at, job_summary, supplies',
    )
    .eq('id', sessionId)
    .maybeSingle()
  if (se || !sess || (sess as { company_id: string }).company_id !== company.id) {
    res.status(404).json({ error: 'Session not found' })
    return
  }
  if ((sess as { status: string }).status !== 'open') {
    res.status(409).json({ error: 'Session is closed' })
    return
  }

  const maxRawBytes = 14 * 1024 * 1024
  const imagePaths: string[] = []
  for (const img of images) {
    let buf: Buffer
    try {
      buf = Buffer.from(img.data, 'base64')
    } catch {
      res.status(400).json({ error: 'Invalid base64 image data' })
      return
    }
    if (buf.length > maxRawBytes) {
      res.status(400).json({
        error:
          'Each image is too large to upload (max ~14 MB before we resize). Try one photo at a time.',
      })
      return
    }
    let fitted: Buffer
    try {
      fitted = await fitImageForAnthropic(buf)
    } catch (e: unknown) {
      const status = (e as { status?: number }).status ?? 400
      const msg =
        e instanceof Error ? e.message : 'Could not process this image format'
      res.status(status).json({ error: msg })
      return
    }
    const path = `${company.id}/${sessionId}/${randomUUID()}.jpg`
    const { error: upErr } = await supabase.storage
      .from('home-services-embed')
      .upload(path, fitted, { contentType: 'image/jpeg', upsert: false })
    if (upErr) {
      res.status(500).json({ error: upErr.message })
      return
    }
    imagePaths.push(path)
  }

  const { error: insUser } = await supabase.from('home_services_messages').insert({
    session_id: sessionId,
    role: 'user',
    content: text,
    image_paths: imagePaths,
  })
  if (insUser) {
    res.status(500).json({ error: insUser.message })
    return
  }

  const { data: history, error: hErr } = await supabase
    .from('home_services_messages')
    .select('id, session_id, role, content, image_paths, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
  if (hErr || !history) {
    res.status(500).json({ error: hErr?.message ?? 'Could not load history' })
    return
  }

  const sessionContact = sess as SessionRow & {
    customer_name?: string | null
    customer_phone?: string | null
    customer_email?: string | null
    customer_address?: string | null
    contact_collected_at?: string | null
    job_summary?: string | null
    supplies?: unknown
  }
  const contactComplete = isContactRecordComplete(sessionContact)
  const systemAddendum = contactComplete ? undefined : CONTACT_COLLECTION_ADDENDUM

  let assistantText: string
  try {
    assistantText = await runClaudeReply({
      supabase,
      companyName: company.name,
      historyRows: history as MessageRow[],
      systemAddendum,
    })
  } catch (e: unknown) {
    const status = (e as { status?: number }).status ?? 500
    const msg = e instanceof Error ? e.message : 'Model error'
    res.status(status).json({ error: msg })
    return
  }

  const { error: insAsst } = await supabase.from('home_services_messages').insert({
    session_id: sessionId,
    role: 'assistant',
    content: assistantText,
    image_paths: [],
  })
  if (insAsst) {
    res.status(500).json({ error: insAsst.message })
    return
  }

  try {
    const pendingAssistant: MessageRow = {
      id: 'pending',
      session_id: sessionId,
      role: 'assistant',
      content: assistantText,
      image_paths: [],
      created_at: new Date().toISOString(),
    }
    const transcript = formatRowsAsTranscript([
      ...(history as MessageRow[]),
      pendingAssistant,
    ])
    const extracted = await extractSessionInsightsFromTranscript(transcript)
    const mergedContact = mergeContact(sessionContact, extracted)
    const mergedJob = mergeJobInsights(sessionContact, extracted)
    const { error: upSession } = await supabase
      .from('home_services_sessions')
      .update({
        customer_name: mergedContact.customer_name,
        customer_phone: mergedContact.customer_phone,
        customer_email: mergedContact.customer_email,
        customer_address: mergedContact.customer_address,
        contact_collected_at: mergedContact.contact_collected_at,
        job_summary: mergedJob.job_summary,
        supplies: mergedJob.supplies,
      })
      .eq('id', sessionId)
    if (upSession) {
      console.warn('[home-services] session insights update failed', upSession.message)
    }
  } catch (err) {
    console.warn('[home-services] session insights extraction failed', err)
  }

  res.json({
    assistantMessage: {
      role: 'assistant',
      content: assistantText,
      image_paths: [],
    },
  })
})
