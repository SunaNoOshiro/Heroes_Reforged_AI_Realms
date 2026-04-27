# 10. AI SYSTEM

> Audit pass over the questions originally listed in this file. Each
> question is preserved verbatim and answered against the current repo
> state (mostly planning + contracts; very little runtime code yet).
>
> Scope: this file covers the **gameplay opponent AI** (heuristic bots
> and the planned MCTS upgrade). Provider-backed *content-generation*
> AI (faction generation, art) is a separate concern and is audited in
> [`14-ai-generated-content-pipeline.md`](./14-ai-generated-content-pipeline.md).

---

### Q: 180. Do AI agents emit the same command type as players, or a privileged superset?

**Status:** ✔ Defined

**Answer:**
The AI emits the **same `Command` shapes as a human player**. The
action scorer's contract is
`selectAction(wants, hero, state): Command` and the worker boundary
returns `{ type: "MOVE_RESULT", command: Command }`. Both feed the
single dispatcher (`state' = apply(state, command)`) — there is no
privileged AI-only command kind in [`command-schema.md`](../architecture/command-schema.md)
(the closed enum is `MOVE_HERO`, `END_HERO_TURN`, `END_DAY`,
`RECRUIT_UNITS`, `BUILD_BUILDING`, `LEARN_SPELL`, `CAPTURE_MINE`,
`INITIATE_BATTLE`, `BATTLE_ATTACK`, `BATTLE_WAIT`, `BATTLE_DEFEND`,
`BATTLE_SPELL`, `BATTLE_SURRENDER`, `AUTO_RESOLVE_BATTLE`,
`SCENARIO_LOAD`, `BATTLE_RESOLVED`). `playerId` is added as dispatcher
metadata regardless of source.

