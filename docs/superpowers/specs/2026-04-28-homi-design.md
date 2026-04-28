# Homi — Design Spec

**Date:** 2026-04-28
**Status:** Approved for implementation planning
**Author:** Eric Parker (with Claude)

## Summary

Homi is a "Carfax for homes" proof of concept built as a project page inside the existing **parkerproductstudio** (PPS) app. The POC lets a signed-in user enter a property address (structured fields), fans out to one or more public-records APIs in parallel, and renders a side-by-side comparison report covering property basics, ownership/sale history, tax & assessment, permits, hazards, and valuation.

The POC has two simultaneous goals:

1. **Concept validation** — see what a useful home report looks like with real data, to gut-check whether the product idea is compelling.
2. **API evaluation** — compare data quality and coverage across providers to inform a future buy/build decision.

If the POC is promising, future phases (inspection-report upload + analysis, address autocomplete, public access, etc.) build on this foundation.

## Goals

- A signed-in user at `/projects/homi` can submit a structured address and see a side-by-side comparison of property data from the integrated providers.
- Adding a new provider in the future is a one-file change (implement the `PropertyProvider` interface, register it).
- Provider responses are cached indefinitely in Supabase, keyed by `(provider, address_key)`, so repeat lookups don't burn free-tier API quota.
- The architecture is honest about provider gaps — disabled providers and missing fields render as explicit "not integrated" / "no data" cells, not hidden columns.

## Non-Goals (Out of Scope for POC)

- Inspection report upload and AI analysis (the next phase, not this POC).
- Address autocomplete (Google Places / Mapbox) — deferred; structured fields only.
- Force-refresh button on cached lookups.
- Public/unauthenticated search.
- Admin-only gating (signed-in is sufficient).
- E2E tests, load testing, exhaustive provider error-path coverage.
- Inferring missing fields from one provider using another.

## Context — Where Homi Lives

PPS is a Vite/React SPA + Express backend, npm workspaces, Supabase auth/data, deployed on Render. It already hosts one project (`home-services-app`) under `frontend/src/projects/` and `backend/src/projects/`. Homi is a sibling project that follows the same conventions — no new repo, no new hosting, no new auth code.

## Architecture

```
[Browser]
   │
   ▼
[/projects/homi] ── React page (Vite SPA)
   │
   ▼
[POST /api/projects/homi/lookup] ── Express route
   │
   ▼
[Orchestrator (lookup.ts)]
   │
   ├──► [RentCast provider]      (real)
   ├──► [Attom provider]         (stub, disabled)
   └──► [RealEstate API provider] (stub, disabled)
   │
   ▼
[Normalize → NormalizedProperty per provider]
   │
   ▼
[Supabase: cache + search history]
   │
   ▼
[Side-by-side ComparisonGrid]
```

Key choices:

- **Server-side fetches only** — provider API keys never leave the backend.
- **Single `PropertyProvider` interface** — adding Attom or RealEstate API is a new file, no UI changes.
- **Cache-first, indefinite** — first lookup populates the cache; subsequent lookups of the same address (any user) return the cached row.
- **Parallel fan-out** — `Promise.all` so a slow or failing provider doesn't block others.

## File Layout

```
parkerproductstudio/
├─ frontend/src/projects/homi/
│  ├─ index.ts                     # exports HomiPage
│  ├─ HomiPage.tsx                 # search form + results, lives at /projects/homi
│  ├─ components/
│  │  ├─ SearchForm.tsx
│  │  ├─ ComparisonGrid.tsx
│  │  └─ DataCell.tsx
│  └─ lib/api.ts                   # calls /api/projects/homi/*
│
├─ backend/src/projects/homi/
│  ├─ index.ts                     # mounts router
│  ├─ routes.ts                    # POST /lookup, GET /searches, GET /searches/:id
│  ├─ providers/
│  │  ├─ types.ts                  # PropertyProvider, NormalizedProperty, ProviderResult
│  │  ├─ rentcast.ts               # real implementation
│  │  ├─ attom.ts                  # stub (enabled: false)
│  │  ├─ realestateapi.ts          # stub (enabled: false)
│  │  └─ registry.ts               # exports providers[]
│  ├─ lookup.ts                    # orchestrator (parallel fan-out)
│  ├─ normalize.ts                 # per-provider raw → NormalizedProperty mappers
│  └─ cache.ts                     # Supabase read/write
│
├─ supabase/migrations/
│  └─ 005_homi.sql                 # next in the existing migration sequence
│
└─ frontend/src/App.tsx            # add <Route path="homi" element={<HomiPage/>}/>
```

## Data Model

One migration: `supabase/migrations/005_homi.sql`. Two tables, RLS on both.

