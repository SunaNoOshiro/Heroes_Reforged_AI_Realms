# Implementation Report — 10 AI System

Source plan: [`10-ai-system-plan.md`](./10-ai-system-plan.md)

This report records the changes that landed against the plan. The
plan was followed exactly: no decisions were redesigned. Two
points required explicit assumption notes (see § 3).

`npm run validate` passes end-to-end (links, contracts,
cross-refs, commands, tasks, arch, UI components, animation
budgets, enums). The wiki regenerates without errors with 69 UI
screen packages and 48 architecture docs.

---

## 1. Updated files

### Architecture docs

- **[docs/architecture/state-flow.md](../../architecture/state-flow.md)**
  Added an "AI Side Channels" section noting (1) `aiDecisionLog`
  is not part of the canonical command log, (2) AI players act
  sequentially in turn order, (3) the worker boundary consumes
  the projected `AdventureView`. Added a Related-docs link to
  `ai-contract.md`.

- **[docs/architecture/command-schema.md](../../architecture/command-schema.md)**
  Added an "AI-Emitted Commands" subsection clarifying that AI
  workers emit the same closed `Command` enum as humans, consume
  a projected per-player view, but the dispatcher always
  validates against full state. Added a Related-files link to
  `ai-contract.md`.

- **[docs/architecture/schema-matrix.md](../../architecture/schema-matrix.md)**
  Added an `AiProfile` row pointing at the new schema and the
  canonical `default.ai-profile.json` example.

- **[docs/architecture/effect-registry.md](../../architecture/effect-registry.md)**
  Added an "AI-Profile Want Weights" section documenting that
  the reserved `weights` map is consumed by the heuristic AI's
  wants engine and is presentation-of-priority, not effects.

- **[docs/architecture/README.md](../../architecture/README.md)**
  Added `ai-contract.md` to the file list and to the suggested
  reading order.

- **[CLAUDE.md](../../../CLAUDE.md)**
  Added `ai-contract.md` to the "Read first" list (item 23) and
  renumbered later items.

### Tasks

- **[tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md](../../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md)**
  Worker input switches to projected `AdventureView`. Added
  `AbortSignal` per § 5 of the contract. Replaced the single 2 s
  hard timeout with the per-difficulty budget table from § 4.
  Added the "no legal action" deterministic fallback. Added the
  `AI_TRACE_*` and `AI_ERROR` message kinds as additive shared
  paths owned by the inspector and decision-log tasks.
  `Owned Paths (shared)` semantics filled in.

- **[tasks/mvp/10-heuristic-ai/05-difficulty-levels-pawn-and-knight.md](../../../tasks/mvp/10-heuristic-ai/05-difficulty-levels-pawn-and-knight.md)**
  Cited the per-difficulty timeout-table rows for Pawn and
  Knight. Cited `randomBot` (provider id `"random"`) as the
  baseline for the 80 % quality gate. Cited the bench harness
  as the verifier of the gate. Updated the bench command to the
  `--a / --b` provider-id form.

- **[tasks/mvp/10-heuristic-ai/02-wants-engine-strategic-action-prioritization.md](../../../tasks/mvp/10-heuristic-ai/02-wants-engine-strategic-action-prioritization.md)**
  Read First links to `ai-contract.md` § 1. Inputs now read the
  projected `AdventureView` so `SCOUT_FOG` operates over
  fog-stripped tiles by construction.

- **[tasks/mvp/10-heuristic-ai/03-action-scorer-priority-weights-plus-tie-breaking.md](../../../tasks/mvp/10-heuristic-ai/03-action-scorer-priority-weights-plus-tie-breaking.md)**
  Read First links to `ai-contract.md` § 4 and § 7.

