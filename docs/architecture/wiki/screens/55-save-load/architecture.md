# Screen 55 Architecture: Save / Load

System: system
Screen ID: save-load
Visual Archetype: curated-save-load
Curation Status: curated-pass-6

## Purpose
Save/load slot browser with save metadata, compatibility checks, overwrite confirmation, and selected slot preview.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Save / Load"]
  C0["ModeTabs"]
  Root --> C0
  C1["SaveSlotTable"]
  Root --> C1
  C2["SlotPreview"]
  Root --> C2
  C3["CompatibilitySeal"]
  Root --> C3
  C4["ActionButtons"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Save manifests"] --> L1
  L1["Content hashes"] --> L2
  L2["Schema versions"] --> L3
  L3["Selected slot"] --> L4
  L4["Save/load screen"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Slot/action input"] --> I1
  I1["Compatibility guard"] --> I2
  I2["Save/load/delete event"] --> I3
  I3["Persistence adapter"] --> I4
  I4["Caller/loading route"]
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
  Draft->>VFX: Rows slide
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Confirm fade
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Save / Load"]
  Current --> T0["59-loading-screen"]
  Current --> T1["60-confirmation-dialog"]
  Current --> T2["54-system-menu or 01-main-menu"]
```

## State Inputs
- mode -> state.ui.saveLoad.mode
- slots -> selectors.persistence.saveSlotManifests
- selectedSlot -> state.ui.saveLoad.selectedSlotId
- compatibility -> selectors.persistence.selectedSaveCompatibility
- overwriteGuard -> selectors.persistence.overwriteGuard

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
