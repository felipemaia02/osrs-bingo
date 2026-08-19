# Acceptance – Project Foundation

## Functional

- [x] AC-001: `GET /health` returns `{"status": "ok"}`
- [x] AC-002: Frontend renders home page with language switcher (en/pt/es)
- [x] AC-003: `make test` passes

## Backend

- [x] Unit test for /health passing
- [x] Endpoint documented in OpenAPI
- [x] Errors return `{"detail": "..."}`

## Frontend

- [x] Home page renders without errors
- [x] Language switcher toggles en/pt/es

## Quality

- [x] `ruff check .` clean
- [x] `mypy app/` clean
- [x] `npm run lint` clean
- [x] `npm run typecheck` clean
