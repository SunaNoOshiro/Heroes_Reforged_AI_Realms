# Screen 23 Architecture: Hero Prison

System: adventure
Screen ID: hero-prison
Visual Archetype: curated-hero-prison
Curation Status: curated-pass-3

## Purpose
Adventure prison dialog for releasing an imprisoned hero into the player's roster when limits and ownership rules allow.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Hero Prison"]
  C0["PrisonCellPortrait"]
  Root --> C0
  C1["ImprisonedHeroSummary"]
  Root --> C1
  C2["RosterCapacityPanel"]
  Root --> C2
  C3["ReleaseLeaveButtons"]
  Root --> C3
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Prison object"] --> L1
  L1["Hero record"] --> L2
  L2["Roster capacity"] --> L3
  L3["Spawn tile"] --> L4
  L4["Prison dialog"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Release input"] --> I1
  I1["Roster/release guard"] --> I2
  I2["Release command"] --> I3
  I3["Reducer creates hero"] --> I4
  I4["Map spawn"]
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
  Draft->>VFX: Bars lift
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Hero spawn
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Hero Prison"]
  Current --> T0["07-adventure-map"]
  Current --> T1["46-hero-screen"]
  Current --> T2["07-adventure-map"]
```

## State Inputs
- prisonId -> state.ui.adventure.pendingPrisonId
- imprisonedHero -> state.mapObjects.byId[prisonId].heroId
- rosterSlots -> selectors.heroes.availableRosterSlots
- releaseGuard -> selectors.heroes.prisonReleaseGuard
- spawnTile -> selectors.mapObjects.prisonReleaseTile

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
