# Implementation Plan: 10 — AI System

> Derived from [docs/readiness-audit/10-ai-system.md](../readiness-audit/10-ai-system.md).
> The original audit file is **not** modified. This plan converts the
> documented gaps (❌ UNKNOWN, ⚠ Partial, Missing Logic, Risks) into
> concrete work items grounded in the existing M2 task tree under
> [tasks/mvp/10-heuristic-ai/](../../tasks/mvp/10-heuristic-ai/), the
> M3 strategic-AI task at [tasks/phase-2/02-strategic-ai.md](../../tasks/phase-2/02-strategic-ai.md),
> the M7 MCTS task at [tasks/phase-3/03-mcts-ai.md](../../tasks/phase-3/03-mcts-ai.md),
> and the architecture docs in [docs/architecture/](../architecture/).
>
> Scope: gameplay opponent AI only (heuristic + MCTS). Provider-backed
> content-generation AI is governed separately by
> [docs/readiness-audit/14-ai-generated-content-pipeline.md](../readiness-audit/14-ai-generated-content-pipeline.md)
> and [docs/architecture/ai-integration.md](../architecture/ai-integration.md).

---

## 1. Overview

The deterministic core of the AI system is in good shape:

- AI emits the **same `Command` shapes** as a human player (Q180).
- Decisions are a **pure function of `(state, seed)`** — `Math.random()`
  is forbidden, and the Pawn coin-flip takes a seeded `Rng` (Q181).
- The MCTS upgrade in M7 is heuristic-search, not ML, so cross-hardware
  determinism follows from the existing PCG32 + fixed-point rules (Q189).
- The difficulty ladder (Pawn → Knight → Grand Master → Lord → Immortal)
  is laid out across M2 / M3 / M7 with quantitative quality gates (Q185).
- The resulting `Command` is appended to the canonical command log,
  which is sufficient for bit-identical replay (Q184 — partial).

What is **missing** is the runtime contract surface that an autonomous
implementer needs to wire AI into the worker boundary, the dispatcher,
the UI, and the test harness without making ad-hoc decisions:

- **Cheat policy / per-player view projection** (Q186) — the worker is
  passed raw `AdventureState`, so full-map information leak is the
  default. There is no `aiPlayerView(state, playerId)` projection.
- **Cancellation** (Q191) — no `AbortSignal` or mid-turn discard
  contract; `Worker.terminate()` is the only escape and its UI
  semantics are undefined.
- **Parallelism policy** (Q192) — single-worker contract is documented
  but multi-AI behavior in 4-player skirmishes is not pinned.
- **Per-turn aggregate budget** (Q182) — only per-call budgets exist
  (50 ms threat-map, 5 ms per `evaluateActions`, 2 s worker hard
  timeout); no whole-turn cap aggregating threat-map + wants +
  N tactical evaluations, and no per-difficulty differentiation.
- **Per-difficulty timeout policy** (Q190) — a single 2 s hard timeout
  for all tiers, with no fallback contract for "no legal action found
  yet".
- **AI debugger surface** (Q183, Q184) — `reasoning: string` is
  computed in memory but never surfaced; no pause / step / inspect
  API; `Want[]` and `ScoredAction[]` traces are not logged.
- **Test-bot interface** (Q187) — random AI baseline and scripted
  smoke tests exist as ad-hoc fixtures, but no `BotProvider` swap
  point.
- **Personalities** (Q188) — only difficulty knobs exist; no per-
  faction or per-hero AI profile schema, so all factions play
  identically until added.

**Overall readiness state:** 6/10 (per audit). Closing the items below
lifts this to 9/10 — the threshold for autonomous implementation of
M2 (heuristic AI) and clean handoff to M3 (strategic AI) and M7
(MCTS) without back-filling contracts mid-milestone.

**In scope of this plan:**

- A new canonical doc `docs/architecture/ai-contract.md` as the single
  source of truth for AI input view, output, worker protocol, budgets,
  cancellation, and parallelism.
- New task files under
  [`tasks/mvp/10-heuristic-ai/`](../../tasks/mvp/10-heuristic-ai/) for
  the cheat policy / view projection, `BotProvider` interface, abort
  contract, per-turn budget, and decision log.
