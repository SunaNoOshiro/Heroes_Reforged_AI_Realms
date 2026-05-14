# Screen 16: View World

### Screen Package
- [`mockup.html`](./mockup.html) — visual reference.
- [`interactions.md`](./interactions.md) — per-control behavior, timing, error paths.
- [`data-contracts.md`](./data-contracts.md) — schemas, selectors, localization, assets.
- [`architecture.md`](./architecture.md) — screen diagrams.

### Description
Full-world overview rendered for **View Air / View Earth** style
spells and for strategic map scanning. The screen opens as a modal
over the adventure map, paints the entire world parchment, applies
fog and spell-visibility rules, and lets the caster inspect or focus
a revealed object before returning to the caller (the adventure map
or the spell book). All four control tokens are **UI-local** by
prefix; this screen does not produce schema-backed gameplay
commands.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract
- Curation status: `curated-pass-3`.
- Fixed `800 × 600` layout. The adventure map and right command
  panel (minimap, hero portraits, selected-hero plate, status bar,
  resource/date bar) remain visible behind a centered parchment
  modal that fills the playfield. Inside the modal:
  - A large parchment-toned world panel (top-left) carrying the
    ownership / object pins, the active hero route trace, and the
    `FogMask` overlay tinted by the calling spell's reveal radius.
  - A right side-rail with a `Layers` panel (`Surface`, `Under`,
    `View Air`) above a `Selected` plaque (selected object name +
    `Legal focus` status), with `FOCUS` and `CLOSE` buttons
    stacked at the bottom.
  - The world panel and side-rail use the same red/brown/stone
    chrome as the adventure map; pins follow the
    ownership-color palette from
    [`../07-adventure-map/spec.md`](../07-adventure-map/spec.md).
- Match [`mockup.html`](./mockup.html) exactly for placement,
  colors, button labels, and panel positions.
- [`mockup.html`](./mockup.html) carries the visible UI only. Logic,
  transitions, and implementation notes live in the sibling markdown
  files.

### Component Tree
- `ViewWorldScreen`
  - `WorldMapCanvas`
  - `FogMaskLegend`
  - `LayerTabs`
  - `ObjectPins`
  - `FocusPlaque`

### State Bindings
| Element | Bound to | Notes |
| --- | --- | --- |
| `spellContext` | `state.ui.viewWorld.spellContext` | View Air, View Earth, or strategic-overview source set when the modal opens; transient local state, never persisted. |
| `visibleWorld` | `selectors.spells.viewWorldVisibleObjects` | Objects revealed under the active spell's rules combined with the caster's scouting and fog state; see [`security-model.md`](../../../security-model.md). |
| `selectedFocus` | `state.ui.viewWorld.selectedObjectId` | Local selected pin; updated by `viewWorld.selectPin`. |
| `activeLayer` | `state.adventure.activeLayer` | Surface / underground enum read from the shared view-layer slice (sibling [`15-underground-toggle`](../15-underground-toggle/spec.md) owns the canonical write surface). Render context only, not gameplay state. |
| `manaPreview` | `selectors.spells.viewWorldManaCost` | Mana cost already paid or still pending for the caller's spell context; sourced from [`ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json). |

### Mechanics Mapping
- Visible world data respects spell type, fog-of-war, scouting
  rules, and the current view layer. Selection can either focus an
  allowed object on the adventure map or return to the caster
  context without moving anything.
- UI previews stay local until a listed `viewWorld.*` token fires;
  none of those tokens enters the deterministic command log
  ([`screen-command-coverage.json`](../../../screen-command-coverage.json)
  `localUiPrefixes`).
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and
  objects resolve through registries and content schemas — never
  hardcoded view logic.

### Animation Contract
- Cloud / fog masks part over legal regions as the spell's reveal
  radius expands; ownership pins on legal tiles twinkle (`pulse`);
  the selected pin holds a glowing focus ring; on `viewWorld.focusSelected`
  the modal closes with a camera zoom from the world view down to
  the adventure-map target.
- Animation consumes the local view-state writes; it never decides
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
- Screen slug `view-world`; system group `adventure`; curation
  marker `curated-pass-3`.
- Build runtime components from this package contract — never from
  third-party captures or external product pixels.
- Resolve presentation through asset IDs and manifests; deterministic
  gameplay records carry stable IDs and scalar values only.
