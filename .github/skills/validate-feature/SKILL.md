---
name: validate-feature
description: 'Validate a feature across backend and frontend, execute integration and quality checks, verify acceptance criteria, and update acceptance.md. Use only after implementation tasks are complete; do not invent requirements or silently fix business-rule conflicts.'
---

# Validate Feature

Performs the final evidence-based validation of an implemented feature.

## Preconditions

Read `AGENTS.md`, `spec.md`, `plan.md`, every file under `tasks/`, and the existing `acceptance.md`. If required implementation tasks remain open, report them and do not mark the feature accepted.

## Procedure

1. Map every acceptance criterion to an observable test or manual verification.
2. Run backend tests, Ruff and MyPy when the feature has backend scope.
3. Run frontend tests, ESLint, Prettier check, TypeScript typecheck and production build when the feature has frontend scope.
4. Execute the integration checks in `tasks/integration.md`, including API/UI contract and error flows.
5. Validate Docker or required runtime infrastructure when the spec includes it.
6. Record exact evidence and any environment limitation in `acceptance.md`.

## Rules

- A checked acceptance item means it was verified in the current implementation, not merely implemented or previously reported as passing.
- Do not weaken an acceptance criterion to make it pass.
- Do not mark a skipped, blocked, flaky, or unexecuted check as complete.
- Record spec/code conflicts in `plan.md` under `Open Questions` and request a product decision.
- Make only narrow validation-related fixes when explicitly authorized; otherwise report failures without changing implementation.

## Completion

Mark the relevant `IN-` task complete only when its evidence passes. Summarize passed checks, failures, limitations, and whether the feature is accepted.
