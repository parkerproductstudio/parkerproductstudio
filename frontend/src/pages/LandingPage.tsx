import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/useAuth'

type Meta = {
  name: string
  tagline: string
}

const CONTACT_EMAIL = 'eric.jason.parker@gmail.com'

export function LandingPage() {
  const { session, loading, supabase } = useAuth()
  const [meta, setMeta] = useState<Meta | null>(null)

  const signedIn = Boolean(supabase && !loading && session)

  async function handleSignOut() {
    if (supabase) await supabase.auth.signOut()
  }

  useEffect(() => {
    let cancelled = false
    const fallback: Meta = {
      name: 'Parker Product Studio',
      tagline:
        'Principal product engineering for consumer and business applications—with AI agents when they are the right tool.',
    }
    fetch('/api/meta')
      .then((r) => {
        if (!r.ok) throw new Error('Bad response')
        return r.json() as Promise<Meta>
      })
      .then((data) => {
        if (!cancelled) setMeta(data)
      })
      .catch(() => {
        if (!cancelled) setMeta(fallback)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const tagline =
    meta?.tagline ??
    'Principal product engineering for consumer and business applications—with AI agents when they are the right tool.'

  return (
    <div className="site">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="header">
        <div className="header-inner">
          <Link className="brand" to="/">
            <img
              src="/brand/logo.png"
              width={40}
              height={40}
              alt=""
              decoding="async"
            />
            Parker Product Studio
          </Link>
          <nav className="nav" aria-label="Primary">
            <a href="#focus">Applications</a>
            <a href="#services">Capabilities</a>
            <a href="#contact">Contact</a>
            {signedIn ? (
              <button
                type="button"
                className="nav-link-btn"
                onClick={() => void handleSignOut()}
              >
                Sign out
              </button>
            ) : (
              <>
                <Link to="/login" className="nav-link-btn">
                  Sign in
                </Link>
                <Link to="/signup" className="nav-link-btn">
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main id="main" className="main">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-bg" aria-hidden="true" />
          <div className="hero-overlay" aria-hidden="true" />
          <div className="hero-inner">
            <div className="hero-grid">
              <span className="eyebrow">Software that ships</span>
              <h1 id="hero-title">Product engineering for the real world.</h1>
              <p className="lead">{tagline}</p>
              <div className="cta-row">
                <a className="btn btn-primary" href={`mailto:${CONTACT_EMAIL}`}>
                  Start a conversation
                </a>
                <a className="btn btn-ghost" href="#services">
                  Capabilities
                </a>
              </div>
            </div>
            <aside className="hero-card" aria-label="Studio positioning">
              <p className="hero-card-kicker">Studio line</p>
              <p className="brand-line">
                Principal product engineering · AI-driven application
                development
              </p>
            </aside>
          </div>
        </section>

        <section className="focus" id="focus" aria-labelledby="focus-title">
          <div className="focus-inner">
            <h2 id="focus-title">Consumer and business applications</h2>
            <p className="sub">
              Different audiences, same bar for quality: clear UX, dependable
              backends, and code you can evolve.
            </p>
            <div className="focus-grid">
              <article className="focus-card">
                <h3>Consumer applications</h3>
                <p>
                  Customer-facing web and mobile experiences—onboarding flows,
                  subscriptions, performance, and accessibility so every release
                  feels intentional.
                </p>
              </article>
              <article className="focus-card">
                <h3>Business applications</h3>
                <p>
                  Internal tools, ops dashboards, and line-of-business software
                  that teams actually want to use: role-based access, auditability,
                  and integrations with the systems you already run.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section
          className="section"
          id="services"
          aria-labelledby="services-title"
        >
          <div className="section-inner">
            <h2 id="services-title">How we help</h2>
            <p className="section-intro">
              From greenfield products to hardening what you already have—scoped
              engagements with hands-on engineering.
            </p>
            <div className="grid-services">
              <article className="card">
                <div className="icon" aria-hidden="true">
                  C
                </div>
                <h3>Consumer products</h3>
                <p>
                  End-to-end product builds: discovery, UX-informed APIs, React
                  front ends, and launch readiness.
                </p>
              </article>
              <article className="card">
                <div className="icon" aria-hidden="true">
                  B
                </div>
                <h3>Business systems</h3>
                <p>
                  Workflow tools, admin consoles, and data-heavy interfaces
                  wired to your CRM, billing, warehouse, or custom services.
                </p>
              </article>
              <article className="card">
                <div className="icon icon--compact" aria-hidden="true">
                  AI
                </div>
                <h3>AI agents</h3>
                <p>
                  When it fits your problem, we integrate AI agents—grounded in
                  your data, with guardrails, evaluation, and human-in-the-loop
                  patterns you can trust.
                </p>
              </article>
              <article className="card">
                <div className="icon" aria-hidden="true">
                  {'{}'}
                </div>
                <h3>Integrations &amp; platforms</h3>
                <p>
                  Reliable pipelines between SaaS and internal APIs,
                  observability, and refactors that keep shipping velocity high.
                </p>
              </article>
            </div>
          </div>
        </section>

        <div className="brand-band" aria-hidden="true">
          <img
            src="/brand/banner-linkedin.png"
            alt=""
            loading="lazy"
            decoding="async"
          />
        </div>

        <section className="cta-band" id="contact" aria-labelledby="cta-title">
          <div className="cta-inner">
            <h2 id="cta-title">Tell us what you are building</h2>
            <p className="sub">
              A short note on the product, users, and timeline is enough—we will
              reply with next steps.
            </p>
            <a className="btn btn-primary" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>
          © {new Date().getFullYear()} Parker Product Studio.{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>Email</a>
        </p>
      </footer>
    </div>
  )
}
