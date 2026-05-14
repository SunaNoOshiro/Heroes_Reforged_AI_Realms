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
| `manifest.schema.json` | Pack identity, dependencies, content hashes; readouts only. | [`content-schema/schemas/manifest.schema.json`](../../../../../content-schema/schemas/manifest.schema.json) |
| `ui-component-registry.schema.json` | Resolves the overlay's own component tree. | [`content-schema/schemas/ui-component-registry.schema.json`](../../../../../content-schema/schemas/ui-component-registry.schema.json) |

Both schemas are registered in
[`schema-matrix.md`](../../../schema-matrix.md).

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
| Command | Type | Effect |
| --- | --- | --- |
| `REPLAY_PAUSE` | presentation-only | Toggle replay-driver pause. |
| `REPLAY_STEP` | presentation-only | Advance replay by one tick. |
| `REPLAY_RESET` | presentation-only | Reset replay to tick 0. |

All three dispatch against the replay driver, never the live engine
reducer; they have no `metadata.nonce` because they do not enter the
deterministic command log. Not yet enumerated in
[`command-schema.md`](../../../command-schema.md) — see `## ⚠ Issues`.

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
- Because the slice is non-persistent it is intentionally absent
  from [`data-inventory.md`](../../../data-inventory.md), per
  CLAUDE.md root contract ("every **persisted** field is registered
  in `data-inventory.md`").

### Validation And Fallback
- Build-flag gate: `import.meta.env.DEV === true`. PROD bundles must
  tree-shake the screen; dynamic imports gate it (see
  [`ui-technology-choice.md` § Build Flags](../../../ui-technology-choice.md#build-flags)).
- Resolver miss for any component listed here surfaces in
  `state.debug.missingComponentCount`; the readout warns.
- [`scripts/validate-screen-component-coverage.mjs`](../../../../../scripts/validate-screen-component-coverage.mjs)
  is the build-time guard against missing registry entries.

---

## 🔍 Sync Check

- **UI: ✔** — Selectors and localization keys match sibling `spec.md` § State Bindings and the `data-i18n` attributes in `mockup.html`.
- **Schema: ✔** — `manifest` and `ui-component-registry` rows exist in [`schema-matrix.md`](../../../schema-matrix.md); no schema enum drift detected.
- **Tasks: ⚠** — Owning task [`phase-2.08-meta-systems.08-debug-overlay-screen`](../../../../../tasks/phase-2/08-meta-systems/08-debug-overlay-screen.md) lists the three replay commands in Acceptance Criteria, but [`command-schema.md`](../../../command-schema.md) has no entries for them.

## ⚠ Issues

- **Replay commands missing from `command-schema.md`.** `REPLAY_PAUSE`, `REPLAY_STEP`, `REPLAY_RESET` are dispatched here but not defined in [`command-schema.md`](../../../command-schema.md). Suggested values: type `local-ui`, presentation-only, no `metadata.nonce`, dispatched against the replay driver. The owning task `phase-2.08-meta-systems.08-debug-overlay-screen` must close the gap before this screen can ship. Skill did not edit `command-schema.md` (Hard Prohibition D — never edit cross-checked files). See sibling `interactions.md` § ⚠ Issues — aligned.
