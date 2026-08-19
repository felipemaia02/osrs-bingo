# OSRS Bingo

Web platform for managing Bingo events for **Old School RuneScape (OSRS)**.

---

## Stack

| Layer | Technologies |
|---|---|
| Backend | Python 3.12, FastAPI, Motor (async MongoDB), Pydantic v2 |
| Frontend | React 18, TypeScript 5, Vite, TanStack Query v5, Tailwind CSS, react-i18next |
| Database | MongoDB 7 |
| Tests | pytest / pytest-asyncio (API) |
| Quality | Ruff, MyPy (API) · ESLint, Prettier, tsc (Web) |
| CI | GitHub Actions (separate pipelines per app) |
| Infra | Docker Compose (local) |

---

## Architecture

Monorepo with two independent apps.

```
osrs-bingo/
├── apps/
│   ├── api/     – Modular Monolith (FastAPI)
│   └── web/     – SPA (React)
├── specs/       – Spec-Driven Development
├── docs/        – Architecture, ADRs and references
├── infra/       – Infrastructure (future)
├── scripts/     – Utility scripts
└── .github/     – CI/CD
```

The backend follows the **Modular Monolith** pattern: each domain (submissions, scoring, teams…) is an independent module within the same process.

---

## Getting started

```bash
cp .env.example .env
docker compose up
```

Available services:

| Service | URL |
|---|---|
| API | http://localhost:8000 |
| OpenAPI docs | http://localhost:8000/docs |
| Frontend | http://localhost:5173 |
| MongoDB | mongodb://localhost:27017 |

---

## Local development (without Docker)

```bash
# Backend
cd apps/api
pip install -e ".[dev]"
uvicorn app.main:app --reload

# Frontend
cd apps/web
npm install
npm run dev
```

---

## Tests

```bash
make test          # all
make test-api      # backend only
```

---

## Lint, format and typecheck

```bash
make lint
make format
make typecheck
```

---

## Spec-Driven workflow

This project adopts **Spec-Driven Development**.
No feature is implemented without an approved spec.

```
specs/features/<NNN>-<slug>/
├── spec.md        – what to build
├── plan.md        – how to build it
├── tasks.md       – verifiable tasks
└── acceptance.md  – acceptance checklist
```

Read `AGENTS.md` before implementing anything.
See templates at `specs/templates/`.

---

## Original Bingo reference

The spreadsheet that originated this project is documented at:

```
docs/references/THUNDER_CRABS_SUMMER_BINGO_WORKBOOK_SPEC.md
```

This is a domain reference, not an implementation spec.

---

## ADRs

Architectural decisions recorded in `docs/adr/`.
