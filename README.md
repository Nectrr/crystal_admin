# CrystalCity Admin

Admin dashboard for the CrystalCity ticketing platform, built with Next.js 14 (App Router) + TypeScript + Tailwind CSS.

Covers Dashboard stats, Shows (with tour stops, ticket settings, and registrations), Artists (with tour dates and projects), News, Orders (with refunds and a door-scanner page), Tour Registrations, Media uploads, and Settings/admin user management — all backed by the Go ticketing API.

## Setup

```bash
npm install
cp .env.example .env.local   # then edit NEXT_PUBLIC_API_URL if the API isn't on localhost:8080
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`. Sign in with an existing admin account from the API (or create one via the API directly, since account creation itself requires an existing session).

## Environment variables

See `.env.example`:

- `NEXT_PUBLIC_API_URL` — base URL of the CrystalCity API (e.g. `http://localhost:8080`). All `/api/admin/*` and `/api/auth/*` calls are made directly from the browser to this origin with `credentials: 'include'`, so the API must set CORS headers that allow this app's origin with credentials, and the `cc_session` cookie must be usable cross-site (or the app should be served from the same site/subdomain as the API in production).

## Auth model

- Sessions are cookie-based (`cc_session`, HttpOnly). The frontend never reads or stores that cookie — every API call goes through `lib/api/client.ts`'s `apiFetch`, which always sends `credentials: 'include'`.
- On login, the API also returns `refresh_token` and `expires_at`. Those two values (only) are kept in `sessionStorage` purely so the client can proactively call `/api/auth/refresh` ~60 seconds before expiry (see `app/providers/AuthProvider.tsx`). No access token is ever stored client-side.
- `AuthProvider` calls `GET /api/admin/auth/me` on mount to establish auth state, and redirects to `/login` on `401`.
- All authenticated routes live under the `app/(admin)` route group, which renders a shared sidebar (`components/layout/Sidebar.tsx`) matching the CrystalCity palette.

## Project structure

- `lib/api/client.ts` — central `apiFetch<T>()` wrapper + typed `ApiError`.
- `lib/api/*.ts` — one typed module per resource: `auth.ts`, `dashboard.ts`, `shows.ts`, `artists.ts`, `news.ts`, `orders.ts`, `tourRegistrations.ts`, `media.ts`.
- `app/providers/AuthProvider.tsx` — auth context, session refresh timer, route gating.
- `app/providers/ToastProvider.tsx` — lightweight toast/notification system used for all mutation feedback.
- `app/(admin)/*` — authenticated pages (dashboard, shows, artists, news, orders, tour-registrations, settings).
- `app/login` — public login page.
- `components/ui/*` — shared building blocks (Button, Field/Input/Select/Textarea, Table, ConfirmDialog, MediaUploadField, HeroImageField).
- `components/shows`, `components/artists`, `components/news` — resource-specific forms and sub-resource tabs/sections.

## Known gaps / deviations from the spec

- **Tour stops, artist tour-dates, and artist projects have no documented `GET` (list) endpoint** in the given API surface — only `POST`/`PATCH`/`DELETE`. The UI therefore manages these sub-resources as client-side state seeded empty (or from whatever the parent `GET /shows/{id}` / `GET /artists/{id}` response happens to include, if the backend nests them) and appends/removes items as you create/delete them within a session. If the backend does return `tour_stops`/`tour_dates`/`projects` arrays on the parent resource, wire that up in `app/(admin)/shows/[id]/page.tsx` (`TourStopsTabWrapper`) and `app/(admin)/artists/[id]/page.tsx` — the plumbing is already there, just point it at the real field name.
- **Refresh-token storage**: kept in `sessionStorage` rather than a non-HttpOnly cookie set by a Next.js route handler, to keep the app pure client-side fetch (no server route needed) per the "in-memory or client-managed" allowance in the spec. This means a hard refresh restarts the proactive-refresh timer's origin point but does *not* log the user out — `GET /api/admin/auth/me` still authenticates via the HttpOnly cookie; only the proactive-refresh convenience needs `sessionStorage` to survive.
- **Rich text for News body** is a plain `<textarea>` (markdown/plain text), per the spec's explicit "don't overbuild" note.
- Image handling: Shows support both JSON (URL string) and multipart (file upload) per hero-image slot via a three-way toggle (Unchanged / Paste URL / Upload file). Artists and News images are URL-string-only (per spec) and go through the shared `MediaUploadField` → `POST /api/admin/media/upload` first.
- CSS `remotePatterns` in `next.config.mjs` allow any https/http host for `next/image`-style flexibility, but since asset hosts are unknown ahead of time, image previews use plain `<img>` tags in a couple of places (`MediaUploadField`, `HeroImageField`) instead of `next/image`, to avoid needing to allow-list a domain.
- No heavy state library — plain `useState`/`useEffect` fetches throughout, since most data isn't hot-path or highly cached.
