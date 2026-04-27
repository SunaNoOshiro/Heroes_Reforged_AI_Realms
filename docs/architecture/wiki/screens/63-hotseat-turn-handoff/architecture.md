# Screen 63 Architecture: Hotseat Turn Handoff

System: multiplayer
Screen ID: hotseat-turn-handoff
Visual Archetype: curated-hotseat-handoff
Curation Status: curated-pass-6

## Purpose
Privacy handoff screen between hotseat players, hiding the map until the next player confirms readiness.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Hotseat Turn Handoff"]
  C0["PrivacyCover"]
  Root --> C0
  C1["PlayerColorBanner"]
  Root --> C1
  C2["TurnDatePlaque"]
  Root --> C2
  C3["BeginTurnButton"]
  Root --> C3
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Turn transition"] --> L1
  L1["Next player"] --> L2
  L2["Calendar"] --> L3
  L3["Privacy cover"] --> L4
  L4["Handoff screen"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Begin input"] --> I1
  I1["Cover guard"] --> I2
  I2["Begin turn event"] --> I3
  I3["Announcement or map route"] --> I4
  I4["Player control"]
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
  Draft->>VFX: Shutters close
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Shutters open
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Hotseat Turn Handoff"]
  Current --> T0["07-adventure-map or pending popup"]
  Current --> T1["56-options"]
```

## State Inputs
- nextPlayer -> state.turn.activePlayerId
- calendar -> state.calendar.currentDate
- privacyCover -> state.ui.hotseat.coverActive
- playerName -> state.players.byId[next].displayName
- pendingAnnouncements -> selectors.turn.pendingStartOfTurnAnnouncements

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
