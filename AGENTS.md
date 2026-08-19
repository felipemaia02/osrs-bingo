# AGENTS.md – Mandatory Workflow for AI Agents

This file defines the protocol that any AI agent must follow when working in this repository.

---

## Mandatory workflow

```
1.  Read AGENTS.md (this file)
2.  Read the feature spec at specs/features/<id>/spec.md
3.  Read related documentation in docs/
4.  Do NOT implement requirements absent from the spec
5.  Create or review specs/features/<id>/plan.md
6.  Create or review specs/features/<id>/tasks.md
7.  Implement one task at a time
8.  Create or update corresponding tests
9.  Run tests (pytest / npm test)
10. Run lint and typecheck (ruff / mypy / eslint / tsc)
11. Mark the task as done in tasks.md
12. Validate acceptance.md
```

---

## Source of truth hierarchy

```
spec.md         ← defines expected behavior
   ↓
plan.md         ← defines how it will be implemented
   ↓
tasks.md        ← defines the implementation steps
   ↓
code            ← executes what was specified
```

If code and spec diverge, the **spec is the source of truth**, unless the spec itself is explicitly under revision.

---

## Critical rules

> **Never change a business rule just because it seems wrong.**

When finding an inconsistency:

1. Record it in the `Open Questions` section of the relevant `plan.md`.
2. Do not decide silently.
3. Do not change the original spec without explicit instruction from the user.

---

## Backend architectural pattern

```
router → service → repository → MongoDB
```

- `router.py` contains no business logic.
- `service.py` centralizes all domain logic.
- `repository.py` contains only MongoDB access.
- Do not create artificial layers when there is no meaningful business logic.

## Frontend architectural pattern

```
Page → Feature → Hook → API Client → FastAPI
```

- Do not make HTTP calls directly inside visual components.
- Remote state via TanStack Query.
- Zustand only for genuinely frontend global state (UI, preferences).

---

## Scoring module

The `modules/scoring/` module must centralize **all** Bingo scoring rules.

Do not spread Bingo rules across routers, React components, or MongoDB queries.

---

## Domain reference

The original Bingo spreadsheet is documented at:

```
docs/references/THUNDER_CRABS_SUMMER_BINGO_WORKBOOK_SPEC.md
```

This document is a **domain reference**, not an implementation spec.
No feature must be implemented directly from it without a corresponding `spec.md`.

---

## Creating a new feature

```
1. Create folder: specs/features/<NNN>-<slug>/
2. Write spec.md (see template at specs/templates/specification.md)
3. Wait for spec approval
4. Write plan.md (see template at specs/templates/plan.md)
5. Write tasks.md (see template at specs/templates/tasks.md)
6. Implement task by task
7. Fill in acceptance.md
```
