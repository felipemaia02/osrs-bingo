# ADR-001: Monorepo

## Status
Accepted

## Context
The project has a frontend and a backend that share domain, documentation and deployment process. Maintaining two separate repositories increases coordination overhead without real benefit at this stage.

## Decision
Use a single repository (monorepo) with independent apps under `apps/api` and `apps/web`. Each app has its own build, tests, Dockerfile and CI pipeline.

## Consequences
- Simplifies cross-cutting refactors and coordinated API + frontend evolution.
- Path-filtered pipelines prevent unnecessary builds.
- Can be split into separate repos in the future without architectural changes.
