# Screen 34: Fort View
## Data Contracts

### Source Files

- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries

| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |
| `ruleset.schema.json` | Deterministic constants and formulas backing wall HP, tower shot count, growth bonus, and prereq guards. | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |
| `building.schema.json` | Fort / citadel / castle building records and their construction requirements. | [`content-schema/schemas/building.schema.json`](../../../../../content-schema/schemas/building.schema.json) |
| `town-presentation.schema.json` | Town panorama, cutaway slot presentation, and other presentation-only town bindings. | [`content-schema/schemas/town-presentation.schema.json`](../../../../../content-schema/schemas/town-presentation.schema.json) |
| `resource-id.schema.json` | Canonical resource IDs used by the next-upgrade cost and affordability checks. | [`content-schema/schemas/resource-id.schema.json`](../../../../../content-schema/schemas/resource-id.schema.json) |
| `unit.schema.json` | Creature growth records modulated by `fortificationGrowthBonus`. | [`content-schema/schemas/unit.schema.json`](../../../../../content-schema/schemas/unit.schema.json) |

### Runtime State Selectors

| UI Element | Selector | Notes |
| --- | --- | --- |
| `fortLevel` | `state.towns.byId[selected].fortificationLevel` | `none` / `fort` / `citadel` / `castle`. |
| `wallDefinition` | `selectors.towns.fortificationBattleLayout` | Wall / tower / gate / moat definitions for the battle layout. |
| `growthBonus` | `selectors.towns.fortificationGrowthBonus` | Creature-growth multiplier the current tier applies. |
| `buildPrereqs` | `selectors.towns.nextFortUpgradePrereqs` | Buildings, resources, and turn gates blocking the next upgrade. |
| `selectedSegment` | `state.ui.fortView.selectedSegment` | Local highlighted wall or tower segment. UI-only draft. |

### Commands And Events

The screen dispatches **no** schema commands. Three local-ui tokens
are emitted for routing / selection only; all three resolve via the
prefix lists in
[`screen-command-coverage.json`](../../../screen-command-coverage.json)
and are not logged to the deterministic command stream:

- `SELECT_FORT_SEGMENT` (action `fortView.selectSegment`,
  `SELECT_` prefix) — updates `state.ui.fortView.selectedSegment`.
- `OPEN_BUILD_TREE_FOR_FORT` (action `fortView.buildTree`, `OPEN_`
  prefix) — routes to `30-build-tree` focused on the next
  fortification upgrade.
- `CLOSE_FORT_VIEW` (action `fortView.close`, `CLOSE_` prefix) —
  returns to `24-town-screen`.

Gameplay mutation (`BUILD_STRUCTURE` for the fort upgrade) is owned
by `30-build-tree`, not by this screen.

### Config Keys

- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys

- `ui.fort-view.title`
- `ui.fort-view.actions.*`
- `ui.fort-view.status.*`
- `ui.fort-view.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`,
  `ui.common.close`

### Asset, Sound, And VFX IDs

- `ui.fort-view.background`
- `ui.fort-view.frame`
- `ui.fort-view.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.town.*`
- `vfx.fort-view.*`

### Save And Replay Fields

- Persist reducer-approved gameplay state, setup records, content
  hashes, command inputs, and explicit draft records only when named
  by the owning system. `state.ui.fortView.selectedSegment` is
  UI-only and never persists.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor
  blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths,
  localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback

- The screen reads built fortification level and faction wall rules
  to expose battle layout, tower shot count, moat presence, growth
  bonus, and build prerequisites.
- Missing presentation may fall back through the asset resolver.
- Missing gameplay records, invalid content IDs, and unresolved
  selectors fail loudly per
  [`fail-loud.md`](../../../fail-loud.md) before controls become
  enabled.

---

## 🔍 Sync Check

- **UI: ✔** — The five state selectors match sibling [`spec.md § State Bindings`](./spec.md), [`interactions.md § State Changes`](./interactions.md), and [`architecture.md § State Inputs`](./architecture.md) verbatim.
- **Schema: ✔** — All seven referenced schemas exist under [`content-schema/schemas/`](../../../../../content-schema/schemas/). Local-ui tokens resolve through the prefix lists in [`screen-command-coverage.json`](../../../screen-command-coverage.json); no schema-command entries are required for this screen because nothing here dispatches a deterministic command.
- **Tasks: ⚠** — Owning UI task [`phase-2.07-ui-screen-backlog.34-fort-view-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/34-fort-view-screen.md) lists this file in Read First. The engine source of the three `selectors.towns.fortification*` selectors is not named in any task's Outputs (most likely [`phase-2.01-spells-artifacts.13-siege-state-machine`](../../../../../tasks/phase-2/01-spells-artifacts/13-siege-state-machine.md); see sibling `spec.md § ⚠ Issues`).

## ⚠ Issues

- **Town fort gameplay slice is not registered in [`data-inventory.md`](../../../data-inventory.md).** This file asserts `state.towns.byId[selected].fortificationLevel` as a persisted source of truth, but `data-inventory.md` contains no `towns` / `fortif` row. Per CLAUDE.md root contract ("every persisted field is registered in `data-inventory.md`"), the engine owner — likely [`phase-2.01-spells-artifacts.13-siege-state-machine`](../../../../../tasks/phase-2/01-spells-artifacts/13-siege-state-machine.md) — must add the row. Suggested values: domain=`towns`, owner=`phase-2.01-spells-artifacts.13-siege-state-machine`, persistence=`indexeddb`, retention=`game`. Skill did not add the row itself (Hard Prohibition D).
