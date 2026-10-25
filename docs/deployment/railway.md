# Deploying to Railway

One Railway project, three services, **one public URL**.

```
browser ──https──▶ web (Caddy, public)
                     ├── /*      → React build (SPA fallback to index.html)
                     └── /api/*  → api.railway.internal (prefix stripped)
                                     └── MongoDB (private)
```

## Why a single public URL

`up.railway.app` is on the Public Suffix List, so `web-…up.railway.app` and `api-…up.railway.app` are **different sites** for the browser. The session cookie is `HttpOnly; SameSite=Lax` and would not be sent on the frontend's API calls. Serving the API under `/api` on the web origin keeps the cookie first-party, removes CORS, and keeps working if a custom domain is added later (just point it at `web`).

## Files in the repository

| File | Purpose |
|---|---|
| `apps/api/Dockerfile` | Production API image; starts `python -m app.server` |
| `apps/api/app/server.py` | Opens one dual-stack socket on `$PORT` (Railway private networking is IPv6, newer environments also IPv4) and trusts forwarded headers from the web proxy |
| `apps/web/Dockerfile` | Builds the SPA with `VITE_API_URL=/api` and serves it with Caddy |
| `apps/web/Caddyfile` | SPA + `/api` reverse proxy; forwards Railway's `X-Real-IP` as the client IP; long cache for `/assets/*`, `no-cache` for the shell |
| `apps/*/Dockerfile.dev` | Local development images used by `docker-compose.yml` |

Railway always builds with the `Dockerfile` it finds in the service root directory, so no build settings are needed. Railway's `railway.toml` (Config as Code) is deprecated and stops being read on 2026-12-01, so this project does not use it; the settings below are set in the dashboard. They can later move to Railway's Infrastructure as Code (`.railway/railway.ts`).

## One-time setup

1. **Project**: New Project → Deploy from GitHub repo → this repository. Delete the service Railway creates automatically if its settings don't match the ones below.
2. **MongoDB**: + New → Database → MongoDB. Keep the default name `MongoDB` (the variable references below use it).
3. **api** service: + New → GitHub Repo → this repository, then in Settings:
   - Service name: `api` (the private hostname becomes `api.railway.internal`).
   - Source → Root Directory: `/apps/api`; Branch: `master`.
   - Watch Paths: `/apps/api/**`
   - Deploy → Healthcheck Path: `/health`
   - Networking: **no public domain**.
4. **web** service: + New → GitHub Repo → this repository, then in Settings:
   - Service name: `web`.
   - Source → Root Directory: `/apps/web`; Branch: `master`.
   - Watch Paths: `/apps/web/**`
   - Deploy → Healthcheck Path: `/`
   - Networking → Generate Domain (target port `8080`). This is the app URL, called `https://<web-domain>` below.
5. Optional: Settings → "Wait for CI" on both services, so a deploy waits for the GitHub Actions checks.

## Variables

**api**

| Variable | Value |
|---|---|
| `APP_ENV` | `production` (enables the `Secure` cookie flag) |
| `PORT` | `8000` |
| `MONGODB_URL` | `${{MongoDB.MONGO_URL}}` |
| `MONGODB_DATABASE` | `osrs_bingo` |
| `FRONTEND_URL` | `https://<web-domain>` (also the only trusted `Origin` for mutations) |
| `CORS_ORIGINS` | `https://<web-domain>` (same origin, kept for completeness) |
| `DISCORD_CLIENT_ID` | from the Discord developer portal |
| `DISCORD_CLIENT_SECRET` | from the Discord developer portal (mark as sealed) |
| `DISCORD_REDIRECT_URI` | `https://<web-domain>/api/auth/discord/callback` |
| `ADMIN_DISCORD_IDS` | your Discord user ID; seeds the first administrator on an empty database |