```sql
-- Cached provider lookups, keyed by normalized address + provider.
-- Indefinite cache for the POC: rows are written once and re-used forever.
create table public.homi_provider_lookups (
  id              uuid primary key default gen_random_uuid(),
  provider        text not null,           -- 'rentcast' | 'attom' | 'realestateapi'
  address_key     text not null,           -- normalized "123-main-st-austin-tx-78701"
  street          text not null,
  city            text not null,
  state           text not null,
  zip             text not null,
  status          text not null,           -- 'ok' | 'not_found' | 'rate_limited' | 'error'
  normalized      jsonb,                   -- NormalizedProperty (null if status != 'ok')
  raw             jsonb,                   -- original API response, for debugging
  error_message   text,
  fetched_at      timestamptz not null default now(),
  unique (provider, address_key)
);

create index on public.homi_provider_lookups (address_key);

-- User search history (one row per search submission, regardless of provider count).
create table public.homi_searches (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  street          text not null,
  city            text not null,
  state           text not null,
  zip             text not null,
  address_key     text not null,
  providers_used  text[] not null,
  created_at      timestamptz not null default now()
);

create index on public.homi_searches (user_id, created_at desc);

-- RLS
alter table public.homi_provider_lookups enable row level security;
alter table public.homi_searches         enable row level security;

-- Lookups: read-only for signed-in users (cache is shared); writes via service role only.
create policy "homi_lookups_read" on public.homi_provider_lookups
  for select to authenticated using (true);

-- Searches: users see only their own.
create policy "homi_searches_own" on public.homi_searches
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

**Notes:**

- `address_key` is normalized in app code: lowercased, punctuation stripped, whitespace collapsed to hyphens, joined with state + zip. So "123 Main St." and "123 main st" collide.
- The `raw` column preserves the unmapped API response so we can debug or remap fields without burning more calls.
- The cache is shared across users (read-only RLS). Writes happen on the backend via the Supabase service-role key.
- Refreshing data is out of scope — once a row exists, it is the answer. Future phases can add `?refresh=1`.

## Provider Interface

`backend/src/projects/homi/providers/types.ts`:

```ts
export type Address = {
  street: string;
  city: string;
  state: string;   // 2-letter
  zip: string;
};

export type NormalizedProperty = {
  basics?: {
    propertyType?: string;
    beds?: number;
    baths?: number;
    sqft?: number;
    lotSizeSqft?: number;
    yearBuilt?: number;
  };
  ownership?: {
    currentOwner?: string;
    lastSalePrice?: number;
    lastSaleDate?: string;     // ISO
    priorSales?: Array<{ price: number; date: string }>;
  };
  tax?: {
    assessedValue?: number;
    taxAmount?: number;
    taxYear?: number;
    history?: Array<{ year: number; assessed: number; tax: number }>;
  };
  permits?: Array<{
    type?: string;
    description?: string;
    status?: string;
    issuedDate?: string;
    value?: number;
  }>;
  hazards?: {
    floodZone?: string;
    fireRisk?: string;
    [k: string]: unknown;
  };
  valuation?: {
    estimate?: number;
    estimateLow?: number;
    estimateHigh?: number;
    asOf?: string;
  };
};

export type ProviderResult =
  | { ok: true;  data: NormalizedProperty; raw: unknown }
  | { ok: false; reason: 'not_found' | 'rate_limited' | 'error'; message: string };

export interface PropertyProvider {
  name: 'rentcast' | 'attom' | 'realestateapi';
  enabled: boolean;     // false if API key missing → UI shows "Not integrated"
  lookup(addr: Address): Promise<ProviderResult>;
}
```

Every field is optional. Providers map only what they return. Missing fields are rendered explicitly as "no data" by the UI.

## Orchestrator

`backend/src/projects/homi/lookup.ts`:

```ts
async function lookupProperty(addr: Address) {
  const key = normalizeAddressKey(addr);
  const results = await Promise.all(
    providers.map(async (p) => {
      if (!p.enabled) {
        return {
          provider: p.name,
          result: { ok: false, reason: 'error', message: 'Not integrated' },
          fromCache: false,
        };
      }
      const cached = await cache.read(p.name, key);
      if (cached) return { provider: p.name, result: cached, fromCache: true };
      const fresh = await p.lookup(addr);
      await cache.write(p.name, addr, key, fresh);
      return { provider: p.name, result: fresh, fromCache: false };
    })
  );
  return results;
}
```

## API Routes

Mounted at `/api/projects/homi` from `backend/src/projects/homi/index.ts`. Auth via existing PPS Supabase-token middleware.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/lookup` | signed-in | Body: `{street, city, state, zip}` → fans out, writes cache + search history, returns `{searchId, results: [{provider, result, fromCache}]}` |
| `GET` | `/searches` | signed-in | The user's recent searches (history page, optional in POC) |
| `GET` | `/searches/:id` | signed-in (own) | Re-renders a past search by re-reading the cache (no API calls) |