- **[tasks/mvp/10-heuristic-ai/04-tactical-evaluator-combat-move-scoring.md](../../../tasks/mvp/10-heuristic-ai/04-tactical-evaluator-combat-move-scoring.md)**
  Read First links to `ai-contract.md` § 7 (the `reasoning`
  field is the consumer of this task's output).

- **[tasks/mvp/10-heuristic-ai.md](../../../tasks/mvp/10-heuristic-ai.md)**
  Module index updated with tasks 07–11. Total estimate raised
  from ~24 h to ~52 h. Exit criteria reference the contract and
  the bench harness.

- **[tasks/mvp/02-content-schemas.md](../../../tasks/mvp/02-content-schemas.md)**
  Added task 27 to the module index.

- **[tasks/mvp/05-adventure-map/02-turn-structure.md](../../../tasks/mvp/05-adventure-map/02-turn-structure.md)**
  Read First links to `ai-contract.md` § 6. Added an acceptance
  criterion that AI players act sequentially per the parallelism
  rule.

- **[tasks/mvp/05-adventure-map/08-7-day-playable-smoke-test.md](../../../tasks/mvp/05-adventure-map/08-7-day-playable-smoke-test.md)**
  Replaced ad-hoc scripted commands with `scriptedBot` (provider
  id `"scripted"`). Added dependency on the BotProvider task.

- **[tasks/mvp/09-tactical-combat/10-replay-smoke-test-20-round-battle.md](../../../tasks/mvp/09-tactical-combat/10-replay-smoke-test-20-round-battle.md)**
  Same scriptedBot edit. Added dependency on the BotProvider
  task.

- **[tasks/phase-2/02-strategic-ai.md](../../../tasks/phase-2/02-strategic-ai.md)**
  Module-level note that M3 extends `ai-contract.md`
  additively. Cited the Grand Master row of the budget table.

- **[tasks/phase-2/02-strategic-ai/05-grand-master-difficulty-plus-headless-evaluation.md](../../../tasks/phase-2/02-strategic-ai/05-grand-master-difficulty-plus-headless-evaluation.md)**
  Read First links to `ai-contract.md` § 4 (Grand Master row)
  and § 8.

- **[tasks/phase-3/03-mcts-ai.md](../../../tasks/phase-3/03-mcts-ai.md)**
  Module-level note that M7 extends `ai-contract.md`
  additively. Cited the Lord and Immortal rows. Cited the bench
  harness as the continuous verifier of the 60 % gate.

- **[tasks/phase-3/03-mcts-ai/05-difficulty-levels-lord-and-immortal.md](../../../tasks/phase-3/03-mcts-ai/05-difficulty-levels-lord-and-immortal.md)**
  Read First links to `ai-contract.md` § 4 (Lord and Immortal
  rows).

- **[tasks/phase-3/03-mcts-ai/06-performance-benchmark-plus-headless-eval.md](../../../tasks/phase-3/03-mcts-ai/06-performance-benchmark-plus-headless-eval.md)**
  Read First links to `ai-contract.md` § 8. Acceptance criteria
  reference the continuous bench harness using `BotProvider`.

### Schemas

- **[content-schema/schemas/faction.schema.json](../../../content-schema/schemas/faction.schema.json)**
  Added optional `aiProfileId` field. Existing fixtures continue
  to validate.

- **[content-schema/schemas/hero.schema.json](../../../content-schema/schemas/hero.schema.json)**
  Added optional `aiProfileId` field. Existing fixtures continue
  to validate.

### Coverage / registry data

- **[docs/architecture/task-command-token-coverage.json](../../architecture/task-command-token-coverage.json)**
  Registered the new worker message kinds `AI_ERROR`,
  `AI_TRACE_REQUEST`, `AI_TRACE_RESULT` as event-only tokens
  (not gameplay commands).

- **[docs/architecture/screen-command-coverage.json](../../architecture/screen-command-coverage.json)**
  Added `AI_TRACE_REQUEST`, `AI_TRACE_RESULT`, `COMPUTE_MOVE` to
  `localUiTokens` so they pass screen-coverage validation when
  referenced from the inspector screen package.

- **[docs/architecture/wiki/screens/index.json](../../architecture/wiki/screens/index.json)**
  Registered `69-dev-ai-inspector` in the existing
  `diagnostics` group.

- **[content-schema/examples/ui-component-registry.example.json](../../../content-schema/examples/ui-component-registry.example.json)**
  Registered the 8 component IDs from the new screen package
  (`AiTurnHeader`, `ChosenCommandPanel`,
  `DevAiInspectorOverlay`, `ProjectedViewPanel`,
  `ReasoningPanel`, `ReplayControlsBar`, `ScoredActionsPanel`,
  `WantsListPanel`).

- **[scripts/check-repo-contracts.mjs](../../../scripts/check-repo-contracts.mjs)**
  Added a single-line suffix mapping (`*.ai-profile.json` →
  `ai-profile.schema.json`) so the canonical example is matched
  to its schema.

---

## 2. New files

### Architecture

- **[docs/architecture/ai-contract.md](../../architecture/ai-contract.md)**
  Single source of truth for the gameplay-AI runtime. Nine
  sections: Input View, Output, Worker Protocol, Per-Turn Budget
  Table, Cancellation, Parallelism, Decision Log, BotProvider,
  Cheats. All other AI files now cite this doc rather than
  re-stating contract clauses.

### Tasks

- **[tasks/mvp/10-heuristic-ai/07-ai-player-view-projection.md](../../../tasks/mvp/10-heuristic-ai/07-ai-player-view-projection.md)** — `aiPlayerView(state, playerId, cheats)`; default cheats `{}`.
- **[tasks/mvp/10-heuristic-ai/08-ai-inspector-dev-screen.md](../../../tasks/mvp/10-heuristic-ai/08-ai-inspector-dev-screen.md)** — owns the dev screen package and the UI consumer of `AI_TRACE_RESULT`.
- **[tasks/mvp/10-heuristic-ai/09-ai-decision-log-channel.md](../../../tasks/mvp/10-heuristic-ai/09-ai-decision-log-channel.md)** — opt-in `aiDecisionLog` ring buffer; off by default; not in the replay hash.
- **[tasks/mvp/10-heuristic-ai/10-bot-provider-interface.md](../../../tasks/mvp/10-heuristic-ai/10-bot-provider-interface.md)** — `BotProvider` + `heuristicBot` / `randomBot` / `scriptedBot`.
- **[tasks/mvp/10-heuristic-ai/11-ai-bench-harness.md](../../../tasks/mvp/10-heuristic-ai/11-ai-bench-harness.md)** — CI win-rate harness over the BotProvider interface.
- **[tasks/mvp/02-content-schemas/27-reserve-ai-profile-schema.md](../../../tasks/mvp/02-content-schemas/27-reserve-ai-profile-schema.md)** — empty-but-valid `ai-profile.schema.json` + optional `aiProfileId` on faction + hero.

### Screen package

- **[docs/architecture/wiki/screens/69-dev-ai-inspector/](../../architecture/wiki/screens/69-dev-ai-inspector/)** — 5-file dev-only screen package (`mockup.html`, `spec.md`, `interactions.md`, `data-contracts.md`, `architecture.md`).

### Schemas / examples

- **[content-schema/schemas/ai-profile.schema.json](../../../content-schema/schemas/ai-profile.schema.json)** — empty-but-valid; one optional `weights` map.
- **[content-schema/examples/records/ai-profiles/default.ai-profile.json](../../../content-schema/examples/records/ai-profiles/default.ai-profile.json)** — canonical example with no weights.

---

## 3. Assumptions

- ⚠️ **Assumption (screen number):** The plan called for screen
  package `61-dev-ai-inspector`, but `61-ai-turn-indicator`
  already exists. I used `69-dev-ai-inspector` (next available
  after `68-dev-profiler`). The plan's "new `dev-tools` group"
  is conceptually identical to the existing `diagnostics` group
  (which already houses `66-debug-overlay`,
  `67-animation-debug-overlay`, `68-dev-profiler`); I registered
  the new package under `diagnostics` rather than splitting the
  wiki sidebar. This preserves the plan's intent ("hidden behind
  a dev flag … not part of any user-facing UI group") without
  introducing a parallel group.

- ⚠️ **Assumption (content-schema task ID):** The plan used a
  placeholder `<next-id>`; the next available content-schema
  task ID was `27`, so the file was authored as
  `tasks/mvp/02-content-schemas/27-reserve-ai-profile-schema.md`.

- ⚠️ **Assumption (wall-clock vs deterministic search budget):**
  The pre-existing
  `tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md` text
  said "Wall-clock-driven truncation is forbidden by
  determinism.md." The plan introduces wall-clock per-turn
  budgets (per § 4 of the new contract) that, when the hard
  timeout fires, return a deterministic `Command` (best-found or
  the per-difficulty no-action fallback). I followed the plan
  exactly. The new `ai-contract.md` § 4 documents the
  reconciliation: search-budget determinism still holds when the
  search completes within budget; on hard-timeout fire, the
  resulting `Command` is logged once and replays bit-identically
  from the log without re-running the search. Cross-machine AI
  *timing* is therefore not part of the determinism guarantee;
  the canonical command log is.

- ⚠️ **Assumption (lint coverage data):** Three small data-only
  edits were necessary to keep `npm run validate` green:
  registering the new worker tokens in
  `task-command-token-coverage.json` and
  `screen-command-coverage.json`, adding a one-line file-suffix
  mapping in `scripts/check-repo-contracts.mjs` for the new
  `*.ai-profile.json` example, and registering the screen's 8
  components in `ui-component-registry.example.json`. None of
  these changed runtime behavior.

---

## 4. Blockers

None. All steps in the plan landed. `npm run validate` passes
end-to-end and `npm run generate:wiki` regenerates the
architecture wiki successfully (69 screen packages, 48
architecture docs, 27 general diagrams).
