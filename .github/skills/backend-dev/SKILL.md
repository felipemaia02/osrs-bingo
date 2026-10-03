---
name: backend-dev
description: 'Implement backend tasks in FastAPI + MongoDB. Use when: implementing a backend task, creating router, service or repository, writing Python code for the API, adding endpoints, writing unit or integration tests, running pytest, running ruff or mypy.'
---

# Backend Development

Implements backend tasks following the project architecture and clean code standards.

## Architecture

```
router → service → repository → MongoDB
```

| Layer | File | Responsibility |
|-------|------|----------------|
| `router.py` | `modules/<name>/router.py` | HTTP interface only — no business logic |
| `service.py` | `modules/<name>/service.py` | All domain logic lives here |
| `repository.py` | `modules/<name>/repository.py` | MongoDB access only |

Do not add artificial layers when there is no meaningful business logic.

## Clean Code Rules

- **Functions do one thing.** If a function needs an "and" in its name, split it.
- **Names are intention-revealing.** Avoid abbreviations, generic names (`data`, `obj`, `result`).
- **No magic numbers or strings.** Use named constants or enums.
- **Short functions.** Aim for ≤ 20 lines per function. Anything longer is a refactor candidate.
- **No dead code.** Remove commented-out code and unused imports.
- **Fail fast.** Validate inputs at the boundary (router layer); don't guard defensively deep in the call chain.
- **Explicit over implicit.** Prefer keyword arguments for functions with 3+ parameters.

## Procedure

### 1. Read the task

Check `specs/features/<id>/tasks/backend.md` for the task description and linked requirements.

### 2. Read the spec

Confirm the expected behavior in `specs/features/<id>/spec.md` before writing any code.

### 3. Implement in layer order

1. Repository — add MongoDB query/mutation
2. Service — add domain logic calling the repository
3. Router — add endpoint calling the service
4. Schemas — add/update Pydantic models in `shared/schemas/` if needed

### 4. Write tests

- Unit tests for service logic (mock the repository)
- Integration tests for endpoints (use `conftest.py` fixtures)
- File convention: `tests/unit/test_<module>.py`, `tests/integration/test_<module>.py`

### 5. Validate

```bash
# From apps/api/
pytest
ruff check .
mypy .
```

All checks must pass before marking the task done.

### 6. Mark task done

Update `specs/features/<id>/tasks/backend.md`: change `- [ ]` to `- [x]` only after the implementation, tests, lint and typecheck pass.

## Security Checklist

- [ ] User input validated by Pydantic schema at the router layer
- [ ] Sensitive routes protected by auth dependency
- [ ] No secrets or credentials in code — use config/env vars
- [ ] MongoDB queries use parameterized values (never string interpolation)
- [ ] Error responses do not leak internal stack traces

## Module Conventions

```
modules/<name>/
├── __init__.py
├── router.py      # FastAPI router, no logic
├── service.py     # Domain logic
├── repository.py  # MongoDB queries
└── schemas.py     # Pydantic models (if module-specific)
```
