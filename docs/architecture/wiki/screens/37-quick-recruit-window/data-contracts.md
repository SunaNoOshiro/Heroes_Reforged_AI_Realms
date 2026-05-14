# Screen 37: Quick Recruit Window
## Data Contracts

### Source Files
- Mockup: [`mockup.html`](./mockup.html)
- Spec: [`spec.md`](./spec.md)
- Interactions: [`interactions.md`](./interactions.md)
- Architecture Diagrams: [`architecture.md`](./architecture.md)

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | [`asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | [`localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |
| `ruleset.schema.json` | Deterministic constants, formulas, and guard rules consumed by `RECRUIT_UNITS`. | [`ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |
| `unit.schema.json` | Unit stats, stacks, recruitment options, army transfers. | [`unit.schema.json`](../../../../../content-schema/schemas/unit.schema.json) |
| `building.schema.json` | Town dwellings, build state, growth pool. | [`building.schema.json`](../../../../../content-schema/schemas/building.schema.json) |
| `resource-id.schema.json` | Canonical resource IDs for costs and affordability. | [`resource-id.schema.json`](../../../../../content-schema/schemas/resource-id.schema.json) |
| `command.schema.json` | Reducer-backed command payload for `RECRUIT_UNITS`. | [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `dwellingRows` | `selectors.towns.quickRecruitRows` | Built dwellings, current stock, creature IDs, and per-row cost. |
| `selectedRows` | `state.ui.quickRecruit.selectedDwellingIds` | Local checked rows; UI draft, not persisted. |
| `destinationArmy` | `selectors.towns.quickRecruitDestinationArmy` | Hero or town garrison target. |
| `totalCost` | `selectors.economy.quickRecruitTotalCost` | Aggregated resource cost across selected rows. |
| `rowGuards` | `selectors.towns.quickRecruitRowGuards` | Per-row localized disabled reason (built, stock, cost, capacity). |

### Commands And Events
| Action ID | Token in `interactions.md` | Type | Resolves To |
| --- | --- | --- | --- |
| `quickRecruit.toggleRow` | `TOGGLE_QUICK_RECRUIT_ROW` | local-ui | `TOGGLE_` prefix in [`screen-command-coverage.json`](../../../screen-command-coverage.json) `localUiPrefixes`. Updates `selectedRows` and `totalCost`. |
| `quickRecruit.selectAffordable` | `SELECT_AFFORDABLE_RECRUITS` | local-ui | `SELECT_` prefix in `localUiPrefixes`. Checks every legal, currently-affordable row. |
| `quickRecruit.commit` | `QUICK_RECRUIT_CREATURES` | command | Aliased to `RECRUIT_UNITS` in `commandAliases`; canonical schema in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) and [`command-schema.md` § RECRUIT_UNITS](../../../command-schema.md). Applies selected rows in deterministic order. |
| `quickRecruit.close` | `CLOSE_QUICK_RECRUIT` | navigation | `CLOSE_` prefix in `localUiPrefixes`. Discards local selections; routes to `24-town-screen`. |

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.quick-recruit-window.title`
- `ui.quick-recruit-window.actions.*`
- `ui.quick-recruit-window.status.*`
- `ui.quick-recruit-window.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.quick-recruit-window.background`
- `ui.quick-recruit-window.frame`
- `ui.quick-recruit-window.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.town.*`
- `vfx.quick-recruit-window.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content
  hashes, command inputs, and explicit draft records only when
  named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor
  blink, animation frame, or transient visual effects. The local
  `state.ui.quickRecruit.selectedDwellingIds` slice is a UI draft
  and is not persisted.
- Replays use stable IDs and scalar command inputs, never raw
  paths, localized labels, rendered positions, or wall-clock
  timestamps.

### Validation And Fallback
- Each checked row must pass: dwelling built, sufficient stock,
  affordable, growth available, destination capacity, and merge
  rules. Commit applies rows in deterministic order — the same set
  of guards runs again per row inside `RECRUIT_UNITS`
  ([`command-schema.md` § RECRUIT_UNITS](../../../command-schema.md)).
- Missing presentation assets may fall back through the asset
  resolver.
- Missing gameplay records, invalid commands, and unresolved
  content IDs fail loudly before controls become enabled, per
  [`fail-loud.md`](../../../fail-loud.md).

---

## 🔍 Sync Check

- **UI: ✔** — Selectors and command list match sibling [`spec.md`](./spec.md) § State Bindings, [`interactions.md`](./interactions.md) § Actions, and [`architecture.md`](./architecture.md) § State Inputs.
- **Schema: ✔** — `RECRUIT_UNITS` exists in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) (verified in [`enums.snapshot.json`](../../../../../content-schema/enums.snapshot.json)) and is documented in [`command-schema.md` § RECRUIT_UNITS](../../../command-schema.md); the `QUICK_RECRUIT_CREATURES → RECRUIT_UNITS` alias and the three local-UI prefixes are registered in [`screen-command-coverage.json`](../../../screen-command-coverage.json).
- **Tasks: ✔** — Owning task [`tasks/phase-2/07-ui-screen-backlog/37-quick-recruit-window-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/37-quick-recruit-window-screen.md) lists this file in Read First and asserts every selector goes through the store / boundary adapter.

## ⚠ Issues

- **`state.ui.quickRecruit.selectedDwellingIds` is a top-level UI slice.** Sibling town screen 25 places town UI drafts under `state.ui.town.*` (see [`25-building-recruitment-dialog/spec.md`](../25-building-recruitment-dialog/spec.md) State Bindings). Per [`state-flow.md`](../../../state-flow.md) the canonical home for town-scoped UI draft state is `state.ui.town.*`; the owning task should confirm whether this slice should be renamed to `state.ui.town.quickRecruit.selectedDwellingIds`. Slice name is a runtime contract — flagged, not silently rewritten. See sibling [`spec.md`](./spec.md) § State Bindings — aligned with the same flag.
- **Selectors are not registered in `state-flow.md`.** Five `selectors.towns.quickRecruit*` and `selectors.economy.quickRecruitTotalCost` selectors are not yet listed in [`state-flow.md`](../../../state-flow.md). Non-blocking for this screen package, but the owning UI task should add the selectors when wiring them up so the canonical selector inventory stays complete.
