# Architecture – Frontend

## Stack
React 18 · TypeScript 5 · Vite · TanStack Query v5 · React Router v6 · Tailwind CSS · react-i18next

## Structure

```
src/
├── app/
│   ├── router/         – application routes
│   └── providers/      – global providers (Query, future auth)
├── features/           – features by domain
│   ├── auth/
│   ├── bingo/
│   ├── board/
│   ├── teams/
│   ├── submissions/
│   ├── leaderboard/
│   └── admin/
├── components/
│   ├── ui/             – primitives (Button, Input, Card...)
│   └── common/         – reusable composites (LanguageSwitcher...)
├── hooks/              – generic hooks
├── lib/
│   ├── api/            – central HTTP client
│   └── i18n/           – i18next config and locales (en, pt, es)
├── services/           – domain-level API calls
└── types/              – shared types and OpenAPI-generated types
```

## State

| Type | Tool |
|---|---|
| Server state (boards, tiles, etc.) | TanStack Query |
| Frontend-only global UI state | Zustand (only when necessary) |

## Internationalisation

Three supported languages: English (`en`), Portuguese (`pt`), Spanish (`es`).
Translation files live in `src/lib/i18n/locales/`.
Language auto-detected from the browser via `i18next-browser-languagedetector`.

## Type generation

Strategy: `openapi-typescript` generates types from the FastAPI OpenAPI schema.

```bash
npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api.gen.ts
```

Implement as a task inside a future spec.
