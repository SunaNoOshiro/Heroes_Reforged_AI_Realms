# Screen 06: Random Map Generator Settings — Interaction Map

## Companion Files
- [`mockup.html`](./mockup.html) — visual reference.
- [`spec.md`](./spec.md) — components, bindings.
- [`data-contracts.md`](./data-contracts.md) — schemas, config, localization.
- [`architecture.md`](./architecture.md) — screen diagrams.

## 1. Purpose
Random map generator setup for template, size, player / team matrix,
water, monster strength, seed, and victory options. The screen builds a
**local RMG draft** and routes into
[`59-loading-screen`](../59-loading-screen/) only when the player
confirms with `GENERATE_RANDOM_MAP`.

## 2. Actions

Two tokens are **local-ui** (prefixes `SELECT_`, `CLOSE_` per
[`screen-command-coverage.json#localUiPrefixes`](../../../screen-command-coverage.json));
they do not enter the deterministic command log. `ROLL_RMG_SEED` and
`GENERATE_RANDOM_MAP` are **schema-backed** kinds defined in
[`command.schema.json`](../../../../../content-schema/schemas/command.schema.json)
and do enter the log; `ROLL_RMG_SEED` is also referenced from
[`command-schema.md` § Seed Source Precedence](../../../command-schema.md#seed-source-precedence)
as the random-map seed source rule. See
[`data-contracts.md` § 3](./data-contracts.md#3-commands--events).

Every row plays the **Standard generator feedback** described in
§ 3 Animation, then a route fade where applicable.

| UI element | Action ID | Type | Next screen | Token | Data updated |
| --- | --- | --- | --- | --- | --- |
| Select template | `rmg.selectTemplate` | local-ui | _(current)_ | `SELECT_RMG_TEMPLATE` | Updates the zone-preview graph and validates the draft. |
| Roll seed | `rmg.rollSeed` | command | _(current)_ | `ROLL_RMG_SEED` | Produces a deterministic seed draft pinned into the command log. |
| Generate | `rmg.generate` | navigation | `59-loading-screen` | `GENERATE_RANDOM_MAP` | Validates the draft and builds scenario data. |
| Back | `rmg.back` | navigation | `02-new-game-setup` | `CLOSE_RANDOM_MAP_SETUP` | Discards the RMG draft. |

## 3. Animation
**Standard generator feedback**: settings sliders notch on press, the
template preview redraws on selection, the seed field rolls dice digits
on `rmg.rollSeed`, the zone-preview graph pulses while the template
validates, and **Generate** fades into loading once
`GENERATE_RANDOM_MAP` is accepted.

Under `config.ui.reducedMotion === true`, motion is replaced by static
highlights; visible state changes are preserved.

## 4. State Changes
Authoritative selectors refresh their bound handles whenever the
owning reducer or local UI draft changes:

- `state.ui.rmg.templateId` → `templateId`.
- `state.ui.rmg.mapSize` → `mapSize`.
- `state.ui.rmg.players` → `players`.
- `state.ui.rmg.seed` → `seed`.
- `selectors.rmg.templateZonePreview` → `zonePreview`.

UI-only hover, focus, selected row, open tab, target cursor, drag
ghost, and animation frame stay outside deterministic gameplay state.

## 5. Navigation Outcomes
Each navigation row routes **only after** guard approval and the exit
animation completes:

- `Generate` → [`59-loading-screen`](../59-loading-screen/) (after the
  RMG draft validates and `GENERATE_RANDOM_MAP` is accepted).
- `Back` → [`02-new-game-setup`](../02-new-game-setup/) (after the
  local draft is discarded).

## 6. Disabled & Error Cases
- Disable `Generate` until required selectors, registry records,
  template compatibility, player-slot legality, content-pack
  availability, deterministic seed, and route guards are satisfied.
- Presentation assets may use resolver fallback. Missing gameplay
  records, invalid content IDs, or rejected commands **fail loudly**
  per [`fail-loud.md`](../../../fail-loud.md).
- On rejection: keep the current screen open, preserve the local draft
  when useful, show localized error text, and play failure feedback.
- Error toast strings are produced by `formatUserError(err, locale)`
  per [`error-formatter.md`](../../../error-formatter.md). **Never
  construct error text inline.**

## 7. AI Implementation Notes
- This file owns **behavior, timing, and command routing**.
- [`spec.md`](./spec.md) owns static regions and state bindings.
- [`architecture.md`](./architecture.md) diagrams **mirror** these
  interactions; they must not introduce new behavior.

---

## 🔍 Sync Check

- **UI: ✔** — Action rows, animation strings, and disabled rules match sibling [`spec.md` § 5 State Bindings](./spec.md#5-state-bindings) and the visible regions in [`mockup.html`](./mockup.html) (`data-action="rmg.generate"`, `data-action="rmg.back"`; template rows + settings rows + zone-preview + seed `HR-0428` visible in the SVG).
- **Schema: ✔** — `SELECT_RMG_TEMPLATE` and `CLOSE_RANDOM_MAP_SETUP` match the local-ui prefixes `SELECT_` and `CLOSE_` in [`screen-command-coverage.json#localUiPrefixes`](../../../screen-command-coverage.json); `ROLL_RMG_SEED` and `GENERATE_RANDOM_MAP` are defined as canonical kinds in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) (the latter is also reserved in [`command-schema.md` § Future Commands](../../../command-schema.md#future-commands-phase-2) as part of the closed phase-2 random-map vocabulary). No closed-enum drift.
- **Tasks: ✔** — Owning task [`phase-2.07-ui-screen-backlog.06-random-map-setup-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/06-random-map-setup-screen.md) reads this file and its siblings; acceptance criteria require the rendered tokens to dispatch live when their engine task is `done` and to render disabled with a localized reason otherwise. The dependency `mvp.03-map-system.09-random-map-generator-deterministic-runner` is the runtime owner for `ROLL_RMG_SEED` / `GENERATE_RANDOM_MAP`.

## ⚠ Issues

- **`GENERATE_RANDOM_MAP` lacks a dedicated section in `command-schema.md`.** The kind is defined in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) (`const: "GENERATE_RANDOM_MAP"`) but [`command-schema.md`](../../../command-schema.md) only lists it indirectly under [§ Future Commands](../../../command-schema.md#future-commands-phase-2) as part of "random-map generation". Per the project root contract (commands the UI dispatches must be defined in `command-schema.md`), `mvp.03-map-system.09-random-map-generator-deterministic-runner` should add a per-command section with validation + effects when it lands. Non-blocking for this screen package; rendered disabled with a localized reason citing the runtime task until then per the owning task's acceptance criteria. Skill did not edit `command-schema.md` (Hard Prohibition D — never edit cross-checked files).
