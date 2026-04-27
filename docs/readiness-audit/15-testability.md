# 15. TESTABILITY

### Q: 248. Can each system be unit-tested with no other system loaded?

**Status:** ⚠ Partial

**Answer:**
The architecture mandates SOLID-style boundaries (single-responsibility modules, dependency inversion, registries instead of hard-coded coupling) and a strict split between `src/engine/`, `src/rules/`, `src/content-runtime/`, `src/renderer/`, `src/ui/`, `src/ai/`, `src/net/`, and `src/persistence/`. That makes module-level unit testing the intended default. However, there is no explicit "unit isolation contract" document, no shared mock/fake catalogue, no dependency-injection convention, and no per-module testing rubric. The only fully scoped test artifact in the task system today is the engine fuzz harness (`src/engine/__tests__/fuzz.test.ts`); per-system unit harnesses for `rules`, `content-runtime`, `ai`, `net`, `persistence`, and `ui` are not separately specified.

**Evidence:**
- [CLAUDE.md](../../CLAUDE.md) — "SOLID-Style Boundaries", module list under `src/`
- [docs/architecture/master-plan.md](../architecture/master-plan.md) — module breakdown
- [tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md](../../tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md)
- ❌ no explicit per-system unit-test plan, no mocking/DI convention doc

---

### Q: 249. Are simulation tests deterministic and seedable?

**Status:** ✔ Defined

**Answer:**
Yes. Determinism is a non-negotiable: PCG32 seeded RNG with named sub-streams, fixed-point integer math, pure command reducer, canonical serializer + xxh64 state hash, and a Replay API. The fuzz test runs five different seeds × 1000 commands and reports the seed + command index on any divergence, which is exactly the seedable simulation-test contract.

**Evidence:**
- [docs/architecture/determinism.md](../architecture/determinism.md) — "Non-Negotiable Stack" 1–6
- [tasks/mvp/01-engine-core/03-implement-pcg32-prng-with-named-sub-streams.md](../../tasks/mvp/01-engine-core/03-implement-pcg32-prng-with-named-sub-streams.md)
- [tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md](../../tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md) — "5 different seeds", "CI reports the seed + command index on any failure"

---

### Q: 250. Is there a headless harness that runs full games without rendering?

**Status:** ✔ Defined

**Answer:**
Yes. Multiple tasks explicitly require a headless run mode:
- M0 fuzz harness is "designed to run headless in Node (no browser APIs)".
- Phase-2 strategic-AI task `05-grand-master-difficulty-plus-headless-evaluation` runs 100 headless games.
- Phase-2 second-faction task `06-balance-check-emberwild-vs-necropolis-headless-games` and Phase-3 `02-ai-generation/03-auto-balancer-headless-battle-baseline` and `03-mcts-ai/06-performance-benchmark-plus-headless-eval` all assume the same harness.

The harness is implicit (Node-driven engine + AI stub + replay API) but is referenced as a real, reusable thing across phases.

**Evidence:**
- [tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md](../../tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md)
- [tasks/task-registry.json](../../tasks/task-registry.json) — multiple "headless" exit criteria
- ⚠ no single canonical doc named "headless harness"; it lives across task acceptance criteria

---

### Q: 251. Are golden-state tests used to lock down mechanics?

**Status:** ❌ UNKNOWN

**Answer:**
The engine has all the primitives needed for golden-state testing — canonical JSON serializer, xxh64 state hash, replay API — but no task or doc explicitly defines a "golden state" / snapshot-state regression suite for mechanics (e.g. checked-in expected state hashes per scenario). The fuzz harness compares two live instances against each other, not against a stored golden hash.

**Evidence:**
- [docs/architecture/determinism.md](../architecture/determinism.md) — canonical serializer + state hash exist
- ❌ no `__fixtures__/golden/*.json` or `goldenState.test.ts` task or convention defined

---

