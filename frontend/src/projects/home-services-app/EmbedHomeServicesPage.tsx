import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import { useAuth } from '../../auth/useAuth'
import { apiUrl } from '../../lib/apiUrl'

const EMBED_API = '/api/public/home-services'
const SESSION_STORAGE_PREFIX = 'parker-hs-embed:v1'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  image_paths: string[]
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => {
      const s = r.result
      if (typeof s !== 'string') {
        reject(new Error('read failed'))
        return
      }
      const comma = s.indexOf(',')
      resolve(comma >= 0 ? s.slice(comma + 1) : s)
    }
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

type StoredEmbedSession = { sessionId: string; companyName: string }

function sessionKey(companySlug: string | undefined, embedKey: string) {
  return `${SESSION_STORAGE_PREFIX}:${companySlug ?? '_'}:${embedKey}`
}

function readStoredSession(
  companySlug: string | undefined,
  embedKey: string,
): StoredEmbedSession | null {
  try {
    const raw = sessionStorage.getItem(sessionKey(companySlug, embedKey))
    if (!raw) return null
    const j = JSON.parse(raw) as StoredEmbedSession
    if (typeof j.sessionId === 'string' && typeof j.companyName === 'string') {
      return j
    }
  } catch {
    /* ignore */
  }
  return null
}

function writeStoredSession(
  companySlug: string | undefined,
  embedKey: string,
  data: StoredEmbedSession,
) {
  try {
    sessionStorage.setItem(sessionKey(companySlug, embedKey), JSON.stringify(data))
  } catch {
    /* quota / private mode */
  }
}

function clearStoredSession(companySlug: string | undefined, embedKey: string) {
  try {
    sessionStorage.removeItem(sessionKey(companySlug, embedKey))
  } catch {
    /* ignore */
  }
}

function PendingImagePreview({ file }: { file: File }) {
  const url = useMemo(() => URL.createObjectURL(file), [file])
  useEffect(() => {
    return () => URL.revokeObjectURL(url)
  }, [url])
  return (
    <img
      src={url}
      alt=""
      className="embed-hs-chat-img embed-hs-pending-img"
    />
  )
}

function EmbedMessageImage({
  apiBase,
  sessionId,
  storagePath,
  fetchHeaders,
}: {
  apiBase: string
  sessionId: string
  storagePath: string
  fetchHeaders: () => HeadersInit
}) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const r = await fetch(
          `${apiBase}/sessions/${sessionId}/image-url?path=${encodeURIComponent(storagePath)}`,
          { headers: fetchHeaders() },
        )
        const j = (await r.json().catch(() => ({}))) as { url?: string }
        if (cancelled) return
        if (r.ok && j.url) setSrc(j.url)
        else setFailed(true)
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [apiBase, sessionId, storagePath, fetchHeaders])

  if (failed) {
    return <p className="embed-hs-attach">Could not load photo.</p>
  }
  if (!src) {
    return <p className="embed-hs-attach">Loading photo…</p>
  }
  return (
    <img
      src={src}
      alt=""
      className="embed-hs-chat-img"
      loading="lazy"
    />
  )
}

function EmbedMessageImages({
  apiBase,
  sessionId,
  paths,
  fetchHeaders,
}: {
  apiBase: string
  sessionId: string
  paths: string[]
  fetchHeaders: () => HeadersInit
}) {
  if (!paths?.length) return null
  return (
    <div className="embed-hs-img-grid">
      {paths.map((p) => (
        <EmbedMessageImage
          key={p}
          apiBase={apiBase}
          sessionId={sessionId}
          storagePath={p}
          fetchHeaders={fetchHeaders}
        />
      ))}
    </div>
  )
}

