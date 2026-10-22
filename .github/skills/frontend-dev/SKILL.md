---
name: frontend-dev
description: 'Implement frontend tasks in React + TypeScript + Tailwind following the layout v2 design in docs/design. Use when: implementing a frontend task, creating components, pages or hooks, writing TypeScript/TSX code, adding UI, matching a mockup, using Material Icons, applying the Runescape theme, running npm test, running eslint or tsc.'
---

# Frontend Development

Implements frontend tasks following the project architecture, Runescape visual theme, and clean code standards.

## Architecture

```
Page → Feature → Hook → API Client → FastAPI
```

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Page | `features/<name>/pages/` | Route entry point, composes features |
| Feature | `features/<name>/components/` | Domain-specific UI blocks |
| Hook | `features/<name>/hooks/` | Data fetching and local state |
| API Client | `features/<name>/api/` (shared client in `lib/api/`) | HTTP calls — never inside components |

- Remote state via **TanStack Query** (`useQuery`, `useMutation`)
- Genuinely global UI state via **Zustand** only; per-device view preferences may use guarded `localStorage`
- Do NOT make HTTP calls directly inside components

## Visual Design — layout v2

The visual source of truth is `docs/design/`. Read it before touching any UI:

| File | What it gives you |
|------|-------------------|
| `docs/design/readme.md` | Chosen layout per screen, implementation order, business rules every screen must respect |
| `docs/design/design-system.md` | Color tokens, typography, sizes, focus/selection states, badge tones, shared patterns, shell layout |
| `docs/design/mockups/<screen>-<option>-<desktop\|mobile>.dc.html` | Exact structure, copy and states of each screen at 1440 px and 390 px |

Mockups are **references, not code**. Their inline styles and `<sc-for>`/`<sc-if>`/`{{...}}` syntax must never be copied. Translate them to Tailwind `rs-*` tokens and shared components.

### Fidelity rules

- Same sections, in the same order, with the same controls, copy (through i18n keys in en/pt/es), badges and states as the mockup, on desktop and mobile.
- Sizes from `design-system.md`: 40 px controls on desktop and 44 px on mobile, 64/56 px headers, 240 px sidebar, 2/3/4 px radii, 16 px input text on mobile.
- Example data in a mockup is not real data. Render real API data; never hardcode names, counts or progress from a mockup. Content marked "[FUTURE]" stays out until its feature exists.
- If something can't match (missing data, accessibility), keep the closest faithful version and record the deviation in `acceptance.md`.

### Tokens

Use only the `rs-*` colors in `tailwind.config.js`; they must match the table in `design-system.md` (add the tokens marked **new** there when a screen needs them). Never use generic Tailwind grays or whites for primary UI.

- Badge tones: success, gold, danger, danger-outline, info, neutral. Difficulty is fixed: Easy → success, Medium → gold, Hard → danger, always with text.
- Focus: 2 px `rs-gold-bright` outline, offset 2 px, on every interactive element.
- Filtered-out items are dimmed (opacity ~.38), never hidden or reordered.

### Typography

- `font-display` (Cinzel) only for short headings and the wordmark; `font-sans` (Inter) for everything else.
- Eyebrow, H1, card title and meta sizes are listed in `design-system.md`.

### Icons — Material Icons

Use `@mui/icons-material`. Mockups use Material Symbols names; map them directly (`grid_view` → `GridView`/`GridViewOutlined`). `shield_person` → `AdminPanelSettings`.

```tsx
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined'
```

- Outlined variants for neutral states, filled variants for active/selected states.
- Icon-only buttons need an accessible label and a tooltip.

### Shared components

Reuse and update `AppShell`, `Panel`, `Badge`, `FormModal`, `TileCard`, `BingoBoard` and the other components under `src/components/` and `src/features/*/components/` to the v2 look. Do not create parallel versions of an existing component.

## Clean Code Rules

- **Components do one thing.** One responsibility per component. If it needs a large "and", split it.
- **Props are typed explicitly.** Always define an interface or type alias for component props.
- **Names are intention-revealing.** `TileBadge`, not `Badge2`. `usePlayerScore`, not `useData`.
- **No magic strings.** Use constants or enums for repeated values.
- **Hooks extract logic.** Complex `useEffect` or derived state belongs in a custom hook, not inline.
- **No dead code.** Remove unused imports, commented-out JSX, and unreachable branches.
- **Keep JSX flat.** Extract deeply nested JSX into named sub-components.

## Procedure

### 1. Read the task

Check `specs/features/<id>/tasks/frontend.md` for the task and linked requirements.

### 2. Read the spec

Confirm expected behavior and UI requirements in `specs/features/<id>/spec.md`, including which mockup files it follows.

### 3. Implement in layer order

1. API client function in `features/<name>/api/` (shared HTTP client in `lib/api/`)
2. Custom hook wrapping TanStack Query
3. Feature component(s)
4. Page composition (if new route)
5. Route registration if needed

### 4. Match the design

Open the screen's mockups (desktop and mobile) listed in the spec. List every visible section, control, label and state, and implement each one with `rs-*` tokens and shared components. Compare the result with the mockup at 1440 px and 390 px before moving on.
Do not use generic Tailwind grays/whites for primary UI elements.

### 5. Write tests

- Unit tests for hooks and pure logic
- Component tests with React Testing Library
- File convention: `tests/unit/<feature>.test.tsx`

### 6. Validate

```bash
# From apps/web/
npm test
npm run lint
npm run format:check
npm run typecheck
npm run build
```

All checks must pass before marking the task done.

### 7. Mark task done

Update `specs/features/<id>/tasks/frontend.md`: change `- [ ]` to `- [x]` only after the implementation, tests, lint, formatting and typecheck pass.

## File Conventions

```
features/<name>/
├── pages/
│   └── <Name>Page.tsx
├── components/
│   └── <Name>.tsx
└── hooks/
    └── use<Name>.ts
```
