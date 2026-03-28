import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../../auth/useAuth'

type NoteRow = {
  id: string
  body: string
  created_at: string
}

type MeResponse = {
  user: { id: string; email: string | undefined }
  project: string
}

export function HomeServicesAppPage() {
  const { supabase, session } = useAuth()
  const [notes, setNotes] = useState<NoteRow[]>([])
  const [body, setBody] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [me, setMe] = useState<MeResponse | null>(null)
  const [meError, setMeError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    void supabase
      .from('home_services_app_notes')
      .select('id, body, created_at')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setLoadError(error.message)
          setNotes([])
          return
        }
        setLoadError(null)
        setNotes((data as NoteRow[]) ?? [])
      })
    return () => {
      cancelled = true
    }
  }, [supabase])

  useEffect(() => {
    if (!session?.access_token) return
    let cancelled = false
    void fetch('/api/projects/home-services-app/me', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(async (r) => {
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { error?: string }
          throw new Error(j.error ?? r.statusText)
        }
        return r.json() as Promise<MeResponse>
      })
      .then((data) => {
        if (cancelled) return
        setMeError(null)
        setMe(data)
      })
      .catch((e: Error) => {
        if (cancelled) return
        setMeError(e.message)
        setMe(null)
      })
    return () => {
      cancelled = true
    }
  }, [session?.access_token])

  async function addNote(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase || !session?.user.id || !body.trim()) return
    const { error } = await supabase.from('home_services_app_notes').insert({
      user_id: session.user.id,
      body: body.trim(),
    })
    if (error) {
      setLoadError(error.message)
      return
    }
    setBody('')
    const { data, error: reloadError } = await supabase
      .from('home_services_app_notes')
      .select('id, body, created_at')
      .order('created_at', { ascending: false })
    if (reloadError) {
      setLoadError(reloadError.message)
      return
    }
    setLoadError(null)
    setNotes((data as NoteRow[]) ?? [])
  }

  return (
    <div className="project-app">
      <nav className="breadcrumb">
        <Link to="/projects">Projects</Link>
        <span aria-hidden="true"> / </span>
        <span>Home Services App</span>
      </nav>

      <header className="project-app-header">
        <h1>Home Services App</h1>
        <p className="project-app-lead">
          Experimental workspace. Data lives in Supabase with row-level security
          per user. The Express API route below checks your JWT server-side.
        </p>
      </header>

      <section className="project-panel" aria-labelledby="api-heading">
        <h2 id="api-heading">Backend check</h2>
        <p className="panel-meta">
          <code>GET /api/projects/home-services-app/me</code>
        </p>
        {meError ? <p className="auth-error">{meError}</p> : null}
        {me ? (
          <pre className="panel-pre">{JSON.stringify(me, null, 2)}</pre>
        ) : !meError ? (
          <p className="panel-muted">Loading…</p>
        ) : null}
      </section>

      <section className="project-panel" aria-labelledby="notes-heading">
        <h2 id="notes-heading">Notes</h2>
        <p className="panel-meta">
          Table <code>home_services_app_notes</code> — run the SQL migration in
          Supabase if you have not already.
        </p>
        {loadError ? <p className="auth-error">{loadError}</p> : null}
        {!supabase ? (
          <p className="auth-error">Supabase client is not configured.</p>
        ) : (
          <form className="note-form" onSubmit={(e) => void addNote(e)}>
            <label className="form-field">
              <span>New note</span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                placeholder="Scratch ideas for the home services experiment…"
              />
            </label>
            <button type="submit" className="btn btn-primary" disabled={!body.trim()}>
              Save note
            </button>
          </form>
        )}
        <ul className="note-list">
          {notes.map((n) => (
            <li key={n.id} className="note-item">
              <p className="note-body">{n.body}</p>
              <time className="note-time" dateTime={n.created_at}>
                {new Date(n.created_at).toLocaleString()}
              </time>
            </li>
          ))}
        </ul>
        {notes.length === 0 && !loadError && supabase ? (
          <p className="panel-muted">No notes yet.</p>
        ) : null}
      </section>
    </div>
  )
}
