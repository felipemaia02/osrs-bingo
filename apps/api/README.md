# OSRS Bingo API

FastAPI + MongoDB backend for the OSRS Bingo project.

## Local development

```bash
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

## Tests

```bash
pytest
pytest --cov=app
```

## Lint / Typecheck

```bash
ruff check .
mypy app/
```

## Event API

The API exposes event listing and detail publicly under `/events`. Creation, draft editing, activation, and finishing require a Discord-authenticated administrator. Players can request event registration; administrators approve requests and assign teams. See [Discord configuration and registration flow](../../docs/architecture/authentication.md).

Only draft events are editable, dates never change status automatically, and at most one event may be active at a time.

## Structure

```
app/
├── main.py          # FastAPI app, lifespan, middleware
├── core/            # config, logging, exceptions, security
├── database/        # MongoDB connection (DatabaseClient) and index manager
├── modules/         # domains: auth, users, players, teams, events,
│                    #          boards, tiles, submissions, verification, scoring
└── shared/          # reusable schemas, types and utils
```

### Module internal pattern

```
modules/<domain>/
├── router.py      – HTTP endpoints, status codes, DI
├── service.py     – business rules and use cases
├── repository.py  – MongoDB access (no business logic)
├── schemas.py     – Pydantic (request/response)
├── models.py      – persisted document representation
└── exceptions.py  – module-specific exceptions
```

Only create a file when it has a real responsibility.
