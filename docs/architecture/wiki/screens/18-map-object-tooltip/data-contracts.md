# Screen 18: Map Object Tooltip
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Companion Docs
- [`ui-state-contract.md` § Tooltip Lifecycle](../../../ui-state-contract.md#tooltip-lifecycle) — per-tick re-resolution rule and the canonical `ruleset.ui.timing` constants this screen consumes.
- [`schema-matrix.md`](../../../schema-matrix.md) — registration index for every schema below.
- [`screen-command-coverage.json`](../../../screen-command-coverage.json) — all four tokens listed below are local-ui via the `OPEN_` / `PIN_` / `CLOSE_` prefix list.

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `asset-index.schema.json` | Tooltip background, frame, portrait slots, brass-tack icon, cursor sprites, animation manifests. | `content-schema/schemas/asset-index.schema.json` |
| `localization.schema.json` | Tooltip labels, status text, masked-field copy, hint strings. | `content-schema/schemas/localization.schema.json` |
| `ruleset.schema.json` | `ui.timing.tooltipHoldDelayMs | tooltipFadeInMs | tooltipFadeOutMs`; visibility/guard formulas consumed by selectors. | `content-schema/schemas/ruleset.schema.json` |
| `map-object.schema.json` | Map object categories, interaction prompts, public hint shape. | `content-schema/schemas/map-object.schema.json` |
| `adventure-building.schema.json` | Mines, dwellings, and other map structures rendered with ownership and guard hints. | `content-schema/schemas/adventure-building.schema.json` |
| `neutral-stack-template.schema.json` | Neutral stack and creature-bank tooltips (attitude band, masked count). | `content-schema/schemas/neutral-stack-template.schema.json` |
| `artifact.schema.json` | Artifact pickup tooltips (name, slot, masked stats while unscouted). | `content-schema/schemas/artifact.schema.json` |
| `resource-id.schema.json` | Canonical resource IDs for resource-pile tooltips. | `content-schema/schemas/resource-id.schema.json` |
| Screen-specific registries | Heroes, towns, spells, armies, map objects loaded by the content runtime. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector / State Path | Notes |
| --- | --- | --- |
| `hoverObject` | `state.ui.adventure.hoverObjectId` | Object under pointer or controller focus. UI draft; excluded from saves/replays. |
| `publicInfo` | `selectors.mapObjects.publicTooltipInfo` | Name, type, owner, public hints. Re-resolved every reducer tick per [`ui-state-contract.md § Per-tick Re-resolution`](../../../ui-state-contract.md#per-tick-re-resolution). |
| `hiddenGuard` | `selectors.scouting.hiddenTooltipFields` | Masked fields due to fog / scouting rules; ownership change triggers a re-render. |
| `pinState` | `state.ui.tooltips.pinnedObjectId` | `null` when nothing pinned. Persists as part of the UI slice; cleared by Esc layer 3 in [`ui-input-arbitration.md` § Esc Precedence Ladder](../../../ui-input-arbitration.md#esc-precedence-ladder). |
| `anchorPosition` | `state.ui.pointer.anchorRect` | Screen-space rect only; never feeds gameplay logic. |

### Tokens (all local-ui)
All four tokens match the prefix-list in [`screen-command-coverage.json`](../../../screen-command-coverage.json) and never enter the deterministic engine command log.

| Token | Origin | Effect |
| --- | --- | --- |
| `OPEN_OBJECT_TOOLTIP` | `tooltip.open` | Sets the tooltip hover/pin draft. |
| `PIN_OBJECT_TOOLTIP` | `tooltip.pin` | Writes `state.ui.tooltips.pinnedObjectId`; keeps the tooltip visible while the pointer moves. |
| `OPEN_TOOLTIP_DETAIL` | `tooltip.details` | Routes to `09-map-object-dialog` or `50-creature-info`; the destination owns any gameplay commands. |
| `CLOSE_OBJECT_TOOLTIP` | `tooltip.close` | Clears `state.ui.tooltips.pinnedObjectId` and the UI draft. |

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.map-object-tooltip.title`
- `ui.map-object-tooltip.rows.*` (name, type, owner, guard, hint slots; masked variants)
- `ui.map-object-tooltip.status.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.map-object-tooltip.background`
- `ui.map-object-tooltip.frame`
- `ui.map-object-tooltip.icons.*` (brass-tack pin, masked-field glyph, portrait fallbacks)
- `audio.ui.hover` on open; `audio.ui.click` on pin or route; silent on auto-invalidate.
- `vfx.map-object-tooltip.fade-in`, `vfx.map-object-tooltip.fade-out`, `feedback.tooltip.invalidate` (auto-dismiss cue).

### Save And Replay Fields
- Nothing on this screen persists. Hover, focus, anchor, and tooltip-draft slots are excluded from saves and replays per [`determinism.md` § UI Draft Slice](../../../determinism.md#ui-draft-slice).
- `state.ui.tooltips.pinnedObjectId` is part of the UI slice; it does not enter the deterministic command log and is not replay-relevant.
- Replays use stable IDs and scalar command inputs only — never raw asset paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Tooltip data is presentation-only and visibility-filtered; hidden army counts, rewards, or ownership stay masked while fog/scouting rules require it.
- Missing presentation assets fall back through the asset resolver.
- Missing gameplay records, unresolved content IDs, or selector failures fail loudly in the selector boundary per [`fail-loud.md`](../../../fail-loud.md), before any tooltip renders.

---

## 🔍 Sync Check

- **UI: ✔** — Selector/state-path table matches sibling `spec.md` § State Bindings; token list matches sibling `interactions.md`. Hover, anchor, and tooltip draft slots are correctly declared UI-draft and excluded from persistence per [`determinism.md` § UI Draft Slice](../../../determinism.md#ui-draft-slice).
- **Schema: ✔** — `ruleset.ui.timing.tooltipHoldDelayMs | tooltipFadeInMs | tooltipFadeOutMs` live in [`ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) (lines 111–113). Selectors `selectors.mapObjects.publicTooltipInfo` and `selectors.scouting.hiddenTooltipFields` are declared in [`ui-state-contract.md § Tooltip Lifecycle`](../../../ui-state-contract.md#tooltip-lifecycle). Every other schema listed is registered in [`schema-matrix.md`](../../../schema-matrix.md).
- **Tasks: ✔** — Runtime owner `mvp.05-adventure-map.09-map-object-dialogs` lists this file in its Read First and ships `MapObjectTooltip.tsx`. Lifecycle/constants owner `mvp.07-ui-shell.17-tooltip-lifecycle` ships the `ui.timing` block.

## ⚠ Issues

_None._