**Evidence:**
- [tasks/mvp/10-heuristic-ai/03-action-scorer-priority-weights-plus-tie-breaking.md:20](../../tasks/mvp/10-heuristic-ai/03-action-scorer-priority-weights-plus-tie-breaking.md#L20)
- [tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md:20-22](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md#L20-L22)
- [docs/architecture/command-schema.md](../architecture/command-schema.md) — full closed enum, `playerId` added by dispatcher

---

### Q: 181. Are AI decisions a pure function of state + seed?

**Status:** ✔ Defined

**Answer:**
Yes. Heuristic AI tasks explicitly forbid `Math.random()` and require
deterministic tie-breaking via sorted comparison on hero IDs. The
"Pawn" difficulty branch that does flip a coin is required to take the
shared seeded `Rng` as a parameter
(`applyDifficulty(action, alternatives, difficulty, rng)`), so the same
`(state, seed)` always produces the same `Command`. This inherits the
project-wide determinism contract in
[`determinism.md`](../architecture/determinism.md) (seeded PCG32 with
named sub-streams, no wall-clock, fixed-point math only).

**Evidence:**
- [tasks/mvp/10-heuristic-ai/03-action-scorer-priority-weights-plus-tie-breaking.md:8,33](../../tasks/mvp/10-heuristic-ai/03-action-scorer-priority-weights-plus-tie-breaking.md#L8) — "never use `Math.random()` — use sorted comparison on hero IDs", "Same input always produces same output"
- [tasks/mvp/10-heuristic-ai/05-difficulty-levels-pawn-and-knight.md:23](../../tasks/mvp/10-heuristic-ai/05-difficulty-levels-pawn-and-knight.md#L23) — `rng: Rng` injected
- [docs/architecture/determinism.md:7-26](../architecture/determinism.md#L7-L26)

---

### Q: 182. Is AI computation bounded per turn?

**Status:** ⚠ Partial

**Answer:**
Per-call performance budgets exist for individual AI subsystems but
there is **no overall per-turn cap**. The defined budgets are:

- `buildThreatMap` < 50 ms on a 128×128 map
- `evaluateActions` < 5 ms per call
- Worker hard timeout: > 2 s ⇒ return best-found action

A whole-turn budget that aggregates threat-map + wants + scoring +
N tactical evaluations is not specified anywhere.

**Evidence:**
- [tasks/mvp/10-heuristic-ai/01-threat-map-bfs-strategic-danger-gradients.md:35](../../tasks/mvp/10-heuristic-ai/01-threat-map-bfs-strategic-danger-gradients.md#L35)
- [tasks/mvp/10-heuristic-ai/04-tactical-evaluator-combat-move-scoring.md:48](../../tasks/mvp/10-heuristic-ai/04-tactical-evaluator-combat-move-scoring.md#L48)
- [tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md:38](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md#L38)

---

### Q: 183. Can AI be paused, stepped, and inspected?

**Status:** ❌ UNKNOWN

**Answer:**
No pause / step / inspect interface is defined for the AI. The worker
contract is request/response only: `requestAIMove(state, difficulty)
=> Promise<Command>`. There is no documented way to break inside the
search, dump intermediate `Want[]` / `ScoredAction[]`, or single-step
through the decision pipeline at runtime. Indirect introspection is
possible because every `ScoredAction` carries a `reasoning: string`
and the engine is a pure reducer that can be re-run from any
checkpoint, but a debugger surface is not part of the spec.

**Evidence:**
- [tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md:18-22](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md#L18-L22) — request/response only
- [tasks/mvp/10-heuristic-ai/04-tactical-evaluator-combat-move-scoring.md:21](../../tasks/mvp/10-heuristic-ai/04-tactical-evaluator-combat-move-scoring.md#L21) — `reasoning: string` exists, but no UI consumer
- No matches for "pause" / "step" / "inspect" in `tasks/mvp/10-heuristic-ai/`

---

### Q: 184. Are AI decisions logged for replay and debugging?

**Status:** ⚠ Partial

**Answer:**
The **resulting `Command`** is logged — every command (player or AI)
is appended to the canonical command log that drives replay,
multiplayer lockstep, and saves
([`state-flow.md`](../architecture/state-flow.md): "append to command
log"). This is sufficient to *replay* an AI game bit-identically.
What is **not** logged is the AI's internal trace: the `Want[]`
priority list, per-action scores, the `reasoning: string` for the
chosen action, or which heuristic branch fired. There is no
documented sink for those.

**Evidence:**
- [docs/architecture/state-flow.md:32,62-65](../architecture/state-flow.md#L32) — command log = source of truth
- [tasks/mvp/10-heuristic-ai/04-tactical-evaluator-combat-move-scoring.md:21](../../tasks/mvp/10-heuristic-ai/04-tactical-evaluator-combat-move-scoring.md#L21) — `reasoning` field exists in memory
- No "ai log" / "decision log" sink defined in `docs/architecture/` or `tasks/`

---

### Q: 185. Is there a difficulty parameterization, and what does it actually change?

**Status:** ✔ Defined

**Answer:**
Yes. The full ladder is **Pawn → Knight → Grand Master → Lord →
Immortal** across three milestones:

| Difficulty | Milestone | What changes |
|---|---|---|
| **Pawn** | M2 (mvp) | 30 % of turns pick a uniformly-random legal action; tactical scoring drops the "retaliation saved" weight |
| **Knight** | M2 (mvp) | Full heuristic, no randomness, all scoring components active. Quality gate: ≥ 80 % wins vs random AI over 10 games |
| **Grand Master** | M3 (phase-2) | Adds resource-deficit detection, town-build planner, multi-hero role assignment, 2-day path lookahead |
| **Lord / Immortal** | M7 (phase-3) | Replaces heuristic with MCTS + UCB1 + beam search, WASM hot paths. Lord must beat Grand Master in ≥ 60 % of 50 games |

Difficulty is locked in `AdventureState` at game start and not
changeable mid-game. There is **no documented "AI cheats with extra
resources" lever** at any tier.

**Evidence:**
- [tasks/mvp/10-heuristic-ai/05-difficulty-levels-pawn-and-knight.md:7-12,32-40](../../tasks/mvp/10-heuristic-ai/05-difficulty-levels-pawn-and-knight.md#L7-L40)
- [tasks/phase-2/02-strategic-ai.md:1-7](../../tasks/phase-2/02-strategic-ai.md#L1-L7)
- [tasks/phase-3/03-mcts-ai.md:1-7](../../tasks/phase-3/03-mcts-ai.md#L1-L7)

---

### Q: 186. Does AI cheat (peek hidden state, extra resources), and is this gated?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** No task or architecture doc says either "AI sees
fog-of-war" or "AI is restricted to fog-of-war"; the input contract is
just `state: AdventureState` passed across the worker boundary. Two
weak signals lean *against* cheating: difficulty levers in
[`05-difficulty-levels-pawn-and-knight.md`](../../tasks/mvp/10-heuristic-ai/05-difficulty-levels-pawn-and-knight.md)
modify *behavior* only (random %, scoring weights), and the
`SCOUT_FOG` want type in
[`02-wants-engine`](../../tasks/mvp/10-heuristic-ai/02-wants-engine-strategic-action-prioritization.md#L25)
implies the AI has hidden tiles to scout. But there is no explicit
"AI input is filtered to AI player's view" contract, and no gating
flag for cheat tiers.

**Evidence:**
- No matches for "ai cheat" / "peek hidden" / "extra resources" in `docs/architecture/` or `tasks/`
- [tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md:19](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md#L19) — passes raw `AdventureState` (no per-player filtering specified)
- [tasks/mvp/10-heuristic-ai/02-wants-engine-strategic-action-prioritization.md:25](../../tasks/mvp/10-heuristic-ai/02-wants-engine-strategic-action-prioritization.md#L25) — implies fog exists for the AI

---

### Q: 187. Can AI be swapped for a scripted bot for tests?

**Status:** ⚠ Partial

**Answer:**
Possible by construction but not formalized as a swap interface.
Because every AI consumer (player turn loop, smoke tests) only sees a
`Command`, any function that returns a valid `Command` from a state
can stand in. The task system already calls out two such fixtures:

- A **"random AI"** opponent for the Knight quality gate (picks a
  legal action uniformly at random; not the same code path as Pawn,
  which is heuristic + 30 % noise)
- **Scripted command sequences** for the 7-day adventure smoke test
  and the 20-round battle replay smoke test

What is missing is a stable `BotProvider`-style contract documented
alongside `requestAIMove`, so that test bots are formally pluggable
rather than ad-hoc.

**Evidence:**
- [tasks/mvp/10-heuristic-ai/05-difficulty-levels-pawn-and-knight.md:37,55-57](../../tasks/mvp/10-heuristic-ai/05-difficulty-levels-pawn-and-knight.md#L37) — random AI baseline opponent
- [tasks/mvp/05-adventure-map/08-7-day-playable-smoke-test.md](../../tasks/mvp/05-adventure-map/08-7-day-playable-smoke-test.md) — scripted 7-day session
- [tasks/mvp/09-tactical-combat/10-replay-smoke-test-20-round-battle.md](../../tasks/mvp/09-tactical-combat/10-replay-smoke-test-20-round-battle.md) — 20 rounds of scripted commands
- No documented `BotProvider` / swap interface in `docs/architecture/`

---

### Q: 188. How are AI personalities defined (data, code, ML model)?

**Status:** ❌ UNKNOWN

**Answer:**
**Personalities are not part of the design.** The MVP defines
*difficulty levels* (behavioral knobs over the same heuristic), not
*personalities* (e.g. "aggressive Barbarian", "builder Wizard"). No
schema exists for per-faction or per-hero AI profiles, no
`ai-profile.schema.json`, and no data hook for weighting `Want` types
by faction or persona. If personalities are intended, this is a gap.

**Evidence:**
- No matches for "personality" / "persona" / "playstyle" in `docs/architecture/` or `tasks/`
- [content-schema/schemas/](../../content-schema/schemas/) — no `ai-profile` / `personality` schema
- [tasks/mvp/10-heuristic-ai/05-difficulty-levels-pawn-and-knight.md:21-23](../../tasks/mvp/10-heuristic-ai/05-difficulty-levels-pawn-and-knight.md#L21-L23) — only `"pawn" | "knight"` discriminator, no persona field

---

### Q: 189. If ML-based, is inference deterministic across hardware?

**Status:** ✔ Defined (N/A — gameplay AI is not ML-based)

**Answer:**
**Not applicable.** Gameplay AI is heuristic in MVP/M3 and Monte
Carlo Tree Search in M7 — no neural net inference is part of the
opponent. MCTS is implemented in TypeScript with WASM
(AssemblyScript) hot paths, both reachable through the same seeded
PCG32 RNG and fixed-point math required by
[`determinism.md`](../architecture/determinism.md), so cross-hardware
determinism follows from the same rules as the rest of the engine.

The *only* place ML / hosted models appear in the project is the
content-generation pipeline (provider-backed faction generation),
which is forbidden from deterministic gameplay code by
[`ai-integration.md`](../architecture/ai-integration.md): "Deterministic
gameplay code must not call hosted AI providers."

**Evidence:**
- [tasks/phase-3/03-mcts-ai.md](../../tasks/phase-3/03-mcts-ai.md) — MCTS, no neural model
- [docs/architecture/ai-integration.md:29](../architecture/ai-integration.md#L29)
- [docs/architecture/determinism.md:7-15](../architecture/determinism.md#L7-L15)

---

### Q: 190. Are AI turns time-limited, and what is the timeout policy?

**Status:** ⚠ Partial

**Answer:**
A **single timeout** is defined: the worker returns the best-found
action if computation exceeds **2 seconds**. This is described as
"not a hang" — i.e. it returns a graceful fallback rather than
throwing — so a partial result must always exist. Nothing is said
about:

- per-difficulty budgets (Lord/Immortal MCTS may need a larger
  budget than Pawn)
- per-battle vs per-turn budget
- multiplayer turn-clock interaction (the multiplayer audit covers
  the human-side clock; AI side is silent)
- what counts as "best-found" when the AI has not yet produced any
  legal action

**Evidence:**
- [tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md:38](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md#L38) — "if AI takes > 2 seconds, it returns the best action found so far"
- No per-difficulty timeouts in `tasks/phase-3/03-mcts-ai/`

---

### Q: 191. Can AI requests be cancelled mid-turn?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** The worker contract documents a clean termination
"when the game ends or user navigates away", but no cancel /
abort-mid-turn mechanism is defined. There is no `AbortSignal`,
cancellation token, or "discard pending result" message in the
documented protocol. In practice the worker can always be terminated
(`Worker.terminate()`), but doing so mid-search has no documented
contract for the calling UI (e.g. who replays the turn, what the
game state looks like, whether the in-flight `Promise` rejects).

**Evidence:**
- [tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md:18-22,37](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md#L18-L37) — only termination on game end / navigation
- No matches for "cancel" / "abort" in AI task files

---

### Q: 192. Is multi-AI parallelism allowed, and how is determinism preserved?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** The current contract is a single worker with a
single in-flight `requestAIMove` per call. Nothing in the docs
explicitly forbids running multiple AI workers concurrently (e.g. one
per AI player in a 4-player skirmish), but nothing enforces it
either. Determinism would in principle be safe because:

- each AI emits commands that go through the single dispatcher
- the dispatcher is the only mutation path (`F → O` in
  [`state-flow.md`](../architecture/state-flow.md))
- turn order is sequential by player, so AI workers cannot race over
  the same `playerId`'s turn

But the *order in which their command-log entries land* is not
explicitly defined for parallel completion, and turn structure
([`02-turn-structure`](../../tasks/mvp/05-adventure-map/02-turn-structure.md))
is sequential anyway, which means parallel AI is mostly a moot
optimization in MVP. This needs a one-line policy ("AI players act
sequentially in turn order; their workers may pre-warm but commands
apply in order").

**Evidence:**
- [tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md) — single-worker contract; no parallelism guidance
- No matches for "parallel" / "multi-ai" in `docs/architecture/` AI files

---

## 🔍 Summary

### Missing Logic
- **Cheat policy** (Q186): no contract for whether AI sees fog-of-war or gets resource bonuses at higher tiers.
- **Personalities** (Q188): no schema for per-faction / per-hero AI profiles; only difficulty knobs exist.
- **Cancellation** (Q191): no `AbortSignal` or mid-turn discard contract for the worker.
- **Parallelism policy** (Q192): not stated whether AI players run concurrently in MP / hotseat skirmishes.
- **Per-turn aggregate budget** (Q182): only per-call budgets are defined; no whole-turn cap aggregating threat-map + wants + N tactical evaluations.
- **AI debugger surface** (Q183, Q184): `reasoning: string` is computed but not surfaced; no pause/step/inspect API; internal `Want[]` / `ScoredAction[]` traces are not logged for replay/debug.
- **Test-bot interface** (Q187): "random AI" baseline and scripted-command fixtures exist, but no documented `BotProvider`-style swap point.

### Risks
- **Worker timeout fallback (Q190)** is defined as "return best-found action so far" but with no guarantee that *any* legal action has been produced yet — a 2 s timeout on the very first computation could yield no action.
- **Difficulty quality gate (Q185)** for Knight (≥ 80 % vs random AI) and Lord (≥ 60 % vs Grand Master) is ambitious; if the heuristics underperform, fixing them will balloon the M2/M7 estimates.
- **Cheat ambiguity (Q186)**: passing raw `AdventureState` into the worker without per-player view filtering means an unintentional information leak (full-map info) is the default — easy to ship by accident.
- **Personality gap (Q188)**: factions advertised as flavorful (Emberwild etc.) will play identically to all other factions until a personality system is added.
- **Mid-turn cancel (Q191)**: without an abort contract, recovering from a misclicked "End Turn" or a force-quit during AI compute may leave the UI's `Promise` dangling.

### Improvements
- Add a one-page `docs/architecture/ai-contract.md` covering: input view (filtered vs full), output (`Command`), worker protocol (compute / cancel / terminate), per-turn budget, and parallelism policy.
- Promote the `reasoning: string` from in-memory debug aid to an opt-in `aiDecisionLog` channel that is **not** part of the canonical command log (so it stays out of the replay hash but is available for QA / replay viewers).
- Define a `BotProvider` interface so `requestAIMove` can be swapped for `randomBot`, `scriptedBot(commands)`, or `recordedBot(replay)` in tests without changing call sites.
- Add a `aiPlayerView(state, playerId): AdventureState` projection at the worker boundary and require it in the worker entry point — make "fair AI" the default and "cheating AI" an explicit, opt-in difficulty toggle.
- Reserve a stable `ai-profile.schema.json` slot now (additive-first per project rules) so personality data can be added later without migrations.
- Specify the per-turn aggregate timeout per difficulty (e.g. Pawn 200 ms, Knight 500 ms, Grand Master 1 s, Lord 2 s, Immortal 3 s) and the fallback when budget is exhausted before any legal action is produced.
- Document explicit `AbortSignal` semantics in `requestAIMove(state, difficulty, signal?)`.

### AI-Readiness
Score: **6/10**

Reason: The deterministic core is in good shape — same `Command` shape
as players (Q180), pure-function decisions (Q181), seeded RNG, no
floats, no `Math.random()`, command-log replay (Q184 partial), worker
isolation (Q186-adjacent), and a clear difficulty ladder with
quantitative quality gates (Q185). That is enough to *start*
implementation. But several runtime contracts that an autonomous
implementer would need are missing or implicit: the cheat policy
(Q186), per-player view projection at the worker boundary, an
`AbortSignal` for cancellation (Q191), parallelism rules (Q192),
inspector / debugger surface (Q183), and any notion of personality
(Q188). These gaps will surface as ad-hoc decisions during coding
unless the docs above are added before M2 begins.
