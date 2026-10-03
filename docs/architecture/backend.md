# Architecture – Backend

## Stack
Python 3.12 · FastAPI · Motor · Pydantic v2 · pytest · Ruff · MyPy

## Module pattern

```
modules/<domain>/
├── router.py      – HTTP endpoints, status codes, DI
├── service.py     – business rules and use cases
├── repository.py  – MongoDB access (no business logic)
├── schemas.py     – Pydantic request/response
├── models.py      – representation of the persisted document
└── exceptions.py  – module-specific exceptions
```

Only create a file when it has a real responsibility.

## Call flow

```
router → service → repository → MongoDB
```

## Planned modules

| Module | Responsibility |
|---|---|
| `auth` | Authentication and authorization |
| `users` | Platform user accounts |
| `players` | RSNs and OSRS player profiles |
| `teams` | Bingo teams |
| `events` | Bingo events |
| `boards` | Boards (tile grids) |
| `tiles` | Individual tiles and progress |
| `submissions` | Drop submissions |
| `verification` | Pre-verification and approval |
| `scoring` | Score calculation (centralized) |

## Configuration
All settings via environment variables – see `.env.example`.
Read by `app/core/config.py` using `pydantic-settings`.

## Event lifecycle

The `events` module is the first implemented domain boundary and follows `router → service → repository → MongoDB`. Event status changes only through explicit activation and finish actions.

Only one event may be active. A partial unique MongoDB index on `status` for active documents protects concurrent activation, including legacy documents with old slot numbers. An administrator must explicitly finish the current event before activating another. Legacy databases with multiple active events require explicit operator resolution before the new index can be installed.

Feature 003 supersedes temporary public administration: event/team mutations and participant administration require a Discord-authenticated administrator. See [authentication and registration](authentication.md) for configuration, session security, and role boundaries.
