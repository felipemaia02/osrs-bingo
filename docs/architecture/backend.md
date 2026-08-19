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
