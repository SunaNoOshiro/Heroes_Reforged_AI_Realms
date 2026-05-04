# Screen 69: Dev AI Inspector
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Developer-only AI inspector overlay. Read-only consumer of
`aiDecisionLog` plus the `AI_TRACE_*` worker messages. Lets a
developer step through recent AI turns and reproduce a chosen
turn against the same `(view, rngSeed)`.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Toggle visibility (Ctrl+Shift+A) | `devAiInspector.toggleVisibility` | local-ui | Current screen | none | `state.ai.inspector.overlayVisible` toggles | None. |
| PREV (newer entry) | `devAiInspector.prev` | local-ui | Current screen | none | `state.ai.inspector.bufferIndex` decrements (clamped at 0) | None. |
| NEXT (older entry) | `devAiInspector.next` | local-ui | Current screen | none | `state.ai.inspector.bufferIndex` increments (clamped at N-1) | None. |
| RE-RUN TRACE | `devAiInspector.replay` | local-ui | Current screen | sends `AI_TRACE_REQUEST` to worker | `state.ai.inspector.replayInFlight` toggles; on result, `state.ai.inspector.lastReplay` updates | None. |
| EXPORT JSON | `devAiInspector.export` | local-ui | Current screen | writes the current `AiDecisionLogEntry` to disk via the `aiDecisionLogPath` sink | none | None. |

### State Changes
- `state.ai.inspector.overlayVisible` toggles via the hotkey or
  the URL escape hatch in PROD.
- `state.ai.inspector.currentEntry` is selected from the
  ring buffer at `state.ai.inspector.bufferIndex`. PREV/NEXT walk
  the buffer; new turns push entries to index 0.
- `state.ai.inspector.replayInFlight` is true between sending
  `AI_TRACE_REQUEST` and receiving `AI_TRACE_RESULT`.
- `state.ai.inspector.lastReplay` is set when a trace returns;
  if the replayed trace differs from the recorded entry, the
  inspector renders a warn banner — this is a determinism bug.

### Navigation Outcomes
- The overlay does not navigate. Hiding it returns input control
  to the layer below without a route change.

### Disabled And Error Cases
- In production builds without `?dev_ai_inspector=1`, the screen
  is not rendered at all and the hotkey is unbound.
- When `Engine.config.aiDecisionLog === false`, the ring buffer
  is empty: panels render "—" and PREV/NEXT/RE-RUN are disabled
  with a help row pointing at the runtime flag.
- RE-RUN requires the worker to be in the `idle` lifecycle
  state. While a real `COMPUTE_MOVE` is in flight, RE-RUN is
  disabled to avoid contention with gameplay-critical compute.
- A trace mismatch (replayed `wants` / `scored` / `command`
  differs from the recorded entry) renders the warn banner and
  records the divergence for QA capture; it does not interrupt
  gameplay.

### AI Implementation Notes
- This file owns behaviour and timing.
- Hotkey registration is done through the central hotkey
  registry in
  [`ui-hotkeys.md`](../../../ui-hotkeys.md); registration is
  cleaned up on unmount to avoid the leak class caught by
  Scenario D in
  [`tasks/mvp/00-perf/03-memory-regression-gate.md`](../../../../../tasks/mvp/00-perf/03-memory-regression-gate.md).
- The RE-RUN button is a debugging aid; calling
  `AI_TRACE_REQUEST` mid-game does NOT append entries to the
  canonical command log per
  [`ai-contract.md` § 7 Decision Log](../../../ai-contract.md#7-decision-log).

## Error surfaces

| Action | Error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| RE-RUN TRACE | AI_PROVIDER_TIMEOUT | inline | error.ai.provider-timeout.body | Disable the RE-RUN button with tooltip; do not auto-retry. |
| RE-RUN TRACE | AI_WORKER_BUSY | inline | error.ai.worker-busy.body | Re-RUN stays disabled while a real COMPUTE_MOVE is in flight; tooltip explains the wait. |
| Trace replay divergence | UI_TRACE_DIVERGENCE | inline | error.ui.trace-divergence.body | Renders the warn banner described above; never blocks gameplay. |
