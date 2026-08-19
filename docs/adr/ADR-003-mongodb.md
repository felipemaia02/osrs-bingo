# ADR-003: MongoDB

## Status
Accepted

## Context
The Bingo domain is document-oriented: events contain boards, boards contain tiles, tiles contain submissions. The schema evolves per feature. There is no need for complex JOINs or distributed transactions.

## Decision
Use MongoDB with Motor (async driver) accessed directly via repositories. No heavy ORM/ODM. Embedding vs. referencing decisions are made spec by spec, according to the actual access pattern.

## Consequences
- Flexible schema facilitates iteration in early phases.
- Explicit repositories are easy to test with mocks.
- Indexes declared centrally in `app/database/indexes.py` via `IndexManager`.
