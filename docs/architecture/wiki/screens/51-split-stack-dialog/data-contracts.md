# Screen 51: Split Stack Dialog
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `command.schema.json` | `SPLIT_ARMY_STACK` reducer payload (`armyId`, `sourceSlot`, `targetSlot`, `quantity ≥ 1`, `metadata`). | [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json) |
| `modal-entry.schema.json` | Registers `51-split-stack-dialog` in the modal stack `modalId` closed enum; carries `callerRoute`, `previousFocusElementId`, `severity`, and per-modal `params`. | [`content-schema/schemas/modal-entry.schema.json`](../../../../../content-schema/schemas/modal-entry.schema.json) |
| `hero.schema.json` | Hero identity, army container, and ownership selectors for caller heroes. | [`content-schema/schemas/hero.schema.json`](../../../../../content-schema/schemas/hero.schema.json) |
| `unit.schema.json` | Unit stats, stack records, same-creature merge legality. | [`content-schema/schemas/unit.schema.json`](../../../../../content-schema/schemas/unit.schema.json) |
| `ruleset.schema.json` | Deterministic constants and guard rules (per-army slot count, stack limits) consumed by the reducer and guard. | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, and animation manifests for the modal chrome. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `sourceStack` | `state.ui.splitStack.sourceStackRef` | Caller-provided stack reference; seeded on modal open. |
| `destinationSlot` | `state.ui.splitStack.destinationSlotRef` | Caller-provided target slot; seeded on modal open. |
| `quantity` | `state.ui.splitStack.quantity` | Local split amount; integer `1..source.count - 1`. |
| `splitGuard` | `selectors.armies.splitStackGuard` | Count, ownership, capacity, and merge legality. |
| `caller` | `state.ui.splitStack.returnScreen` | Caller route to refocus after split; mirrors `modalStack[top].callerRoute`. |

### Commands And Events
- `SET_SPLIT_STACK_QUANTITY` from `splitStack.changeQuantity` — local-ui; updates `state.ui.splitStack.quantity` preview only.
- `SET_SPLIT_STACK_ONE` from `splitStack.one` — local-ui; sets `quantity = 1` if legal.
- `SET_SPLIT_STACK_MAX` from `splitStack.max` — local-ui; sets `quantity = source.count - 1` (or capped by `splitGuard`).
- `SPLIT_ARMY_STACK` from `splitStack.confirm` — reducer command; updates source and destination army slots after validation.
- `CANCEL_SPLIT_STACK` from `splitStack.cancel` — local-ui; discards split draft and pops the modal frame.

`SET_*` and `CANCEL_*` tokens are local-ui routing per the
prefix list in
[`screen-command-coverage.json`](../../../screen-command-coverage.json);
only `SPLIT_ARMY_STACK` enters the deterministic command log.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.split-stack-dialog.title`
- `ui.split-stack-dialog.actions.*`
- `ui.split-stack-dialog.status.*`
- `ui.split-stack-dialog.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`
- `error.dispatcher.rejected.body` (per sibling `interactions.md` § Error surfaces).

### Asset, Sound, And VFX IDs
- `ui.split-stack-dialog.background`
- `ui.split-stack-dialog.frame`
- `ui.split-stack-dialog.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.hero.*`
- `vfx.split-stack-dialog.*`

### Save And Replay Fields
- This screen's draft slice (`state.ui.splitStack.*`) and modal frame
  (`state.ui.modalStack[top]` while open) are transient UI state and
  are **excluded** from saves and replays per
  [`modal-entry.schema.json`](../../../../../content-schema/schemas/modal-entry.schema.json)
  and the persistence rules in
  [`persistence.md`](../../../persistence.md).
- Only the reducer-approved `SPLIT_ARMY_STACK` command (with stable
  IDs and scalar `quantity`) enters the deterministic command log
  per [`command-stream-integrity.md`](../../../command-stream-integrity.md).
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor
  blink, animation frame, or transient visual effects.

### Validation And Fallback
- Split validates source count, destination slot availability, merge
  legality (same creature ID or empty slot), minimum one creature in
  source where required, and caller ownership rules.
- Missing presentation may fall back through the asset resolver per
  [`asset-policy.md`](../../../asset-policy.md).
- Missing gameplay records, invalid commands, and unresolved content
  IDs fail loudly before controls become enabled, per
  [`fail-loud.md`](../../../fail-loud.md).

---

## 🔍 Sync Check

- **UI: ✔** — Selectors and command IDs match sibling `spec.md`
  § State Bindings and sibling `interactions.md` § Actions; modal id
  matches the package folder slug.
- **Schema: ✔** — `SPLIT_ARMY_STACK` payload (`armyId`, `sourceSlot`,
  `targetSlot`, `quantity ≥ 1`, `metadata`) is pinned in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json);
  modal id `51-split-stack-dialog` is enumerated in
  [`modal-entry.schema.json` §`modalId`](../../../../../content-schema/schemas/modal-entry.schema.json);
  modal-entry is registered in
  [`schema-matrix.md`](../../../schema-matrix.md).
- **Tasks: ✔** — Reducer owner
  [`mvp.05-adventure-map.17-split-army-stack-command`](../../../../../tasks/mvp/05-adventure-map/17-split-army-stack-command.md)
  owns `src/engine/commands/split-army-stack.ts`; UI owner
  [`phase-2.07-ui-screen-backlog.51-split-stack-dialog-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/51-split-stack-dialog-screen.md)
  owns `src/ui/screens/SplitStackDialog.tsx` and lists every selector
  in this file as one of its acceptance criteria.

## ⚠ Issues

_None._