- All four control tokens (`SELECT_VIEW_WORLD_PIN`,
  `SET_VIEW_WORLD_LAYER`, `FOCUS_VIEW_WORLD_TARGET`,
  `CLOSE_VIEW_WORLD`) are **UI-local** by prefix (`SELECT_`, `SET_`,
  `FOCUS_`, `CLOSE_` listed in `localUiPrefixes` of
  [`screen-command-coverage.json`](../../../screen-command-coverage.json));
  none requires a row in `command.schema.json`. See sibling
  [`interactions.md`](./interactions.md) for per-control routing and
  [`data-contracts.md`](./data-contracts.md) for the coverage
  classification.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree (`ViewWorldScreen`, `WorldMapCanvas`,
  `FogMaskLegend`, `LayerTabs`, `ObjectPins`, `FocusPlaque`) and
  button labels (`FOCUS`, `CLOSE`) match the `data-action` attributes
  and visible regions in [`mockup.html`](./mockup.html); animation
  contract mirrors the `pulse`, `modalIn`, `dash`, and reduced-motion
  rules in the mockup `<style>` block. Sibling
  [`architecture.md`](./architecture.md) Visual Composition diagram
  uses the same component names — aligned.
- **Schema: ✔** — `manaPreview` is sourced from
  [`ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json);
  `activeLayer` reads the shared
  [`state.adventure.activeLayer`](../15-underground-toggle/data-contracts.md)
  slice; all four control tokens clear via the `SELECT_` / `SET_` /
  `FOCUS_` / `CLOSE_` UI-local prefix policy in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json),
  so none requires a row in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json).
  Sibling [`data-contracts.md`](./data-contracts.md) carries the full
  schema list.
- **Tasks: ✔** — Owning UI task
  [`phase-2.07-ui-screen-backlog.16-view-world-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/16-view-world-screen.md)
  reads this file first and lists
  [`mvp.03-map-system.10-underground-layer-support`](../../../../../tasks/mvp/03-map-system/10-underground-layer-support.md)
  and
  [`mvp.03-map-system.05-fog-of-war`](../../../../../tasks/mvp/03-map-system/05-fog-of-war.md)
  among its Dependencies; the engine task `10-underground-layer-support`
  reads sibling [`interactions.md`](./interactions.md) first and
  asserts that "Screen 15 and 16 selectors can switch view layer
  without mutating gameplay state".

## ⚠ Issues

- **Layer-toggle token diverges from sibling 15.** This screen
  carries its own `SET_VIEW_WORLD_LAYER` for the layer-tabs control
  while sibling [`15-underground-toggle`](../15-underground-toggle/interactions.md)
  uses the canonical `SET_ADVENTURE_LAYER` for the same
  `state.adventure.activeLayer` write surface. Both clear UI-local
  by prefix, so neither blocks CI, but the duplicate token name is a
  documentation smell. Per
  [`mvp.03-map-system.10-underground-layer-support`](../../../../../tasks/mvp/03-map-system/10-underground-layer-support.md)
  (engine owner of the view-layer slice), the canonical write
  surface should be a single token. Suggested follow-up: unify under
  `SET_ADVENTURE_LAYER` in a future engine task; the audit did not
  rename the token here because that would change the original
  meaning (Hard Prohibition A).
- **Mockup `data-action` coverage is partial.** [`mockup.html`](./mockup.html)
  exposes `data-action` attributes only on the `FOCUS` and `CLOSE`
  buttons. Pin clicks (`viewWorld.selectPin`) and layer-tab clicks
  (`viewWorld.changeLayer`) are described in
  [`interactions.md`](./interactions.md) but lack explicit
  `data-action` hooks in the SVG. Soft cross-reference gap only; the
  owning UI task
  [`phase-2.07-ui-screen-backlog.16-view-world-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/16-view-world-screen.md)
  must wire the missing handlers when implementing the screen. Skill
  did not edit `mockup.html` (reference-only file).
- **Transient UI slices not in `data-inventory.md`.**
  `state.ui.viewWorld.spellContext`, `state.ui.viewWorld.selectedObjectId`,
  and `state.adventure.activeLayer` are render context only and not
  persisted, so the
  [`data-inventory.md`](../../../data-inventory.md) contract ("every
  persisted field is registered") does not require a row. If any of
  these ever becomes session-persistent, the owning UI task above
  must add the row before merge. Skill did not edit
  `data-inventory.md` (Hard Prohibition D).