export function EmbedHomeServicesPage() {
  const { session } = useAuth()
  const { companySlug } = useParams<{ companySlug: string }>()
  const [searchParams] = useSearchParams()
  const embedKey =
    searchParams.get('embedKey')?.trim() ||
    (import.meta.env.VITE_HOME_SERVICES_EMBED_KEY as string | undefined)?.trim() ||
    ''

  const [companyName, setCompanyName] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [startingFresh, setStartingFresh] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const base = apiUrl(EMBED_API)

  const headers = useCallback(
    (json = false): HeadersInit => {
      const h: Record<string, string> = { 'X-Embed-Key': embedKey }
      if (json) h['Content-Type'] = 'application/json'
      return h
    },
    [embedKey],
  )

  const fetchHeaders = useCallback(() => headers(false), [headers])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!embedKey) {
      setLoading(false)
      setError(
        'Add your embed key: set VITE_HOME_SERVICES_EMBED_KEY or use ?embedKey= in the URL for testing.',
      )
      return
    }

    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const stored = readStoredSession(companySlug, embedKey)
        if (stored?.sessionId) {
          const mr = await fetch(`${base}/sessions/${stored.sessionId}/messages`, {
            headers: headers(),
          })
          const mj = (await mr.json().catch(() => ({}))) as {
            error?: string
            messages?: ChatMessage[]
          }
          if (mr.ok && !cancelled) {
            setSessionId(stored.sessionId)
            setCompanyName(stored.companyName)
            setMessages(mj.messages ?? [])
            setLoading(false)
            return
          }
          clearStoredSession(companySlug, embedKey)
        }

        const r = await fetch(`${base}/sessions`, {
          method: 'POST',
          headers: headers(true),
          body: '{}',
        })
        const j = (await r.json().catch(() => ({}))) as {
          error?: string
          sessionId?: string
          company?: { name?: string; slug?: string }
        }
        if (!r.ok) {
          throw new Error(j.error ?? r.statusText)
        }
        if (cancelled) return
        if (j.company?.slug && companySlug && j.company.slug !== companySlug) {
          setError(
            `This embed key is for “${j.company.slug}”, not “${companySlug}”. Use the matching URL or key.`,
          )
          setLoading(false)
          return
        }
        const name = j.company?.name ?? companySlug ?? 'Home services'
        setSessionId(j.sessionId ?? null)
        setCompanyName(name)
        if (j.sessionId) {
          writeStoredSession(companySlug, embedKey, {
            sessionId: j.sessionId,
            companyName: name,
          })
          const mr = await fetch(`${base}/sessions/${j.sessionId}/messages`, {
            headers: headers(),
          })
          const mj = (await mr.json().catch(() => ({}))) as {
            error?: string
            messages?: ChatMessage[]
          }
          if (!mr.ok) {
            throw new Error(mj.error ?? mr.statusText)
          }
          if (!cancelled) setMessages(mj.messages ?? [])
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not start session')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [base, companySlug, embedKey, headers])

  async function reloadMessages(sid: string) {
    const r = await fetch(`${base}/sessions/${sid}/messages`, {
      headers: headers(),
    })
    const j = (await r.json().catch(() => ({}))) as {
      error?: string
      messages?: ChatMessage[]
    }
    if (!r.ok) throw new Error(j.error ?? r.statusText)
    setMessages(j.messages ?? [])
  }

  async function startNewConversation() {
    if (!embedKey) return
    clearStoredSession(companySlug, embedKey)
    setSessionId(null)
    setMessages([])
    setText('')
    setFiles([])
    setError(null)
    setStartingFresh(true)
    try {
      const r = await fetch(`${base}/sessions`, {
        method: 'POST',
        headers: headers(true),
        body: '{}',
      })
      const j = (await r.json().catch(() => ({}))) as {
        error?: string
        sessionId?: string
        company?: { name?: string; slug?: string }
      }
      if (!r.ok) {
        throw new Error(j.error ?? r.statusText)
      }
      if (j.company?.slug && companySlug && j.company.slug !== companySlug) {
        setError(
          `This embed key is for “${j.company.slug}”, not “${companySlug}”. Use the matching URL or key.`,
        )
        return
      }
      const name = j.company?.name ?? companySlug ?? 'Home services'
      setSessionId(j.sessionId ?? null)
      setCompanyName(name)
      if (j.sessionId) {
        writeStoredSession(companySlug, embedKey, {
          sessionId: j.sessionId,
          companyName: name,
        })
        await reloadMessages(j.sessionId)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start a new conversation')
    } finally {
      setStartingFresh(false)
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!sessionId || sending) return
    const t = text.trim()
    if (!t && files.length === 0) return

    setSending(true)
    setError(null)
    try {
      const images: { data: string; mediaType: string }[] = []
      for (const f of files) {
        const data = await fileToBase64(f)
        const mediaType = f.type || 'image/jpeg'
        images.push({ data, mediaType })
      }
      const r = await fetch(`${base}/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify({ text: t, images }),
      })
      const j = (await r.json().catch(() => ({}))) as {
        error?: string
        assistantMessage?: { content: string }
      }
      if (r.status === 409) {
        clearStoredSession(companySlug, embedKey)
        setError('This conversation was closed. Refresh the page or use “Start over”.')
        setSessionId(null)
        setMessages([])
        return
      }
      if (!r.ok) throw new Error(j.error ?? r.statusText)
      await reloadMessages(sessionId)
      setText('')
      setFiles([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setSending(false)
    }
  }

  const title = companyName ?? (companySlug ? slugToTitle(companySlug) : 'Service request')

  return (
    <div className="embed-hs">
      {session ? (
        <div className="embed-hs-top">
          <Link to="/projects" className="embed-hs-back">
            ← Projects
          </Link>
        </div>
      ) : null}
      <header className="embed-hs-header">
        <h1 className="embed-hs-title">{title}</h1>
        <p className="embed-hs-sub">
          Request service — we will ask follow-up questions and may request photos.
        </p>
        {sessionId && embedKey ? (
          <p className="embed-hs-toolbar">
            <button
              type="button"
              className="embed-hs-link-btn"
              onClick={() => void startNewConversation()}
              disabled={loading || sending || startingFresh}
            >
              {startingFresh ? 'Starting…' : 'Start over (new conversation)'}
            </button>
          </p>
        ) : null}
      </header>

      {error ? <p className="embed-hs-error">{error}</p> : null}

      <div className="embed-hs-thread" aria-live="polite">
        {loading ? <p className="embed-hs-muted">Starting…</p> : null}
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === 'assistant' ? 'embed-hs-bubble embed-hs-bubble-assistant' : 'embed-hs-bubble embed-hs-bubble-user'
            }
          >
            {m.content?.trim() ? (
              <p className="embed-hs-bubble-text">{m.content}</p>
            ) : null}
            {sessionId && m.image_paths?.length ? (
              <EmbedMessageImages
                apiBase={base}
                sessionId={sessionId}
                paths={m.image_paths}
                fetchHeaders={fetchHeaders}
              />
            ) : null}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form className="embed-hs-form" onSubmit={(e) => void onSubmit(e)}>
        <label className="embed-hs-label">
          <span>Message</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Describe what you need…"
            disabled={!sessionId || sending}
          />
        </label>
        <label className="embed-hs-label embed-hs-file">
          <span>Photos (optional)</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            disabled={!sessionId || sending}
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
          {files.length > 0 ? (
            <span className="embed-hs-file-meta">{files.length} file(s) selected</span>
          ) : null}
        </label>
        {files.length > 0 ? (
          <div className="embed-hs-pending-imgs" aria-label="Photos to send">
            {files.map((file, i) => (
              <PendingImagePreview
                key={`${file.name}-${file.size}-${file.lastModified}-${i}`}
                file={file}
              />
            ))}
          </div>
        ) : null}
        <button
          type="submit"
          className="btn btn-primary embed-hs-send"
          disabled={!sessionId || sending || (!text.trim() && files.length === 0)}
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  )
}

function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
