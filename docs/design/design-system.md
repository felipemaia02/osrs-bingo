# Layout v2 — design system

The values below were extracted from the chosen mockups in `mockups/` (shell 4A, board 1A/1B, teams 3A, board builder 2A/2B). This document is the implementation reference for the visual layer: when a page is rebuilt, it must match these values. The mockups remain the reference for structure and copy of each screen; this file is the reference for the shared building blocks.

Mockups are not code. Implement with Tailwind tokens and the shared React components in `apps/web/src/components/`, never with the mockups' inline styles or template syntax.

## Color tokens

Existing tokens in `apps/web/tailwind.config.js` already match the base palette. Rows marked **new** must be added when the first v2 screen is implemented.

| Token (`rs-*`) | Value | Use |
|---|---|---|
| `canvas` | `#15110e` | Page background |
| `surface` | `#211914` | Panels, cards, tiles, buttons |
| `raised` | `#2d2119` | Selected/active row, active nav item, neutral badge background |
| `inset` | `#19120e` | Header, sidebar footer bars, inputs, image wells, table headers |
| `border` | `#705a39` | Default borders. Subtle dividers use it at 45–60 % opacity |
| `border-strong` | `#a88647` | Active nav border, empty-slot dashes, avatar ring, fallback initials |
| `gold` | `#d4ad53` | Primary button, eyebrow text, active segment underline, accent icons |
| `gold-bright` | `#f1d487` | Headings, focus ring, search hits, links |
| `gold-hover` **new** | `#ffe3a3` | Link hover |
| `text` | `#ead9b7` | Body text |
| `muted` | `#aa9a7c` | Secondary text, axis labels, table headers |
| `disabled` **new** | `#9a8b70` | Disabled navigation items |
| `success` | `#6f984f` | Success border |
| `success-text` **new** | `#b5d699` | Success badge text |
| `success-bg` **new** | `#1b2214` | Success badge background |
| `warning-bg` **new** | `#2a2112` | Gold/warning badge background (text `gold-bright`, border `border-strong`) |
| `danger` | `#b45b4e` | Danger border, danger button border |
| `danger-text` **new** | `#efaaa0` | Danger badge/button text |
| `danger-bg` **new** | `#2b1714` | Danger badge background, rejection notes |
| `info` | `#668ca3` | Info border |
| `info-text` **new** | `#a9cde2` | Info badge text |
| `info-bg` **new** | `#13202a` | Info badge and banner background |
| `info-banner-text` **new** | `#cfe2ee` | Info banner body text |

No generic Tailwind whites or grays.

## Typography

| Role | Desktop | Mobile |
|---|---|---|
| Body | Inter 14 px, line-height 1.45 | same |
| Eyebrow | 12 px, uppercase, letter-spacing .18em, weight 600, `gold` | 11 px |
| Page title (H1) | Cinzel 700, 32–34 px, `gold-bright`, line-height 1.15 | 24 px |
| Section/card title | Cinzel 700, 18–22 px, `gold-bright` | 16–18 px |
| Sidebar group label | 11 px, uppercase, letter-spacing .14em, weight 600, `muted` | — |
| Meta/secondary | 12–13 px, `muted` | same |
| Badge | 11 px, weight 600 | same |

Cinzel only for short headings and the "OSRS / Bingo" wordmark. Everything else is Inter.

## Sizes and shape

| Element | Desktop | Mobile |
|---|---|---|
| Header height | 64 px, padding 0 24 px, `inset` background, bottom border | 56 px, padding 0 12 px 0 16 px |
| Sidebar | 240 px, padding 16 px 12 px, right border `border`/55 % | — (bottom bar) |
| Bottom bar | — | 68 px, `inset` background, top border, equal columns |
| Button | min-height 40 px, padding 0 14 px | min-height 44 px |
| Small button | min-height 32–34 px, padding 0 10 px, 13 px text | — |
| Icon button | 40 × 40 px | 44 × 44 px |
| Input/select | min-height 40 px, 14 px text, `inset` background | min-height 44 px, **16 px text** (avoids mobile zoom) |
| Segmented control | buttons min-height 38 px | chips min-height 36–40 px, fully rounded |
| Nav item | min-height 40 px, gap 12 px | list rows min-height 56 px |
| Tab | min-height 44 px, 2 px bottom indicator | chips |
| Main content padding | per screen, from its mockup: overview 28/40 px, board 28/32 px, teams 24/32 px, board builder 24/28 px (`AppShell` `desktopPadding`) | 12–16 px, bottom 90 px (clears the bottom bar) |

