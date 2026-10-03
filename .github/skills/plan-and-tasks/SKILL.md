---
name: plan-and-tasks
description: 'Create or review a unified implementation plan and separate backend, frontend, and integration task lists for an approved feature spec. Use when creating plan.md or files under tasks/. Do not change the source spec or implement code.'
---

# Plan and Tasks

Creates one coordinated `plan.md` and task lists separated by implementation area.

## When to Use

- A `spec.md` exists and has been approved
- You need to write or review `plan.md`
- You need to write or review files under `tasks/`
- You need to decompose a feature into ordered, traceable tasks

## Procedure

### 1. Read the spec

```
specs/features/<id>/spec.md
```

Understand all FRs, BRs, edge cases, and acceptance criteria before writing anything.

### 2. Create `plan.md`

Follow the template at `specs/templates/plan.md`.

Required sections:
- **Summary** — one paragraph technical overview
- **Architecture Impact** — list new modules, changed boundaries
- **Backend Changes** — affected modules, new endpoints, services, repositories
- **Frontend Changes** — affected pages, components, hooks
- **Data Model** — new documents or fields; justify embedding vs. referencing
- **API Changes** — table with method, path, description
- **Security Considerations** — auth, authorization, input validation
- **Test Strategy** — unit, integration, frontend
- **Implementation Order** — numbered list
- **Open Questions** — record every ambiguity; do NOT resolve silently

### 3. Create task files

Create only the task files needed by the feature, using the templates under `specs/templates/tasks/`:

- `tasks/backend.md` for API, domain, persistence, backend tests and backend quality checks.
- `tasks/frontend.md` for API client, hooks, UI, frontend tests and frontend quality checks.
- `tasks/integration.md` for contract validation, end-to-end flows and acceptance validation.

Rules:
- Each task maps to at least one FR, BR, or AC from the spec
- Tasks are small and independently completable (≤ 1 day each)
- Order respects the implementation order in `plan.md`
- Use `BE-`, `FE-`, and `IN-` identifiers in the corresponding files
- Keep tests and quality checks in the same area as the code they validate
- Put final acceptance validation only in `tasks/integration.md`

### 4. Validate coverage

Confirm every FR, BR, and AC in `spec.md` is covered by at least one task across `tasks/`.
If a gap exists, add the missing task before finishing.

## File Locations

```
specs/features/<id>/
├── spec.md      ← read-only (source of truth)
├── plan.md      ← create/update here
├── tasks/
│   ├── backend.md
│   ├── frontend.md
│   └── integration.md
└── acceptance.md
```
