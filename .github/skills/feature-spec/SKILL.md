---
name: feature-spec
description: 'Create or refine a feature specification before planning or implementation. Use when drafting spec.md, reviewing requirements, resolving ambiguities, defining acceptance criteria, or preparing a spec for approval. Do not create implementation plans or write code.'
---

# Feature Specification

Creates a new `spec.md` or improves an existing one while preserving product intent and explicit user authority over business rules.

## Modes

- **Create:** when `specs/features/<id>/spec.md` does not exist, create the feature folder and draft it from `specs/templates/specification.md`.
- **Refine:** when the spec exists, review it for ambiguity, gaps, conflicts, edge cases, scope creep, security concerns, and untestable acceptance criteria.

## Procedure

1. Read `AGENTS.md`, related documentation in `docs/`, and the relevant domain references.
2. Inspect adjacent feature specs to preserve terminology and boundaries.
3. Establish context, problem, goal, user stories, functional requirements, business rules, edge cases, out-of-scope items, and Given/When/Then acceptance criteria.
4. Keep the specification implementation-independent. Do not prescribe FastAPI classes, React components, MongoDB collections, or task ordering.
5. Give every requirement and acceptance criterion a stable identifier.
6. Confirm that each user-visible behavior is testable and that error, empty, permission, and boundary cases are addressed when relevant.
7. For UI features, add a **Design reference** section naming the chosen mockup files in `docs/design/mockups/` (desktop and mobile) and the decision row in `docs/design/readme.md`. Describe the visible behavior the mockup requires in requirements; never copy example data from a mockup as if it were real. If the mockup changes behavior approved in an earlier spec, name that spec and requirement explicitly and list the change for user approval.

## Ambiguities and business rules

Never infer a feature requirement directly from `docs/references/THUNDER_CRABS_SUMMER_BINGO_WORKBOOK_SPEC.md`. It is a domain reference, not an implementation spec. The same applies to `docs/design/mockups/`: a mockup shows the chosen layout, but anything it implies beyond layout (new actions, data or rules) must be stated in the spec and approved. "[FUTURE]" mockup content is out of scope until its feature exists.

- Fix only clear wording, structure, or formatting defects directly.
- Present unresolved product decisions to the user before encoding them as requirements.
- Never change a business rule because it appears incorrect.
- If a `plan.md` already exists, record discovered inconsistencies in its `Open Questions` section.
- If no plan exists yet, keep a clearly labeled unresolved-questions section in the working draft and do not mark the spec approved.

## Completion

Finish by showing requirement-to-acceptance coverage and listing unresolved decisions. Do not create `plan.md`, task files, implementation code, or approve the spec on the user's behalf.
