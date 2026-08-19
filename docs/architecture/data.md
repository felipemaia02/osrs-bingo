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
