# Screen 09 Architecture: Map Object Dialog

System: adventure
Screen ID: map-object-dialog
Visual Archetype: curated-map-object-dialog
Curation Status: curated-pass-3

## Purpose
Generic adventure object visit dialog for shrines, events, guarded rewards, signs, one-shot pickups, and choice prompts.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Map Object Dialog"]
  C0["ObjectPortrait"]
  Root --> C0
  C1["ObjectMessage"]
  Root --> C1
  C2["RequirementPanel"]
  Root --> C2
  C3["RewardPreview"]
  Root --> C3
  C4["DialogButtons"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Hero movement result"] --> L1
  L1["Object record"] --> L2
  L2["Visit flags"] --> L3
  L3["Reward preview"] --> L4
  L4["Object dialog"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Accept click"] --> I1
  I1["Visit guard"] --> I2
  I2["Object command"] --> I3
  I3["Reducer result"] --> I4
  I4["Map refresh"]
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
  Draft->>VFX: Object pop
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Map return
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Map Object Dialog"]
  Current --> T0["07-adventure-map"]
  Current --> T1["07-adventure-map"]
  Current --> T2["18-map-object-tooltip"]
  Current --> T3["11-quest-log"]
```

## State Inputs
- objectId -> state.ui.adventure.pendingObjectVisit.objectId
- heroId -> state.adventure.selectedHeroId
- visitRecord -> state.mapObjects.byId[objectId]
- rewardPreview -> selectors.mapObjects.previewVisitReward
- guardResult -> selectors.mapObjects.visitGuard

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
