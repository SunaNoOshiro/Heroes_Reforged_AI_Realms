# Screen 19 Architecture: Status Bar

System: adventure
Screen ID: status-bar
Visual Archetype: curated-status-bar
Curation Status: curated-pass-3

## Purpose
Adventure status line and message history strip showing hover descriptions, command feedback, resource changes, and disabled reasons.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Status Bar"]
  C0["MessageTicker"]
  Root --> C0
  C1["MessageHistoryDrawer"]
  Root --> C1
  C2["PinnedMessage"]
  Root --> C2
  C3["ResourceDeltaBadges"]
  Root --> C3
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Hover context"] --> L1
  L1["Command feedback"] --> L2
  L2["Localization"] --> L3
  L3["Message history"] --> L4
  L4["Status bar"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Hover/result input"] --> I1
  I1["Message formatter"] --> I2
  I2["Local history draft"] --> I3
  I3["Drawer controls"] --> I4
  I4["Visible feedback"]
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
  Draft->>VFX: Message slide
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Drawer fold
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Status Bar"]
  Current --> CurrentRefresh["Refresh current screen"]
```

## State Inputs
- hoverContext -> state.ui.adventure.hoverContext
- latestMessage -> state.ui.messages.latest
- messageHistory -> state.ui.messages.history
- resourceDeltas -> selectors.economy.lastVisibleDeltas
- drawerOpen -> state.ui.statusBar.drawerOpen

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
