# Screen 62 Architecture: Multiplayer Setup

System: multiplayer
Screen ID: multiplayer-setup
Visual Archetype: curated-multiplayer-setup
Curation Status: curated-pass-6

## Purpose
Multiplayer setup for hotseat, LAN/online lobby, player colors, teams, timers, map/scenario, and deterministic content lock.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Multiplayer Setup"]
  C0["ConnectionTypeTabs"]
  Root --> C0
  C1["PlayerSlotTable"]
  Root --> C1
  C2["MapPreview"]
  Root --> C2
  C3["TimerOptions"]
  Root --> C3
  C4["ContentHashLock"]
  Root --> C4
  C5["HostJoinButtons"]
  Root --> C5
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Scenario index"] --> L1
  L1["Connection settings"] --> L2
  L2["Player slots"] --> L3
  L3["Content hashes"] --> L4
  L4["Multiplayer setup"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Slot/host/join input"] --> I1
  I1["Compatibility guard"] --> I2
  I2["Session event"] --> I3
  I3["Lobby/hotseat route"] --> I4
  I4["Session state"]
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
  Draft->>VFX: Banner flip
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Lobby fade
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Multiplayer Setup"]
  Current --> T0["64-network-lobby or 63-hotseat-turn-handoff"]
  Current --> T1["64-network-lobby"]
  Current --> T2["02-new-game-setup"]
```

## State Inputs
- connectionType -> state.ui.multiplayer.connectionType
- playerSlots -> state.ui.multiplayer.playerSlots
- selectedScenario -> state.ui.multiplayer.scenarioId
- timerConfig -> state.ui.multiplayer.timer
- contentHash -> selectors.multiplayer.contentCompatibilityHash

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
