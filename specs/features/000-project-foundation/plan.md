# Implementation Plan – Project Foundation

## Summary

Creation of the monorepo with FastAPI (Modular Monolith) + React SPA + MongoDB, structured Spec-Driven Development and CI pipelines.

## Architecture Impact

Establishes the entire project structure. All future modules inherit this pattern.

## Backend Changes

- New `apps/api` project with FastAPI, Motor, Pydantic v2.
- Domain modules created as empty packages with defined boundaries.
- `GET /health` as the only real endpoint.
- MongoDB connection with proper lifecycle (lifespan) using `DatabaseClient` class.

## Frontend Changes

- New `apps/web` project with React + Vite + TypeScript.
- Minimal home page with i18n (en, pt, es) and `LanguageSwitcher`.
- Central HTTP client in `src/lib/api/client.ts`.

## Data Model

No documents defined. Collections listed as future reference in `docs/architecture/data.md`.

## API Changes

| Method | Path | Description |
|---|---|---|
| GET | /health | Liveness probe |

## Security Considerations

- CORS configured via environment variable.
- No authenticated endpoints at this stage.

## Test Strategy

- Unit (API): `test_health_returns_ok` – mock `DatabaseClient.connect`/`disconnect`.

## Implementation Order

1. Directory structure and pyproject.toml
2. Backend core (config, logging, exceptions, database)
3. app/main.py with /health
4. Domain modules (empty packages)
5. Frontend (Vite + React + Tailwind + i18n)
6. Docker Compose
7. Makefile
8. CI (GitHub Actions)
9. Docs and ADRs
10. Specs (this document + templates)

## Open Questions

None.
