# Screen 66: Debug Overlay

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Developer-only diagnostics overlay. Surfaces FPS, frame-time tier,
deterministic state hash, RNG substream tick counters, command-log
tail, replay scrubber, content-pack hashes, and resolver-miss
counter. Gated behind `import.meta.env.DEV` per
[`ui-technology-choice.md` § Build Flags](../../../ui-technology-choice.md#build-flags);
production builds tree-shake the screen.

### Visual Direction
- Internal developer UI. No franchise art, no curated theme; dark-
  blue panel system distinct from gameplay chrome.

### Visual Contract
- Curation status: `curated-pass-1`.
- Z-Layer: 9000 per [`ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
- Non-input-blocking overlay; toggleable via hotkey (`Ctrl+~`).
- Read-only readouts plus replay-scrubber controls.
- `mockup.html` carries visible UI only. Behaviour and timing live
  in `interactions.md`.

### Component Tree
- DebugOverlay
  - FpsCounter
  - StateHashReadout
  - CommandLogTail
  - ReplayScrubber
  - PackContentHashReadout
  - RngStreamCounters

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `fps` | `state.debug.fps` | Sliding-window frame rate; presentation only. |
| `frameTimeTier` | `state.debug.frameTier` | Green / Amber / Orange / Red per [`renderer-technology-choice.md` § Frame-Time Budget & Degradation](../../../renderer-technology-choice.md#frame-time-budget--degradation). |
| `stateHash` | `state.debug.hash` | Latest xxh64 over canonical state. |
| `rngTicks` | `state.debug.rngTicks` | Per-substream tick counters (`world`, `combat`, `ai`, `generation`, `audit`). |
| `commandLogTail` | `state.debug.recentCommands` | Bounded ring buffer (length 20) of reducer-applied commands. |
| `replay` | `state.debug.replay` | `{ tick, total, speed, mode: "live" \| "replay" \| "paused" }`. |
| `contentHashes` | `state.content.hashes` | Content-runtime pack hashes. |
| `missingComponents` | `state.debug.missingComponentCount` | Resolver-miss counter; see [`ui-component-resolver.md`](../../../ui-component-resolver.md). |
| `viewport` | `state.ui.viewport` | DPR, stage size, aspect (from [`ui-renderer-seam.md`](../../../ui-renderer-seam.md)). |

The mockup also renders a `desync probe`, `locale`, and `build`
readout row; those bindings are not yet defined and are tracked in
`## ⚠ Issues`.

### Mechanics Mapping
- The overlay reads diagnostic state only; it never dispatches
  gameplay commands.
- Replay-scrubber actions dispatch presentation-only commands handled
  by the replay driver, never the live engine reducer.
- No save/replay state is owned here.

### Animation Contract
- No animations beyond the replay scrubber fill. Reduced-motion
  preserves all readouts as static text.

### Acceptance Criteria
- Mockup contains every readout listed in the Component Tree.
- Every state binding lives under `state.debug.*`, `state.content.hashes`,
  or `state.ui.viewport`.
- Toggle hotkey, replay-scrubber actions, and the
  `import.meta.env.DEV` build-flag gate are documented in
  `interactions.md`.
- Overlay is absent from production builds.
- Overlay does not block input on layers below it.

### AI Implementation Notes
- Screen slug: `debug-overlay`; system group: `diagnostics`; curation
  marker: `curated-pass-1`.
- Post-MVP screen; owning task is
  [`phase-2.08-meta-systems.08-debug-overlay-screen`](../../../../../tasks/phase-2/08-meta-systems/08-debug-overlay-screen.md).
- All controls dispatch through the command hook with `replay`-
  namespaced presentation-only commands; never mutate gameplay state
  from the overlay.
- Build runtime components from this package contract; do not add
  panels not listed in the Component Tree.

---

## 🔍 Sync Check

- **UI: ⚠** — Component Tree, hotkey, and Z-layer match `mockup.html`, sibling `interactions.md`, and `architecture.md`. Mockup includes three readout rows (`desync probe`, `locale`, `build`) that have no entry under State Bindings.
- **Schema: ✔** — Schemas referenced by `data-contracts.md` (`manifest`, `ui-component-registry`) are registered in [`schema-matrix.md`](../../../schema-matrix.md). No schema fields are claimed in this file.
- **Tasks: ✔** — Owning task [`phase-2.08-meta-systems.08-debug-overlay-screen`](../../../../../tasks/phase-2/08-meta-systems/08-debug-overlay-screen.md) lists this screen package in Read First; status `planned` in [`tasks/task-status.json`](../../../../../tasks/task-status.json).

## ⚠ Issues

- **Unbound mockup readouts.** `mockup.html` renders `desync probe: ok`, `locale: en-US dir ltr`, and `build: dev` rows inside `PackContentHashReadout`, but no state binding exists for them. Per Hard Prohibition B (never invent features), the rewrite did not add bindings; the owning task `phase-2.08-meta-systems.08-debug-overlay-screen` should either drop those rows from the mockup or add bindings (suggested: `desyncProbe → state.debug.desyncProbe`, `locale → state.ui.locale`, `build → import.meta.env.MODE`) before implementation.
