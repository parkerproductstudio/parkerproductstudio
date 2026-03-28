# Parker Product Studio

Monorepo: **Vite + React** (`frontend/`), **Express** (`backend/`), optional **Supabase** (Auth + Postgres for side projects).

## Scripts

- `npm install` — install dependencies
- `npm run dev` — run frontend and backend in development
- `npm run build` — production build
- `npm start` — run the production backend (serves API + static `frontend/dist`)

## Environment variables

Copy `.env.example` to **`.env` in the repository root**. Vite is configured with `envDir` pointing at the root so `VITE_*` variables load for local dev.

| Variable | Where | Purpose |
|----------|--------|---------|
| `VITE_SUPABASE_URL` | Frontend | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Supabase anon (public) key |
| `SUPABASE_URL` | Server | Same project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Service role key (never expose to browser) |
| `ALLOWED_ADMIN_EMAILS` | Server | Optional comma-separated allowlist for `/api/projects/*` routes |

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. **Authentication → Providers**: enable Email; consider disabling public sign-ups and creating your user via **Authentication → Users** (invite or add user).
3. **Authentication → URL Configuration**
   - **Site URL**: your production origin, e.g. `https://parkerproductstudio.com`
   - **Redirect URLs**: add at least:
     - `https://parkerproductstudio.com/**`
     - `https://www.parkerproductstudio.com/**` (if you use `www`)
     - `https://<your-app>.onrender.com/**` (if applicable)
     - `http://localhost:5173/**` (local Vite)
     - `http://localhost:5173/auth/callback` and `https://parkerproductstudio.com/auth/callback` (explicit callback path; wildcards often cover these)
   Invite, magic-link, and recovery emails use **PKCE** and return with `?code=` in the URL. This app exchanges that code and sends you to `/projects`.
4. **SQL Editor**: run `supabase/migrations/001_home_services_app.sql` to create `home_services_app_notes` and RLS policies.
5. Copy **Project URL** and keys from **Settings → API** into `.env`.

### Users and passwords

- **New user with a password**: **Authentication → Users → Add user** — enter email and password, enable **Auto Confirm User** (wording may vary) so they can sign in immediately.
- **Existing user**: open the user in **Users** → use **Send password recovery** (or **Reset password**) so they get an email; after the URL fix above, the link should complete in the app. There is often **no** “type a new password in the dashboard” field for security reasons; recovery email or delete-and-recreate the user are the usual options.

## Deploy on Render (single Web Service)

Use a **Web Service** (not a separate static site) so Express serves both the API and the SPA.

- **Root directory**: repository root (empty) or leave default.
- **Build command**: `npm install && npm run build`
- **Start command**: `npm start`
- **Environment**: set the same variables as in `.env` (including all `VITE_*` vars so the **build** embeds them in the client bundle).

After deploy, add your custom domain under the service **Settings → Custom Domains**.

### Migrating from a Render Static Site

Point the domain at the new Web Service instead of the static site, or delete the static service once the Web Service is verified.

## Project layout

- `frontend/src/pages/` — marketing shell, login, projects hub.
- `frontend/src/projects/home-services-app/` — first side project UI.
- `backend/src/projects/home-services-app/` — API routes under `/api/projects/home-services-app/`.
- `supabase/migrations/` — SQL to run in Supabase.

## Routes

| Path | Access |
|------|--------|
| `/` | Public landing |
| `/login` | Sign in (Supabase email + password) |
| `/projects` | Authenticated — project list |
| `/projects/home-services-app` | Authenticated — Home Services App experiment |
