# Screen 15: Underground Layer Toggle

### Screen Package
- [`mockup.html`](./mockup.html) — visual reference.
- [`interactions.md`](./interactions.md) — per-control behavior, timing, error paths.
- [`data-contracts.md`](./data-contracts.md) — schemas, selectors, localization, assets.
- [`architecture.md`](./architecture.md) — screen diagrams.

### Description
Adventure-map view-layer switcher. Lets the active player flip the
rendered map between the surface and the underground, focus a known
subterranean gate, or close the modal. All four controls are
**UI-local** — none of them mutate deterministic gameplay state.
Hero relocation between layers still requires walking onto a valid
subterranean gate or monolith, which is owned by the engine task
[`mvp.03-map-system.10-underground-layer-support`](../../../../../tasks/mvp/03-map-system/10-underground-layer-support.md).

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract
- Curation status: `curated-pass-3`.
- Fixed `800 × 600` layout. The adventure map and right-side command
  panel remain visible behind a centered modal titled `World Layers`
  carrying: a left `Surface` preview panel (warm greens) and a right
  `Underground` preview panel (cold stone), a central glowing brass
  lever bridging the two, and three buttons (`SURFACE`, `UNDER`,
  `CLOSE`). Match [`mockup.html`](./mockup.html) exactly for
  placement, colors, and button labels.
- Use dense classic fantasy strategy UI: ornate gold frame,
  red / brown / stone panels, compact icon slots, right-click
  detail affordances, and bottom status / resource feedback.
- [`mockup.html`](./mockup.html) carries the visible UI only. Logic,
  transitions, and implementation notes live in the sibling markdown
  files.

### Component Tree
- `UndergroundToggle`
  - `SurfacePreview`
  - `UndergroundPreview`
  - `GateMarkerList`
  - `LayerLever`
  - `CloseButton`

### State Bindings
| Element | Bound to | Notes |
| --- | --- | --- |
| `activeLayer` | `state.adventure.activeLayer` | View-layer enum (`surface` \| `underground`); render context only, not gameplay state. Shared with screen [`16-view-world`](../16-view-world/data-contracts.md). |
| `hasUnderground` | `state.scenario.layers.underground.enabled` | Read-only scenario flag; gates the `UNDER` button. Sourced from [`scenario.schema.json`](../../../../../content-schema/schemas/scenario.schema.json) at load. |
| `knownGates` | `selectors.adventure.knownSubterraneanGates` | Visible gates and two-way links for the active player; derived from per-player fog and gate-discovery state owned by [`mvp.03-map-system.10-underground-layer-support`](../../../../../tasks/mvp/03-map-system/10-underground-layer-support.md). |
| `selectedGate` | `state.ui.layerToggle.selectedGateId` | Local selected gate marker; transient, never persisted. |
| `cameraFocus` | `state.adventure.camera` | Camera target; updated by `layer.focusGate` and by the layer switch's recenter step. |

### Mechanics Mapping
- Layer switch changes the camera and render context only. It does
  **not** move heroes; cross-layer travel still requires walking
  into a valid subterranean gate or monolith, which is owned by the
  engine task above.
- UI previews stay local until the player presses `SURFACE`,
  `UNDER`, `CLOSE`, or clicks a gate marker.
- Gate visibility, two-way links, and underground availability
  resolve through registries and content schemas — never hardcoded
  view logic.

### Animation Contract
- Vertical wipe between surface and underground previews; the
  minimap palette swaps when the active layer commits; known gates
  pulse on the inactive layer to advertise crossings; the `UNDER`
  button is disabled with a `clank` cue when `hasUnderground` is
  `false`.
- Animation consumes the view-layer write; it never decides
  gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static
  highlights and localized feedback. The
  `@media (prefers-reduced-motion: reduce)` rule in
  [`mockup.html`](./mockup.html) is the canonical example.

### Acceptance Criteria
- Mockup is visually distinct from sibling screens and follows this
  package's internal visual direction.
