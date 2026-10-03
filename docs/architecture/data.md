# Architecture – Data

## Database
MongoDB 7 (schema-less).

## Planned collections

| Collection | Description |
|---|---|
| `users` | Platform accounts |
| `players` | RSNs and OSRS profiles |
| `teams` | Bingo teams |
| `events` | Bingo events |
| `boards` | Boards |
| `tiles` | Tiles and progress |
| `submissions` | Submitted drops |
| `verifications` | Pre-verification records |
| `score_events` | Score history |

## Embedding vs. Referencing

Decided **spec by spec**, based on the actual access pattern of each feature.

General guidelines:
- Embed when data is always read together and has bounded growth.
- Reference when data is accessed independently or has high cardinality.

## Indexes

Declared in `apps/api/app/database/indexes.py` via `IndexManager`.
Applied at startup or via an admin command.

### Events

Event documents contain identity, optional description, timezone-safe schedule instants, lifecycle status, and audit timestamps. `active_slot` may be present on legacy documents; activation now uses a partial unique status index.

Indexes:

- partial unique `status` index restricted to `active`, enforcing at most one active event;
- compound `status, created_at` index supporting filtered newest-first lists.

Future teams, boards, and submissions reference an event rather than embedding the event document.

### Authentication and registrations

Feature 003 adds `users`, `auth_states`, and `sessions`, plus registration status and an optional user reference on `players`. See [authentication and registration](authentication.md) for indexes, expiry, and legacy-player migration.

### Global administration and request limits

Feature 004 stores global administrator membership and its role-change audit in one revision-checked `administration` document. Bootstrap uses explicitly configured IDs once. `request_limits` holds hashed time-bucket counters with TTL expiry for shared request-volume enforcement. Neither collection is exposed to public clients.
