# OSRS Bingo Web

React SPA – frontend for the OSRS Bingo project.

## Local development

```bash
npm install
npm run dev
```

## Lint / Typecheck / Format

```bash
npm run lint
npm run typecheck
npm run format
```

## Structure

```
src/
├── app/
│   ├── router/     – route definitions (React Router)
│   └── providers/  – global providers (Query, etc.)
├── features/       – features by domain
├── components/
│   ├── ui/         – themed UI primitives (Panel, Badge, Progress...)
│   └── common/     – shared composites (AppShell, LanguageSwitcher...)
├── hooks/          – generic hooks
├── lib/
│   ├── api/        – central HTTP client (axios + interceptors)
│   └── i18n/       – i18next config and locales (en, pt, es)
├── services/       – domain API calls
└── types/          – global types and OpenAPI-generated types
```

## Internationalisation

Supported languages: English (`en`), Portuguese (`pt`), Spanish (`es`).
Switch language via the `LanguageSwitcher` component or by changing the browser language.

Every application-controlled label must exist in all three locale files. OSRS, event, team, and player proper names remain domain data and are not translated automatically.

## Visual conventions

- Use the semantic `rs.*` tokens from `tailwind.config.js`; avoid generic gray and white as primary UI colors.
- Reserve `font-display` (Cinzel) for short headings and use the default interface font for content.
- Use Material Icons: outlined for neutral states and filled for active or completed states.
- Keep decoration restrained: compact radii, subtle texture, selective gold, and no decorative glow as a primary state indicator.
- Provide accessible names, keyboard focus, image fallbacks, and reduced-motion behavior.
- On mobile, preserve readable Bingo tiles in a horizontal scroll region instead of shrinking all six columns.

## API type generation

```bash
npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api.gen.ts
```

## Events

The `/events` route provides the temporary public event administration interface. Remote event data uses TanStack Query; current-event selection uses persisted Zustand state and is validated against active events on load.

Event dates use localized MUI X date/time pickers backed by Day.js. The editor presents local time in a 24-hour format, offers one-, seven-, and fourteen-day duration presets, validates that the end follows the start, and serializes values as UTC ISO 8601 instants for the API.