### Q: 252. Are replays used as regression tests?

**Status:** ⚠ Partial

**Answer:**
The Replay API (Task 8 of M0) is required and the fuzz harness consumes it. Saves, replays, and multiplayer all pin `contentHash` and `engineHash` so a stored replay must reproduce the exact same final state. That makes replays usable as regression tests in principle. What is missing: a checked-in replay corpus, a "replay regression" test runner, and a policy on when to add a replay (e.g. on every fixed bug). No task currently owns those artifacts.

**Evidence:**
- [tasks/mvp/01-engine-core/08-replay-api.md](../../tasks/mvp/01-engine-core/08-replay-api.md)
- [docs/architecture/determinism.md](../architecture/determinism.md) — content/engine hash pinning
- ❌ no replay-corpus or replay-regression-runner task

---

### Q: 253. Is there a property-based testing layer?

**Status:** ❌ UNKNOWN

**Answer:**
No. There is no mention of `fast-check`, `jsverify`, hypothesis-style generators, or any property-based testing tool/strategy in the architecture docs, planning docs, or task files. The fuzz harness is closer to randomized differential testing (two engines, same input) than property-based testing of invariants.

**Evidence:**
- ❌ no occurrences of "property-based", "fast-check", or equivalent across docs/tasks
- only randomized fuzzing is specified ([tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md](../../tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md))

---

### Q: 254. Are network conditions simulated in tests (loss, jitter, partition)?

**Status:** ❌ UNKNOWN

**Answer:**
The Phase-3 multiplayer module covers WebRTC peer setup, lockstep, per-turn hash exchange, desync detection, auto-bisect, reconnection with log-range replay, and host migration — but none of the eight task files define a network-condition simulator (packet loss, jitter, partition, NAT failure injection, message reordering). Disconnection is exercised at the protocol level (reconnection task), not via a chaos/network harness.

**Evidence:**
- [tasks/phase-3/01-multiplayer.md](../../tasks/phase-3/01-multiplayer.md)
- ❌ no "loss", "jitter", "chaos", "partition" tasks or harness specified

---

### Q: 255. Are AI agents tested via tournament harness?

**Status:** ⚠ Partial

**Answer:**
Tournament-style evaluation is used as exit criteria for several AI tasks but is not packaged as a single named "tournament harness":
- `phase-2/02-strategic-ai/05` — "Grand Master AI wins consistently vs Knight AI in 100 headless games".
- `phase-2/03-second-faction/06` — "balance check Emberwild vs Necropolis headless games".
- `phase-3/03-mcts-ai/06` — "Lord beats Grand Master heuristic in ≥ 60% of 50 headless games".
A user-facing "Tournament mode UI" also exists in `phase-3/04-polish/04-tournament-mode-ui`, but that is a player feature, not a CI test harness. There is no task that owns a reusable AI-vs-AI bracket runner with shared metrics.

**Evidence:**
- [tasks/task-registry.json](../../tasks/task-registry.json) — exit criteria quoted above
- [tasks/phase-3/04-polish](../../tasks/phase-3/04-polish/) — `tournament-mode-ui` is the only task with "tournament" in its name and it is a UI feature
- ❌ no shared "AI tournament harness" task or doc

---

### Q: 256. Is UI tested via snapshot, interaction, or E2E?

**Status:** ⚠ Partial

**Answer:**
The task system flags this as a known gap. The audits explicitly recommend adding a Playwright or `vitest --browser` smoke step to `tasks:done` for any task whose `ownedPaths` include `src/ui/**`, because UI changes can pass headless tests but break interactively. Today, UI tasks rely on `npm run validate && npm test` (Node-only) plus manual inspection via the wiki mockups. No snapshot, interaction, or E2E test framework is wired in.

