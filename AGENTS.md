# AGENTS.md – Mandatory Workflow for AI Agents

This file defines the protocol that any AI agent must follow when working in this repository.

---

## Mandatory workflow

```
1.  Read AGENTS.md (this file)
2.  Read the feature spec at specs/features/<id>/spec.md
3.  Read related documentation in docs/ (for any UI work, start with docs/design/)
4.  Do NOT implement requirements absent from the spec
5.  Create or review specs/features/<id>/plan.md
6.  Create or review specs/features/<id>/tasks/backend.md, frontend.md and integration.md as applicable
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
tasks/          ← defines backend, frontend and integration steps
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
- Follow clean code: functions do one thing, intention-revealing names, no magic numbers, no dead code, fail fast at boundaries.

## Frontend architectural pattern

```
Page → Feature → Hook → API Client → FastAPI
```

- Do not make HTTP calls directly inside visual components.
- Remote state via TanStack Query.
- Zustand only for genuinely frontend global state (UI, preferences).
- Follow clean code: one responsibility per component, intention-revealing names, no magic strings, no dead code.

## Frontend UI conventions

- **Design source of truth**: `docs/design/`. The chosen layouts and their order are in `docs/design/readme.md`; tokens, sizes, states and shared patterns are in `docs/design/design-system.md`; each screen's structure and copy are in `docs/design/mockups/`. When a page is built or rebuilt, follow its mockup **faithfully** on desktop (1440 px) and mobile (390 px): same sections, order, controls, copy, states and sizes.
- **Mockups are references, not code**: never copy their inline styles or template syntax. Implement with Tailwind `rs-*` tokens and shared components.
- **Layout changes need a spec**: adopting a mockup that changes approved behavior (for example, a dialog becoming a side panel, or a new bulk action) requires a feature spec that cites the mockup and the earlier spec it revises. Business rules in `docs/design/readme.md` always win over a mockup; record any conflict in the plan's `Open Questions`.
- **Deviations**: if a mockup can't be followed exactly (missing data, accessibility, an unavailable feature), record the deviation and its reason in the feature's `acceptance.md`. Never invent data to fill a mockup; "[FUTURE]" content stays out until its feature exists.
- **Icons**: use Material Icons (`@mui/icons-material`), mapping the mockups' Material Symbols names directly (`grid_view` → `GridView`). Outlined for neutral, filled for active/selected. `shield_person` → `AdminPanelSettings`.
- **Theme**: Runescape aesthetic — dark brown panels, gold borders, parchment/gold text. All colors come from the `rs-*` tokens in `tailwind.config.js`, which must match `docs/design/design-system.md`.
- No generic Tailwind grays/whites for primary UI elements. Difficulty badges always carry text (Easy = success, Medium = gold, Hard = danger).
- **Create/edit forms**: use modals as the project default, keeping the originating list visible behind the overlay. Reuse `components/ui/FormModal.tsx` for new or revised form flows, including related image/drop controls and import forms. Show validation/API errors inside the modal, preserve inputs on failure, and close on successful save with list refresh and success feedback.
- **Modal behavior**: provide a localized title and close control, trap/restore keyboard focus, support Escape while idle, lock background scrolling, and keep content usable on small screens. Disable duplicate submissions and dismissal while requests are pending. See `docs/architecture/frontend.md` for the full convention.

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
5. Write task lists under tasks/ (see templates at specs/templates/tasks/)
6. Implement task by task
7. Fill in acceptance.md
```
