# ADR-005: Spec-Driven Development

## Status
Accepted

## Context
The project will be developed intensively with AI agents. Without a clear hierarchy of sources of truth, implementations silently diverge from requirements.

## Decision
Adopt Spec-Driven Development: every feature starts with `spec.md` → `plan.md` → `tasks.md` → code → `acceptance.md`. The spec is the source of truth. Inconsistencies are recorded, not silently decided.

## Consequences
- AI agents have enough context to work autonomously and correctly.
- Regressions are identifiable by divergence between spec and code.
- Documentation overhead is offset by reduced rework.
