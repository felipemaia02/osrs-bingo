# Tasks – Project Foundation

## Backend

- [x] T001 Create `apps/api/pyproject.toml` → FR-001
- [x] T002 Create `app/core/config.py` → FR-003
- [x] T003 Create `app/core/logging.py`
- [x] T004 Create `app/core/exceptions.py`
- [x] T005 Create `app/database/mongodb.py` with `DatabaseClient` class → FR-003
- [x] T006 Create `app/database/indexes.py` with `IndexManager` class
- [x] T007 Create `app/main.py` with `GET /health` → FR-001
- [x] T008 Create domain module packages
- [x] T009 Create `apps/api/Dockerfile`

## Frontend

- [x] T010 Create `apps/web/package.json` → FR-002
- [x] T011 Configure Vite + TypeScript + Tailwind
- [x] T012 Create `src/App.tsx` and home page → FR-002, AC-002
- [x] T013 Create central HTTP client → FR-002
- [x] T014 Add i18n (en, pt, es) with `LanguageSwitcher`
- [x] T015 Create `apps/web/Dockerfile`

## Infrastructure

- [x] T016 Create `docker-compose.yml` → FR-003, AC-001
- [x] T017 Create `Makefile` → FR-004
- [x] T018 Create `.env.example`

## Tests

- [x] T019 Create `tests/unit/test_health.py` → AC-003

## Quality

- [x] T020 Configure Ruff and MyPy
- [x] T021 Configure ESLint and Prettier

## Documentation

- [x] T022 Create `AGENTS.md`
- [x] T023 Create `README.md`
- [x] T024 Create ADRs 001–005
- [x] T025 Create architecture docs
- [x] T026 Create spec templates
- [x] T027 Create `.github/workflows/api-ci.yml`
- [x] T028 Create `.github/workflows/web-ci.yml`
