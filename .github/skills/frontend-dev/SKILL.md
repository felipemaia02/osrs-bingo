---
name: frontend-dev
description: 'Implement frontend tasks in React + TypeScript + Tailwind. Use when: implementing a frontend task, creating components, pages or hooks, writing TypeScript/TSX code, adding UI, using Material Icons, applying Runescape theme, running npm test, running eslint or tsc.'
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
| API Client | `lib/api/` | HTTP calls — never inside components |

- Remote state via **TanStack Query** (`useQuery`, `useMutation`)
- Global UI state (theme, language, sidebar) via **Zustand** only
- Do NOT make HTTP calls directly inside components

## Visual Theme — Runescape

The UI must evoke the classic RuneScape aesthetic while remaining functional and accessible.

### Color Palette

| Token | Usage | Reference |
|-------|-------|-----------|
| `rs-brown-dark` | Panel backgrounds, borders | `#3d2b1f` |
| `rs-brown-mid` | Secondary panels, headers | `#5c3d28` |
| `rs-gold` | Headings, highlights, active states | `#c8a84b` |
| `rs-gold-light` | Hover, glow effects | `#f0d080` |
| `rs-parchment` | Body text background | `#f5e6c8` |
| `rs-text` | Primary text | `#ffe4a0` |
| `rs-text-muted` | Secondary text | `#a89060` |
| `rs-red` | Danger, health | `#8b0000` |
| `rs-green` | Success, prayer | `#2d5a1b` |

Define these in `tailwind.config.js` under `theme.extend.colors`.

### Typography

- Headings: `font-serif` with letter-spacing — mimics the RS interface font
- Body: clean sans-serif for readability
- Use `text-rs-gold` for section titles

### Components Style

- Panels: dark brown background, gold border (`border border-rs-gold/40`), slight inner shadow
- Buttons: brown base, gold border, gold text; hover glows gold
- Tables: alternating row tints using `rs-brown-mid` / `rs-brown-dark`
- Inputs: dark background, gold border on focus

### Icons — Material Icons

Use **Material Icons** for all UI icons. Import via the `@mui/icons-material` package.

```tsx
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
```

- Prefer outlined variants for decorative icons
- Use filled variants for active/selected states
- Keep icon size consistent: `fontSize="small"` inside compact UI, `fontSize="medium"` as default

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

Confirm expected behavior and UI requirements in `specs/features/<id>/spec.md`.

### 3. Implement in layer order

1. API client function in `lib/api/`
2. Custom hook wrapping TanStack Query
3. Feature component(s)
4. Page composition (if new route)
5. Route registration if needed

### 4. Apply Runescape theme

Every new component must follow the visual theme defined above.
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