- A new dev-only screen package `docs/architecture/wiki/screens/61-dev-ai-inspector/`
  for the AI pause / step / inspect surface (mirrors the dev-only
  pattern used by the performance plan's profiling overlay).
- A reserved (empty-but-additive) `content-schema/schemas/ai-profile.schema.json`
  and a placeholder content-schema task so personality data is a
  pure additive extension when M3+ needs it.
- Extensions (not rewrites) to existing M2 tasks via owned-paths
  shared-extension semantics — particularly
  [tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md).

**Explicitly out of scope (deferred):**

- Implementing personality content for any faction. The schema slot
  is reserved; populating it is M3-or-later work tied to
  [tasks/phase-2/02-strategic-ai.md](../../tasks/phase-2/02-strategic-ai.md)
  and [tasks/phase-2/03-second-faction.md](../../tasks/phase-2/03-second-faction.md).
- Multi-worker pre-warming optimizations. Parallelism policy is
  documented; the optimization is opt-in for M7 if profiling demands
  it.
- ML-based opponent AI. `ai-integration.md` already forbids hosted
  models in deterministic gameplay code.

---

## 2. Critical Fixes (Must Do First)

These fixes block M2 from starting cleanly. Each one will otherwise
surface as an ad-hoc decision during heuristic-AI implementation and
require costly retrofits.

### Issue: AI cheat policy is undefined; full-map information leak is the default

**Source:** Q186, Risks "Cheat ambiguity"

**Problem:**
[tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md)
passes raw `AdventureState` across the worker boundary with no
per-player view filter. No architecture doc states whether the AI
sees fog-of-war or gets resource bonuses. The `SCOUT_FOG` want type
in [tasks/mvp/10-heuristic-ai/02-wants-engine-strategic-action-prioritization.md](../../tasks/mvp/10-heuristic-ai/02-wants-engine-strategic-action-prioritization.md)
implies fog exists, but the input contract leaks it anyway.

**Impact:**
- An AI that passes its own quality gate by reading the player's
  hand is unreviewable as a "fair" opponent.
- Multiplayer parity is broken — a desync gate in
  [docs/architecture/state-flow.md](../architecture/state-flow.md)
  cannot detect cheat-by-knowledge because both replicas would still
  agree on the resulting `Command`.
- Difficulty levers in
  [tasks/mvp/10-heuristic-ai/05-difficulty-levels-pawn-and-knight.md](../../tasks/mvp/10-heuristic-ai/05-difficulty-levels-pawn-and-knight.md)
  cannot meaningfully differentiate Pawn from Lord if all tiers see
  the same full state.

**Solution:**
Make "fair AI" the default at the worker entrypoint by introducing a
projection function `aiPlayerView(state, playerId): AdventureState`
that strips fog-hidden tiles, opponent hero positions/inventories,
and any other player-private fields. Higher difficulty cheat tiers
become an explicit, documented opt-in (e.g. `cheats?: { seeFog?:
boolean; resourceBonus?: number }`) — defaulting to `{}` for all
M2/M3 tiers per the existing audit signal.

**Files to Update:**
- [tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md) — change worker input contract from `state: AdventureState` to `view: aiPlayerView(state, playerId)`; add cheats parameter (default `{}`).
- [tasks/mvp/10-heuristic-ai/02-wants-engine-strategic-action-prioritization.md](../../tasks/mvp/10-heuristic-ai/02-wants-engine-strategic-action-prioritization.md) — make `SCOUT_FOG` explicit consumer of the projected view.
- [docs/architecture/command-schema.md](../architecture/command-schema.md) — note that `INITIATE_BATTLE` / `MOVE_HERO` validity is checked against the full state at dispatcher time, not the projected view (so the AI can target what it can legally see).

**New Files:**
- `docs/architecture/ai-contract.md` — canonical AI runtime contract (see Issue: AI runtime contract doc below).
- `tasks/mvp/10-heuristic-ai/07-ai-player-view-projection.md` — implements `aiPlayerView(state, playerId)` and the cheats opt-in.

**Implementation Steps:**
1. Draft the projection contract in `docs/architecture/ai-contract.md`: list which `AdventureState` fields are stripped (visibility map, opponent hero `inventory` / `spellBook` / `path` / unrevealed map objects).
2. Create `tasks/mvp/10-heuristic-ai/07-ai-player-view-projection.md` with `Owned Paths: src/engine/ai/aiPlayerView.ts`, dependency on engine-core and visibility tasks.
3. Edit `06-run-ai-in-web-worker.md` worker contract to call `aiPlayerView(state, playerId, cheats)` before dispatch; record this in `Owned Paths (shared)` so task 07 is not blocked by 06.
4. Add a `cheats: AiCheats` field to the `requestAIMove` signature with default `{}`.
5. Add a smoke test (extending [tasks/mvp/05-adventure-map/08-7-day-playable-smoke-test.md](../../tasks/mvp/05-adventure-map/08-7-day-playable-smoke-test.md)) that fails if the AI worker reads any field not present in the projection.
6. Run `npm run validate:tasks`.

**Dependencies:**
- Visibility / fog-of-war system (already implied by `SCOUT_FOG` want; cite the M2 visibility task ID once produced by `npm run tasks:next:mvp`).
- Engine-core `AdventureState` type definition.

**Complexity:** M

---

### Issue: AI runtime contract doc does not exist

**Source:** Improvements "Add a one-page `docs/architecture/ai-contract.md`", indirect across Q182, Q186, Q190, Q191, Q192.

**Problem:**
The per-call AI contracts are scattered across 6 task files plus
`state-flow.md` and `command-schema.md`. There is no single doc that
an autonomous implementer can read to learn: input view, output
shape, worker protocol, per-turn budget, cancellation, and
parallelism. Several gaps in this audit (Q186, Q191, Q192) exist
specifically because there is no canonical doc to add them to.

**Impact:**
- M2 implementers must reverse-engineer the contract from 6 task
  files and an audit summary.
- M3 (strategic AI) and M7 (MCTS) cannot extend the contract without
  rewriting prose in each task file.
- Multiplayer audit ([docs/readiness-audit/07-multiplayer.md](../readiness-audit/07-multiplayer.md))
  cannot reference a stable surface for AI-side turn-clock behavior.

**Solution:**
Create `docs/architecture/ai-contract.md` as the single source of
truth. All AI task files should link into sections of this doc
rather than re-stating the contract. Existing task files keep their
implementation notes but cite `ai-contract.md` for the contract
itself.

**Files to Update:**
- [docs/architecture/README.md](../architecture/README.md) — add link.
- [CLAUDE.md](../../CLAUDE.md) — add to "Read first" list.
- [tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md) — link to `ai-contract.md` for the worker protocol, retain task-specific implementation notes.
- [tasks/mvp/10-heuristic-ai/03-action-scorer-priority-weights-plus-tie-breaking.md](../../tasks/mvp/10-heuristic-ai/03-action-scorer-priority-weights-plus-tie-breaking.md) — link for determinism + budget rules.
- [tasks/phase-2/02-strategic-ai.md](../../tasks/phase-2/02-strategic-ai.md) — link as the doc M3 must extend.
- [tasks/phase-3/03-mcts-ai.md](../../tasks/phase-3/03-mcts-ai.md) — link as the doc M7 must extend.

**New Files:**
- `docs/architecture/ai-contract.md` with the following sections:
  1. **Input view** — `aiPlayerView(state, playerId, cheats)` projection rule.
  2. **Output** — `Command` (closed enum, no AI-only kinds; reference `command-schema.md`).
  3. **Worker protocol** — request / response message shapes, lifecycle (spawn / terminate), error path.
  4. **Per-turn budget table** — per-difficulty wall-clock + step budgets (see Issue: Per-turn aggregate budget).
  5. **Cancellation** — `AbortSignal` semantics (see Issue: Cancellation contract).
  6. **Parallelism** — sequential-by-turn policy (see Issue: Parallelism policy).
  7. **Decision log** — opt-in `aiDecisionLog` channel that is **not** part of the canonical command log (see Issue: AI decision log).
  8. **BotProvider** — pluggable interface for tests (see Issue: BotProvider interface).
  9. **Cheats** — explicit opt-in flags; default-empty for M2/M3.

**Implementation Steps:**
1. Author `ai-contract.md` skeleton with all 9 section headers and stubs that point to the relevant task files.
2. Move per-section content from `06-run-ai-in-web-worker.md` and the audit summary into the doc.
3. Update each AI task file to cite the doc.
4. Run `npm run validate` (links + cross-refs).

**Dependencies:**
- None for the doc skeleton; sections fill in as the issues below are resolved.

**Complexity:** S (skeleton) → M (fully populated)

---

### Issue: Worker has no cancellation contract

**Source:** Q191, Risks "Mid-turn cancel"

**Problem:**
[tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md)
documents only "terminate when the game ends or user navigates
away". There is no `AbortSignal`, cancellation token, or "discard
pending result" message. `Worker.terminate()` works but its UI
semantics are undefined: who replays the turn, what state does the
UI show, does the in-flight `Promise` resolve / reject / hang?

**Impact:**
- A misclick on "End Turn" leaves the UI in an unrecoverable wait.
- The save / load flow ([docs/readiness-audit/08-persistence-save-system.md](../readiness-audit/08-persistence-save-system.md))
  cannot synchronously snapshot during AI compute without a cancel.
- Multiplayer turn clock ([docs/readiness-audit/07-multiplayer.md](../readiness-audit/07-multiplayer.md))
  expiry on the AI side has no defined cleanup path.

**Solution:**
Introduce `AbortSignal` parameter on `requestAIMove`:

```
requestAIMove(view, difficulty, signal?: AbortSignal): Promise<Command>
```

When the signal aborts, the worker:

1. Finishes the current `evaluateActions` call (≤ 5 ms by existing
   budget).
2. Returns the best-found `Command` if any, OR a deterministic
   fallback `END_HERO_TURN` / `END_DAY` if no legal action has
   scored.
3. The returned `Promise` resolves (not rejects) with that fallback,
   so the dispatcher always sees a valid `Command`.

Termination of the worker process is reserved for "game ends /
navigates away" only.

**Files to Update:**
- [tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md) — add `signal` parameter to the contract; spell out the 3-step abort handler.
- `docs/architecture/ai-contract.md` (new) — section 5 "Cancellation".

**New Files:**
- None.

**Implementation Steps:**
1. Add `signal?: AbortSignal` to the `requestAIMove` signature in `06-run-ai-in-web-worker.md`.
2. Document the abort-handler 3-step rule above in the task `Implementation Notes` and in `ai-contract.md` §5.
3. Add a unit test directive to the task: "abort during `buildThreatMap` returns `END_HERO_TURN` deterministically".
4. Run `npm run validate:tasks`.

**Dependencies:**
- Issue: AI runtime contract doc (skeleton exists).

**Complexity:** S

---

### Issue: Per-turn aggregate budget is undefined

**Source:** Q182, Q190, Risks "Worker timeout fallback"

**Problem:**
Per-call budgets exist (50 ms threat-map, 5 ms per `evaluateActions`,
2 s worker hard timeout) but no whole-turn aggregate cap. The 2 s
hard timeout has a known edge case: if the timeout fires before any
legal action has been scored, "best-found" is undefined.

**Impact:**
- A Lord/Immortal MCTS turn could legitimately need more than 2 s,
  but raising the timeout uniformly hurts Pawn UX.
- The "no legal action yet" edge case can hang the dispatcher (no
  `Command` to apply), violating the state-flow contract.
- Performance-audit ([docs/implementation-plans/09-performance-plan.md](./09-performance-plan.md))
  cannot allocate AI's slice of the per-frame / per-turn budget.

**Solution:**
Define a per-difficulty turn-budget table in `ai-contract.md`:

| Difficulty | Per-turn wall-clock budget | Hard timeout | No-action fallback |
|---|---|---|---|
| Pawn | 200 ms | 500 ms | `END_HERO_TURN` |
| Knight | 500 ms | 1 s | `END_HERO_TURN` |
| Grand Master | 1 s | 2 s | `END_HERO_TURN` |
| Lord | 2 s | 4 s | best-of-MCTS-rollouts so far, else `END_HERO_TURN` |
| Immortal | 3 s | 6 s | best-of-MCTS-rollouts so far, else `END_HERO_TURN` |

The "Hard timeout" column overrides the current single 2 s hard
timeout. The "No-action fallback" guarantees a valid `Command`
always returns. All values pre-set in
[tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md);
M3 and M7 may tune via task extensions but cannot drop below "always
return a legal `Command`".

**Files to Update:**
- [tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md) — replace the single 2 s hard timeout with the per-difficulty table; add the "no legal action" fallback.
- [tasks/mvp/10-heuristic-ai/05-difficulty-levels-pawn-and-knight.md](../../tasks/mvp/10-heuristic-ai/05-difficulty-levels-pawn-and-knight.md) — cite the table for Pawn/Knight rows.
- [tasks/phase-2/02-strategic-ai.md](../../tasks/phase-2/02-strategic-ai.md) — cite for Grand Master row.
- [tasks/phase-3/03-mcts-ai.md](../../tasks/phase-3/03-mcts-ai.md) — cite for Lord / Immortal rows.
- `docs/architecture/ai-contract.md` (new) — section 4 "Per-turn budget table".

**New Files:**
- None.

**Implementation Steps:**
1. Author the table in `ai-contract.md`.
2. Update `06-run-ai-in-web-worker.md` to call the budget enforcer once per turn (not per call).
3. Add a deterministic fallback `END_HERO_TURN` / `END_DAY` selector when no legal action has scored.
4. Add a smoke test directive: "Lord with `state` containing 0 ready heroes returns `END_DAY` within 6 s".
5. Run `npm run validate:tasks`.

**Dependencies:**
- Issue: AI runtime contract doc (skeleton).

**Complexity:** M

---

## 3. System Improvements

### UI / Screens

#### Issue: AI debugger surface (pause / step / inspect) is not defined

**Source:** Q183

**Problem:**
There is no documented way to break inside the AI search, dump
intermediate `Want[]` / `ScoredAction[]`, or single-step the
decision pipeline. The `reasoning: string` exists in memory
([tasks/mvp/10-heuristic-ai/04-tactical-evaluator-combat-move-scoring.md:21](../../tasks/mvp/10-heuristic-ai/04-tactical-evaluator-combat-move-scoring.md#L21))
but has no UI consumer.

**Impact:**
- QA cannot audit why the AI picked a given action when balancing
  difficulty quality gates (Knight ≥ 80 % vs random; Lord ≥ 60 % vs
  Grand Master).
- Implementers cannot triage "AI did the wrong thing" reports
  without re-running the worker locally and adding `console.log`s.
- The `aiDecisionLog` channel proposed below has no UI surface
  without this.

**Solution:**
Add a dev-only screen package
`docs/architecture/wiki/screens/61-dev-ai-inspector/` that visualizes
a single AI turn: the projected view, the `Want[]` priority list,
each `ScoredAction` with its `reasoning`, the chosen `Command`, and
a step-button that re-runs the worker against the same `(view,
seed)` to reproduce. The screen is hidden behind a dev flag (same
gating as the performance plan's profiler overlay) and is not part
of any user-facing UI group.

The worker contract gains one extra opt-in message:

```
{ type: "AI_TRACE_REQUEST", state, difficulty, seed }
=> { type: "AI_TRACE_RESULT", view, wants, scored, command, reasoning }
```

This message is **separate** from `requestAIMove`; it is non-
deterministic to call from production code (it can be invoked
mid-game from the inspector) but the trace it returns is itself
deterministic for the input `(view, seed)`.

**Files to Update:**
- [tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md) — add `AI_TRACE_REQUEST` / `AI_TRACE_RESULT` message kinds (additive).
- `docs/architecture/ai-contract.md` (new) — section 7 "Decision log" + reference to the inspector screen package.
- [docs/architecture/wiki/screens/index.json](../architecture/wiki/screens/index.json) — register the new dev-only package in a `dev-tools` group.

**New Files:**
- `docs/architecture/wiki/screens/61-dev-ai-inspector/mockup.html`
- `docs/architecture/wiki/screens/61-dev-ai-inspector/spec.md`
- `docs/architecture/wiki/screens/61-dev-ai-inspector/interactions.md`
- `docs/architecture/wiki/screens/61-dev-ai-inspector/data-contracts.md`
- `docs/architecture/wiki/screens/61-dev-ai-inspector/architecture.md`
- `tasks/mvp/10-heuristic-ai/08-ai-inspector-dev-screen.md` — owns the screen package and the `AI_TRACE_*` message kinds.

**Implementation Steps:**
1. Add the new screen package files (5 standard files per CLAUDE.md guide).
2. Update `index.json` to include a new `dev-tools` group so the wiki sidebar renders it separately from gameplay screens.
3. Author task `08-ai-inspector-dev-screen.md` with `Owned Paths: docs/architecture/wiki/screens/61-dev-ai-inspector/, src/ui/dev/AiInspector.tsx` and `Dependencies` on tasks 03, 04, 06.
4. Update `06-run-ai-in-web-worker.md` `Owned Paths (shared)` to allow task 08 to add the `AI_TRACE_*` message handlers without rewriting the worker entry.
5. Run `npm run generate:wiki` and `npm run validate`.

**Dependencies:**
- Issue: AI runtime contract doc.
- Existing M2 tasks 03, 04, 06.

**Complexity:** L

---

### Data Contracts

#### Issue: AI decisions internal trace is not logged

**Source:** Q184, Improvements "Promote `reasoning: string`"

**Problem:**
Only the resulting `Command` is appended to the canonical command
log. The `Want[]` priority, per-action scores, the chosen
`reasoning`, and which heuristic branch fired are discarded. This
is sufficient for replay (the engine re-derives state from the
`Command` log) but insufficient for debugging the **AI itself**
across replay viewers, QA reports, or balance audits.

**Impact:**
- Adding the `reasoning` to the canonical log would change the
  replay hash and break determinism for unrelated replays.
- Without an opt-in side channel, QA must re-run the AI from a
  save state to recover a `reasoning`, which is slow and may not
  reproduce if any RNG sub-stream has been touched.

**Solution:**
Add an **opt-in, out-of-band** `aiDecisionLog` channel that is **not**
part of the canonical command log:

```
type AiDecisionLogEntry = {
  turn: number,
  playerId: PlayerId,
  difficulty: Difficulty,
  view: AdventureViewSnapshotHash,
  wants: Want[],
  scored: ScoredAction[],
  chosen: Command,
  reasoning: string
}
```

The channel is enabled by a runtime flag (default off). When off,
no allocation occurs. When on, entries are written to an in-memory
ring buffer of last N turns and optionally serialized to disk for
QA. The replay hash and saves remain untouched.

**Files to Update:**
- [docs/architecture/state-flow.md](../architecture/state-flow.md) — explicitly note that `aiDecisionLog` is **not** part of the command log.
- [tasks/mvp/10-heuristic-ai/04-tactical-evaluator-combat-move-scoring.md](../../tasks/mvp/10-heuristic-ai/04-tactical-evaluator-combat-move-scoring.md) — `reasoning` is plumbed into the log.
- [tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md) — worker emits `aiDecisionLog` entries when flag is on.
- `docs/architecture/ai-contract.md` (new) — section 7 "Decision log".

**New Files:**
- `tasks/mvp/10-heuristic-ai/09-ai-decision-log-channel.md` — owns `src/engine/ai/aiDecisionLog.ts` and the runtime flag.

**Implementation Steps:**
1. Define the `AiDecisionLogEntry` type in the new task.
2. Add a runtime flag (`Engine.config.aiDecisionLog: boolean`).
3. Plumb `reasoning` from `evaluateActions` into the channel.
4. Add a CI test that asserts replay hash is identical with the flag on vs off.
5. Run `npm run validate:tasks`.

**Dependencies:**
- Issue: AI runtime contract doc.

**Complexity:** M

---

#### Issue: No `BotProvider` swap interface for tests

**Source:** Q187, Improvements "Define a `BotProvider` interface"

**Problem:**
The "random AI" baseline opponent for the Knight quality gate
([tasks/mvp/10-heuristic-ai/05-difficulty-levels-pawn-and-knight.md:55-57](../../tasks/mvp/10-heuristic-ai/05-difficulty-levels-pawn-and-knight.md#L55-L57))
and the scripted commands for the 7-day adventure smoke test
([tasks/mvp/05-adventure-map/08-7-day-playable-smoke-test.md](../../tasks/mvp/05-adventure-map/08-7-day-playable-smoke-test.md))
and 20-round battle smoke test
([tasks/mvp/09-tactical-combat/10-replay-smoke-test-20-round-battle.md](../../tasks/mvp/09-tactical-combat/10-replay-smoke-test-20-round-battle.md))
exist as ad-hoc fixtures. There is no `BotProvider` swap point.

**Impact:**
- Each test reinvents how to plug in a non-default opponent.
- M3 / M7 cannot run regression tests against M2 heuristic by name.
- Replays cannot be re-run with a recorded-bot to verify
  bit-identicality without rewriting harness code.

**Solution:**
Define a single interface:

```
type BotProvider = {
  id: string,
  requestAIMove(view: AdventureView, difficulty: Difficulty, signal?: AbortSignal): Promise<Command>
}
```

with three first-party implementations:

- `heuristicBot` — the M2 default; wraps the worker.
- `randomBot(seed)` — picks a uniformly-random legal action; the
  baseline opponent for the Knight quality gate.
- `scriptedBot(commands)` — replays a fixed `Command[]` for smoke
  tests.

Tests pick a provider by ID; production wires `heuristicBot` only.
M7 adds `mctsBot` as a fourth implementation without changing call
sites.

**Files to Update:**
- [tasks/mvp/10-heuristic-ai/05-difficulty-levels-pawn-and-knight.md](../../tasks/mvp/10-heuristic-ai/05-difficulty-levels-pawn-and-knight.md) — Knight quality gate cites `randomBot` by ID.
- [tasks/mvp/05-adventure-map/08-7-day-playable-smoke-test.md](../../tasks/mvp/05-adventure-map/08-7-day-playable-smoke-test.md) — scripted opponent uses `scriptedBot`.
- [tasks/mvp/09-tactical-combat/10-replay-smoke-test-20-round-battle.md](../../tasks/mvp/09-tactical-combat/10-replay-smoke-test-20-round-battle.md) — same.
- `docs/architecture/ai-contract.md` (new) — section 8 "BotProvider".

**New Files:**
- `tasks/mvp/10-heuristic-ai/10-bot-provider-interface.md` — owns `src/engine/ai/BotProvider.ts`, `src/engine/ai/randomBot.ts`, `src/engine/ai/scriptedBot.ts`.

**Implementation Steps:**
1. Author task 10 with the interface and 3 implementations.
2. Update the 3 task files cited above to call the interface by `id`.
3. Run `npm run validate:tasks`.

**Dependencies:**
- Issue: AI runtime contract doc.
- Issue: Worker has no cancellation contract (for the `signal` param).

**Complexity:** M

---

### Schemas

#### Issue: No `ai-profile.schema.json` for personalities

**Source:** Q188, Improvements "Reserve a stable `ai-profile.schema.json` slot now"

**Problem:**
The MVP defines difficulty levels (behavioral knobs over the same
heuristic) but not personalities (per-faction or per-hero AI
profiles). No schema, no data hook. If personalities are intended,
adding them post-hoc would force a non-additive change to factions
and heroes (per CLAUDE.md "additive-first" rule, this is the kind
of thing to reserve early).

**Impact:**
- All factions play identically, defeating the flavor goals of
  Emberwild and other factions
  ([tasks/phase-2/03-second-faction.md](../../tasks/phase-2/03-second-faction.md)).
- M3 strategic AI ([tasks/phase-2/02-strategic-ai.md](../../tasks/phase-2/02-strategic-ai.md))
  has no place to put faction-specific weights.

**Solution:**
Reserve `content-schema/schemas/ai-profile.schema.json` now as an
empty-but-valid schema with a stable `$id` and a single optional
field (`weights: Record<WantType, number>`). Reference it as an
**optional** field on `faction.schema.json` and `hero.schema.json`.
Do **not** populate any first-party content. M3+ tasks fill it in.

**Files to Update:**
- [content-schema/schemas/faction.schema.json](../../content-schema/schemas/faction.schema.json) — add optional `aiProfileId: ResourceId` field.
- [content-schema/schemas/hero.schema.json](../../content-schema/schemas/hero.schema.json) — add optional `aiProfileId: ResourceId` field.
- [docs/architecture/schema-matrix.md](../architecture/schema-matrix.md) — add row for `ai-profile`.
- [docs/architecture/effect-registry.md](../architecture/effect-registry.md) — note that `Want` weights are the consumer.

**New Files:**
- `content-schema/schemas/ai-profile.schema.json` (empty-but-valid; one optional `weights` field).
- `content-schema/examples/ai-profiles/default.json` (canonical example with no weights = same as no profile).
- `tasks/mvp/02-content-schema/<next-id>-reserve-ai-profile-schema.md` — task that owns the schema slot. Use `npm run tasks:next:mvp` to find the next available ID under the content-schema folder.

**Implementation Steps:**
1. Author the schema with `additionalProperties: false`, `properties: { id, weights? }`.
2. Author the canonical example with `id` only.
3. Add optional `aiProfileId` to faction + hero schemas with no validators yet.
4. Add a row to `schema-matrix.md`.
5. Run `npm run validate` (contracts + cross-refs + task lint).

**Dependencies:**
- Existing content-schema task system.

**Complexity:** S

---

### Architecture

#### Issue: Multi-AI parallelism policy is not stated

**Source:** Q192

**Problem:**
The current contract is a single worker with a single in-flight
`requestAIMove`. Nothing in the docs forbids running multiple AI
workers concurrently for 4-player skirmishes, but nothing enforces
it either. The order in which their command-log entries land is
not defined for parallel completion. Turn structure
([tasks/mvp/05-adventure-map/02-turn-structure.md](../../tasks/mvp/05-adventure-map/02-turn-structure.md))
is sequential anyway, so parallel AI is mostly a moot optimization
in MVP — but it has to be **stated**.

**Impact:**
- Future contributor (or AI agent) implementing 4-player skirmish
  may parallelize AI workers and hit non-determinism in command-log
  ordering.
- M7 multiplayer ([tasks/phase-3/01-multiplayer.md](../../tasks/phase-3/01-multiplayer.md))
  desync gate cannot reference a stable rule.

**Solution:**
Document a one-line policy in `ai-contract.md` §6 "Parallelism":

> AI players act **sequentially in turn order**. Workers may be
> pre-warmed (kept resident across turns) but commands always
> apply to the dispatcher in turn order. Multi-worker parallel
> compute is permitted only as an internal optimization that does
> not affect the order of `Command`s appended to the log.

**Files to Update:**
- `docs/architecture/ai-contract.md` (new) — section 6 "Parallelism".
- [docs/architecture/state-flow.md](../architecture/state-flow.md) — cross-link to ai-contract §6.
- [tasks/mvp/05-adventure-map/02-turn-structure.md](../../tasks/mvp/05-adventure-map/02-turn-structure.md) — note that AI turns slot into the same sequential schedule as human turns.

**New Files:**
- None.

**Implementation Steps:**
1. Author §6 in `ai-contract.md`.
2. Add cross-link in `state-flow.md`.
3. Run `npm run validate`.

**Dependencies:**
- Issue: AI runtime contract doc (skeleton).

**Complexity:** S

---

### Tasks

#### Issue: Difficulty quality gates risk balooning M2 / M7 estimates

**Source:** Q185, Risks "Difficulty quality gate"

**Problem:**
Knight quality gate is "≥ 80 % wins vs random AI over 10 games";
Lord must "beat Grand Master in ≥ 60 % of 50 games". If heuristics
underperform, fixing them will balloon M2/M7 estimates. There is
no early-warning bench harness.

**Impact:**
- A late-M2 quality-gate failure forces re-tuning under deadline
  pressure.
- M7 has no harness to know when MCTS has reached the bar.

**Solution:**
Add a per-milestone bench harness that runs the quality gate
**continuously** (in CI) against the current heuristic, not just
at milestone close. The harness uses `BotProvider` (Issue above) to
plug in `randomBot` / `heuristicBot` / future `mctsBot` and reports
win-rates per commit.

**Files to Update:**
- [tasks/mvp/10-heuristic-ai/05-difficulty-levels-pawn-and-knight.md](../../tasks/mvp/10-heuristic-ai/05-difficulty-levels-pawn-and-knight.md) — cite the bench harness as the verifier of the 80 % gate; do not change the gate value.
- [tasks/phase-3/03-mcts-ai.md](../../tasks/phase-3/03-mcts-ai.md) — same for the 60 % gate.

**New Files:**
- `tasks/mvp/10-heuristic-ai/11-ai-bench-harness.md` — owns `src/engine/ai/bench/` and a CI hook that records win-rates per commit. Depends on `BotProvider`.

**Implementation Steps:**
1. Author task 11 with the harness contract: input = bot pair + N games + seed; output = win-rate + per-game `Command[]`.
2. Hook the harness into CI as a non-blocking metric in M2; promote to blocking when the Knight gate is reached.
3. Run `npm run validate:tasks`.

**Dependencies:**
- Issue: BotProvider interface.

**Complexity:** M

---

## 4. Suggested Task Breakdown

Convert the issues above into trackable work items. IDs are
placeholders — run `npm run tasks:next:mvp` to confirm the next
available ID before authoring each file.

- [ ] **NEW** `docs/architecture/ai-contract.md` skeleton (9 sections, links to existing tasks).
- [ ] **NEW** `tasks/mvp/10-heuristic-ai/07-ai-player-view-projection.md` — implements `aiPlayerView(state, playerId, cheats)` projection; default cheats `{}`.
- [ ] **EDIT** `tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md` — input switches to projected view; add `AbortSignal`; add per-difficulty timeout table; add no-action fallback; add `AI_TRACE_*` message handlers (additive).
- [ ] **NEW** `tasks/mvp/10-heuristic-ai/08-ai-inspector-dev-screen.md` — owns dev screen package 61 + UI consumer of `AI_TRACE_RESULT`.
- [ ] **NEW** `tasks/mvp/10-heuristic-ai/09-ai-decision-log-channel.md` — opt-in `aiDecisionLog` ring buffer; off by default; not in replay hash.
- [ ] **NEW** `tasks/mvp/10-heuristic-ai/10-bot-provider-interface.md` — `BotProvider` + `heuristicBot` / `randomBot` / `scriptedBot`.
- [ ] **NEW** `tasks/mvp/10-heuristic-ai/11-ai-bench-harness.md` — CI win-rate harness using `BotProvider`.
- [ ] **NEW** `tasks/mvp/02-content-schema/<next-id>-reserve-ai-profile-schema.md` — empty-but-valid `ai-profile.schema.json` + optional `aiProfileId` on faction + hero.
- [ ] **NEW** `docs/architecture/wiki/screens/61-dev-ai-inspector/` — 5-file dev-only screen package; register in `index.json` under a new `dev-tools` group.
- [ ] **EDIT** `tasks/mvp/10-heuristic-ai/05-difficulty-levels-pawn-and-knight.md` — cite per-difficulty timeout table; cite `randomBot` by ID; cite bench harness as verifier of 80 % gate.
- [ ] **EDIT** `tasks/phase-2/02-strategic-ai.md` — cite `ai-contract.md`; cite Grand Master row of timeout table.
- [ ] **EDIT** `tasks/phase-3/03-mcts-ai.md` — cite `ai-contract.md`; cite Lord/Immortal rows; cite bench harness as verifier of 60 % gate.
- [ ] **EDIT** `tasks/mvp/05-adventure-map/02-turn-structure.md` — cross-link AI sequential-turn rule.
- [ ] **EDIT** `tasks/mvp/05-adventure-map/08-7-day-playable-smoke-test.md` — replace ad-hoc scripted commands with `scriptedBot`.
- [ ] **EDIT** `tasks/mvp/09-tactical-combat/10-replay-smoke-test-20-round-battle.md` — replace ad-hoc scripted commands with `scriptedBot`.
- [ ] **EDIT** `docs/architecture/state-flow.md` — note that `aiDecisionLog` is not part of the canonical command log; cross-link parallelism rule.
- [ ] **EDIT** `docs/architecture/command-schema.md` — note projected-view consumption + dispatcher full-state validation split.
- [ ] **EDIT** `docs/architecture/schema-matrix.md` — add `ai-profile` row.
- [ ] **EDIT** `docs/architecture/README.md` and `CLAUDE.md` — link to `ai-contract.md`.

---

## 5. Execution Order

Strict ordering — earlier items unblock later ones:

1. **`docs/architecture/ai-contract.md` skeleton** (Issue: AI runtime contract doc). Empty section headers + links into existing tasks. ~30 min.
2. **`07-ai-player-view-projection.md`** (Issue: cheat policy). Locks the worker input contract before any other AI work proceeds.
3. **`06-run-ai-in-web-worker.md` edits** (Issues: cancellation, per-turn budget, view projection consumer). Pulls in 1 + 2.
4. **`10-bot-provider-interface.md`** (Issue: BotProvider). Needed by 5 + 11 and the smoke-test edits.
5. **`05-difficulty-levels-pawn-and-knight.md` edits + smoke-test edits** (Issue: bench harness, BotProvider). Pulls in 4.
6. **`09-ai-decision-log-channel.md`** (Issue: AI decision log). Independent of 4 / 5 once 1 exists; can run in parallel.
7. **`<next-id>-reserve-ai-profile-schema.md`** (Issue: personalities). Independent; can run in parallel with 1–6.
8. **`11-ai-bench-harness.md`** (Issue: difficulty quality gate). Depends on 4.
9. **`08-ai-inspector-dev-screen.md` + screen package 61** (Issue: AI debugger surface). Depends on 3 + 6. Largest single piece (5-file screen package + UI consumer).
10. **Architecture-doc edits** (state-flow, command-schema, schema-matrix, README, CLAUDE.md, parallelism rule). Final pass; pulls in all of the above.
11. **`npm run validate`** end-to-end. Confirms links, contracts, cross-refs, task lint.
12. **`tasks:next:mvp`** to verify the new tasks land in the queue at the expected positions.

---

## 6. Risks if Not Implemented

- **Cheat policy unaddressed (Issue 1):** the M2 heuristic ships
  with full-map information by default, making the Knight quality
  gate (≥ 80 % vs random) meaningless and inviting silent
  multiplayer desyncs once
  [tasks/phase-3/01-multiplayer.md](../../tasks/phase-3/01-multiplayer.md)
  starts.
- **No cancellation contract (Issue 3):** any save / load /
  navigation that races AI compute can hang the UI or leak a
  resolved promise into the next turn's dispatcher.
- **No per-difficulty timeout (Issue 4):** Lord/Immortal MCTS will
  silently exceed the 2 s hard timeout and either hang or return
  malformed `Command`s; meanwhile Pawn UX takes the full 2 s for
  trivial states.
- **No `BotProvider` (Issue 7):** every test reinvents the bot
  swap, M3 / M7 regression tests cannot reference M2 by name, and
  the bench harness has nothing to plug into.
- **No `ai-profile` slot (Issue 8):** when M3+ wants per-faction
  flavor, adding the field becomes a non-additive change across
  faction.schema.json + hero.schema.json + every existing pack —
  exactly the migration cost the project's "additive-first" rule
  exists to avoid.
- **No AI inspector / decision log (Issues 5, 6):** QA cannot
  triage "AI did the wrong thing" reports without local re-runs;
  balance audits become guesswork; difficulty gate failures land
  late with no diagnostic surface.
- **Parallelism unstated (Issue 9):** a future contributor will
  parallelize AI workers in a 4-player skirmish optimization and
  silently break command-log ordering — the kind of bug that
  surfaces only as a multiplayer desync many milestones later.

---

## 7. AI Implementation Readiness

**Score after this plan: 9/10.**

What lifts it from 6 to 9:

- The deterministic core (Q180, Q181, Q189) is unchanged — it was
  already strong.
- The 5 ❌ UNKNOWN items (Q183, Q186, Q188, Q191, Q192) all gain
  explicit contracts in `ai-contract.md` + the new tasks above.
  Q188 lands as a *reserved* schema slot rather than a populated
  personality system, which is the right scope for MVP per the
  audit's "if intended" framing.
- The 4 ⚠ Partial items (Q182, Q184, Q187, Q190) are upgraded:
  per-call budgets become a per-turn table, the command log gains
  an opt-in side channel for AI traces, the swap interface is
  formalized as `BotProvider`, and the timeout policy gains
  per-difficulty rows + a guaranteed fallback.

What remains at 9 (not 10):

- Personality content is not authored — only the schema slot is
  reserved. Populating per-faction profiles is M3-or-later content
  work.
- The bench harness is non-blocking in CI until M2 reaches the
  Knight gate, so a regression that drops win-rate below 80 %
  during M2 will be reported but not block merges.
- Multi-worker parallel pre-warming is policy-only; no
  optimization is implemented (deferred to M7 if profiling demands
  it).

These remaining items are deliberate scope reductions, not gaps —
each maps to a later milestone with an existing task.
