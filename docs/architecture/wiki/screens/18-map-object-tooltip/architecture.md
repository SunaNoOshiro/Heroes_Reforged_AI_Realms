# Screen 18 Architecture: Map Object Tooltip

System: adventure
Screen ID: map-object-tooltip
Visual Archetype: curated-object-tooltip
Curation Status: curated-pass-3

## Companion Docs
- [`ui-state-contract.md` § Tooltip Lifecycle](../../../ui-state-contract.md#tooltip-lifecycle) — owns per-tick re-resolution, auto-dismiss on null, ownership-change re-render, and the `ruleset.ui.timing` constants.
- [`screen-command-coverage.json`](../../../screen-command-coverage.json) — confirms the four tooltip tokens are local-ui by prefix match.
- Sibling `spec.md` (component tree + state bindings), `interactions.md` (per-gesture behavior + animation/audio), `data-contracts.md` (schemas + tokens).

## Purpose
Right-click informational tooltip for adventure map objects — heroes, towns, mines, resources, neutral stacks, treasures. Presentation-only; no gameplay state mutates here.

## Visual Direction
Original internal UI contract. Do not use third-party captures, copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["MapObjectTooltip"]
  Root --> C0["TooltipAnchor"]
  Root --> C1["ObjectPortrait"]
  Root --> C2["PublicInfoRows"]
  Root --> C3["PinState"]
  Root --> C4["CloseHotspot"]
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Hover/right-click object"] --> L1["selectors.mapObjects.publicTooltipInfo"]
  L1 --> L2["selectors.scouting.hiddenTooltipFields"]
  L2 --> L3["state.ui.pointer.anchorRect"]
  L3 --> L4["Render MapObjectTooltip"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Right-click / hold object"] --> I1["Hold-delay timer (ruleset.ui.timing.tooltipHoldDelayMs)"]
  I1 --> I2["Fade-in (tooltipFadeInMs)"]
  I2 --> I3{"Action"}
  I3 -->|"tooltip.pin"| I4["Write state.ui.tooltips.pinnedObjectId"]
  I3 -->|"tooltip.details"| I5["Route to 09 or 50 (local-ui)"]
  I3 -->|"tooltip.close / Esc / null selector"| I6["Fade-out (tooltipFadeOutMs)"]
```

## Animation Flow
```mermaid
sequenceDiagram
  participant UI as MapObjectTooltip
  participant Sel as Selectors
  participant State as state.ui.tooltips
  participant VFX
  UI->>Sel: publicTooltipInfo(pinnedObjectId)
  Sel-->>UI: row data or null
  alt row data
    UI->>VFX: hold-delay → fade-in
    UI->>State: PIN_OBJECT_TOOLTIP (on pin gesture)
  else null result
    UI->>VFX: feedback.tooltip.invalidate
    UI->>State: pinnedObjectId ← null
  end
  UI->>VFX: fade-out on close / route
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["18-map-object-tooltip"] --> T0["09-map-object-dialog"]
  Current --> T1["50-creature-info"]
```

`tooltip.details` routes to `09-map-object-dialog` for towns / mines / generic interactables, and to `50-creature-info` for neutral stacks and army units. The route is local-ui; gameplay commands fire from the destination screen, not from this tooltip.

## State Inputs
- `hoverObject` → `state.ui.adventure.hoverObjectId`
- `publicInfo` → `selectors.mapObjects.publicTooltipInfo`
- `hiddenGuard` → `selectors.scouting.hiddenTooltipFields`
- `pinState` → `state.ui.tooltips.pinnedObjectId`
- `anchorPosition` → `state.ui.pointer.anchorRect`

## Implementation Contract
- The mockup defines visible regions and data hooks only.
- `spec.md` owns the component / state contract.
- `interactions.md` owns gestures, animation durations, route targets, and dismissal paths.
- `data-contracts.md` owns schemas, tokens, config, localization, asset, audio, VFX, and save/replay references.
- Per-tick re-resolution, auto-dismiss on `null`, and ownership-change re-render are owned by [`ui-state-contract.md § Tooltip Lifecycle`](../../../ui-state-contract.md#tooltip-lifecycle); these diagrams summarize that contract and must not introduce hidden behavior.

---

## 🔍 Sync Check

- **UI: ✔** — Component nodes and state inputs match sibling `spec.md` § Component Tree / State Bindings. Outgoing transitions (`09-map-object-dialog`, `50-creature-info`) match sibling `interactions.md` § Navigation Outcomes.
- **Schema: ✔** — Timing constants (`tooltipHoldDelayMs`, `tooltipFadeInMs`, `tooltipFadeOutMs`) cited in the Main Interaction Flow exist in [`ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) (lines 111–113); selectors are declared in [`ui-state-contract.md § Tooltip Lifecycle`](../../../ui-state-contract.md#tooltip-lifecycle).
- **Tasks: ✔** — Runtime owner `mvp.05-adventure-map.09-map-object-dialogs` ships `MapObjectTooltip.tsx`. Lifecycle/constants owner `mvp.07-ui-shell.17-tooltip-lifecycle` ships the `ui.timing` block and the per-tick re-resolution invariant these diagrams reference.

## ⚠ Issues

_None._
