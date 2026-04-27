# Screen 59 Architecture: Loading Screen

System: system
Screen ID: loading-screen
Visual Archetype: curated-loading-screen
Curation Status: curated-pass-6

## Purpose
Loading/progress screen for scenario creation, save load, random map generation, asset warmup, and route handoff.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Loading Screen"]
  C0["LoadingArtwork"]
  Root --> C0
  C1["ProgressBar"]
  Root --> C1
  C2["StepText"]
  Root --> C2
  C3["AnimatedCrest"]
  Root --> C3
  C4["RecoverableErrorPanel"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Task request"] --> L1
  L1["Content hashes"] --> L2
  L2["Asset warmup"] --> L3
  L3["State creation/load"] --> L4
  L4["Destination route"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Progress/error event"] --> I1
  I1["Recovery guard"] --> I2
  I2["Retry/cancel/complete"] --> I3
  I3["Route handoff"] --> I4
  I4["Destination screen"]
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
  Draft->>VFX: Bar fill
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Fade out
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Loading Screen"]
  Current --> T0["Configured fallback"]
  Current --> T1["Configured destination"]
```

## State Inputs
- loadingTask -> state.ui.loading.taskId
- progress -> state.ui.loading.progress
- destination -> state.ui.loading.destinationRoute
- errors -> state.ui.loading.errors
- contentHashes -> state.ui.loading.contentHashes

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
