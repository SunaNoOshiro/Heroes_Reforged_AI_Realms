# Screen 25: Building / Recruitment Dialog
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `command.schema.json` | `RECRUIT_UNITS` payload and validation (see [`command-schema.md` § RECRUIT_UNITS](../../../command-schema.md)). | `content-schema/schemas/command.schema.json` |
| `unit.schema.json` | Unit stats, stacks, recruitment options, army transfers. | `content-schema/schemas/unit.schema.json` |
| `building.schema.json` | Dwelling records, construction state, and built / unbuilt gating. | `content-schema/schemas/building.schema.json` |
| `resource-id.schema.json` | Canonical resource IDs used by costs and affordability checks. | `content-schema/schemas/resource-id.schema.json` |
| `ruleset.schema.json` | Deterministic constants and growth / cost formulas consumed by the dialog. | `content-schema/schemas/ruleset.schema.json` |
| `asset-index.schema.json` | Background, frames, icons, cursor sprites, animation manifests. | `content-schema/schemas/asset-index.schema.json` |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | `content-schema/schemas/localization.schema.json` |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `town.id` | `state.towns.selectedTownId` | Town providing dwelling stock. |
| `dwelling.stock` | `state.towns.byId[selected].dwellingStock` | Available creatures by dwelling, decremented by `RECRUIT_UNITS`. |
| `selectedDwelling` | `state.ui.town.selectedDwellingId` | Local recruitment selection (UI draft). |
| `recruitQuantity` | `state.ui.town.recruitQuantity` | Local quantity draft until confirmed. |
| `destinationArmy` | `state.townRecruit.destinationArmy` | Hero or garrison target slot set. |

### Commands And Events
Schema-backed (enters the deterministic command log):
- `RECRUIT_UNITS` from `recruit.confirm` — spends resources,
  decrements stock, adds / merges the stack into the destination
  army. Payload and validation in
  [`command-schema.md` § RECRUIT_UNITS](../../../command-schema.md).

UI-local (draft state only, never logged; covered by
`SELECT_` / `SET_` / `CLOSE_` prefixes in
[`screen-command-coverage.json`](../../../screen-command-coverage.json)):
- `SELECT_RECRUIT_DWELLING` from `recruit.selectDwelling` — updates
  selected creature, stock readout, and cost preview.
- `SET_RECRUIT_QUANTITY` from `recruit.changeQuantity` — updates
  local quantity and total cost.
- `SET_MAX_RECRUIT_QUANTITY` from `recruit.max` — picks the maximum
  legal quantity from stock / resources / capacity.
- `CLOSE_RECRUITMENT_DIALOG` from `recruit.cancel` — discards the
  recruitment draft and routes back to `24-town-screen`.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.building-recruitment-dialog.title`
- `ui.building-recruitment-dialog.actions.*`
- `ui.building-recruitment-dialog.status.*`
- `ui.building-recruitment-dialog.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`,
  `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.building-recruitment-dialog.background`
- `ui.building-recruitment-dialog.frame`
- `ui.building-recruitment-dialog.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.town.*`
- `vfx.building-recruitment-dialog.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content
  hashes, and `RECRUIT_UNITS` command inputs only.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor
  blink, animation frame, or transient visual effects.
- The local-ui draft slices
  (`state.ui.town.selectedDwellingId`, `state.ui.town.recruitQuantity`,
  `state.townRecruit.destinationArmy`) are session-only and do not
  enter saves or replays.
- Replays use stable IDs and scalar command inputs, never raw paths,
  localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- `RECRUIT_UNITS` validation chain (from the schema): hero is in
  town, town is friendly, dwelling exists and is owned by the town,
  sufficient stock in growth pool, sufficient resources, recruited
  units fit hero army (≤ 7 stacks) or town garrison.
- Missing presentation assets may fall back through the asset
  resolver.
- Missing gameplay records, invalid commands, and unresolved content
  IDs fail loudly before the BUY control becomes enabled.

---

## 🔍 Sync Check

- **UI: ✔** — Selector rows match sibling `spec.md` § State Bindings and `interactions.md` § State Changes exactly. Asset / localization key namespaces match the screen slug `building-recruitment-dialog`.
- **Schema: ✔** — `RECRUIT_UNITS` defined in [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json); validation list mirrors [`command-schema.md` § RECRUIT_UNITS](../../../command-schema.md). The four UI-local tokens are covered by `localUiPrefixes` in [`screen-command-coverage.json`](../../../screen-command-coverage.json) (no per-token entries needed).
- **Tasks: ✔** — Owning task [`tasks/phase-2/07-ui-screen-backlog/25-building-recruitment-dialog-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/25-building-recruitment-dialog-screen.md) lists this file in Read First; engine reducer for `RECRUIT_UNITS` owned by `mvp.05-adventure-map.05-town-visit-recruit-build-mage-guild`.

## ⚠ Issues

- **`state.townRecruit` slice naming.** This screen binds `destinationArmy` to top-level `state.townRecruit.destinationArmy`, while sibling screen `37-quick-recruit-window` exposes the same concept via `selectors.towns.quickRecruitDestinationArmy`. Per [`state-flow.md`](../../../state-flow.md), the canonical home for town-scoped UI draft state is `state.ui.town.*`. The owning task `tasks/phase-2/07-ui-screen-backlog/25-building-recruitment-dialog-screen.md` should reconcile (either rename to `state.ui.town.recruit.destinationArmy`, or expose it as a selector like the sibling screen). Flagged rather than silently rewritten because the slice name is a runtime contract. See sibling `spec.md` § ⚠ Issues — aligned.
- **No persisted slices.** `data-inventory.md` is the registry for *persisted* fields. All five state bindings on this screen are either deterministic game state already covered by saves (under `state.towns.*`) or session-only UI draft (under `state.ui.town.*` and `state.townRecruit.*`). No new row is required in [`data-inventory.md`](../../../data-inventory.md); listing this here so future audits don't re-open the question.