**Evidence:**
- [docs/planning/audits/AUDIT-2026-04-30-TASK-SYSTEM-FULL-CONSISTENCY.md](../planning/audits/AUDIT-2026-04-30-TASK-SYSTEM-FULL-CONSISTENCY.md) — "Add a Playwright/vitest browser smoke check to the verify chain"
- [docs/planning/audits/AUDIT-2026-04-30-TASK-SYSTEM-AI-EXECUTABILITY-V2.md](../planning/audits/AUDIT-2026-04-30-TASK-SYSTEM-AI-EXECUTABILITY-V2.md)
- ❌ no Playwright/Cypress/Storybook/snapshot config or task in repo today

---

### Q: 257. Is there a fuzzing harness for command inputs?

**Status:** ✔ Defined

**Answer:**
Yes, this is explicitly the M0 exit criterion. The fuzz harness drives two parallel sim instances with a random-move AI generating legal commands, compares state hashes after every command, and runs 1000 commands × 5 seeds in under 10 seconds in Node. CI is required to fail on hash divergence and to print the seed + command index for reproducibility. There is also a separate canonical-JSON fuzz test (10,000 random JSON-compatible values, round-trip identity).

**Evidence:**
- [tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md](../../tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md)
- [tasks/mvp/01-engine-core/07b-canonical-json.md](../../tasks/mvp/01-engine-core/07b-canonical-json.md)
- [tasks/mvp/01-engine-core/10-github-actions-ci.md](../../tasks/mvp/01-engine-core/10-github-actions-ci.md) — fuzz runs on every PR

---

### Q: 258. Are edge-case scenarios scripted as test fixtures?

**Status:** ❌ UNKNOWN

**Answer:**
No edge-case fixture catalogue is defined. The schema layer ships canonical examples (`content-schema/examples/`), and `src/persistence/` is described as owning "saves, replays, scenarios", but there is no dedicated set of test scenarios such as "siege with empty garrison", "stack of 1 vs 1000", "all-heroes-dead victory", "out-of-resources turn", etc. No task currently owns an `__fixtures__/edge-cases/` folder or equivalent.

**Evidence:**
- [docs/architecture/overview.md](../architecture/overview.md) — `src/persistence/` includes scenarios
- [content-schema/examples/](../../content-schema/examples/) — canonical examples for schemas, not edge-case scenarios
- ❌ no edge-case fixture task or directory specified

---

### Q: 259. Is coverage tracked per system, and what are the thresholds?

**Status:** ❌ UNKNOWN

**Answer:**
No coverage gate is specified. CI runs `lint`, `type-check`, `test`, and the fuzz harness, with a wall-clock budget under 3 minutes — but no coverage tool (c8, istanbul, vitest --coverage), no per-module thresholds, and no coverage badge are defined in any task or doc.

**Evidence:**
- [tasks/mvp/01-engine-core/10-github-actions-ci.md](../../tasks/mvp/01-engine-core/10-github-actions-ci.md) — CI steps listed; coverage not among them
- ❌ no coverage threshold or tool specified anywhere in `docs/` or `tasks/`

---

### Q: 260. Can the engine run faster than real time for stress tests?

**Status:** ⚠ Partial

**Answer:**
Implicitly yes. The fuzz harness must execute 1000 commands × 5 seeds in under 10 seconds on Node 20, and the headless AI eval tasks run 50–100 full games per CI run, which only works if the engine runs much faster than wall-clock playthrough. The architecture also forbids `Date.now()` / `performance.now()` in deterministic paths and forbids `setTimeout`-based race decisions, so the engine has no real-time coupling at all — it advances purely on commands. What is missing: an explicit "stress mode" task with throughput targets (commands/sec, full-games/min) and a benchmark harness checked into CI.

**Evidence:**
- [docs/architecture/determinism.md](../architecture/determinism.md) — "Forbidden In Deterministic Paths" excludes wall-clock time
- [tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md](../../tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md) — "< 10 seconds" for 5000 commands
- [tasks/phase-3/03-mcts-ai/06-performance-benchmark-plus-headless-eval.md](../../tasks/phase-3/03-mcts-ai/06-performance-benchmark-plus-headless-eval.md) — performance benchmark exists for AI, not for engine throughput
- ⚠ no engine-level throughput SLO or benchmark task

