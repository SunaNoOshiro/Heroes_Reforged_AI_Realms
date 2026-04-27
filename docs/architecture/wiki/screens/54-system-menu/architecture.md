# Screen 54 Architecture: System Menu

System: system
Screen ID: system-menu
Visual Archetype: curated-system-menu
Curation Status: curated-pass-6

## Purpose
In-game system menu overlay for save, load, options, restart, main menu, and quit confirmation.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["System Menu"]
  C0["DimmedGameplayBackdrop"]
  Root --> C0
  C1["CommandTablet"]
  Root --> C1
  C2["SaveLoadButtons"]
  Root --> C2
  C3["OptionsButton"]
  Root --> C3
  C4["ConfirmRoutes"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Caller route"] --> L1
  L1["Save/load guards"] --> L2
  L2["Session state"] --> L3
  L3["Localized commands"] --> L4
  L4["System menu"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Command click"] --> I1
  I1["Route/confirm guard"] --> I2
  I2["Child dialog route"] --> I3
  I3["Optional confirm"] --> I4
  I4["Caller/main route"]
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
  Draft->>VFX: Backdrop dim
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Dialog fade
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["System Menu"]
  Current --> T0["55-save-load"]
  Current --> T1["55-save-load"]
  Current --> T2["56-options"]
  Current --> T3["60-confirmation-dialog"]
  Current --> T4["Caller screen"]
```

## State Inputs
- callerRoute -> state.ui.systemMenu.callerRoute
- canSave -> selectors.persistence.canSaveCurrentGame
- canLoad -> selectors.persistence.hasLoadableSave
- restartGuard -> selectors.session.restartGuard
- dirtyDrafts -> state.ui.unsavedDrafts

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
