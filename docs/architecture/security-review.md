# Application security review — 2026-10-03

This is a source-code and automated-test review of the current application, not a penetration test or certification of the deployment.

## Implemented controls

| Area | Evidence and scope |
|---|---|
| Authentication | `modules/auth/service.py` checks expiring server sessions; token hashes are stored instead of raw session tokens. |
| Authorization | `require_admin` protects event/team mutations and participant administration. Regular users cannot approve requests, assign teams, remove participants, or list all registrations through direct API requests. |
| Identity binding | Registration takes its user ID from the authenticated session. Extra fields such as client-supplied owner/team are rejected by registration schemas. |
| OAuth state | Browser cookie comparison, expiry, and one-use consumption prevent accepting a callback for an unrelated or reused state. |
| Cookie writes | `require_trusted_origin` rejects unsafe cookie-authenticated requests without the configured frontend Origin. SameSite=Lax provides an additional browser restriction. |
| Cookie storage | Session cookies are HttpOnly; Secure is enabled outside development. The frontend does not persist session tokens in localStorage. |
| Domain boundaries | Same-event team checks, draft-only guards, duplicate indexes, and conditional pending/approved/removed writes are implemented. |
| Data minimization | Discord identify is requested. Email, guild membership, and server roles are not requested. Response schemas do not expose session hashes/provider tokens. |
| Logs | Application logs avoid request bodies/query strings; Uvicorn's OAuth callback filter removes code/state query parameters. Reverse-proxy logs need their own configuration. |
| Logout | Backend session revocation and frontend private-cache clearing are implemented. |

## Gaps and limits

- Feature 004 now enforces shared MongoDB rate limits for auth/user mutations and a global streamed-body size limit. Tests cover 429/413 responses, storage failure, and ignoring forged forwarded headers. This is not a load test or DDoS guarantee.
- Feature 004 now persists application roles, initializes them once, and provides protected administrator selection. Revision-checked writes preserve at least one administrator and append audit in the same write.
- API middleware now applies no-store, nosniff, and no-referrer. This covers private responses without relying on frontend caching choices.
- HTTPS termination, production database access controls, encryption of database storage/backups, and proxy logging are deployment responsibilities. Source review does not establish that they are configured.
- CORS controls browser cross-origin access; authentication/authorization are still required independently and are implemented on protected endpoints.
- Current public event/team reads remain public by specification. The user directory has administrator guards; future ranking endpoints must preserve that boundary.
- Event lifecycle guards currently check state in services; they do not provide transactional isolation against concurrent event activation.
- Current tests use mocked Discord/persistence dependencies. No real Discord login, live MongoDB concurrency test, load test, or infrastructure penetration test was performed.

Feature 004 implements the application controls above. Specs 005/006 still describe pending ranking/scoring work. Deployment protections and live-service validation remain explicitly separate.
