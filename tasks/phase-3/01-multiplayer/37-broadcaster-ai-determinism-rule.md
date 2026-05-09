# Broadcaster AI Determinism Rule (Wall-Clock Budgets)

Module: [Multiplayer (M5)](../01-multiplayer.md)

Description:
Pin the structural rule that keeps deterministic replay safe under
wall-clock-driven AI fallbacks. Closes CF-3 (Pin the AI
broadcaster rule for wall-clock budgets).

The doctrine — that wall-clock budgets are permitted only in the
broadcaster-elected AI worker, that non-broadcaster peers MUST NOT
re-run AI search, that single-player and friendly-MP-bot paths
route through the same broadcaster gate, and that the rule is
enforced via the `botRngStreamId` model — lives in
[`docs/architecture/ai-contract.md` § 6 (AI Determinism Under
Wall-Clock Budgets)](../../../docs/architecture/ai-contract.md#ai-determinism-under-wall-clock-budgets).
This task owns enforcement of that rule once the M5 multiplayer
runtime begins.

Read First:
- [`docs/architecture/ai-contract.md`](../../../docs/architecture/ai-contract.md)
  § 4 Per-Turn Budget Table, § 6 Parallelism +
  AI Determinism Under Wall-Clock Budgets
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
  § AI Compute Budget
- [`tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md`](./07-host-migration-heartbeat-election.md)
  § CF-3

Inputs:
- Broadcaster election state from
  [`07-host-migration-heartbeat-election.md`](./07-host-migration-heartbeat-election.md).
- `botRngStreamId` model § Bot RNG Sub-Streams.
- AI worker boundary from
  [`tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md`](../../mvp/10-heuristic-ai/06-run-ai-in-web-worker.md).

Outputs:
- Enforcement at the dispatcher: a non-broadcaster peer's
  `requestAIMove` short-circuits to "consume from log" instead of
  spawning a worker search.
- Cross-link in
  [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
  § AI Compute Budget pointing at ai-contract § 6.
- Tests asserting:
  - non-broadcaster peer never calls into the AI worker boundary,
  - single-player path runs AI search exactly once and logs the
    chosen `Command`,
  - replay reads the logged `Command` without re-running search.

Owned Paths:
- (no source paths today — pre-runtime; this task carries doctrine
  + enforcement responsibility for the rule and acquires concrete
  paths once `src/net/webrtc/` lands.)

Owned Paths (shared):
- `docs/architecture/ai-contract.md` — primary owner is the AI
  module index; this task contributes the § 6 normative section
  pinned by CF-3 and must not rewrite earlier semantics.
- `docs/architecture/determinism.md` — primary owner is the engine
  determinism module; this task adds the one-line cross-reference
  to ai-contract § 6 and must not rewrite earlier rules.

Dependencies:
- phase-3.01-multiplayer.07-host-migration-heartbeat-election

Acceptance Criteria:
- `ai-contract.md` § 6 carries the normative
  "AI Determinism Under Wall-Clock Budgets" section listing the
  four rules § CF-3.
- `determinism.md` § AI Compute Budget references the new
  section.
- `npm run validate:links` passes.
- Once the multiplayer runtime begins, any code path that lets a
  non-broadcaster peer run an AI search is rejected at review and
  by the test added by this task.

Owned Paths (shared) acceptance:
- The AI contract doc is **owned by** the AI module index. This
  task is **additive**: the § 6 "AI Determinism Under Wall-Clock
  Budgets" subsection is appended; this task must not rewrite the
  earlier § 6 Parallelism semantics.
- The determinism doc is **owned by** the engine determinism
  module. This task is **additive**: a one-line cross-reference
  to ai-contract § 6 is appended; this task must not rewrite the
  earlier rules.

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
