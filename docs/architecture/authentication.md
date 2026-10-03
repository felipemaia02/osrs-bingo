# Discord authentication and event registration

Feature 003 provides Discord login; feature 004 adds `/login` and the private `/admin` portal, with global application roles. This replaces temporary public administration from feature 002. The approved flow is:

```text
Discord login → player requests event registration → pending
                                                   ↓ admin approves one/all
                                                approved → admin assigns a team
                                                   ↓ admin removes
                                                removed
```

Only administrators assign teams, approve requests, or remove registrations. Players cannot choose teams or cancel their own registration. Registration, approval, assignment, and removal are limited to draft events. Unassigning a team retains the approved event registration. Removed records retain their identifier and history references. Re-registration after removal and linking legacy records are deferred.

## Local configuration

Create an application in the Discord Developer Portal and register this OAuth2 redirect URI exactly:

```text
http://localhost:8000/auth/discord/callback
```

Configure the API process environment or the repository root `.env`. Source-checkout startup reads that root file even when invoked from `apps/api` (including `make dev-api`). A `.env` in the process working directory overrides the root file; process environment variables override both. Standalone/container installations read only their working-directory `.env` and process environment:

```dotenv
DISCORD_CLIENT_ID=<Discord application ID>
DISCORD_CLIENT_SECRET=<Discord application secret>
DISCORD_REDIRECT_URI=http://localhost:8000/auth/discord/callback
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173
ADMIN_DISCORD_IDS=<your Discord user ID>,<another administrator user ID>
APP_ENV=development
```

Set `VITE_API_URL=http://localhost:8000` for the web application. Use `localhost` consistently for both browser and callback URLs. Restart the API after configuration changes. No bot, guild membership, Discord role, or email scope is required. The user ID is the numeric Discord identity, not a username, application ID, or role ID. When no role record exists, the configured IDs initialize `administration/global-administrators` once. An empty list does not initialize roles and grants nobody access. After initialization, manage access in `/admin/administrators`; editing this environment variable cannot restore a revoked role. No first-user promotion exists. New users appear in the directory after their first login.

The implementation follows Discord's [authorization-code OAuth2 flow](https://docs.discord.com/developers/topics/oauth2) and requests only `identify`. Credentials belong in the API environment; never place the client secret in a `VITE_` variable or commit it.

## Sessions and deployment

The backend exchanges the authorization code and fetches the Discord identity, then stores a local user and a seven-day opaque session. Only hashes of session tokens are stored. Cookies are HttpOnly, SameSite=Lax, and Secure whenever `APP_ENV` is not `development`. OAuth state expires after ten minutes and is browser-bound and consumed once. Expiry is checked explicitly; MongoDB TTL cleanup is not the security boundary. Logout revokes the session and clears frontend private caches.

For deployment, use HTTPS and host the frontend and API on the same site (for example, `bingo.example.com` and `api.example.com`). Cross-site domains are not supported by the Lax cookie configuration. Set `FRONTEND_URL` to the exact frontend origin without a path; set the matching CORS origin and register the exact production callback in Discord. Mutations reject missing or different Origin headers. Configure reverse proxies to omit callback query strings from access logs; the application and Uvicorn filter already exclude OAuth codes/state. Responses containing sessions or user identity use `Cache-Control: no-store`.

## Persistence and compatibility

- `users.discord_id` is unique. The persisted global administrator record determines privileges on every request, independently of Discord server roles.
- `auth_states` and `sessions` have expiry indexes; only token hashes are persisted.
- A registration has `pending`, `approved`, or `removed` status and optional team membership.
- Unique event/user and event/normalized-name indexes prevent duplicate registration.
- On startup, existing player documents without a status become approved legacy registrations. Their team assignments remain; no Discord identity is guessed from the OSRS name. The event/user unique index only includes documents with an ObjectId user reference.
- Approval, assignment, and removal use conditional writes so stale operations cannot revive a removed registration. Bulk approval returns the count changed; newly arriving requests may require another review.
- Event lifecycle guards remain service-level checks. This revision does not introduce transactions against concurrent event activation.

## Validation

Automated tests exercise the provider exchange with a mocked Discord response, OAuth/session contracts, role/Origin restrictions, conditional persistence operations, and frontend participant/administrator flows. They do not substitute for a real Discord login or a live MongoDB concurrency run.


## Administration and request protection

- `/admin/events`: create/edit/activate/finish events. At most one event can be active; finish it explicitly before activating another.
- `/admin/teams`: select an event, review pending registrations, approve one/all, assign teams, and remove registrations.
- `/admin/administrators`: global application roles, without event selection. Grants/revocations require confirmation and are checked/audited by the backend. The last administrator cannot be removed, including concurrent revision conflicts.
- `/admin/ranking`: private entry point only. Scoring and player comparisons remain unavailable until specs 005/006 and the accepted-activity source are implemented. The user requires administrator-configured event rules, including row/column bonuses.
- Role membership and audit entries change in a single version-checked document write. Audit records include actor/target IDs, action, and timestamp. Long-term archival is future work; document-size failures fail the change atomically rather than dropping audit.
- JSON/body limit: 64 KiB by default, counting streamed bytes as well as declared Content-Length. Oversized requests return 413 before route execution.
- Authentication endpoints: 20 requests per peer IP per minute by default, including initiation, callback, and logout. Authenticated mutations: 120 per local user per minute. Shared MongoDB counters have TTL cleanup; excess returns 429 with Retry-After, and storage failure rejects guarded operations with 503.
- IP keys use the ASGI peer address and do not read arbitrary forwarded headers. Start Uvicorn with `--no-proxy-headers` unless a trusted reverse proxy is explicitly configured; when using one, restrict `--forwarded-allow-ips` to that proxy. These limits are not DDoS protection.
- API responses use no-store, nosniff, and no-referrer headers. TLS termination, database network restrictions, and storage/backup encryption still require deployment setup.

## Operator recovery and upgrades

Before initial setup, configure at least one known Discord user ID and restart the API. After initialization, an existing administrator manages roles in the interface. If every configured account becomes inaccessible, an operator with database access must deliberately recover membership in `administration/global-administrators` under maintenance, increment its revision, and append an operator-recovery audit entry. Never delete the role record merely to trigger automatic reinitialization, and never promote the next person to log in. This application does not expose an unauthenticated recovery endpoint.

For an older database with multiple active events, explicitly decide which event remains active and finish the others before enabling the new unique active-status index. The application will not select a winner or silently finish existing events during startup.
