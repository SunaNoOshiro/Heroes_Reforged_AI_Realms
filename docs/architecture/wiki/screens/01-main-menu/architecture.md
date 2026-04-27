# Screen 01 Architecture: Main Menu

System: menus
Screen ID: main-menu
Visual Archetype: curated-menu
Curation Status: anchor-v1

## Purpose
Boot shell menu with full-bleed fantasy painting, title treatment, icon-backed menu buttons, and no gameplay state loaded.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Main Menu"]
  C0["BackdropPainting"]
  Root --> C0
  C1["LogoTitle"]
  Root --> C1
  C2["CommandStack"]
  Root --> C2
  C3["VersionLabel"]
  Root --> C3
  C4["RouteFadeOverlay"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["App boot"] --> L1
  L1["Shell asset manifest"] --> L2
  L2["Localization"] --> L3
  L3["Command availability"] --> L4
  L4["Main menu view"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Pointer/key"] --> I1
  I1["Command guard"] --> I2
  I2["Route request"] --> I3
  I3["Fade animation"] --> I4
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
  Draft->>VFX: Idle storm
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Route fade
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Main Menu"]
  Current --> T0["02-new-game-setup"]
  Current --> T1["55-save-load"]
  Current --> T2["57-high-scores"]
  Current --> T3["05-intro-cinematic"]
  Current --> T4["60-confirmation-dialog"]
```

## State Inputs
- menu.commands -> state.shell.availableCommands
- lastSaveAvailable -> state.persistence.hasLoadableSave
- quitGuard -> state.shell.quitRequiresConfirmation

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
