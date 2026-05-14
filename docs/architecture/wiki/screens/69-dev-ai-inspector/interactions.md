# Screen 69: Dev AI Inspector
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Developer-only AI inspector overlay. Read-only consumer of the
`aiDecisionLog` ring buffer plus the `AI_TRACE_*` worker messages.
Lets a developer step through recent AI turns and reproduce a chosen
turn against the same `(view, rngSeed)`.

### Actions
| UI Element                            | Action ID                          | Type      | Next Screen     | Command / Event                                                                       | Data Updated                                                                                                              | Animation / Audio |
| ------------------------------------- | ---------------------------------- | --------- | --------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Toggle visibility (`Ctrl+Shift+A`)    | `devAiInspector.toggleVisibility`  | local-ui  | Current screen  | none                                                                                  | `state.ai.inspector.overlayVisible := !state.ai.inspector.overlayVisible`                                                  | None.             |
| PREV (newer entry)                    | `devAiInspector.prev`              | local-ui  | Current screen  | none                                                                                  | `state.ai.inspector.bufferIndex` decrements (clamped at `0`)                                                               | None.             |
| NEXT (older entry)                    | `devAiInspector.next`              | local-ui  | Current screen  | none                                                                                  | `state.ai.inspector.bufferIndex` increments (clamped at `N-1`, where `N = 64`)                                             | None.             |
| RE-RUN TRACE                          | `devAiInspector.replay`            | local-ui  | Current screen  | posts `AI_TRACE_REQUEST` to AI worker                                                  | `state.ai.inspector.replayInFlight` flips `true → false`; on result, `state.ai.inspector.lastReplay` updates               | None.             |
| EXPORT JSON                           | `devAiInspector.export`            | local-ui  | Current screen  | writes the current `AiDecisionLogEntry` through the `Engine.config.aiDecisionLogPath` sink | none                                                                                                                      | None.             |

The toggle action is symmetric: pressing the hotkey while the overlay
is visible sets `state.ai.inspector.overlayVisible = false`.

### State Changes
- `state.ai.inspector.overlayVisible` toggles via the hotkey or the
  PROD URL escape hatch (`?dev_ai_inspector=1`).
- `state.ai.inspector.currentEntry` is selected from the ring buffer
  at `state.ai.inspector.bufferIndex`. PREV / NEXT walk the buffer
  (size `N = 64` per [`09-ai-decision-log-channel.md`](../../../../../tasks/mvp/10-heuristic-ai/09-ai-decision-log-channel.md));
  new turns push to index `0`.
- `state.ai.inspector.replayInFlight` is `true` between sending
  `AI_TRACE_REQUEST` and receiving `AI_TRACE_RESULT`.
- `state.ai.inspector.lastReplay` is set when a trace returns. If
  the replayed `wants` / `scored` / `command` differ from the
  recorded entry, the inspector renders the warn-mismatch banner —
  this is a determinism bug.

### Navigation Outcomes
- The overlay does not navigate. Hiding it returns input control to
  the layer below without a route change.

### Disabled And Error Cases
- In production builds without `?dev_ai_inspector=1`, the screen is
  not rendered at all and the hotkey is unbound.
- When `Engine.config.aiDecisionLog === false`, the ring buffer is
  empty: panels render `—` and PREV / NEXT / RE-RUN are disabled
  with a help row pointing at the runtime flag.
- RE-RUN requires the worker in the `idle` lifecycle state. While a
  real `COMPUTE_MOVE` is in flight, RE-RUN is disabled to avoid
  contention with gameplay-critical compute.
- A trace mismatch renders the warn-mismatch banner and captures
  the divergence for QA; it does not interrupt gameplay.

### Error Formatter
Errors are produced by `formatUserError(err, locale)` declared in
[`error-formatter.md`](../../../error-formatter.md); never construct
error toast text inline.

### Error Surfaces

