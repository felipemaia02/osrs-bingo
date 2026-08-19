# Architecture – Overview

## Monorepo structure

```
osrs-bingo/
├── apps/api/    – FastAPI Modular Monolith
├── apps/web/    – React SPA
├── specs/       – Spec-Driven Development
├── docs/        – Documentation and ADRs
├── infra/       – Infrastructure (future: Terraform, k8s)
└── scripts/     – Utility scripts
```

## Data flow

```
Browser
  │
  │  HTTP/REST
  ▼
FastAPI (apps/api)
  │
  │  Motor (async)
  ▼
MongoDB
```

## Principles

- Each app is independently deployable.
- Business rules reside in module `service.py` files.
- Scoring is centralized in `modules/scoring`.
- TypeScript types are generated from the FastAPI OpenAPI schema.

See `ADR-001` through `ADR-005` in `docs/adr/` for architectural decisions.