Radius: badges 2 px, controls 3 px, panels/cards/tiles 4 px, chips fully rounded. Avatars are circles with a `border-strong` ring.

Touch targets are at least 44 px on mobile.

## Focus and states

- Focus: `outline 2px gold-bright`, offset 2 px on every interactive element (`:focus-visible`).
- Selected tile: the same outline with offset 3 px.
- Search/filter hit: border `gold-bright` plus a 1 px inset ring; the matching drop is shown in a gold chip (`gold-bright` background, `canvas` text) or a highlighted row with a 3 px `gold-bright` left inset bar.
- Filtered out: opacity .38 (tiles, list rows, mini-map cells use .35). Never hidden, never reordered.
- Disabled navigation: `disabled` text color, `cursor: not-allowed`, plus a neutral "Soon" badge. Disabled buttons use opacity .5.
- Active navigation item: `raised` background, `border-strong` border, `gold-bright` text, weight 600, filled icon.
- Active segment: `raised` background, `gold-bright` text, 2 px `gold` inset underline.
- Active chip (mobile): filled `gold` with `canvas` text, or `raised` with `gold` border in compact pickers, as in each mockup.
- Selected table row: `raised` background.

## Badges

Badges always carry text, so meaning never depends on color alone.

| Tone | Text | Border | Background | Used for |
|---|---|---|---|---|
| success | `success-text` | `success` | `success-bg` | Easy, Active event, Accepted |
| gold (warning) | `gold-bright` | `border-strong` | `warning-bg` | Medium, Pending counts |
| danger | `danger-text` | `danger` | `danger-bg` | Hard, Rejected, danger states |
| danger-outline | `danger-text` | `danger` | transparent | Retired card |
| info | `info-text` | `info` | `info-bg` | Informational tags |
| neutral | `text` | `border` | `raised` | Soon, counts, points, kind |

Difficulty mapping is fixed: **Easy → success, Medium → gold, Hard → danger**.

## Shared patterns

- **Panel**: `surface` background, 1 px `border`, radius 4 px.
- **Info banner**: `info` border, `info-bg` background, `info-banner-text`, info icon on the left. Used for "Progress unavailable" and similar notices.
- **Image well**: `inset` background, radius 3 px, image `object-fit: contain`. Without an image: a shield icon plus up to three initials in Cinzel, `border-strong` color.
- **Attribution**: whenever Wiki images are shown, a muted line or link names the OSRS Wiki source and license.
- **Table** (desktop): header row `inset` background, 12 px `muted` labels; body rows divided by `border`/45 %; checkbox 18 px with `gold` accent.
- **Tabs**: bottom border on the tab row; active tab has `gold-bright` text and a 2 px `gold` underline; a count pill turns `gold` when its tab is active.
- **Overview card**: panel with an accent icon, Cinzel title, short description and status badges pinned to the bottom. Unavailable cards use a dashed border and reduced opacity.
- **Modals**: the existing `FormModal` convention stays (see `docs/architecture/frontend.md`).

## Icons

The mockups use Material Symbols names. The app uses the equivalent `@mui/icons-material` SVG components: outlined for neutral, filled for active/selected. Name mapping is direct (`grid_view` → `GridView`/`GridViewOutlined`). The only exception is `shield_person`, which has no MUI equivalent: use `AdminPanelSettings`.

## Shell (4A)

- Desktop header: logo shield (31 × 40) + "OSRS / Bingo" stacked in Cinzel 19 px, linking home. On the right: event pill (event icon, event name, "Active" badge, remaining time), language segmented control EN/PT/ES (active = `gold` background), account button (avatar initial, username, expand icon).
- Desktop sidebar: group "Play" (Board, Events, My submissions — disabled with "Soon"), group "Administration" visible only to administrators (Overview, Events, Teams and registrations with a pending-count badge, Card catalog, Event boards, Administrators, Ranking — disabled with "Soon"). There is no separate admin tab row, and Ranking never appears for players.
- Mobile: 56 px header (logo 25 × 32, wordmark 16 px, language button showing the current code, avatar button), a 44 px event bar under it (event name, "Active" badge, remaining time), and a bottom bar: Board, Events, Submissions (disabled, "soon"), Admin (administrators only).
