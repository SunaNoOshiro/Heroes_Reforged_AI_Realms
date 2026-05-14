# Screen 08: Kingdom Overview — Data Contracts

## Companion Files
- [`mockup.html`](./mockup.html) — visual reference.
- [`spec.md`](./spec.md) — components, bindings.
- [`interactions.md`](./interactions.md) — per-control behavior.
- [`architecture.md`](./architecture.md) — screen diagrams.

## 1. Content Schemas & Registries

| Schema / Registry | Used for | Canonical source |
| --- | --- | --- |
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |
| `ruleset.schema.json` | Deterministic constants, formulas, and guard rules consumed by commands. | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |
| `hero.schema.json` | Hero identity, stats, army, skills, spellbook, equipment, ownership selectors. | [`content-schema/schemas/hero.schema.json`](../../../../../content-schema/schemas/hero.schema.json) |
| `faction.schema.json` | Faction identity, town roster, hero / unit references, player-facing faction metadata. | [`content-schema/schemas/faction.schema.json`](../../../../../content-schema/schemas/faction.schema.json) |
| `building.schema.json` | Town buildings, construction requirements, dwellings, mage guilds, forts, shipyards, grail structures. | [`content-schema/schemas/building.schema.json`](../../../../../content-schema/schemas/building.schema.json) |
| `unit.schema.json` | Unit stats, stacks, recruitment options, combat previews, upgrades, army transfers. | [`content-schema/schemas/unit.schema.json`](../../../../../content-schema/schemas/unit.schema.json) |
| `resource-id.schema.json` | Canonical resource IDs used by costs, rewards, income, trade rates, affordability checks. | [`content-schema/schemas/resource-id.schema.json`](../../../../../content-schema/schemas/resource-id.schema.json) |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, and shell state used below. | Loaded content / runtime registries. |

## 2. Runtime State Selectors

| UI element | Selector | Notes |
| --- | --- | --- |
| `townRows` | `state.players.active.townIds` | Owned towns with build, income, and garrison summary. |
| `heroRows` | `state.players.active.heroIds` | Owned heroes with movement, mana, army strength, and location. |
| `incomeTotals` | `selectors.economy.dailyIncomeByResource` | Daily income preview from town and mine ownership. |
| `selectedRow` | `state.ui.kingdomOverview.selectedRowId` | Local focus row for keyboard / pointer navigation. **UI-only; not persisted, not replayed.** |
| `warnings` | `selectors.adventure.kingdomWarnings` | Threats, idle heroes, empty towns, blocked build state. |

## 3. Commands & Events

All four tokens are **UI-local routing** — they match the `OPEN_`,
`FOCUS_`, and `CLOSE_` prefixes in
[`screen-command-coverage.json#localUiPrefixes`](../../../screen-command-coverage.json)
and therefore never enter the deterministic command log. They are
not defined in [`command-schema.md`](../../../command-schema.md) and
do not require an entry there.

| Action ID | Token | Effect |
| --- | --- | --- |
| `kingdom.selectTown` | `OPEN_TOWN_SCREEN` | Sets selected town context; routes to [`24-town-screen`](../24-town-screen/). No economy mutation. |
| `kingdom.selectHero` | `OPEN_HERO_SCREEN` | Sets selected hero context; routes to [`46-hero-screen`](../46-hero-screen/). Preserves adventure camera. |
| `kingdom.focusMap` | `FOCUS_ADVENTURE_ENTITY` | Centers camera on the selected town or hero; routes to [`07-adventure-map`](../07-adventure-map/). |
| `kingdom.close` | `CLOSE_KINGDOM_OVERVIEW` | Closes the modal; returns to previous adventure selection in [`07-adventure-map`](../07-adventure-map/). |

## 4. Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

## 5. Localization Keys
- `ui.kingdom-overview.title`
- `ui.kingdom-overview.actions.*`
- `ui.kingdom-overview.status.*`
- `ui.kingdom-overview.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

## 6. Asset, Sound & VFX IDs
- `ui.kingdom-overview.background`
- `ui.kingdom-overview.frame`
- `ui.kingdom-overview.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.adventure.*`
- `vfx.kingdom-overview.*`

## 7. Save & Replay
- Persist only reducer-approved gameplay state, setup records,
  content hashes, command inputs, and explicit draft records named
  by the owning system.
- Do **not** persist hover, focus, tooltip, scroll, drag ghost,
  cursor blink, animation frame, or transient visual effects
  (`selectedRow` is local UI per § 2).
- Replays use stable IDs and scalar command inputs — never raw
  paths, localized labels, rendered positions, or wall-clock
  timestamps.

## 8. Validation & Fallback
- Missing presentation assets may fall back through the asset
  resolver.
- Missing gameplay records, invalid commands, and unresolved
  content IDs **fail loudly** before controls become enabled.
- Mechanics, disabled cases, and error rendering live in
  [`interactions.md` § 5 Disabled & Error Cases](./interactions.md#5-disabled--error-cases);
  the canonical mechanics summary lives in
  [`spec.md` § 6 Mechanics Mapping](./spec.md#6-mechanics-mapping).

---

## 🔍 Sync Check

- **UI: ✔** — Selectors and tokens match sibling [`spec.md` § 5](./spec.md#5-state-bindings) and [`interactions.md` § 2](./interactions.md#2-actions); button set matches the two `data-action` buttons + two clickable row regions in [`mockup.html`](./mockup.html).
- **Schema: ✔** — All eight schema files exist under [`content-schema/schemas/`](../../../../../content-schema/schemas/); none of this screen's bindings require a new screen-specific schema. The four ALL-CAPS tokens are correctly classified as UI-local in [`screen-command-coverage.json`](../../../screen-command-coverage.json).
- **Tasks: ✔** — Schemas and selectors match the Read First / Inputs of owning task [`tasks/phase-2/07-ui-screen-backlog/08-kingdom-overview-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/08-kingdom-overview-screen.md); `selectedRow` is UI-only and correctly excluded from [`data-inventory.md`](../../../data-inventory.md).

## ⚠ Issues

_None._