## Frontend Flow

1. User visits `/projects/homi` → `HomiPage.tsx` renders `<SearchForm>`.
2. Submit → `POST /api/projects/homi/lookup` → loading state.
3. Response → `<ComparisonGrid>` with one column per provider, rows grouped by category.
4. Each `<DataCell>` renders one of:
   - The value (formatted)
   - `—` (provider returned no data for this field)
   - `Not integrated yet` (provider disabled — no API key)
   - `Error: <reason>` (provider call failed or returned `not_found` / `rate_limited`)
5. Optional history page: `/projects/homi/history` lists past searches; clicking re-renders from cache.

Sample comparison grid:

```
                  RentCast      Attom            RealEstate API
─────────────────────────────────────────────────────────────────
Property Type     Single Family —                Not integrated
Beds              3             —                Not integrated
Baths             2             —                Not integrated
Sqft              1,820         —                Not integrated
Year Built        1968          —                Not integrated
─────────────────────────────────────────────────────────────────
Last Sale         $425k (2021)  —                Not integrated
Current Owner     J. Smith      —                Not integrated
─────────────────────────────────────────────────────────────────
Permits           No data       —                Not integrated
...
```

## Routing & Auth

- Route added to `frontend/src/App.tsx` under the existing `<SignedInRoute>` block:
  ```tsx
  <Route path="homi" element={<HomiPage />} />
  ```
- Not admin-gated for the POC. Easy to flip to admin-only later by wrapping in `<AdminRoute>`.
- `ProjectsHubPage` should be updated to link to `/projects/homi` so signed-in users can find it.

## Environment Variables

Added to root `.env` (and `.env.example`):

```
RENTCAST_API_KEY=
ATTOM_API_KEY=          # blank for now — provider stays disabled
REALESTATEAPI_KEY=      # blank for now — provider stays disabled
```

Read server-side only. The `enabled` flag on each provider is `!!process.env.<KEY>`.

## Error Handling

- **Provider failure** — that column shows the error reason; other columns render normally. Failure is also persisted to the cache (`status='error' | 'not_found' | 'rate_limited'`) so we don't retry-storm.
- **Orchestrator/DB failure** — 500 with a generic message; frontend shows a retry banner.
- **Invalid address** — 400 with field-level message; `<SearchForm>` validates required fields client-side first.
- **Rate limit** — written to cache as `status='rate_limited'`. Out-of-scope to auto-retry; manual refresh in a future phase.

## Testing (POC-Appropriate)

- **Unit:** `normalize.ts` mappers. Given a recorded RentCast response fixture, produce the expected `NormalizedProperty`.
- **Unit:** `address_key` normalization. Collision tests for case, punctuation, and whitespace variants.
- **Integration:** one happy-path test against `POST /api/projects/homi/lookup` with the RentCast HTTP client mocked.
- **No E2E.** No load tests. Skip exhaustive provider error-path coverage until Attom and RealEstate API are integrated.

## Provider Onboarding (Phase Order)

1. **RentCast** — real implementation. Self-serve free tier (~50 calls/month, no card), good coverage for basics, ownership, sale history, tax, AVM. Weak on permits and hazards.
2. **Attom** — stub only in this POC. Enterprise-gated (sales contact for trial). Best depth on permits, deed history, hazards. Add when access is obtained.
3. **RealEstate API** — stub only in this POC. Self-serve, credit-metered. Add after RentCast plumbing is proven.

The provider abstraction means each addition is a new file + a row in the registry — no UI or schema changes.

## Risks & Open Questions

- **RentCast free-tier limits** — 50 calls/month may be tight even for dev. Mitigation: indefinite cache reduces repeat costs; we reuse the same handful of test addresses during dev.
- **Permit data may be empty across all integrated providers in the POC.** That's expected — empty permit cells are themselves a useful signal that drives the buy/build decision.
- **Address normalization is naive.** "123 N Main St" vs "123 North Main Street" will not collide. For the POC we accept this; the real fix is autocomplete (deferred).
- **No explicit refresh path.** If a sale or assessment changes, the cached row goes stale. Acceptable for the POC; documented for the next phase.

## Future Phases (Not This POC)

1. Inspection report upload + Claude-powered analysis (the original product thesis).
2. Address autocomplete (Google Places or Mapbox).
3. Force-refresh + append-only history table for true "Carfax timeline" capability.
4. Public unauthenticated search with rate limiting.
5. Real Attom and RealEstate API integrations.
