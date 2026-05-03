# Screen 69 Architecture: Dev AI Inspector

System: diagnostics
Screen ID: dev-ai-inspector
Visual Archetype: diagnostics-overlay
Curation Status: curated-pass-1

## Purpose
Developer-only AI inspector overlay. Read-only consumer of
`aiDecisionLog` plus the `AI_TRACE_*` worker messages.

## Visual Direction
- Internal developer UI. No franchise art, no curated theme.

## Visual Composition
```mermaid
flowchart TD
  Root["Dev AI Inspector Overlay"]
  P0["AiTurnHeader"]
  Root --> P0
  P1["ProjectedViewPanel"]
  Root --> P1
  P2["WantsListPanel"]
  Root --> P2
  P3["ScoredActionsPanel"]
  Root --> P3
  P4["ChosenCommandPanel"]
  Root --> P4
  P5["ReasoningPanel"]
  Root --> P5
  P6["ReplayControlsBar"]
  Root --> P6
```

## Build-Flag Gate
```mermaid
flowchart LR
  B0["Bundle build"] --> B1
  B1{"import.meta.env.DEV?"} -- yes --> B2["dynamic import: DevAiInspectorOverlay"]
  B1 -- no --> B3{"URL contains ?dev_ai_inspector=1?"}
  B3 -- yes --> B2
  B3 -- no --> B4["screen tree-shaken"]
  B2 --> B5["mount under z-layer 9002 portal"]
  B4 --> B6["no overlay in PROD bundle"]
```

## Subscription Cadence
```mermaid
flowchart LR
  AiWorker["AI worker MOVE_RESULT"] --> Log["aiDecisionLog ring buffer"]
  Log --> Entry["state.ai.inspector.currentEntry"]
  Entry --> Selectors["overlay selectors"]
  ReplayBtn["RE-RUN TRACE"] --> TraceReq["AI_TRACE_REQUEST → worker"]
  TraceReq --> TraceRes["AI_TRACE_RESULT → state.ai.inspector.lastReplay"]
  TraceRes --> Selectors
```

## Outgoing Transitions
- None. The overlay does not navigate. Hiding it returns input
  to the underlying layer.

## State Inputs
- currentEntry -> state.ai.inspector.currentEntry
- bufferIndex -> state.ai.inspector.bufferIndex
- replayInFlight -> state.ai.inspector.replayInFlight
- lastReplay -> state.ai.inspector.lastReplay
- overlayVisible -> state.ai.inspector.overlayVisible

## Data Sources
```mermaid
flowchart LR
  Worker["src/ai/bots/ai-worker.ts"] -- AI_TRACE_RESULT --> Client["src/ai/bots/ai-client.ts"]
  Client -- AiDecisionLogEntry --> RingBuf["src/engine/ai/aiDecisionLog.ts"]
  RingBuf --> Selector["state.ai.inspector.* selectors"]
  Selector --> UI["src/ui/dev/AiInspector.tsx"]
```

## Implementation Contract
- Screen is dynamically imported only when
  `import.meta.env.DEV === true` or when
  `?dev_ai_inspector=1` is present on the URL.
- Overlay reads diagnostics state; it never mutates gameplay
  state, never dispatches gameplay commands.
- Z-layer 9002; non-input-blocking outside its panel; one above
  `dev-profiler` (9001) so all three diagnostic overlays
  (`debug-overlay` 9000, `dev-profiler` 9001, `dev-ai-inspector`
  9002) can stack.
- Localization keys live under `ui.dev-ai-inspector.*`.
- Owning task:
  [`tasks/mvp/10-heuristic-ai/08-ai-inspector-dev-screen.md`](../../../../../tasks/mvp/10-heuristic-ai/08-ai-inspector-dev-screen.md).
- Source of every contract clause referenced by the overlay:
  [`docs/architecture/ai-contract.md`](../../../ai-contract.md).
