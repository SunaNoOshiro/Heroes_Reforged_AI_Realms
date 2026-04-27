# Screen 65: Map Editor

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Map editor shell with terrain/object palettes, brush tools, layers, scenario properties, validation, and save/export controls.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-6`.
- Editor workspace with map canvas center, terrain/object palette left, properties inspector right, tool ribbon top, minimap and validation drawer bottom.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- MapEditor
  - ToolRibbon
  - MapCanvas
  - TerrainPalette
  - ObjectPalette
  - PropertiesInspector
  - ValidationDrawer
  - SaveExportButtons

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| editorDocument | state.editor.currentDocument | Scenario draft document. |
| selectedTool | state.editor.selectedTool | Brush, object, erase, road, river, zone, properties. |
| selectedLayer | state.editor.selectedLayer | Surface, underground, objects, events, regions. |
| selection | state.editor.selection | Selected tile/object/region. |
| validationIssues | selectors.editor.validationIssues | Schema and scenario rule issues. |

### Mechanics Mapping
- Edits scenario authoring data, not runtime gameplay state. Save validates schema records, stable IDs, object rules, starting positions, objectives, and asset references.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Brush preview follows cursor, object stamp bounces, invalid cells crosshatch red, validation drawer slides up, and saved status seal glows.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `map-editor`; system group: `editor`; curation marker: `curated-pass-6`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