- Spec lists every visible region and authoritative state binding.
- [`interactions.md`](./interactions.md) covers every primary
  control, next screen, state update, animation cue, disabled case,
  and error path.
- [`architecture.md`](./architecture.md) carries screen-specific
  diagrams, not copied archetype diagrams.
- [`data-contracts.md`](./data-contracts.md) identifies the schema,
  config, localization, asset, sound, VFX, save, and replay fields
  required to implement the screen.

### AI Implementation Notes
- Screen slug `underground-toggle`; system group `adventure`;
  curation marker `curated-pass-3`.
- Build runtime components from this package contract — never from
  third-party captures or external product pixels.
- Resolve presentation through asset IDs and manifests; deterministic
  gameplay records carry stable IDs and scalar values only.
- All four control tokens (`SET_ADVENTURE_LAYER` ×2,
  `FOCUS_SUBTERRANEAN_GATE`, `CLOSE_LAYER_TOGGLE`) are **UI-local**
  by prefix (`SET_`, `FOCUS_`, `CLOSE_` listed in `localUiPrefixes`
  of
  [`screen-command-coverage.json`](../../../screen-command-coverage.json));
  none requires a row in `command.schema.json`. See sibling
  [`interactions.md`](./interactions.md) for per-control routing and
  [`data-contracts.md`](./data-contracts.md) for the coverage
  classification.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree (`UndergroundToggle`, `SurfacePreview`,
  `UndergroundPreview`, `GateMarkerList`, `LayerLever`,
  `CloseButton`) and button labels (`SURFACE`, `UNDER`, `CLOSE`)
  match the `data-action` attributes and visible regions in
  [`mockup.html`](./mockup.html). Animation contract mirrors the
  `pulse`, `modalIn`, and reduced-motion rules in the mockup
  `<style>` block. Sibling [`architecture.md`](./architecture.md)
  Visual Composition diagram uses the same component names — aligned.
- **Schema: ✔** — `hasUnderground` is sourced from
  [`scenario.schema.json`](../../../../../content-schema/schemas/scenario.schema.json);
  the four control tokens clear via the `SET_` / `FOCUS_` / `CLOSE_`
  UI-local prefix policy in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json),
  so none requires a row in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json).
  Sibling [`data-contracts.md`](./data-contracts.md) carries the
  full schema list.
- **Tasks: ✔** — Owning UI task
  [`phase-2.07-ui-screen-backlog.15-underground-toggle-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/15-underground-toggle-screen.md)
  reads this file first and lists
  [`mvp.03-map-system.10-underground-layer-support`](../../../../../tasks/mvp/03-map-system/10-underground-layer-support.md)
  as a Dependency; that engine task in turn reads sibling
  [`interactions.md`](./interactions.md) first.

## ⚠ Issues

- **Token classification reconciled.** The previous revision of
  [`interactions.md`](./interactions.md) listed `SET_ADVENTURE_LAYER`
  as `Type: command`, which contradicts the `SET_` UI-local prefix
  policy in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  and the engine owner's contract that "selectors can switch view
  layer without mutating gameplay state"
  ([`mvp.03-map-system.10-underground-layer-support`](../../../../../tasks/mvp/03-map-system/10-underground-layer-support.md)).
  Rewrote both sibling files to classify all four tokens as
  UI-local. No code change implied.
- **Transient UI slices not in `data-inventory.md`.**
  `state.adventure.activeLayer`, `state.ui.layerToggle.selectedGateId`,
  and `state.adventure.camera` are not persisted, so the
  [`data-inventory.md`](../../../data-inventory.md) contract
  ("every persisted field is registered") does not require a row.
  Soft cross-reference gap only; if any of these ever becomes
  session-persistent, the owning UI task
  [`phase-2.07-ui-screen-backlog.15-underground-toggle-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/15-underground-toggle-screen.md)
  must add the row before merge. Skill did not edit
  `data-inventory.md` (Hard Prohibition D).