---

## 🔍 Summary

### Missing Logic
- **Golden-state regression suite**: state hash + canonical serializer exist, but no checked-in expected hashes per scenario.
- **Replay corpus + replay-regression runner**: replay API exists, but no policy or runner for replays-as-regressions.
- **Property-based testing layer**: no `fast-check`/equivalent generators or invariant tests.
- **Network condition simulator**: no loss/jitter/partition/reorder injection for the multiplayer stack.
- **Reusable AI tournament harness**: tournament-style evaluations live as one-off exit criteria across 4 tasks instead of one shared bracket runner with shared metrics.
- **UI snapshot / interaction / E2E layer**: explicitly flagged in audits as a gap; no Playwright or `vitest --browser` wired into `tasks:done`.
- **Edge-case scenario fixture catalogue**: no `__fixtures__/edge-cases/` corpus.
- **Coverage gate**: no coverage tool, per-module threshold, or badge.
- **Engine throughput SLO**: no formal commands/sec or games/sec benchmark target for stress testing.
- **Per-system unit-test contract**: no shared mocking/DI convention or per-module test rubric.

### Risks
- "Tests pass headless, UI breaks live" — already named in audits but not yet mitigated.
- Mechanics drift silently because no golden-state hashes guard them; only differential hashing between two live instances catches divergence, not unintended *intentional* changes.
- Multiplayer is allowed to ship with desync detection but no chaos testing — first time a real lossy network is exercised will be in production.
- AI quality is gated on per-task win rates with no shared metric, so cross-AI regressions (e.g. heuristic AI degrades after MCTS lands) may go unnoticed.
- No coverage signal means whole subsystems (e.g. `content-runtime` overrides, `persistence` migrations) can ship with zero tests without flagging.
- Edge cases (empty garrisons, dead-hero victories, resource-overflow turns) are not pinned by fixtures, so refactors can change behavior with no failing test.

### Improvements
- Add a `__fixtures__/golden/` corpus with `(scenario, seed) → expectedStateHash` and a runner that fails on any drift.
- Add a `tests/replays/*.replay.json` corpus and a replay-regression task; require a replay for every fixed mechanics bug.
- Adopt `fast-check` for invariant tests on the rules/formula evaluator and the canonical serializer.
- Add a NetSim layer in `src/net/` with configurable loss/jitter/partition; bind two parallel instances to it for chaos tests of lockstep + reconnection.
- Promote the ad-hoc headless eval tasks into one shared `src/ai/__tests__/tournament.ts` runner emitting standard metrics (winrate, decision-time, branching).
- Wire `vitest --browser` (or Playwright) into `scripts/tasks.mjs done` for any task whose `ownedPaths` include `src/ui/**`, as the audits recommend.
- Add `vitest --coverage` with per-module thresholds (engine ≥ 90%, rules ≥ 90%, content-runtime ≥ 80%, ai ≥ 70%, ui smoke only) and a CI gate.
- Add an engine-throughput benchmark task with a target (e.g. ≥ 100k commands/sec on M1 Node 20) and track regressions.
- Document a per-system unit-test contract in `docs/architecture/`: mocking conventions, DI seams, and the canonical fake set.

### AI-Readiness
Score: 6/10
Reason: Determinism, fuzzing, and headless execution are fully specified and are the load-bearing primitives an AI implementer needs to build the rest. Everything above the engine layer (golden states, replay regressions, property tests, network chaos, AI tournament harness, UI snapshot/E2E, edge-case fixtures, coverage gating, throughput SLOs) is either implicit or undefined, so an AI executing the audit chapter today would have to invent test scaffolding rather than follow a written contract.