Screenshot storage (feature 008) — create a **Bucket** in the project (+ New → Bucket) and reference it from **api** (replace `Bucket` with the bucket service's name):

| Variable | Value |
|---|---|
| `STORAGE_ENDPOINT` | `${{Bucket.ENDPOINT}}` |
| `STORAGE_BUCKET` | `${{Bucket.BUCKET}}` |
| `STORAGE_ACCESS_KEY_ID` | `${{Bucket.ACCESS_KEY_ID}}` |
| `STORAGE_SECRET_ACCESS_KEY` | `${{Bucket.SECRET_ACCESS_KEY}}` |
| `STORAGE_REGION` | `${{Bucket.REGION}}` |

Without all four storage values the API keeps screenshots in a local folder, which is wiped on every deploy; it logs `screenshot_storage_local_outside_development` at startup when that happens outside development. Buckets are private: the app shows screenshots through short-lived signed links.

Maintenance mode (feature 028), optional on **api**:

| Variable | Value |
|---|---|
| `MAINTENANCE_MODE` | `true` closes the site for everyone but logged-in admins; `false` (default) reopens it |
| `MAINTENANCE_MESSAGE` | Optional text for players, up to 280 characters (e.g. `Back at 20:00 UTC.`) |

Changing them restarts the `api` service (about a minute). Players then see "The world is being updated" with the message, and the API answers their requests with 503; `/health`, `/status` and the Discord login stay open so admins can log in and test before reopening. Admins see a "Maintenance mode is on" banner.

DropTracker drop ingestion (feature 029), optional on **api**:

| Variable | Value |
|---|---|
| `DROPTRACKER_API_KEY` | The group's export key (droptracker.io → group settings). Secret: set it only here |
| `DROPTRACKER_GROUP_ID` | `126` (AstralStar) |
| `DROPTRACKER_INGEST_ENABLED` | `true` starts pulling the clan's drops; `false` (default) makes no request |
| `DROPTRACKER_POLL_SECONDS` | Seconds between polls; default `300` (5 minutes), minimum `30` |
| `DROPTRACKER_RETENTION_DAYS` | Days raw drops are kept; default `30` |
| `DROPTRACKER_BINGO_ENABLED` | `true` turns drops of active-event players into **pending** submissions in the review queue (feature 030); needs ingestion on |

Admins check what arrived at `/api/admin/droptracker/status` and `/api/admin/droptracker/drops` (filters `player`, `npc`, `item`, `min_value`). With only ingestion on, nothing in events, submissions or scores changes. With the bingo flag on, each new drop is checked once: the bingo account (RSN chosen when joining) of an approved player with a team, an item a board card accepts, inside the event window. It becomes a Pending submission marked "DropTracker" (never auto-accepted), unless the player sent the same item manually on that card within 24 h. Only one API instance polls at a time.

**web**

| Variable | Value |
|---|---|
| `API_UPSTREAM` | `http://${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}` |

`VITE_API_URL` is baked into the build as `/api` by the Dockerfile; it doesn't need a Railway variable.

## Discord

In the Discord developer portal → OAuth2 → Redirects, add `https://<web-domain>/api/auth/discord/callback` exactly as set in `DISCORD_REDIRECT_URI`. Keep the localhost redirect for development.

## Checks after the first deploy

- `https://<web-domain>/api/health` returns `{"status":"ok"}`.
- `https://<web-domain>/admin/events` loads the app (SPA fallback).
- Log in with Discord: you return to the app logged in, and the administrator account from `ADMIN_DISCORD_IDS` sees Administration.
- The `api` logs show real client IPs (not Railway or Caddy addresses) on requests.

## Notes

- **Client IP**: Railway's edge overwrites `X-Real-IP` with the client IP on each request; Caddy passes it to the API as `X-Forwarded-For`, which the auth and mutation rate limits use. The API trusts forwarded headers only because it has no public domain: never give `api` a public domain without revisiting `app/server.py`.
- **Custom domain later**: add it to `web`, then update `FRONTEND_URL`, `CORS_ORIGINS`, `DISCORD_REDIRECT_URI` and the Discord redirect list.
- **Backups**: the MongoDB service keeps its data on a Railway volume; schedule backups (for example `mongodump` from a cron service) before the first real event.
