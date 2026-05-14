# Screen 65: Map Editor

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Map editor shell with terrain/object palettes, brush tools, layers,
scenario properties, validation, and save/export controls.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract
- Curation status: `curated-pass-6`.
- Layout: map canvas centered, terrain/object palette left,
  properties inspector right, tool ribbon top, validation drawer
  bottom.
- Dense classic fantasy strategy UI: fixed `800×600` frame, ornate
  gold border, red/brown/stone panels, compact icon slots,
  right-click detail affordances, bottom status/resource feedback.
- `mockup.html` carries visible UI only. Logic, transitions, and
  implementation notes live in the Markdown package files.

### Component Tree
- `MapEditor`
  - `ToolRibbon`
  - `MapCanvas`
  - `TerrainPalette`
  - `ObjectPalette`
  - `PropertiesInspector`
  - `ValidationDrawer`
  - `SaveExportButtons`
  - `PublishButton`

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `editorDocument` | `state.editor.currentDocument` | Scenario draft document. |
| `selectedTool` | `state.editor.selectedTool` | One of: brush, object, erase, road, river, zone, properties. |
| `selectedLayer` | `state.editor.selectedLayer` | One of: surface, underground, objects, events, regions. |
| `selection` | `state.editor.selection` | Selected tile, object, or region. |
| `validationIssues` | `selectors.editor.validationIssues` | Schema and scenario rule issues. |

UI-only hover, focus, drag ghost, cursor blink, and animation frame
stay outside deterministic state per
[`interactions.md`](./interactions.md) § State Changes.

### Mechanics Mapping
- Edits scenario authoring data, **not** runtime gameplay state.
  `SAVE_EDITOR_SCENARIO` validates schema records, stable IDs,
  object rules, starting positions, objectives, and asset references
  before writing the draft.
- UI previews stay local until a listed command or route guard
  accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and
  objects resolve through registries and content schemas listed in
  [`data-contracts.md`](./data-contracts.md) — never through
  hardcoded view logic.

### Animation Contract
- Brush preview follows cursor; object stamp bounces on commit;
  invalid cells crosshatch red; validation drawer slides up; saved
  status seal glows.
- Animation consumes reducer or route results; it never decides
  gameplay outcomes.
- Reduced-motion mode (`config.ui.reducedMotion`) preserves visible
  state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen,
  state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied
  archetype diagrams.
- Data contracts identify schema, config, localization, asset,
  sound, VFX, save, and replay fields required to implement the
  screen.

### AI Implementation Notes
- Screen slug: `map-editor`; system group: `editor`; curation
  marker: `curated-pass-6`.
- Build runtime components from the package contract, not from
  third-party captures or external product pixels.
- Runtime code resolves presentation through asset IDs and
  manifests; deterministic gameplay commands use stable IDs and
  scalar values.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree, bindings, and visual contract align
  with [`mockup.html`](./mockup.html) and sibling
  [`interactions.md`](./interactions.md) (Publish surface present
  in both).
- **Schema: ✔** — State bindings (`state.editor.*`) match the
  selector list in [`data-contracts.md`](./data-contracts.md) § Runtime
  State Selectors; registries the screen consumes are enumerated
  there.
- **Tasks: ✔** — Owning task
  [`phase-2.07-ui-screen-backlog.65-map-editor-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/65-map-editor-screen.md)
  reads this file first; command-producing tasks
  ([`08-map-editor-commands`](../../../../../tasks/phase-2/04-content-editor/08-map-editor-commands.md),
  [`10-publish-disclaimer-flow`](../../../../../tasks/phase-2/04-content-editor/10-publish-disclaimer-flow.md))
  reference the screen package.

## ⚠ Issues

_None._
