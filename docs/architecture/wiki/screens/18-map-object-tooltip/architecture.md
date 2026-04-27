# Screen 18 Architecture: Map Object Tooltip

System: adventure
Screen ID: map-object-tooltip
Visual Archetype: curated-object-tooltip
Curation Status: curated-pass-3

## Purpose
Right-click informational tooltip for adventure map objects, heroes, towns, resources, and guarded encounters.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Map Object Tooltip"]
  C0["TooltipAnchor"]
  Root --> C0
  C1["ObjectPortrait"]
  Root --> C1
  C2["PublicInfoRows"]
  Root --> C2
  C3["PinState"]
  Root --> C3
  C4["CloseHotspot"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Hover object"] --> L1
  L1["Scouting visibility"] --> L2
  L2["Public info selector"] --> L3
  L3["Anchor rect"] --> L4
  L4["Tooltip"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Right-click/hold"] --> I1
  I1["Visibility guard"] --> I2
  I2["Local tooltip draft"] --> I3
  I3["Optional detail route"] --> I4
  I4["Tooltip close"]
```

## Animation Flow
```mermaid
sequenceDiagram
  participant UI
  participant Draft as UI Draft
  participant Guard
  participant Reducer
  participant VFX
  UI->>Draft: hover/select/preview
  Draft->>VFX: Hold delay
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Fade out
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Map Object Tooltip"]
  Current --> T0["09-map-object-dialog or 50-creature-info"]
```

## State Inputs
- hoverObject -> state.ui.adventure.hoverObjectId
- publicInfo -> selectors.mapObjects.publicTooltipInfo
- hiddenGuard -> selectors.scouting.hiddenTooltipFields
- pinState -> state.ui.tooltips.pinnedObjectId
- anchorPosition -> state.ui.pointer.anchorRect

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
