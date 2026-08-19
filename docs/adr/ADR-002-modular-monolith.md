# ADR-002: Modular Monolith for the backend

## Status
Accepted

## Context
Microservices add operational complexity (service mesh, distributed tracing, independent deployments) that is not justified at the current project size.

## Decision
The backend is a single FastAPI process organised into domain modules (`auth`, `users`, `players`, `teams`, `events`, `boards`, `tiles`, `submissions`, `verification`, `scoring`). Each module has explicit boundaries: router, service, repository, schemas.

## Consequences
- Simple deployment and testing.
- Explicit boundaries facilitate eventual service extraction if needed.
- Business rules centralised in the `scoring` module.
