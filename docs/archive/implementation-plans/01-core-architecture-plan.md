# Implementation Plan: 01 — Core Architecture

> Source audit: [docs/archive/readiness-audit/01-core-architecture.md](../readiness-audit/01-core-architecture.md)
>
> This plan converts the audit's ❌ UNKNOWN, ⚠ Partial, Missing Logic,
> and Risk items into concrete documentation, schema, and tooling work.
> Nothing here invents gameplay. Every change formalizes a contract that
> is already implied by the existing architecture but is not yet pinned
> down.

---

## 1. Overview

**Scope.** Close the ten gaps the core-architecture audit flagged as
blocking determinism, replay safety, multiplayer readiness, or AI-agent
implementation:

1. Frame-time budget & degradation policy (Q4)
2. Top-level `GameState` shape (Q5)
3. Mid-game runtime entity-ID allocator (Q7)
4. RNG named sub-stream catalogue (Q10)
5. Fresh-session seed-source policy (Q11)
6. Command-dispatcher input queue & overflow policy (Q15)
7. Command idempotency / nonce strategy (Q16)
8. Cross-actor command ordering rule (Q17)
9. Multi-engine harness contract (Q20)
10. Module-graph acyclicity enforcement (Q22, Q24)

**Readiness state today.** AI-Readiness scored **6.5 / 10**. The
deterministic stack, command schema, and layer boundaries are solid;
the gaps are adjacent contracts an implementer hits on day one. All ten
gaps are resolvable through focused doc edits, schema additions, and a
small number of CI-side scripts. No runtime engine code is required to
unblock the next implementation milestone.

**Out of scope.** Authoring runtime engine code, building the renderer,
shipping multiplayer transport (M5). This plan only formalizes the
contracts those layers must satisfy.

---

## 2. Critical Fixes (Must Do First)

These must land before any deterministic-engine task starts implementation.
They are ordered by risk: each one, if left open, will cause silent
state divergence or unrecoverable replay corruption.

1. **RNG sub-stream catalogue (Issue 3.D-1)** — without canonical names,
   the first commit that calls `rng.next()` poisons every replay.
2. **Mid-game entity-ID allocator (Issue 3.D-2)** — the second-most
   common source of cross-machine divergence; must be pinned before
   `SCENARIO_LOAD` or any recruitment command is implemented.
3. **Top-level `GameState` shape (Issue 3.C-1)** — the reducer cannot
   be written without a top-level type; immutability strategy must be
   chosen before structural-sharing decisions calcify.
4. **Command idempotency key (Issue 3.B-1)** — required before any UI
   wiring; retroactive addition would force a command-log migration.
5. **Fresh-session seed source (Issue 3.D-3)** — required by the first
   `SCENARIO_LOAD` test; cheap to specify, expensive to retrofit.

---

## 3. System Improvements

### Architecture

#### Issue 3.A-1: Top-level `GameState` shape & immutability strategy

**Source:** Q5 (⚠ Partial), Missing Logic bullet 2

**Problem:**
The reducer signature `state' = apply(state, command)` is defined, but
the shape of `state` is not. Immutability strategy (full immutable,
structural sharing via Immer/immutable.js, or copy-on-write), and
whether the tree is normalized (entities-by-id maps) vs. nested are all
unspecified. No top-level `GameState` schema exists.

**Impact:**
- Two implementers will pick incompatible shapes (one nested, one
  normalized), forcing a costly rewrite.
- Structural-sharing choice affects every reducer write path; deferring
  it makes later refactors expensive.
- Save/load and command-log replay both depend on a stable serialized
  shape — currently undefined.

**Solution:**
Author `docs/architecture/state-shape.md` defining:
- the top-level `GameState` interface (phase, turn, players,
  worldMap, towns, heroes, stacks, mines, log, rngStreams, contentHashes)
- nested tactical-battle sub-state placement
- normalization rule (per-entity collections keyed by stable ID)
- immutability strategy: structural sharing via plain frozen objects,
  no third-party library
- canonical JSON serialization rules consistent with
  `determinism.md`

Add `content-schema/schemas/game-state.schema.json` as the closed schema.

**Files to Update:**
- [docs/architecture/overview.md](../../architecture/overview.md) — link to new state-shape doc
- [docs/architecture/glossary.md](../../architecture/glossary.md) — add `GameState` term
- [docs/architecture/schema-matrix.md](../../architecture/schema-matrix.md) — register `game-state.schema.json`

