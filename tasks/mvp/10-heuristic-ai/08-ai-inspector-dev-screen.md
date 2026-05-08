# AI Inspector — Dev-Only Screen

Module: [Heuristic AI (M2)](../10-heuristic-ai.md)

Description:
Dev-only UI surface that visualizes a single AI turn end-to-end:
the projected view, the `Want[]` priority list, each
`ScoredAction` with its `reasoning`, the chosen `Command`, and a
step button that re-runs the worker against the same
`(view, rngSeed)` to reproduce. Hidden behind the same dev gate
as the performance plan's profiler overlay.

QA uses this surface to triage "AI did the wrong thing" reports
without local re-runs and to audit difficulty quality gates
(Knight ≥ 80 % vs random; Lord ≥ 60 % vs Grand Master).

Read First:
- [`docs/architecture/ai-contract.md`](../../../docs/architecture/ai-contract.md) § 7 Decision Log
- [`docs/architecture/wiki/screens/69-dev-ai-inspector/`](../../../docs/architecture/wiki/screens/69-dev-ai-inspector/)
- [`docs/architecture/ui-technology-choice.md`](../../../docs/architecture/ui-technology-choice.md) § Build Flags

Inputs:
- `AI_TRACE_REQUEST` / `AI_TRACE_RESULT` worker messages (this
  task adds them additively to the worker; see Owned Paths shared)
- `aiDecisionLog` ring buffer from
  [`09-ai-decision-log-channel.md`](./09-ai-decision-log-channel.md)
- The 5-file screen package
  `docs/architecture/wiki/screens/69-dev-ai-inspector/`

Outputs:
- `src/ui/dev/AiInspector.tsx` — React component for the overlay
- `src/ui/dev/AiInspector.styles.ts` — scoped styles (dark-amber
  panel system, distinct from `dev-profiler` to allow co-display)
- Worker message kinds (additive on `ai-worker.ts`):
  - `{ type: "AI_TRACE_REQUEST", requestId, view, difficulty, rngSeed }`
  - `{ type: "AI_TRACE_RESULT", requestId, view, wants, scored, command, reasoning }`
- Hotkey wiring: `Ctrl+Shift+A` toggles the overlay (registered
  through the hotkey registry; non-blocking on input layers
  below).

Owned Paths:
- `docs/architecture/wiki/screens/69-dev-ai-inspector/`
- `src/ui/dev/AiInspector.tsx`
- `src/ui/dev/AiInspector.styles.ts`

Owned Paths (shared):
- `src/ai/bots/ai-worker.ts` — additively register
  `AI_TRACE_REQUEST` / `AI_TRACE_RESULT` handlers without
  rewriting `COMPUTE_MOVE`. Primary owner is
  [`06-run-ai-in-web-worker.md`](./06-run-ai-in-web-worker.md).
- `docs/architecture/wiki/screens/index.json` — additively add
  the `69-dev-ai-inspector` entry to the existing `diagnostics`
  group.

Dependencies:
- mvp.10-heuristic-ai.03-action-scorer-priority-weights-plus-tie-breaking
- mvp.10-heuristic-ai.04-tactical-evaluator-combat-move-scoring
- mvp.10-heuristic-ai.06-run-ai-in-web-worker
- mvp.10-heuristic-ai.09-ai-decision-log-channel

Acceptance Criteria:
- Overlay is gated behind `import.meta.env.DEV`. Production
  bundles tree-shake the screen unless `?dev_ai_inspector=1` is
  present in the URL (QA / alpha-tester escape hatch).
- Overlay does not appear in production builds without the URL
  parameter.
- Overlay does not block input on layers below it.
- Re-running `AI_TRACE_REQUEST` against the same
  `(view, rngSeed)` returns identical `wants`, `scored`, and
  `command` — the trace is deterministic for the input.
- Calling `AI_TRACE_REQUEST` mid-game does NOT append entries to
  the canonical command log; replay hash is unchanged whether
  the inspector was opened during the run or not (CI test).
- The screen package's 5 standard files (`mockup.html`,
  `spec.md`, `interactions.md`, `data-contracts.md`,
  `architecture.md`) at
  [`docs/architecture/wiki/screens/69-dev-ai-inspector/`](../../../docs/architecture/wiki/screens/69-dev-ai-inspector/)
  exist and pass `npm run validate` (links + cross-refs +
  screen-package lint).
- `index.json` registers `69-dev-ai-inspector` under the existing
  `diagnostics` group (alongside `66-debug-overlay`,
  `67-animation-debug-overlay`, `68-dev-profiler`).
- The wiki regenerates without errors:
  `npm run generate:wiki`.
- Shared-path edits to `src/ai/bots/ai-worker.ts` and
  `docs/architecture/wiki/screens/index.json` are **additive**:
  the new `AI_TRACE_REQUEST` / `AI_TRACE_RESULT` handlers and the
  new `index.json` entry land without rewriting the
  `COMPUTE_MOVE` worker semantics or other groups in
  `index.json`. The primary contract for the worker entrypoint is
  **owned by**
  [`06-run-ai-in-web-worker.md`](./06-run-ai-in-web-worker.md);
  the primary contract for `index.json` group ordering is
  **owned by** the existing screen-package authoring system. This
  task **must not** rewrite either.

Verify:
- npm run validate
- npm run generate:wiki
- npm test

Estimated Time:
- 6 hours
