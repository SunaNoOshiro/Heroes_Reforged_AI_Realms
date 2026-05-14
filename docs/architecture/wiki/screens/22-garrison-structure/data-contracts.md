# Screen 22: Garrison Structure — Data Contracts

## Source Files

- Mockup: [`mockup.html`](./mockup.html)
- Spec: [`spec.md`](./spec.md)
- Interactions: [`interactions.md`](./interactions.md)
- Architecture Diagrams: [`architecture.md`](./architecture.md)

Cross-package references:
[`command-schema.md`](../../../command-schema.md),
[`screen-command-coverage.json`](../../../screen-command-coverage.json),
[`data-inventory.md`](../../../data-inventory.md),
[`error-ux.md`](../../../error-ux.md),
[`error-formatter.md`](../../../error-formatter.md).

## Content Schemas And Registries

| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `command.schema.json` | `TRANSFER_GARRISON_STACK` envelope and validation gate. | [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json) |
| `hero.schema.json` | Visiting hero identity, ownership, army container. | [`content-schema/schemas/hero.schema.json`](../../../../../content-schema/schemas/hero.schema.json) |
| `adventure-building.schema.json` | Standalone garrison structure record, ownership, locked-garrison flag. | [`content-schema/schemas/adventure-building.schema.json`](../../../../../content-schema/schemas/adventure-building.schema.json) |
| `unit.schema.json` | Stack stats, merge legality, capacity (max 7 stacks per army). | [`content-schema/schemas/unit.schema.json`](../../../../../content-schema/schemas/unit.schema.json) |
| `ruleset.schema.json` | Deterministic transfer constants consumed by the guard. | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error message keys. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |

## Runtime State Selectors

| UI Element | Selector | Notes |
| --- | --- | --- |
| `heroArmy` | `state.heroes.byId[selected].army` | Visiting hero stack row. |
| `garrisonArmy` | `state.mapObjects.byId[garrisonId].army` | Structure stack row. |
| `selectedStack` | `state.ui.garrisonTransfer.selectedStackRef` | Local drag/click selection (in-memory). |
| `transferRules` | `selectors.armies.garrisonTransferRules` | Ownership, lock, capacity, and merge legality. |
| `splitDraft` | `state.ui.garrisonTransfer.splitQuantity` | Local split quantity before command (in-memory). |

Local drafts under `state.ui.garrisonTransfer.*` are session-only,
in-memory, and require no
[`data-inventory.md`](../../../data-inventory.md) row.

## Commands And Events

Resolution rules per
[`screen-command-coverage.json`](../../../screen-command-coverage.json):

| Action | Token | Resolution | Effect |
| --- | --- | --- | --- |
| `garrison.dragStack` | `START_GARRISON_STACK_DRAG` | UI-local (matches `START_` prefix). | Creates the drag draft on `state.ui.garrisonTransfer.selectedStackRef`. |
| `garrison.dropStack` | `TRANSFER_GARRISON_STACK` | Schema-backed; dispatched through the shared command hook. | Moves, merges, swaps, or rejects the transfer between hero and garrison armies. |
| `garrison.splitStack` | `OPEN_SPLIT_STACK_DIALOG` | UI-local (matches `OPEN_` prefix); routes to [`51-split-stack-dialog`](../51-split-stack-dialog/). | Initializes `state.ui.garrisonTransfer.splitQuantity` draft. |
| `garrison.close` | `CLOSE_GARRISON_STRUCTURE` | UI-local (matches `CLOSE_` prefix); routes to [`07-adventure-map`](../07-adventure-map/). | Closes the modal; preserves no draft. |

Engine ownership for `TRANSFER_GARRISON_STACK`:
[`tasks/mvp/05-adventure-map/18-transfer-stack-commands.md`](../../../../../tasks/mvp/05-adventure-map/18-transfer-stack-commands.md).

## Config Keys

- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

## Localization Keys

- `ui.garrison-structure.title`
- `ui.garrison-structure.actions.*`
- `ui.garrison-structure.status.*`
- `ui.garrison-structure.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`
- Error keys resolve through
  [`error-formatter.md`](../../../error-formatter.md) under the
  closed `errors.*` namespace.

## Asset, Sound, And VFX IDs

- `ui.garrison-structure.background`
- `ui.garrison-structure.frame`
- `ui.garrison-structure.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.adventure.*`
- `vfx.garrison-structure.*`

## Save And Replay Fields

- Persist reducer-approved gameplay state, setup records, content
  hashes, command inputs, and explicit draft records only when named
  by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor
  blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths,
  localized labels, rendered positions, or wall-clock timestamps.

## Validation And Fallback

- The dispatcher validates `TRANSFER_GARRISON_STACK` against
  ownership, locked-garrison flag, stack compatibility,
  one-creature-left rules where applicable, and per-army capacity
  before reducing both armies atomically.
- Missing presentation may fall back through the asset resolver
  (see [`asset-loading.md`](../../../asset-loading.md)).
- Missing gameplay records, invalid commands, and unresolved content
  IDs fail loudly per [`fail-loud.md`](../../../fail-loud.md) before
  controls become enabled.

---

## 🔍 Sync Check

- **UI: ✔** — Selectors, command tokens, and asset / localization roots match `spec.md` § State Bindings, `interactions.md` § Actions, and the `data-action` hooks in [`mockup.html`](./mockup.html).
- **Schema: ✔** — `TRANSFER_GARRISON_STACK` defined in [`command.schema.json` `TRANSFER_GARRISON_STACK`](../../../../../content-schema/schemas/command.schema.json); the three UI-local tokens are covered by the `START_` / `OPEN_` / `CLOSE_` prefixes in [`screen-command-coverage.json`](../../../screen-command-coverage.json) `localUiPrefixes`. No persisted slice requires a [`data-inventory.md`](../../../data-inventory.md) row.
- **Tasks: ✔** — Engine reducer owned by [`mvp.05-adventure-map.18-transfer-stack-commands`](../../../../../tasks/mvp/05-adventure-map/18-transfer-stack-commands.md); UI screen owned by [`phase-2.07-ui-screen-backlog.22-garrison-structure-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/22-garrison-structure-screen.md). Both reference this file in their Read First / acceptance blocks.

## ⚠ Issues

_None._
