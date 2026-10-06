# Thunder Crabs Summer Bingo — source workbook audit

## Source identity

- File: `docs/references/Thunder Crabs - SummerBingo - AstralStar (1).xlsx`
- SHA-256: `ba75ef2a701e4ec90e66609a4de89c1189996bb96b20d79fce47687fb901958e`
- Format: Microsoft Excel 2007+ (`.xlsx`), without a VBA project
- Audited: 2026-10-03

This audit supplements `THUNDER_CRABS_SUMMER_BINGO_WORKBOOK_SPEC.md`. The earlier document describes a four-sheet snapshot. The supplied workbook is a newer/different source snapshot with six sheets and additional named ranges. Preserve both documents: the earlier description remains useful context, while catalog extraction for feature 007 must identify this exact source hash.

The audit reads workbook XML, formulas, and stored calculation results. It does not recalculate Excel/Google Sheets formulas, so an importer must validate primary rule cells and formula relationships rather than trusting cached values blindly.

## Workbook structure

Visible sheets:

1. `Board`
2. `Tile Breakdown`
3. `Individual Stats`
4. `Accepted Drops`
5. `Tradeable Drops`
6. `Ultimate Breakdown`

Named ranges include:

- `Tiles`: `'Accepted Drops'!$B$84:$B$328`
- `AllPrices`: `'Accepted Drops'!$AC$83:$AF$331`
- `AllDrops`: `'Accepted Drops'!$AG$83:$AQ$331`
- `Boss`: `'Ultimate Breakdown'!$A$39:$A$93`
- `BossCode`: `'Ultimate Breakdown'!$B$39:$B$93`
- `BossLookup`: `'Ultimate Breakdown'!$A$39:$B$93`

Current tables differ from the earlier snapshot:

- `Individual Stats`: `A2:AW36`, including `Total GP` and 35 submission columns at `O:AW`.
- `Tradeable Drops`: `A2:T36`.
- `Ultimate Breakdown`: `A3:BN37`, with 66 columns.

The package contains two embedded PNG files, but Board tile visuals still use formula-generated external `summerbingo.s.gy` URLs. Those images are not the requested OSRS Wiki catalog.

## Flattened accepted-drop catalog

The `Tiles` named range contains exactly 245 non-empty, unique labels and no duplicate full `Category - Drop` strings.

- 213 main-tile entries across 36 tile categories.
- 32 flattened bonus entries across 6 bonus categories.
- Every main entry has a stored tier, tile score, completion requirement, progress weight, and calculated individual contribution.
- Bonus entries store their bonus/contribution value without a main-tile tier, score, or completion requirement.

Main-tile entry counts:

| Tile | Entries | Stored tier | Stored tile score | Requirement |
|---|---:|---|---:|---:|
| Mad Angel | 3 | Low | 5 | 6 |
| Hueycoatl | 4 | Low | 5 | 8 |
| Grotesque Guardians | 7 | Mid | 10 | 8 |
| Tormented Demons | 2 | Mid* | 10 | 3 |
| Cerberus | 6 | High | 20 | 6 |
| Chambers of Xeric | 13 | High | 20 | 4 |
| Medium Boots | 5 | Mid | 10 | 5 |
| Yama | 3 | High | 20 | 3 |
| Tempoross | 7 | Mid** | 10** | 10 |
| Theatre of Blood | 9 | High | 20 | 4 |
| Mortimer | 24 | Mid | 10 | 15 |
| Demonic Gorillas | 6 | Mid | 10 | 10 |
| God Wars Dungeon | 14 | High | 20 | 18 |
| Vorkath | 6 | Mid | 10 | 8 |
| Tombs of Amascut | 6 | High | 20 | 4 |
| GOTR | 6 | Low | 5 | 10 |
| Phantom Muspah | 2 | Mid | 10 | 5 |
| Royal Titans | 5 | Low | 5 | 10 |
| Wintertodt | 3 | Low | 5 | 1 |
| Araxxor | 5 | High | 20 | 12 |
| Zulrah | 7 | Mid | 10 | 6 |
| Armoured Zombies | 2 | Low | 5 | 8 |
| Doom of Mokhaiotl | 4 | High | 20 | 3 |
| Abyssal Sire | 1 | Mid | 10 | 5 |
| Alchemical Hydra | 6 | High | 20 | 6 |
| Zalcano | 4 | Mid | 10 | 1 |
| Scurrius | 2 | Low | 5 | 10 |
| Gauntlet | 4 | Mid | 10 | 6 |
| Skilling Tools | 3 | Low | 5 | 10 |
| Maggot King | 3 | High | 20 | 2 |
| Thieving | 4 | Mid | 10 | 3 |
| Barrows | 6 | Low | 5 | 12 |
| DT2 Bosses | 15 | High | 20 | 12 |
| Wilderness Trio | 8 | High | 20 | 10 |
| Dagannoth Kings | 5 | Mid | 10 | 15 |
| Moons of Peril | 3 | Low | 5 | 8 |

