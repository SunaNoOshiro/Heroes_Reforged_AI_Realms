# Screen 66: Debug Overlay
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `manifest.schema.json` | Pack identity, dependencies, content hashes; readouts only. | `content-schema/schemas/manifest.schema.json` |
| `ui-component-registry.schema.json` | Resolves the overlay's own component tree. | `content-schema/schemas/ui-component-registry.schema.json` |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `fps` | `state.debug.fps` | Sliding-window frame rate. |
| `frameTimeTier` | `state.debug.frameTier` | Renderer tier from frame-time degradation. |
| `stateHash` | `state.debug.hash` | xxh64 over canonical state. |
| `rngTicks` | `state.debug.rngTicks` | Per-substream tick counters. |
| `commandLogTail` | `state.debug.recentCommands` | Bounded ring buffer of last 20 commands. |
| `replay` | `state.debug.replay` | `{ tick, total, speed, mode }`. |
| `contentHashes` | `state.content.hashes` | Pack-resolution hashes. |
| `missingComponents` | `state.debug.missingComponentCount` | Resolver-miss runtime counter. |
| `viewport` | `state.ui.viewport` | DPR / stage / aspect (read-only readout). |

### Commands And Events
- `REPLAY_PAUSE` (presentation-only): toggle replay-driver pause.
- `REPLAY_STEP` (presentation-only): advance replay by one tick.
- `REPLAY_RESET` (presentation-only): reset replay to tick 0.
- All three are dispatched against the replay driver, never the live
  engine reducer; they have no `metadata.nonce` because they do not
  enter the deterministic command log.

### Config Keys
- `config.debug.enabled` — runtime safeguard; the screen ignores it
  in PROD builds (build flag is the canonical guard).
- `config.debug.hotkey` — default `Ctrl+~`.
- `config.debug.opacity` — overlay opacity (presentation only).

### Localization Keys
- `ui.debug-overlay.fps.title`
- `ui.debug-overlay.state-hash.title`
- `ui.debug-overlay.command-log.title`
- `ui.debug-overlay.replay.title`
- `ui.debug-overlay.pack-hash.title`
- `ui.debug-overlay.rng.title`

### Asset, Sound, And VFX IDs
- None. The overlay uses CSS-only styling.

### Save And Replay Fields
- The overlay writes nothing to save state. `state.debug.*` is
  non-replayed and non-hashed.
- Replay-driver state (`state.debug.replay`) is presentation only;
  switching modes does not affect deterministic gameplay state.

### Validation And Fallback
- Build-flag gate: `import.meta.env.DEV === true`. PROD bundles must
  tree-shake the screen; dynamic imports gate it (see
  [`ui-technology-choice.md` § Build Flags](../../../ui-technology-choice.md#build-flags)).
- Resolver miss for any component listed here surfaces in
  `state.debug.missingComponentCount` and the readout warns.
- `scripts/validate-screen-component-coverage.mjs` is the build-time
  guard against missing registry entries.
