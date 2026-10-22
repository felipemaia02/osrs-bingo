# Architecture – Frontend

## Stack
React 18 · TypeScript 5 · Vite · TanStack Query v5 · React Router v6 · Tailwind CSS · Material UI/X · Day.js · react-i18next

## Structure

```
src/
├── app/
│   ├── router/         – application routes
│   └── providers/      – global providers (Query, date localization)
├── features/           – features by domain (api/, hooks/, components/, pages/ inside each)
│   ├── administration/ – portal overview, administrators, ranking entry, admin route guard
│   ├── auth/           – Discord session, login page, auth controls
│   ├── bingo/          – public board page, tiles, search/filter helpers
│   ├── boards/         – event board builder
│   ├── cards/          – global card catalog
│   ├── events/         – events list/management, active-event indicator
│   └── teams/          – registrations, roster and teams
├── components/
│   ├── ui/             – primitives (Panel, Badge, ProgressBar, FormModal, DateTimeField)
│   └── common/         – shared composites (AppShell, LanguageSwitcher)
├── lib/
│   ├── api/            – central HTTP client
│   └── i18n/           – i18next config and locales (en, pt, es)
└── types/              – shared types
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

The visual source of truth is `docs/design/` (layout v2, chosen on 2026-10-22):

- `docs/design/readme.md` — chosen layout per screen, implementation order and the business rules every screen must respect.
- `docs/design/design-system.md` — color tokens, typography, sizes, focus and selection states, badge tones and shared patterns.
- `docs/design/mockups/` — one mockup per screen (desktop 1440 px, mobile 390 px). They are references for structure, copy and states, not code to copy.

Every page that is built or rebuilt follows its mockup faithfully. Until a screen is migrated, it keeps its current look; migration happens one screen at a time, each through its own spec (see "Layout v2 migration" below).

Principles that stay the same: a restrained RuneScape-inspired look rather than the game client or a generic dashboard; gold reserved for identity, active state and emphasis; parchment text instead of generic whites and grays; `Cinzel` only for short headings and the wordmark, `Inter` for everything else; compact corners; subtle motion that respects reduced-motion preferences.

Tokens live in `tailwind.config.js` (`rs-*`) and must match `design-system.md`. Reusable primitives live under `src/components/ui/`; shared composites such as the application shell live under `src/components/common/`. Update these shared pieces to the v2 look instead of creating parallel versions.

## Creation and editing dialogs

Project convention established by the user on 2026-10-21: creation and editing forms open in a modal, with the originating list retained behind the overlay. Related fields and tools (such as drops, rules, image selection and import controls) stay within that dialog. Apply this default when creating or revising form flows; it does not silently change feature-specific business rules or migrate existing screens.

Reuse `src/components/ui/FormModal.tsx`, built on the installed MUI Modal for portal rendering, focus trapping/restoration, and background scroll locking. Keep domain-specific form state, validation and mutations in the feature; the shared modal owns presentation and dismissal behavior.

- Use a localized title, labeled close button and appropriate form actions.
- Keep the dialog within the viewport with internal scrolling and usable controls from 320 px upward.
- Support Escape and explicit cancellation while idle, restoring focus to the opening control when dismissed.
- Display validation and API errors inside the modal and retain the entered values so the user can correct or retry.
- Disable duplicate submission and dismissal while a save, import or image-resolution request is pending.
- After successful save, close the editor, refresh the relevant list through TanStack Query, and show success feedback on the originating page. Keep import conflicts inside the dialog for review.
- Test opening, cancellation/focus restoration, pending behavior, in-dialog errors and successful submission as applicable.

The catalog creation/editing and workbook-import dialogs are the reference implementation. Specialized editors such as the event board retain their approved page layout unless their spec is explicitly revised.

## Icons

Use `@mui/icons-material` as the only interface icon system:

- the mockups use Material Symbols names; map them directly to MUI components (`grid_view` → `GridView` / `GridViewOutlined`). `shield_person` has no MUI equivalent: use `AdminPanelSettings`;
- outlined variants for neutral, inactive, or decorative states;
- filled variants for active, selected, or completed states;
- icons inside icon-only buttons require an accessible label and tooltip;
- do not mix Material Icons with emoji or arbitrary Unicode symbols for interface actions.

## Responsive layout

Content must remain usable from 320 px upward, with touch targets of at least 44 px on mobile. Desktop uses a persistent sidebar; mobile uses a header, an event bar and a bottom bar (shell 4A in `docs/design/`).

The board (3×3 to 6×6, feature 014; the mockups show 6×6) never compresses its columns into a phone viewport: on mobile it is shown as a row-grouped list, with the 6×6 mini-map from mockup 1B above it once the board v2 is implemented.

## Layout v2 migration

| Order | Screen | Mockups | Current state | Target |
|---|---|---|---|---|
| 1 | App shell | `shell-a-desktop`, `shell-a-mobile` | **Done (feature 010)** | Grouped sidebar (Play / Administration), no admin tab row, Ranking only inside Administration, event pill with countdown, EN/PT/ES segmented control, account menu; mobile event bar and bottom bar with Admin for administrators; administration overview with real counts |
| 2 | Board `/` | `board-a-desktop`, `board-b-mobile` | **Done (feature 011)** | 6×6 grid with a fixed tile detail panel on desktop, "Progress unavailable" info banner, "Your team" card; mobile row list plus a 6×6 mini-map |
| 3 | `/admin/teams` | `teams-a-desktop`, `teams-a-mobile` | **Done (feature 012)** | Table with Discord and request time, multi-select with approve/remove selected, mobile cards |
| 4 | `/admin/boards` | `boards-a-desktop`, `boards-b-mobile` | **Done (feature 013)** | Desktop 2A with status panel, difficulty counts, visible empty slots, catalog filters; mobile "position first" flow |
| 5 | `/events`, `/admin/events` | none (design system) | **Done (feature 015)** | Tabs with counts, admin table/cards with per-status actions, FormModal, player cards with registration badges |
| 6 | `/admin/cards` | none (design system) | **Done (feature 016)** | Local search and filters, desktop table with a fixed detail panel, mobile cards, retire via ConfirmDialog |

[FUTURE] mockups are implemented only with their own features (submissions, scoring, ranking).

## Bingo presentation boundary

The Bingo page renders the active event's published board from the API (feature 007). The frontend calculates no score, completion or bonus: tile progress shows as unavailable until accepted activity and the backend `modules/scoring/` module (feature 006) exist. The original static prototype data and its frontend score summary were removed on 2026-10-21.

Features 009 and 011 make the board a planning tool without any calculation. Search matches tile names, drop names and aliases, ignoring case and accents. The difficulty filter dims tiles without moving them. Only the viewer's own team is shown.

- **Desktop** (`board-a-desktop`): an event header with a "Your team" card, a "Progress unavailable" info banner, a toolbar (search, difficulty and view segmented controls, help modal, result line), a labeled 6×6 grid or the row list, and a fixed detail panel with drops as progress units. The panel starts with a prompt until a tile is selected.
- **Mobile** (`board-b-mobile`): a summary card, the search field and difficulty chips, a 6×6 mini-map (tap to scroll to a tile), the row list, and tile details in a modal.
- The layout is chosen with `useIsDesktop` (the `md` breakpoint), so only one renders. The desktop grid/list choice is kept in `localStorage` (`osrs-bingo-board-view`) behind guarded access.

## Event state

Event server state uses TanStack Query. The header and public board automatically use the single active event returned by the API. There is no header selector or persisted current-event preference. Administrative event selectors remain independent and explicit. The platform identity is OSRS Bingo, not the team/season from the source workbook.

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

`/login` is the dedicated Discord entry point. `/admin` routes require an authenticated application administrator. Global user/role management lives at `/admin/administrators`; `/admin/events` and `/admin/teams` contain management controls removed from the public event page. Team/registration and ranking sections explicitly select an event. Since feature 010, administration navigation lives only in the shell's Administration group (no separate tab row). Ranking is shown there disabled ("Soon"), never to players. The `/admin/ranking` route still explains that scoring is unavailable and displays no points.

### Participant roster

Administration shows Pending, Unassigned, Assigned and Teams tabs (feature 012, layout 3A). Desktop uses a table with OSRS name, Discord, request time, status and actions. Rows on the current page can be selected for "Approve selected" (Pending) and "Remove selected" (Pending, Unassigned, Assigned) through `approve-selected`/`remove-selected` endpoints that keep per-record state checks and report changed/skipped counts. Mobile uses chips and cards without multi-select. Participant rows load in pages of 25 with server-side search over OSRS and Discord names (300 ms debounce), group and team filters. Counts are event-wide, while pagination totals reflect filters. Changing tab, search or page clears the selection, and removing the final row on a page returns to a valid page. Creating teams, assigning participants and every confirmation use `FormModal`. Approve-all still applies to every pending registration in the event and says so.
