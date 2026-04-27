# Screen 10 Architecture: Puzzle Map

System: adventure
Screen ID: puzzle-map
Visual Archetype: curated-puzzle-map
Curation Status: curated-pass-3

## Purpose
Obelisk puzzle map view revealing grail-location fragments according to visited obelisks.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Puzzle Map"]
  C0["FragmentGrid"]
  Root --> C0
  C1["ObeliskProgress"]
  Root --> C1
  C2["GrailHintPanel"]
  Root --> C2
  C3["MapJumpButton"]
  Root --> C3
  C4["CloseButton"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Scenario grail data"] --> L1
  L1["Visited obelisks"] --> L2
  L2["Reveal mask"] --> L3
  L3["Fragment sprites"] --> L4
  L4["Puzzle map"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Fragment input"] --> I1
  I1["Reveal guard"] --> I2
  I2["Local focus"] --> I3
  I3["Optional map focus"] --> I4
  I4["Adventure return"]
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
  Draft->>VFX: Parchment open
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Close fold
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Puzzle Map"]
  Current --> T0["07-adventure-map"]
  Current --> T1["07-adventure-map"]
```

## State Inputs
- obeliskProgress -> state.players.active.obelisksVisited
- fragmentGrid -> selectors.grail.revealedPuzzleFragments
- selectedFragment -> state.ui.puzzleMap.selectedFragment
- grailRegionHint -> selectors.grail.visibleRegionHint
- mapJumpTarget -> selectors.grail.selectedFragmentMapFocus

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
