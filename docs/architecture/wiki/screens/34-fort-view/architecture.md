# Screen 34 Architecture: Fort View

System: town
Screen ID: fort-view
Visual Archetype: curated-fort-view
Curation Status: curated-pass-4

## Purpose
Town fortification inspection view showing fort/citadel/castle tier, wall/tower battle bonuses, and siege readiness.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Fort View"]
  C0["FortificationCutaway"]
  Root --> C0
  C1["WallSegmentList"]
  Root --> C1
  C2["TowerSlots"]
  Root --> C2
  C3["SiegeBonusChecklist"]
  Root --> C3
  C4["CloseButton"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Town buildings"] --> L1
  L1["Fort rules"] --> L2
  L2["Battle layout"] --> L3
  L3["Growth selector"] --> L4
  L4["Fort view"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Segment/build input"] --> I1
  I1["Build prerequisite guard"] --> I2
  I2["Local focus or route"] --> I3
  I3["Town/battle bonus preview"] --> I4
  I4["Town return"]
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
  Draft->>VFX: Wall highlight
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Silhouette pulse
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Fort View"]
  Current --> T0["30-build-tree"]
  Current --> T1["24-town-screen"]
```

## State Inputs
- fortLevel -> state.towns.byId[selected].fortificationLevel
- wallDefinition -> selectors.towns.fortificationBattleLayout
- growthBonus -> selectors.towns.fortificationGrowthBonus
- buildPrereqs -> selectors.towns.nextFortUpgradePrereqs
- selectedSegment -> state.ui.fortView.selectedSegment

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
