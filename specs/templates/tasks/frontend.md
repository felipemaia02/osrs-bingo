# Frontend Tasks – <Feature Name>

Each task must reference at least one requirement or acceptance criterion.

For creation/editing flows, follow the modal convention in `AGENTS.md` and `docs/architecture/frontend.md`: reuse `FormModal`, keep errors inside the dialog, block dismissal while pending, and verify cancellation/focus restoration and successful submission.

For UI work, follow the layout v2 design (`docs/design/readme.md`, `docs/design/design-system.md`): name the mockup file(s) each task implements, use only `rs-*` tokens, and check desktop (1440 px) and mobile (390 px).

- [ ] FE-001 ... (mockup: `docs/design/mockups/<file>`) → FR-001, AC-001
- [ ] FE-002 Add component or hook tests for ... → AC-001
- [ ] FE-003 Run tests, ESLint, Prettier and TypeScript successfully → AC-001