**New Files:**
- `docs/architecture/state-shape.md`
- `content-schema/schemas/game-state.schema.json`
- `content-schema/examples/game-state.example.json`

**Implementation Steps:**
1. Draft `state-shape.md` enumerating the top-level keys, derived from
   command-schema payloads (every payload references a sub-tree).
2. Decide and document immutability strategy (recommend: frozen plain
   objects + structural sharing helpers in `src/engine/state/`).
3. Decide and document normalization rule (recommend: `byId` maps for
   heroes/stacks/towns/mines; arrays only for ordered logs).
4. Author the JSON schema with `additionalProperties: false`.
5. Author a canonical example covering one hero, one town, one mine.
6. Cross-link from `overview.md`, `schema-matrix.md`, `glossary.md`.

**Dependencies:** none — this is a pure documentation/schema task.

**Complexity:** M

---

#### Issue 3.A-2: Module-graph acyclicity enforcement

**Source:** Q22 (⚠ Partial), Q24 (⚠ Partial), Risks bullet "Architectural drift"

**Problem:**
The intended dependency graph (engine → schemas; UI/AI/net → engine
contracts; renderer read-only) is acyclic and unidirectional in design,
but no automated check exists. Task-system dependency cycles are
detected by `npm run validate:tasks`, but this only covers Markdown
task ordering, not `src/` module imports. The first PR that lets
`src/engine/` import `src/renderer/` will pass review unchallenged.

**Impact:**
- Architectural drift becomes invisible until a leak corrupts
  determinism (renderer state leaking into engine, asset paths in
  gameplay records).
- AGENTS.md's "engine pure / renderer read-only" rule degrades to
  policy-only.

**Solution:**
Adopt `dependency-cruiser` with a config that codifies the boundary
table from `state-flow.md`. Wire it into `npm run validate` and CI.

**Files to Update:**
- [package.json](../../../package.json) — add `dependency-cruiser` devDep + `validate:arch` script; add `validate:arch` to `validate`
- [docs/architecture/overview.md](../../architecture/overview.md) — link to fitness check
- [AGENTS.md](../../../AGENTS.md) — note that boundary violations are CI-enforced
- [CLAUDE.md](../../../CLAUDE.md) — add `npm run validate:arch` mention in workflow

**New Files:**
- `.dependency-cruiser.cjs` — boundary rules
- `docs/architecture/module-graph.md` — human-readable description of allowed edges, with the same table as the `.cjs` rules

**Implementation Steps:**
1. Install `dependency-cruiser` as a devDependency.
2. Author `.dependency-cruiser.cjs` with `forbidden` rules:
   - `src/engine/**` may not import `src/renderer/**`, `src/ui/**`, `src/ai/**`, `src/net/**`, `src/persistence/**`
   - `src/renderer/**` may not import `src/engine/**` (read-only via state snapshots only)
   - `src/rules/**` may not import anything outside `src/rules/**` and `src/content-schema/**`
   - no cycles anywhere in `src/**`
3. Add `validate:arch` script: `depcruise --config .dependency-cruiser.cjs src`.
4. Add `validate:arch` to the `validate` aggregate script.
5. Author `docs/architecture/module-graph.md` mirroring the rules in
   prose so non-Node readers can audit the contract.
6. Verify the script passes on the empty/current `src/` tree.

**Dependencies:** none.

**Complexity:** S

---

#### Issue 3.A-3: Multi-engine harness contract

**Source:** Q20 (⚠ Partial), Missing Logic bullet 9

**Problem:**
Desync detection requires running two engine instances side-by-side and
comparing state hashes after each command. The engine's purity makes
this implicitly possible, but no doc, fixture, or wrapper formalizes
it. Without a contract, the first multi-engine test will discover
hidden globals or shared module state.

**Impact:**
- Desync detection cannot be validated.
- Multiplayer lockstep (M5) loses its primary verification tool.
- Subtle non-purity (singletons, module-level caches) ships unnoticed.

**Solution:**
Author `docs/architecture/multi-engine-harness.md` describing:
- the `createEngine()` factory contract (no globals, no module-level
  singletons, full state passed in)
- the recommended test fixture shape (parallel apply + hash compare
  after each command)
