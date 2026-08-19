.PHONY: dev dev-api dev-web \
        test test-api test-web \
        lint lint-api lint-web \
        format format-api format-web \
        typecheck typecheck-api typecheck-web \
        build docker-up docker-down

# ── Local dev ──────────────────────────────────────────────────────────────────
dev:
	docker compose up

dev-api:
	cd apps/api && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-web:
	cd apps/web && npm run dev

# ── Tests ──────────────────────────────────────────────────────────────────────
test: test-api test-web

test-api:
	cd apps/api && pytest

test-web:
	cd apps/web && npm test

# ── Lint ───────────────────────────────────────────────────────────────────────
lint: lint-api lint-web

lint-api:
	cd apps/api && ruff check .

lint-web:
	cd apps/web && npm run lint

# ── Format ─────────────────────────────────────────────────────────────────────
format: format-api format-web

format-api:
	cd apps/api && ruff format .

format-web:
	cd apps/web && npm run format

# ── Type check ─────────────────────────────────────────────────────────────────
typecheck: typecheck-api typecheck-web

typecheck-api:
	cd apps/api && mypy app/

typecheck-web:
	cd apps/web && npm run typecheck

# ── Docker ─────────────────────────────────────────────────────────────────────
docker-up:
	docker compose up --build

docker-down:
	docker compose down

# ── Build ──────────────────────────────────────────────────────────────────────
build:
	cd apps/web && npm run build
