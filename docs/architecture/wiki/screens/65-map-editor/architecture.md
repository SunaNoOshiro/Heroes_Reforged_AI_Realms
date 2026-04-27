# Screen 65 Architecture: Map Editor

System: editor
Screen ID: map-editor
Visual Archetype: curated-map-editor
Curation Status: curated-pass-6

## Purpose
Map editor shell with terrain/object palettes, brush tools, layers, scenario properties, validation, and save/export controls.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Map Editor"]
  C0["ToolRibbon"]
  Root --> C0
  C1["MapCanvas"]
  Root --> C1
  C2["TerrainPalette"]
  Root --> C2
  C3["ObjectPalette"]
  Root --> C3
  C4["PropertiesInspector"]
  Root --> C4
  C5["ValidationDrawer"]
  Root --> C5
  C6["SaveExportButtons"]
  Root --> C6
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Editor document"] --> L1
  L1["Terrain/object registries"] --> L2
  L2["Tool state"] --> L3
  L3["Validation rules"] --> L4
  L4["Editor workspace"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Tool/canvas/save input"] --> I1
  I1["Editor guard"] --> I2
  I2["Document command"] --> I3
  I3["Validation refresh"] --> I4
  I4["Save/export"]
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
  Draft->>VFX: Brush preview
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Drawer slide
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Map Editor"]
  Current --> CurrentRefresh["Refresh current screen"]
```

## State Inputs
- editorDocument -> state.editor.currentDocument
- selectedTool -> state.editor.selectedTool
- selectedLayer -> state.editor.selectedLayer
- selection -> state.editor.selection
- validationIssues -> selectors.editor.validationIssues

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