- prohibited patterns (any `let foo = …` at module scope that the
  reducer reads)

**Files to Update:**
- [docs/architecture/state-flow.md](../../architecture/state-flow.md) — link to harness doc from desync section
- [docs/architecture/determinism.md](../../architecture/determinism.md) — add cross-link in fuzz-harness section

**New Files:**
- `docs/architecture/multi-engine-harness.md`

**Implementation Steps:**
1. Draft the `createEngine()` factory contract.
2. Document a canonical desync-detection test pattern (pseudocode).
3. Cross-link from `state-flow.md`, `determinism.md`, and the
   fuzz-harness section.
4. Add an entry to `glossary.md` for "multi-engine harness".

**Dependencies:** Issue 3.A-1 (`GameState` shape must exist before the
factory's return type can be specified).

**Complexity:** S

---

### Data Contracts

#### Issue 3.B-1: Command idempotency key / nonce

**Source:** Q16 (⚠ Partial), Risks bullet "UI / network double-dispatch"

**Problem:**
Commands are intentionally non-idempotent (each application mutates
state). At-most-once delivery at the UI/network boundary is
unaddressed: a UI double-click or network retry can append a duplicate
command and corrupt the log + replay.

**Impact:**
- Replays diverge after any double-click.
- Multiplayer lockstep cannot deduplicate retried network frames.
- Bug-report replays from users will be unreliable.

**Solution:**
Add a required `nonce: string` field to every command's
dispatcher-added metadata. The dispatcher rejects (does not append) any
command whose `nonce` matches one in the recent log window. Document
the nonce-generation rule (deterministic per-actor counter, format
`<playerId>:<turn>:<seq>`).

**Files to Update:**
- [docs/architecture/command-schema.md](../../architecture/command-schema.md) — add `nonce` to metadata block (lines ~1-20 and ~460-484); add a "Deduplication" section
- [content-schema/schemas/command.schema.json](../../../content-schema/schemas/command.schema.json) — add `nonce` to the required metadata
- [docs/architecture/glossary.md](../../architecture/glossary.md) — add "command nonce"

**New Files:** none.

**Implementation Steps:**
1. Specify nonce format: `"<playerId>:<turn>:<sequence>"` where
   sequence resets each turn per actor.
2. Update `command-schema.md` metadata section to include
   `nonce: string`.
3. Add a "Deduplication" section: dispatcher MUST reject commands
   whose nonce already appears in the current turn's log slice.
4. Update `command.schema.json` (require `nonce`, pattern-match the
   format).
5. Update every example command in `command-schema.md` to include a
   nonce.
6. Add a `glossary.md` entry.

**Dependencies:** none.

**Complexity:** M (touches every command example).

---

#### Issue 3.B-2: Dispatcher input queue & overflow policy

**Source:** Q15 (⚠ Partial), Missing Logic bullet 6

**Problem:**
A command **log** is defined; a command **input queue** is not. There
is no documented buffering, backpressure, or overflow rule. Single-
player turn-based play does not need one (synchronous `apply`), but
multiplayer lockstep (M5) does, and the design is silent.

**Impact:**
- Multiplayer ships without a queue contract → ad-hoc per-implementer
  buffering → divergence.
- AI co-actors and scripted scenarios cannot batch-submit commands
  safely.
- No defined behavior under network burst or replay fast-forward.

**Solution:**
Add a "Dispatcher Queue" section to `command-schema.md`:
- single FIFO queue per engine instance
- bounded capacity (recommend: 1024)
- overflow policy: hard reject + structured error (no silent drop)
- single-threaded drain (synchronous `apply` per dequeue)
- M5 lockstep wraps the queue with a network-frame demuxer; the
  per-engine queue contract does not change

**Files to Update:**
- [docs/architecture/command-schema.md](../../architecture/command-schema.md) — new "Dispatcher Queue" section
- [docs/architecture/state-flow.md](../../architecture/state-flow.md) — extend boundary table with queue ownership
- [docs/architecture/glossary.md](../../architecture/glossary.md) — add "dispatcher queue"

**New Files:** none.

**Implementation Steps:**
1. Draft the "Dispatcher Queue" section with capacity, overflow, and
   ordering rules.
2. Specify the structured overflow error shape
   (`{ kind: 'queue_overflow', capacity, queued }`).
3. Cross-link from `state-flow.md` boundary table.
4. Add `glossary.md` entry.

**Dependencies:** Issue 3.B-1 (nonce policy informs the dedup-on-enqueue rule).

**Complexity:** S

---

#### Issue 3.B-3: Cross-actor command ordering

**Source:** Q17 (❌ UNKNOWN), Missing Logic bullet 8

**Problem:**
Within a single player's turn, ordering is "as the player issues them".
Across actors (hotseat handoff, AI co-actors, multiplayer lockstep), no
canonical tie-breaker is defined. M5 lockstep cannot ship without one.

**Impact:**
- Hotseat handoff order is ambiguous.
- AI/UI co-actor turns may interleave non-deterministically.
- Multiplayer lockstep cannot agree on canonical ordering → desync.

**Solution:**
Document the cross-actor ordering rule in `command-schema.md`:
- single-player: trivial (one actor per turn)
- hotseat: turn order is `players[].turnOrder` (already in scenario
  schema); strict, no interleaving within a turn
- multiplayer lockstep (M5): commands per network frame are sorted by
  `(playerId asc, turn asc, sequence asc)` before dispatch
- AI co-actors are treated as players with deterministic
  `playerId`s

**Files to Update:**
- [docs/architecture/command-schema.md](../../architecture/command-schema.md) — new "Cross-Actor Ordering" section
- [docs/architecture/state-flow.md](../../architecture/state-flow.md) — link from turn-loop diagram
- [docs/architecture/glossary.md](../../architecture/glossary.md) — add "cross-actor ordering"

**New Files:** none.

**Implementation Steps:**
1. Draft the "Cross-Actor Ordering" section.
2. State explicitly that hotseat is single-actor-per-turn (no
   interleaving) and reference screen `63-hotseat-turn-handoff`.
3. Specify the M5 lockstep tuple `(playerId, turn, sequence)`.
4. Add `glossary.md` entry.

**Dependencies:** Issue 3.B-1 (sequence comes from the nonce format).

**Complexity:** S

---

### Schemas

#### Issue 3.C-1: `game-state.schema.json`

Covered by Issue 3.A-1 (the schema file is part of that task's
deliverable).

---

#### Issue 3.C-2: Extend `command.schema.json` with required `nonce`

Covered by Issue 3.B-1 (the schema update is part of that task's
deliverable). Listed here so the schema-matrix entry is not missed.

**Files to Update:**
- [docs/architecture/schema-matrix.md](../../architecture/schema-matrix.md) — note the `nonce` requirement in the command-schema row

---

### Determinism

#### Issue 3.D-1: RNG named sub-stream catalogue

**Source:** Q10 (⚠ Partial), Missing Logic bullet 4, Risks bullet "Determinism gaps via under-specified RNG sub-streams"

**Problem:**
`determinism.md` requires "PCG32 with named sub-streams" but never
enumerates the names. The first `rng.next()` call without a chosen
sub-stream silently couples unrelated systems and breaks replay
isolation.

**Impact:**
- Adding a new system later (e.g. luck) shifts every other system's
  RNG draws → all existing replays break.
- Cannot reason about per-system reproducibility independently.

**Solution:**
Author `docs/architecture/rng-streams.md` enumerating canonical
sub-stream names with the owning system. Initial catalogue (extend
during system implementation):

| Sub-stream | Owner | Used in |
|---|---|---|
| `damage` | rules / battle | damage rolls |
| `morale` | rules / battle | morale checks |
| `luck` | rules / battle | luck triggers |
| `mage-guild` | rules / town | spell selection at build time |
| `hero-traits` | rules / hero | starting traits, level-up secondary skill offers |
| `creature-growth` | rules / town | weekly growth variance (if any) |
| `treasure` | rules / world | adventure-map treasure rolls |
| `combat-init` | rules / battle | initiative tiebreak |
| `rmg` | content-runtime | random-map generation |
| `ai-decision` | ai | bot decision-tie-break (kept separate so AI changes never shift gameplay RNG) |

**Files to Update:**
- [docs/architecture/determinism.md](../../architecture/determinism.md) — link to new sub-streams doc
- [docs/architecture/glossary.md](../../architecture/glossary.md) — add "named sub-stream"
- `docs/architecture/state-shape.md` — `rngStreams` field references this catalogue once created in Issue 3.A-1

**New Files:**
- `docs/architecture/rng-streams.md`

**Implementation Steps:**
1. Draft the catalogue table above.
2. Document the rule: every `rng.next()` site MUST name its sub-stream
   at the call site; calls without a named stream are a CI failure
   (deferred to engine-impl task).
3. Document how new sub-streams are added (additive only; never
   rename; never reuse a retired name).
4. Cross-link from `determinism.md` and `state-shape.md`.

**Dependencies:** none.

**Complexity:** S

---

#### Issue 3.D-2: Runtime entity-ID allocator

**Source:** Q7 (⚠ Partial), Missing Logic bullet 3, Risks bullet "Mid-game ID collisions or non-determinism"

**Problem:**
Scenario-load IDs are stable. Mid-game minted IDs (recruited stacks,
captured mines, generated random-map objects, summoned units) have no
documented allocator. Two implementers will choose different schemes;
replays built on one will not load on the other.

**Impact:**
- Cross-machine replay breakage.
- Save/load corruption when a stack recruited in turn 12 has a
  different ID after reload.
- Multiplayer desync the moment any mid-game ID is minted.

**Solution:**
Document a deterministic allocator in `docs/architecture/id-allocator.md`:
- format: `<kind>:<turn>:<actorId>:<perTurnCounter>`
  (e.g. `stack:12:p1:003`)
- counter resets per turn per actor
- counter lives in `GameState.idCounters` (added to the state shape in
  Issue 3.A-1)
- never reused; never depends on wall-clock or insertion order across
  actors

**Files to Update:**
- [docs/architecture/glossary.md](../../architecture/glossary.md) — extend "Stable ID" entry to cover runtime IDs and link to allocator doc
- [docs/architecture/command-schema.md](../../architecture/command-schema.md) — note that commands minting new entities use this allocator
- `docs/architecture/state-shape.md` — add `idCounters` field once created in Issue 3.A-1

**New Files:**
- `docs/architecture/id-allocator.md`

**Implementation Steps:**
1. Draft the allocator format and counter-per-turn rule.
2. Enumerate which command kinds mint IDs (recruit, summon,
   capture-mine, RMG-spawn) and reference each from the allocator doc.
3. Specify replay safety: counter is part of state, so replays produce
   identical IDs.
4. Cross-link from `glossary.md`, `command-schema.md`,
   `state-shape.md`.

**Dependencies:** Issue 3.A-1 (`idCounters` lives in `GameState`).

**Complexity:** M

---

#### Issue 3.D-3: Fresh-session seed-source policy

**Source:** Q11 (⚠ Partial), Missing Logic bullet 5

**Problem:**
For loaded games and replays the seed comes from the saved triple. For
a brand-new session, the source is undocumented: scenario field? RMG
roll? UI input? Implementers will pick differently.

**Impact:**
- "New game" reproducibility ambiguous.
- RMG seed-rolling and scenario-fixed-seed cases collide.
- Tournament/competitive use cases (fixed seed) cannot be implemented
  reliably.

**Solution:**
Document in `command-schema.md` (`SCENARIO_LOAD` section) and
`determinism.md` the seed-source precedence:
1. Explicit user input (tournament, daily-challenge) — highest
2. Scenario `seed` field if present (fixed scenarios)
3. RMG `rollRmgSeed` command result (random maps)
4. Fallback: cryptographically strong random at session start, then
   pinned into the save's triple

In all cases the resulting seed is pinned into the command log
immediately on `SCENARIO_LOAD`.

**Files to Update:**
- [docs/architecture/command-schema.md](../../architecture/command-schema.md) — extend `SCENARIO_LOAD` section (lines ~392-413)
- [docs/architecture/determinism.md](../../architecture/determinism.md) — link from seed/RNG section
- [docs/architecture/glossary.md](../../architecture/glossary.md) — add "seed source"

**New Files:** none.

**Implementation Steps:**
1. Draft the precedence list.
2. Add UX hooks (which screens collect explicit seeds) — reference
   `docs/architecture/wiki/screens/` packages where relevant.
3. Cross-link from `determinism.md`.
4. Add glossary entry.

**Dependencies:** none.

**Complexity:** S

---

### Performance

#### Issue 3.E-1: Frame-time budget & degradation policy

**Source:** Q4 (❌ UNKNOWN), Missing Logic bullet 1, Risks bullet "No frame-time budget"

**Problem:**
60 FPS is an aspirational target. No frame-time threshold, no
documented degradation steps, no fallback rendering path. Tablets or
large adventure maps will silently miss the target.

**Impact:**
- Renderer regressions invisible until users complain.
- No automatic degradation → unplayable on lower-end devices.
- No criteria for accepting a renderer PR's perf characteristics.

**Solution:**
Add a "Frame-Time Budget & Degradation" section to
`renderer-technology-choice.md` and create
`docs/archive/readiness-audit/09-performance.md` (currently absent — referenced
in the Q4 evidence). Define the table:

| Frame time | Tier | Action |
|---|---|---|
| ≤ 16.7 ms | Green | Full render path |
| 16.8–25 ms | Amber | Drop non-critical animations (idle bobs, particle FX) |
| 25–40 ms | Orange | Disable layered animations entirely, freeze camera tweens |
| > 40 ms sustained 1 s | Red | Fall back to Canvas 2D / static map render |

Telemetry: report tier transitions to a debug overlay (toggleable),
not to disk by default.

**Files to Update:**
- [docs/architecture/renderer-technology-choice.md](../../architecture/renderer-technology-choice.md) — extend lines ~82-95 with the budget table and degradation steps
- [docs/architecture/glossary.md](../../architecture/glossary.md) — add "frame-time tier"

**New Files:**
- `docs/archive/readiness-audit/09-performance.md` (stub at minimum, with the budget questions answered)

**Implementation Steps:**
1. Draft the tier table.
2. Specify the sliding-window measurement (recommend: 60-frame
   rolling average to enter a tier, single bad frame to escalate
   to Red).
3. Author the `09-performance.md` audit file with at least Q4
   answered.
4. Cross-link from `renderer-technology-choice.md`.

**Dependencies:** none.

**Complexity:** M

---

### Tasks

The audit's gaps cleanly map to one or two implementation tasks each.
Each task should be authored under [tasks/](../../../tasks/) following the
template in existing task files, with `verifyCommands` that run the
schema validators and `npm run validate` to catch regressions.

#### Issue 3.F-1: Author task files for each plan section

**Source:** All sections above

**Problem:** The audit findings need to be enqueued into the task
system so `npm run tasks:next` surfaces them. Today they live only in
this plan.

**Solution:** For each issue 3.A through 3.E, create a Markdown task
under `tasks/architecture/` (or appropriate folder) with:
- frontmatter (id, status: planned, phase: mvp, owned paths,
  dependencies)
- a body that links back to this plan
- `verifyCommands` that runs `npm run validate` and any new
  schema-specific check

**Files to Update:**
- [tasks/task-registry.json](../../../tasks/task-registry.json) — regenerated by `npm run generate:task-registry`
- [docs/planning/implementation-log.md](../../../docs/planning/implementation-log.md) — append plan-derived task creation entries

**New Files:** one task file per issue (10 files), e.g.
- `tasks/architecture/arch-state-shape.md`
- `tasks/architecture/arch-module-graph.md`
- `tasks/architecture/arch-multi-engine-harness.md`
- `tasks/architecture/cmd-nonce.md`
- `tasks/architecture/cmd-dispatcher-queue.md`
- `tasks/architecture/cmd-cross-actor-ordering.md`
- `tasks/architecture/det-rng-streams.md`
- `tasks/architecture/det-id-allocator.md`
- `tasks/architecture/det-seed-source.md`
- `tasks/architecture/perf-frame-budget.md`

**Implementation Steps:**
1. Author each task file using an existing task as a template.
2. Wire dependencies: 3.A-1 → 3.A-3, 3.D-2; 3.B-1 → 3.B-2, 3.B-3.
3. Run `npm run generate:task-registry` and `npm run validate:tasks`.
4. Append a creation entry to `docs/planning/implementation-log.md`.

**Dependencies:** none — meta-task.

**Complexity:** M

---

## 4. Suggested Task Breakdown

- [ ] **arch-state-shape** — Author `state-shape.md` + `game-state.schema.json` + example (Issue 3.A-1)
- [ ] **arch-module-graph** — Add `dependency-cruiser` config + `validate:arch` script + `module-graph.md` (Issue 3.A-2)
- [ ] **arch-multi-engine-harness** — Author `multi-engine-harness.md` + glossary entry (Issue 3.A-3)
- [ ] **cmd-nonce** — Add `nonce` to command schema + dedup section + update all examples (Issue 3.B-1)
- [ ] **cmd-dispatcher-queue** — Add "Dispatcher Queue" section to `command-schema.md` + glossary (Issue 3.B-2)
- [ ] **cmd-cross-actor-ordering** — Add "Cross-Actor Ordering" section + glossary (Issue 3.B-3)
- [ ] **det-rng-streams** — Author `rng-streams.md` catalogue + glossary + cross-links (Issue 3.D-1)
- [ ] **det-id-allocator** — Author `id-allocator.md` + extend glossary + cross-link from `command-schema.md` (Issue 3.D-2)
- [ ] **det-seed-source** — Extend `SCENARIO_LOAD` with seed-source precedence + glossary (Issue 3.D-3)
- [ ] **perf-frame-budget** — Add tier table to `renderer-technology-choice.md` + author `09-performance.md` (Issue 3.E-1)
- [ ] **plan-task-files** — Create the 10 task files above and regenerate the registry (Issue 3.F-1)

---

## 5. Execution Order

Strict dependency order (each step's outputs are inputs to later steps):

1. **det-rng-streams** (3.D-1) — unblocks every reducer touching RNG; no upstream deps.
2. **arch-state-shape** (3.A-1) — defines `GameState`; required by id-allocator and multi-engine harness.
3. **det-id-allocator** (3.D-2) — needs `GameState.idCounters` from step 2.
4. **cmd-nonce** (3.B-1) — defines the nonce format used by ordering and queue.
5. **cmd-dispatcher-queue** (3.B-2) — depends on nonce dedup from step 4.
6. **cmd-cross-actor-ordering** (3.B-3) — uses nonce sequence from step 4.
7. **det-seed-source** (3.D-3) — independent; can run parallel to steps 4-6.
8. **arch-multi-engine-harness** (3.A-3) — depends on `GameState` shape from step 2.
9. **arch-module-graph** (3.A-2) — independent of doc changes; can land any time after step 1.
10. **perf-frame-budget** (3.E-1) — independent; can run parallel.
11. **plan-task-files** (3.F-1) — final wrap; ensures `npm run tasks:next` surfaces the work.

Parallelization windows: steps 7, 9, 10 can run any time. Steps 4–6
must run sequentially after step 1 and step 2.

---

## 6. Risks if Not Implemented

- **Replay corruption (very high).** Without RNG sub-streams (3.D-1)
  and the ID allocator (3.D-2), any replay is unreliable the moment a
  second system uses RNG or a mid-game entity is created. This breaks
  bug reports, tournaments, and the auto-balancer.
- **Multiplayer indefinitely deferred (high).** M5 lockstep needs the
  queue (3.B-2), nonce (3.B-1), and cross-actor ordering (3.B-3). All
  three are absent. Without them, there is no spec to implement
  against.
- **State-shape rewrite (high).** Skipping 3.A-1 forces every reducer
  to be rewritten when the shape is finally pinned. Cost grows
  super-linearly with implemented commands.
- **Architectural drift (medium).** Without 3.A-2's CI check, the
  first PR that crosses a boundary ships unchallenged. Recovery
  requires post-hoc untangling.
- **Performance regressions invisible (medium).** Without 3.E-1, the
  renderer can ship at 30 FPS on tablets and the team will not know
  until users report.
- **Replay portability ambiguity (medium).** Without 3.D-3, two
  installers will source the seed differently for a "new game" and
  bug reports will not reproduce.

---

## 7. AI Implementation Readiness

**Score after this plan: 9 / 10**

Once all eleven tasks land, an AI agent (or a human) implementing the
deterministic engine has every contract it needs on day one:
- top-level state shape and serialization rule
- command schema with nonce, queue, and cross-actor ordering
- RNG sub-stream catalogue
- ID allocator
- seed-source precedence
- module-graph fitness CI check
- multi-engine harness contract
- frame-time degradation policy

The remaining 1-point gap is the absence of actual runtime code — that
is by design (this repo is contracts-first). The AI-readiness ceiling
for a contracts-only repo is effectively 9/10; reaching 10/10 requires
shipping at least the engine reducer + command dispatcher so the
contracts are exercised in CI.
