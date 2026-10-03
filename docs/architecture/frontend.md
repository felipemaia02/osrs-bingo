# Architecture – Frontend

## Stack
React 18 · TypeScript 5 · Vite · TanStack Query v5 · React Router v6 · Tailwind CSS · Material UI/X · Day.js · react-i18next

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

All application-controlled labels must use translation keys. Event names, team names, player names, and OSRS proper names remain unchanged unless the domain data supplies translations.

## Visual system

The interface follows a restrained RuneScape-inspired system rather than reproducing the legacy game client or applying a generic dashboard theme.

- Dark warm canvas and surfaces establish hierarchy.
- Gold is reserved for identity, active state, progress, and high-value emphasis.
- Parchment-toned text replaces generic Tailwind whites and grays.
- `Cinzel` is limited to short display headings; `Inter` and system fallbacks serve interface content.
- Corners remain compact and decoration stays secondary to information.
- Texture and motion are subtle; reduced-motion preferences are respected globally.

Shared tokens are defined in `tailwind.config.js`. Reusable primitives live under `src/components/ui/`, while shared composites such as the application shell and language switcher live under `src/components/common/`.

## Icons

Use `@mui/icons-material` as the only interface icon system:

- outlined variants for neutral, inactive, or decorative states;
- filled variants for active, selected, or completed states;
- icons inside icon-only buttons require an accessible label and tooltip;
- do not mix Material Icons with emoji or arbitrary Unicode symbols for interface actions.

## Responsive layout

The application shell uses persistent side navigation on desktop and compact bottom navigation on mobile. Content must remain usable from 320 px upward.

The 6×6 Bingo board preserves a readable tile width inside a keyboard-focusable horizontal scroll region on narrow screens. It must not compress all six columns into a phone viewport.

## Bingo presentation boundary

The current Bingo page presents static prototype data. Tile completion and score values are preserved only for prototype continuity; authoritative Bingo rules must move to the backend `modules/scoring/` module in a dedicated future feature.

## Event state

Event server state uses TanStack Query. The current event identifier is genuine frontend-global preference state and uses a persisted Zustand store. The stored identifier is always revalidated against the active-event API response; missing or finished selections are cleared without automatically choosing another event.

The `/events` page owns event management. Components do not issue HTTP calls directly: typed functions under `features/events/api/` are wrapped by hooks under `features/events/hooks/`.

### Event date and time

Event scheduling uses MUI X `DateTimePicker` with the Day.js adapter. A global localization provider follows the selected application language (`en`, `pt`, or `es`), while the field uses a 24-hour clock and 15-minute increments.

The form displays the browser's local timezone and keeps local `Dayjs` values only while editing. API payloads are converted to ISO 8601 UTC instants at the API boundary. The end must be later than the start; one-, seven-, and fourteen-day presets provide fast, explicit duration changes.

## Type generation

Strategy: `openapi-typescript` generates types from the FastAPI OpenAPI schema.

```bash
npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api.gen.ts
```

Implement as a task inside a future spec.

### Session and event registrations

Discord session state is remote state in TanStack Query. The API client sends HttpOnly session cookies with credentials. The event list offers personal registration/status; administrators use `/teams` for approval, assignment, and removal. Logout clears private cached data. See [authentication and registration](authentication.md).

### Administration portal

`/login` is the dedicated Discord entry point. `/admin` routes require an authenticated application administrator. Global user/role management lives at `/admin/administrators`; `/admin/events` and `/admin/teams` contain management controls removed from the public event page. Team/registration and ranking sections explicitly select an event independently of the public current-event selector. The ranking entry currently explains that scoring is unavailable; it does not display prototype points.