`*` One Tormented Demons row stores `mid` in lowercase. Its cached score is still 10. This can be normalized to the canonical `Mid` enum without changing the rule.

`**` Tempoross conflicts with the Board and requires an explicit product decision below.

## Bonus catalog

Flattened entries:

| Category | Entries | Values |
|---|---:|---|
| MegaRares | 3 | 10 each |
| Nightmare | 9 | 2 or 4 |
| Nex | 7 | 3 or 5 |
| Corporeal Beast | 5 | 6 each |
| Fortis Colosseum | 6 | 0.5 or 1 |
| Jar/Pet | 2 | 2 each |

The main Nightmare bonus block contains a tenth eligible entry, `Little Nightmare`, worth 4. Its count is included in the capped Nightmare formula, but `Nightmare - Little Nightmare` is absent from `B84:B328`. It therefore has no dropdown entry or flattened individual-contribution lookup.

## Confirmed internal discrepancies

### Tempoross score

- Board image state uses `tempoCompleteLow`.
- Board official tile formula at `M60` awards 5 points.
- The flattened accepted-drop rows store `Mid`, derive 10 points, and calculate individual contributions using 10.

Consequences:

- Board distribution: Low 11, Mid 13, High 12; total main-tile score 425.
- Flattened contribution table: Low 10, Mid 14, High 12; implied template total 430.

Do not choose one silently. The base-catalog import must record the approved Tempoross tier/score and fixtures must cover both official team score and individual contribution.

### Little Nightmare

- Present in the primary Nightmare bonus block at 4 points.
- Included in the Nightmare cap formula.
- Missing from the `Tiles` named range and flattened contribution table.

The application needs an explicit decision to include it as a valid submission or reproduce the omission.

### Row and column bonus

- All six row formulas and all six column formulas award 30.
- Workbook rule text says 40.

The user previously resolved this discrepancy: row and column bonuses are explicit event settings, not a global imported constant.

## Import requirements derived from the audit

- Verify the source SHA-256 before importing a known catalog version.
- Extract primary tile/drop rules and cross-check the flattened table; do not accept cached formulas as the sole source.
- Require exactly 36 base tile templates and 245 flattened labels for this source version, while separately accounting for the unresolved `Little Nightmare` omission.
- Normalize only representation-level differences such as `mid` → `Mid`; every semantic mismatch remains an explicit decision with provenance.
- Persist workbook source, sheet/cell provenance, raw source value, normalized value, and catalog version.
- Import each workbook entry as an immutable source revision under a stable global card identity. Later administrator changes create new revisions with `derived_from`, actor, timestamp, and reason; they never rewrite the audited source revision or an event snapshot.

## Decisions still required

1. Tempoross: import as Low/5 following the Board, or Mid/10 following the flattened contribution table.
2. Little Nightmare: add it to the application catalog at 4 bonus points, or preserve its omission from valid submission choices.
