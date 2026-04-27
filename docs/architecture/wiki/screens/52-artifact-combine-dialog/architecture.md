# Screen 52 Architecture: Artifact Combine Dialog

System: hero
Screen ID: artifact-combine-dialog
Visual Archetype: curated-artifact-combine
Curation Status: curated-pass-5

## Purpose
Combination artifact confirmation showing required pieces, resulting artifact, blocked slots, and equip/backpack outcome.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Artifact Combine Dialog"]
  C0["ComponentArtifactRing"]
  Root --> C0
  C1["ResultArtifactCard"]
  Root --> C1
  C2["MissingPieceList"]
  Root --> C2
  C3["DestinationSlotPreview"]
  Root --> C3
  C4["CombineButtons"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Hero artifacts"] --> L1
  L1["Combine recipe"] --> L2
  L2["Artifact registry"] --> L3
  L3["Destination slots"] --> L4
  L4["Combine dialog"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Combine input"] --> I1
  I1["Recipe/ownership guard"] --> I2
  I2["Combine command"] --> I3
  I3["Inventory update"] --> I4
  I4["Hero sheet refresh"]
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
  Draft->>VFX: Piece orbit
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Component vanish
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Artifact Combine Dialog"]
  Current --> T0["46-hero-screen"]
  Current --> T1["46-hero-screen"]
```

## State Inputs
- recipeId -> state.ui.artifactCombine.recipeId
- components -> selectors.artifacts.combineComponents
- resultArtifact -> registries.artifacts.byId[resultId]
- destination -> selectors.artifacts.combineDestination
- combineGuard -> selectors.artifacts.combineGuard

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
