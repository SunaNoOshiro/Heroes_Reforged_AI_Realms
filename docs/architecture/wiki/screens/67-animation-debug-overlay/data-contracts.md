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
| `animation.schema.json` | Per-stack timeline data, per-sequence cue list. | `content-schema/schemas/animation.schema.json` |
| `vfx.schema.json` | VFX phase readouts in the cue list. | `content-schema/schemas/vfx.schema.json` |
| `ui-component-registry.schema.json` | Resolves the overlay's own component tree. | `content-schema/schemas/ui-component-registry.schema.json` |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `paused` | `state.dev.animPaused` | Toggle state. |
| `eventLogIndex` | `state.dev.eventLogIndex` | Renderer-side cursor; safe to mutate. |
| `timelineSpeed` | `state.dev.timelineSpeed` | Per-debug speed multiplier. |
| `activeTimelines` | `selectors.dev.activeTimelines` | Derived from the null-renderer event-log consumer. |
| `recentEvents` | `state.debug.recentCommands` | Reused from screen 66. |
| `degradationTier` | `state.debug.frameTier` | Reused from screen 66. |
| `missingRefs` | `state.dev.missingAnimRefs` | Counter of unresolved sound/vfx/status refs. |

### Commands And Events
- `PAUSE_PRESENTATION` (presentation-only): toggle renderer pause.
- `STEP_PRESENTATION_FORWARD` (presentation-only): advance event-log
  cursor by 1.
- `STEP_PRESENTATION_BACK` (presentation-only): retreat event-log
  cursor by 1.
- `SCRUB_PRESENTATION_TO_INDEX { index }` (presentation-only): seek
  event-log cursor to `index`.
- All four are dispatched against the renderer driver, never the
  live engine reducer; they have no `metadata.nonce` because they do
  not enter the deterministic command log.

### Config Keys
- `config.dev.enableDebugOverlay` — boolean, default `false`. Gates
  this screen and screen 66. See
  [`56-options/data-contracts.md`](../56-options/data-contracts.md).
- `config.dev.placeholderSprites` — boolean, default `false`. When
  `true`, the renderer surfaces magenta-checker placeholders that the
  per-stack inspector flags in red.
- `config.ui.animationSpeed` and per-debug `state.dev.timelineSpeed`
  combine multiplicatively per
  [`animation-contract.md` § Two-Clock Model](../../../animation-contract.md#two-clock-model).

### Localization Keys
- `ui.animation-debug-overlay.title`
- `ui.animation-debug-overlay.controls.*`
- `ui.animation-debug-overlay.inspector.*`
- `ui.animation-debug-overlay.cues.*`

### Asset, Sound, And VFX IDs
- None. The overlay uses CSS-only styling.

### Save And Replay Fields
- The overlay writes nothing to save state. `state.dev.*` is
  non-replayed and non-hashed.
- The renderer's event-log cursor is presentation only; switching
  cursor position does not affect deterministic gameplay state.

### Validation And Fallback
- Build-flag gate: `import.meta.env.DEV === true`. PROD bundles must
  tree-shake the screen; dynamic imports gate it.
- Runtime safeguard: `config.dev.enableDebugOverlay === true`.
- Resolver miss for any component listed here surfaces in
  `state.debug.missingComponentCount` and the readout warns.
- Missing animation refs fall back per
  [`pack-contract.md` § Asset Fallback And Placeholders](../../../pack-contract.md#asset-fallback-and-placeholders);
  the overlay surfaces the count.
