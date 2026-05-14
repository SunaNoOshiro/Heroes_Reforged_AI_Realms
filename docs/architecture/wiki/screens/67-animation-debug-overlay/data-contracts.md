# Screen 67: Animation Debug Overlay
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `animation.schema.json` | Per-stack timeline data; per-sequence cue list. | [`content-schema/schemas/animation.schema.json`](../../../../../content-schema/schemas/animation.schema.json) |
| `vfx.schema.json` | VFX phase readouts in the inspector and cue list. | [`content-schema/schemas/vfx.schema.json`](../../../../../content-schema/schemas/vfx.schema.json) |
| `ui-component-registry.schema.json` | Resolves the overlay's own component tree. | [`content-schema/schemas/ui-component-registry.schema.json`](../../../../../content-schema/schemas/ui-component-registry.schema.json) |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `animOverlayVisible` | `state.dev.animOverlayVisible` | Hotkey-toggled visibility. |
| `paused` | `state.dev.animPaused` | Renderer pause flag. |
| `eventLogIndex` | `state.dev.eventLogIndex` | Renderer's event-log cursor; safe to mutate. |
| `eventLogTotal` | `selectors.dev.eventLogLength` | Total events available; backs the `N / total` readout. |
| `timelineSpeed` | `state.dev.timelineSpeed` | Per-debug speed multiplier. |
| `activeTimelines` | `selectors.dev.activeTimelines` | Derived from the null-renderer event-log consumer. |
| `recentEvents` | `state.debug.recentCommands` | Reused from screen 66. |
| `degradationTier` | `state.debug.frameTier` | Reused from screen 66. |
| `missingRefs` | `state.dev.missingAnimRefs` | Counter of unresolved sound/vfx/status refs. |

### Commands And Events
- `PAUSE_PRESENTATION` (presentation-only) — toggle renderer pause.
- `STEP_PRESENTATION_FORWARD` (presentation-only) — advance event-log
  cursor by 1.
- `STEP_PRESENTATION_BACK` (presentation-only) — retreat event-log
  cursor by 1.
- `SCRUB_PRESENTATION_TO_INDEX { index }` (presentation-only) — seek
  event-log cursor to `index`.

All four are dispatched against the renderer driver, never the live
engine reducer. They have **no `metadata.nonce`** because they do
not enter the deterministic command log and are intentionally absent
from [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json);
they are tracked under
[`screen-command-coverage.json`](../../../screen-command-coverage.json)
(presentation tokens) and validated by `npm run validate:commands`.

### Config Keys
- `config.dev.enableDebugOverlay` — boolean, default `false`. Gates
  this screen and screen 66. See
  [`56-options/data-contracts.md`](../56-options/data-contracts.md).
- `config.dev.placeholderSprites` — boolean, default `false`. When
  `true`, the renderer surfaces magenta-checker placeholders that the
  per-stack inspector flags in red.
- `config.ui.animationSpeed` × `state.dev.timelineSpeed` combine
  multiplicatively per
  [`animation-contract.md` § Two-Clock Model](../../../animation-contract.md#two-clock-model).

### Localization Keys
- `ui.animation-debug-overlay.title`
- `ui.animation-debug-overlay.controls.*`
- `ui.animation-debug-overlay.inspector.*`
- `ui.animation-debug-overlay.events.*`
- `ui.animation-debug-overlay.cues.*`
- `ui.animation-debug-overlay.degradation.*`

### Asset, Sound, And VFX IDs
None. The overlay uses CSS-only styling.

### Save And Replay Fields
- The overlay writes nothing to save state. `state.dev.*` is
  non-replayed and non-hashed.
- The renderer's event-log cursor is presentation only; switching
  cursor position does not affect deterministic gameplay state.

### Validation And Fallback
- Build-flag gate: `import.meta.env.DEV === true`. Production bundles
  must tree-shake the screen; dynamic imports gate it.
- Runtime safeguard: `config.dev.enableDebugOverlay === true`.
- Resolver miss for any component listed here surfaces in
  `state.debug.missingComponentCount`, and the readout warns.
- Missing animation refs fall back per
  [`pack-contract.md` § Asset Fallback And Placeholders](../../../pack-contract.md#asset-fallback-and-placeholders);
  the overlay surfaces the count via `missingRefs`.

## 🔍 Sync Check
- **UI: ✔** — every selector backs a row or panel in `mockup.html`;
  the four localization-key prefixes cover the four `data-i18n`
  attributes (`controls.title`, `inspector.title`, `events.title`,
  `cues.title`, `degradation.title`).
- **Schema: ✔** — all three referenced schemas exist; the four
  presentation tokens are correctly listed in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  (lines 58–61) and intentionally absent from
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json).
- **Tasks: ✔** — owning task
  [`tasks/phase-2/08-meta-systems/09-animation-debug-overlay-screen.md`](../../../../../tasks/phase-2/08-meta-systems/09-animation-debug-overlay-screen.md)
  Acceptance Criteria explicitly require all four scrubbing commands
  to dispatch against the renderer driver (not the engine reducer)
  and `state.dev.*` to remain non-replayed and non-hashed.
- **Siblings: ✔** — `spec.md` Component Tree, `interactions.md`
  Actions, and `architecture.md` State Inputs aligned in this
  revision.

## ⚠ Issues
- **Two new bindings introduced in this revision:**
  `state.dev.animOverlayVisible` and `selectors.dev.eventLogLength`.
  Required for cross-sibling consistency with `interactions.md`
  (which already used `animOverlayVisible`) and `mockup.html` (which
  renders the `N / total` event-log ratio). The owning task must
  declare both in [`state-shape.md`](../../../state-shape.md) before
  the screen mounts at runtime.
- **`config.dev.placeholderSprites` is referenced only here.** It
  steers a renderer behaviour (magenta-checker fallback) and an
  inspector behaviour (red flag). Surfaced rather than removed
  because the cross-cut is real; the renderer-side owner should
  pin it in
  [`renderer-technology-choice.md`](../../../renderer-technology-choice.md)
  before this overlay's red-flag branch is implemented.
