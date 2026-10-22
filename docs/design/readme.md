# Layout v2 — design reference

High-fidelity mockups of layout changes for OSRS Bingo. Use them as a **visual reference** only.

## What's in this folder

- `mockups/*.dc.html` — one file per screen (desktop 1440 px or mobile 390 px). They are mockups with inline styles and a small template syntax (`<sc-for>`, `<sc-if>`, `{{...}}`), so they **do not render on their own** in a browser. Read them for structure, copy, spacing, colors and states. **Do not copy their code into the app.**
- `assets/` — boss images cropped from a screenshot of the current app, plus the logo shield. Real images must keep coming from the OSRS Wiki with attribution and a fallback image.
- [`design-system.md`](design-system.md) — tokens, sizes, states, badges and shared patterns extracted from the chosen mockups. Use it as the implementation reference for the visual layer.
- Optional: put PNG exports of each screen in `screenshots/` so they're easier to compare visually.

### Mockup index

File names were corrected on 2026-10-22 to match each mockup's own title.

| Screen | File |
|---|---|
| App shell 4A (chosen) | `mockups/shell-a-desktop`, `mockups/shell-a-mobile` |
| App shell 4B | `mockups/shell-b-desktop` (mobile missing) |
| Board 1A (chosen, the "Main" screen) | `mockups/board-a-desktop` (mobile missing; the current row list remains the base) |
| Board 1B (mobile mini-map chosen) | `mockups/board-b-desktop`, `mockups/board-b-mobile` |
| Teams 3A (chosen) | `mockups/teams-a-desktop`, `mockups/teams-a-mobile` |
| Teams 3B | `mockups/teams-b-desktop`, `mockups/teams-b-mobile` |
| Board builder 2A (desktop chosen) | `mockups/boards-a-desktop`, `mockups/boards-a-mobile` |
| Board builder 2B (mobile chosen) | `mockups/boards-b-desktop`, `mockups/boards-b-mobile` |
| [FUTURE] screens | `mockups/future-board-desktop` (mobile missing), `future-my-submissions`, `future-review`, `future-unrecognized`, `future-rules`, `future-ranking` |
| Notes | `mockups/recommendation`, `mockups/suggestions` |

Missing from the export: `shell-b-mobile`, `board-a-mobile`, `future-board-mobile` and `assets/dagannoth-kings.png`. None blocks the chosen layouts: board 1A on mobile is the row list plus the 1B mini-map, both covered by `board-b-mobile` and the current app.

## Decisions — implement in this order

| # | Screen | Chosen layout | Mockup files |
|---|--------|---------------|--------------|
| 1 | App shell | **4A** grouped sidebar. Remove the admin tab row. "Ranking" only appears inside the Administration group (admins only). "My submissions" is shown as disabled with a "Soon" badge. | `shell-a-desktop`, `shell-a-mobile` |
| 2 | Board `/` | **1A** on desktop (6×6 grid + fixed tile detail panel). On mobile: list by row (1A) **plus the 6×6 mini-map from 1B** above the list. | `board-a-desktop`, `board-b-mobile` (mini-map only) |
| 3 | `/admin/teams` | **3A** tabs + table with bulk actions (multi-select, "Approve selected", "Approve all" with confirmation). | `teams-a-desktop`, `teams-a-mobile` |
| 4 | `/admin/boards` | **2A** on desktop (drag and drop, side catalog, difficulty counts, empty slots, rules panel). On mobile use the **2B "position first"** flow (tap a slot → pick a card), since drag and drop doesn't work there. | `boards-a-desktop`, `boards-b-mobile` |
| later | [FUTURE] screens | Only after drop submissions and server-side scoring exist. | `future-*` |

The B alternatives (`*-b-*`) are kept for comparison. `recommendation.dc.html` and `suggestions.dc.html` are notes, not screens.

## Business rules that must not break

1. Event lifecycle: draft → active → finished, only by explicit admin action. **Only one active event.** Only draft events are editable (data, teams, registrations, board). Active and finished are read-only.
2. Registration: the player requests, it stays "pending", an admin approves (one by one or all). Only admins set the team. Players don't choose a team or cancel their registration. Removed ≠ deleted: a removed player still sees their own "removed" status.
3. Board: square, 3×3 to 6×6 (default 6×6; feature 014), every position filled, one board per event, the same for every team, frozen on activation. **Search and filters may highlight or dim tiles, never reorder or hide them.**
4. Each tile has difficulty (Easy/Medium/Hard), points (configurable), a progress requirement and a list of accepted drops.
5. **A drop's weight is PROGRESS, not points.** A tile is worth its points once, when progress reaches the requirement. Extra progress gives no points.
6. Scoring, real progress, row/column bonuses and ranking **don't exist yet**. Today every screen shows "Progress unavailable". Never show invented numbers as if they were real.
7. Players only see their OWN team. Comparing teams and the ranking are admin-only.
8. Card catalog: global, immutable revisions (editing = new revision). A retired card can't be picked for new boards but stays on boards that already use it.
9. Images come from the OSRS Wiki, always with attribution and a fallback image.

## Design constraints

- Colors: background `#15110e`; surfaces `#211914`, `#2d2119`; inset `#19120e`; borders `#705a39`, `#a88647`; gold `#d4ad53`, `#f1d487`; parchment text `#ead9b7`; secondary text `#aa9a7c`; success `#6f984f`; danger `#b45b4e`; info `#668ca3`. No generic whites or grays.
- Fonts: Cinzel for short headings only; Inter for everything else.
- Icons: Material Icons — outlined for neutral, filled for active/selected.
- Create/edit forms always in a modal, with the list visible behind.
- Works from 320 px to desktop. Keyboard accessible with visible focus. Never rely on color alone (difficulty badges always have text).
- Three languages: EN, PT, ES via the existing i18n. Game names are not translated.

## How to work through it

For each row in the table above, one at a time: write the spec (`feature-spec` skill), plan (`plan-and-tasks`), implement (`frontend-dev`), validate (`validate-feature`). Each row is a new feature folder under `specs/features/` that names the mockup files it follows and the earlier specs it revises (for example, the board revises the tile dialog of feature 009, and teams adds the multi-select that feature 003 had deferred). Earlier specs are not edited silently; the new spec records what changes.

Reuse the existing components (`AppShell`, `BingoBoard`, `TileCard`, `Badge`, `Panel`, `FormModal`, …) and update them to the v2 look instead of creating parallel ones. Run lint and tests at the end of each step, and check the result against the mockup (structure, copy, states, desktop and mobile).
