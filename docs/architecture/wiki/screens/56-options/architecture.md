# Screen 56 Architecture: Options

System: system
Screen ID: options
Visual Archetype: curated-options
Curation Status: curated-pass-6

## Purpose
Options screen for audio, animation speed, combat settings, autosave, language, accessibility, and renderer scale.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Options"]
  C0["OptionsTabs"]
  Root --> C0
  C1["SliderRows"]
  Root --> C1
  C2["ToggleRows"]
  Root --> C2
  C3["SegmentedControls"]
  Root --> C3
  C4["ApplyCancelButtons"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Config store"] --> L1
  L1["Caller locks"] --> L2
  L2["Localization"] --> L3
  L3["Options draft"] --> L4
  L4["Options view"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Setting/apply input"] --> I1
  I1["Config validation"] --> I2
  I2["Apply command"] --> I3
  I3["Persist settings"] --> I4
  I4["Caller refresh"]
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
  Draft->>VFX: Tab slide
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Apply glow
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Options"]
  Current --> T0["Caller screen"]
```

## State Inputs
- optionsDraft -> state.ui.options.draft
- audioConfig -> config.audio
- uiConfig -> config.ui
- gameplayLocks -> selectors.options.gameplayConfigLocks
- dirty -> selectors.options.hasUnsavedChanges

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