| Action                  | Error code            | Surface | Localization key                       | Notes                                                                                                       |
| ----------------------- | --------------------- | ------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| RE-RUN TRACE            | `AI_PROVIDER_TIMEOUT` | inline  | `error.ai.provider-timeout.body`       | Disable the RE-RUN button with tooltip; do not auto-retry.                                                  |
| RE-RUN TRACE            | `AI_WORKER_BUSY`      | inline  | `error.ai.worker-busy.body`            | RE-RUN stays disabled while a real `COMPUTE_MOVE` is in flight; tooltip explains the wait.                  |
| Trace replay divergence | `UI_TRACE_DIVERGENCE` | inline  | `error.ui.trace-divergence.body`       | Renders the warn-mismatch banner; never blocks gameplay.                                                    |

### AI Implementation Notes
- This file owns behaviour and timing.
- Hotkey registration goes through the central hotkey registry in
  [`ui-hotkeys.md`](../../../ui-hotkeys.md); registration is cleaned
  up on unmount to avoid the leak class caught by Scenario D in
  [`tasks/mvp/00-perf/03-memory-regression-gate.md`](../../../../../tasks/mvp/00-perf/03-memory-regression-gate.md).
- `AI_TRACE_REQUEST` is a debugging aid and does NOT append entries
  to the canonical command log per
  [`ai-contract.md` § 7 Decision Log](../../../ai-contract.md#7-decision-log).

---

## 🔍 Sync Check

- **UI: ✔** — Action IDs and state paths match `state.ai.inspector.*` slices declared in `spec.md` and `architecture.md`; mockup buttons (`PREV`, `NEXT`, `RE-RUN TRACE`, `EXPORT JSON`) map 1:1 to the rows above.
- **Schema: ⚠** — Error-formatter localization keys above use the `error.*` namespace; [`error-formatter.md` § 2](../../../error-formatter.md) names the closed `errors.*` namespace as the canonical key set (per `localization.schema.json#errors.*`). Same wording is used by sibling diagnostics packages, so this is a cross-screen drift, not unique here.
- **Tasks: ✔** — Owning task `mvp.10-heuristic-ai.08-ai-inspector-dev-screen` references this file; the memory-leak scenario cited above is owned by `mvp.00-perf.03-memory-regression-gate`.

## ⚠ Issues

- **`Hotkey` column missing from the Actions table.** [`ui-hotkeys.md`](../../../ui-hotkeys.md) and [`wiki/README.md`](../../README.md) mandate a `Hotkey` column on every `interactions.md` Actions table; the sweep is owned by [`tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md`](../../../../../tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md) (planned). All sibling diagnostics packages (`66-debug-overlay`, `67-animation-debug-overlay`, `68-dev-profiler`) share the same gap; this file does not unilaterally close it because adding a cell referencing an undefined registry entry would fail `validate`.
- **No `dev-ai-inspector` toggle entry in the canonical hotkey default record.** [`hotkey/global-default.hotkey.json`](../../../../../content-schema/examples/records/hotkey/global-default.hotkey.json) does not register `Ctrl+Shift+A` for the inspector. Per the naming convention in [`ui-hotkeys.md`](../../../ui-hotkeys.md), the entry should land as a global binding (the overlay must toggle regardless of active screen when DEV is on). Owned jointly by [`tasks/mvp/07-ui-shell/18-hotkey-registry.md`](../../../../../tasks/mvp/07-ui-shell/18-hotkey-registry.md) and this screen's owning task. Suggested values: `id=global.dev-ai-inspector-toggle`, `defaultBinding=Control+Shift+KeyA`, `scope=global`, `rebindable=false`.
- **`error.*` vs `errors.*` localization namespace.** The error keys above (`error.ai.*`, `error.ui.*`) drift from [`error-formatter.md`](../../../error-formatter.md), which mandates `errors.*` per `localization.schema.json#errors.*`. Cross-screen issue, not exclusive to this package; the canonical fix lives in the error-formatter contract owner.
