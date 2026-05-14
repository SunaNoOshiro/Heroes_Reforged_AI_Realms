# Screen 69: Dev AI Inspector

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Developer-only AI inspector overlay. Visualizes a single AI turn
end-to-end: the projected `AdventureView` (the input the worker
saw), the `Want[]` priority list, each `ScoredAction` with its
`reasoning`, the chosen `Command`, and a button that re-runs the
worker against the same `(view, rngSeed)` to reproduce the result.

Presentation-only consumer of the `AI_TRACE_*` worker messages
([`ai-contract.md` § 3 Worker Protocol](../../../ai-contract.md#3-worker-protocol))
and the `aiDecisionLog` ring buffer
([`ai-contract.md` § 7 Decision Log](../../../ai-contract.md#7-decision-log)).
Toggled with `Ctrl+Shift+A`. Gated behind `import.meta.env.DEV` per
[`ui-technology-choice.md` § Build Flags](../../../ui-technology-choice.md#build-flags);
production bundles tree-shake the screen unless `?dev_ai_inspector=1`
is present in the URL (QA / alpha-tester escape hatch).

This screen is the in-app counterpart to the bench harness owned by
[`tasks/mvp/10-heuristic-ai/11-ai-bench-harness.md`](../../../../../tasks/mvp/10-heuristic-ai/11-ai-bench-harness.md):
the bench captures aggregate win-rate trends; the inspector localizes
a single turn's decision pipeline.

### Visual Direction
- Internal developer UI. No franchise art, no curated theme; uses a
  dark-amber-on-charcoal panel system distinct from `dev-profiler`
  (also dark-amber but vertically tiled) and `debug-overlay`
  (dark-blue), so up to three diagnostic overlays stay visually
  separable when stacked.

### Visual Contract
- Curation status: `curated-pass-1`.
- Z-Layer: `9002` per
  [`ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract)
  — one above `dev-profiler` (`9001`) so the inspector sits on top
  when both are open.
- Non-input-blocking outside the inspector's own panel; clicks
  inside the panel do not propagate.
- Toggleable via hotkey (`Ctrl+Shift+A`).
- `mockup.html` contains visible UI only. Behaviour and timing live
  in `interactions.md`.

### Component Tree
- `DevAiInspectorOverlay`
  - `AiTurnHeader`
  - `ProjectedViewPanel`
  - `WantsListPanel`
  - `ScoredActionsPanel`
  - `ChosenCommandPanel`
  - `ReasoningPanel`
  - `ReplayControlsBar`

### State Bindings
| Element            | Bound To                                          | Notes                                                                                                |
| ------------------ | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `turnHeader`       | `state.ai.inspector.currentEntry`                 | `AiDecisionLogEntry` currently being inspected (turn, playerId, difficulty).                          |
| `viewSnapshotHash` | `state.ai.inspector.currentEntry.view`            | xxh64 hash of the projected view; the full view is fetched on demand via `AI_TRACE_REQUEST`.          |
| `wants`            | `state.ai.inspector.currentEntry.wants`           | `Want[]` from the wants engine, ordered by score.                                                     |
| `scored`           | `state.ai.inspector.currentEntry.scored`          | `ScoredAction[]` from the tactical evaluator.                                                         |
| `chosenCommand`    | `state.ai.inspector.currentEntry.chosen`          | The `Command` the AI emitted.                                                                          |
| `reasoning`        | `state.ai.inspector.currentEntry.reasoning`       | Free-text reasoning from the chosen scorer branch.                                                    |
| `ringBufferIndex`  | `state.ai.inspector.bufferIndex`                  | Index into the ring buffer (newest = `0`; size `N = 64`).                                              |
| `replayInFlight`   | `state.ai.inspector.replayInFlight`               | `true` while an `AI_TRACE_REQUEST` is pending.                                                         |
| `lastReplay`       | `state.ai.inspector.lastReplay`                   | Last `AI_TRACE_RESULT` payload; drives the warn-mismatch banner.                                       |
| `overlayVisible`   | `state.ai.inspector.overlayVisible`               | Toggled by `Ctrl+Shift+A` or by the PROD URL escape hatch.                                             |

### Mechanics Mapping
- The overlay reads diagnostic state only. It never dispatches
  gameplay or replay commands.
- Re-running `AI_TRACE_REQUEST` against the same `(view, rngSeed)`
  is deterministic and produces identical `wants`, `scored`, and
  `command` per
  [`ai-contract.md` § 7 Decision Log](../../../ai-contract.md#7-decision-log).
- The trace request is **not** part of the canonical command log;
  the replay hash is unchanged whether the inspector was used or not.

### Animation Contract
- No animations. Reduced-motion preserves all readouts as static
  text.

### Acceptance Criteria
- Mockup contains every panel listed in the Component Tree.
- Every state binding above is under the `state.ai.inspector.*`
  slice.
- Interactions document the toggle hotkey (`Ctrl+Shift+A`), the
  `import.meta.env.DEV` build-flag gate, the `?dev_ai_inspector=1`
  URL-parameter escape hatch, and the PREV / NEXT / RE-RUN / EXPORT
  control behaviour.
- The overlay does not appear in production builds without the URL
  parameter.
- The overlay does not block input on layers below it (outside its
  own panel rect).
- Overlay's own per-frame cost is **< 0.2 ms** at the Reference tier
  when idle (no replay in flight), verified by the bench harness
  with the overlay on vs off.

### AI Implementation Notes
- Screen slug: `dev-ai-inspector`; system group: `diagnostics`;
  curation marker: `curated-pass-1`.
- Owning task:
  [`tasks/mvp/10-heuristic-ai/08-ai-inspector-dev-screen.md`](../../../../../tasks/mvp/10-heuristic-ai/08-ai-inspector-dev-screen.md).
- All readouts are state selectors; do not call into
  `src/engine/ai/*` directly from the overlay. The
  `AI_TRACE_REQUEST` round-trip is mediated by the worker client.
- Build runtime components from this package contract; do not add
  panels not listed in the Component Tree.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree, state bindings, and visual contract are consistent with `architecture.md` (State Inputs), `data-contracts.md` (Runtime State Selectors), `interactions.md` (Actions), and `mockup.html` (`data-component` tags + `data-i18n` keys); `overlayVisible` and `lastReplay`, previously missing here, are now present so all four files enumerate the same slice.
- **Schema: ⚠** — `state.ai.inspector.*` is intentionally in-memory; `data-inventory.md` has no explicit row pinning the slice (see sibling `data-contracts.md` § Issues — aligned).
- **Tasks: ✔** — Owning task `mvp.10-heuristic-ai.08-ai-inspector-dev-screen` cites this folder in Read First; the bench-harness companion `mvp.10-heuristic-ai.11-ai-bench-harness` is referenced above and exists.

## ⚠ Issues

_None unique to this file._ See sibling `data-contracts.md` for the worker-envelope drift and the `data-inventory.md` row recommendation, sibling `interactions.md` for the `Hotkey` column + hotkey-default-record gaps, and sibling `architecture.md` for the Z-Stack Contract table extension recommendation.
