# 1. CORE ARCHITECTURE

> Audit pass over the questions originally listed in this file. Each
> question is preserved verbatim and answered against the current repo
> state (mostly planning + contracts; very little runtime code yet).

---

### Q: 1. What is the exact tick rate of the main game loop, and is it fixed-step or variable-step?

**Status:** ⚠ Partial

**Answer:**
There is **no real-time simulation tick**. The game is turn-based and
command-driven: the engine advances strictly when a command is
dispatched (`state' = apply(state, command)`). There is no fixed
millisecond/Hz step in any deterministic path.
The **renderer** targets 60 FPS as a presentation goal, but is
explicitly decoupled from simulation step rate. No simulation tick
rate is defined anywhere because none is needed for the design.

**Evidence:**
- [docs/architecture/state-flow.md](../architecture/state-flow.md) — turn-loop diagram, no tick
- [docs/architecture/command-schema.md:13](../architecture/command-schema.md#L13) — `state' = apply(state, command)`
- [docs/architecture/renderer-technology-choice.md:83-95](../architecture/renderer-technology-choice.md#L83-L95) — 60 FPS render target, "decouple presentation from simulation step rate"

---

### Q: 2. Is the loop frame-driven, command-driven, or hybrid?

**Status:** ✔ Defined

**Answer:**
**Command-driven.** The engine is a pure reducer: every state
mutation is the application of a single serializable command. The
renderer is frame-driven and read-only, but that is presentation, not
the loop that owns state.

**Evidence:**
- [docs/architecture/command-schema.md:9-15](../architecture/command-schema.md#L9-L15)
- [docs/architecture/state-flow.md:56-58](../architecture/state-flow.md#L56-L58) — "F → O is the only path state changes take"
- [docs/architecture/overview.md:8-11](../architecture/overview.md#L8-L11)

---

### Q: 3. Does the loop separate simulation from rendering, and at what frequency does each run?

**Status:** ✔ Defined

**Answer:**
Yes — separation is a hard rule. Simulation runs only when commands
are dispatched (no fixed frequency). The renderer runs frame-driven
at a 60 FPS target and is read-only — it consumes state snapshots and
the event log, never calls back into simulation.

**Evidence:**
- [docs/architecture/state-flow.md:46-58](../architecture/state-flow.md#L46-L58) — boundary table; renderer is read-only
- [docs/architecture/renderer-technology-choice.md:46-51](../architecture/renderer-technology-choice.md#L46-L51) — "Renderer does not depend on simulation code"
- [docs/architecture/renderer-technology-choice.md:83-95](../architecture/renderer-technology-choice.md#L83-L95) — 60 FPS presentation target

---

### Q: 4. What is the maximum acceptable frame time before degradation kicks in?

**Status:** ✔ Defined

**Answer:**
A four-tier frame-time budget is documented in
[`renderer-technology-choice.md` § Frame-Time Budget &amp; Degradation](../architecture/renderer-technology-choice.md#frame-time-budget--degradation):

| Frame time | Tier | Action |
|---|---|---|
| ≤ 16.7 ms | Green | Full render path |
| 16.8–25 ms | Amber | Drop non-critical animations |
| 25–40 ms | Orange | Disable layered animations; freeze camera tweens |
| > 40 ms sustained 1 s | Red | Canvas 2D / static fallback |

Tier entry / exit uses a 60-frame rolling-average window (Red can
escalate on a single frame). Transitions surface via a toggleable
debug overlay; telemetry uploads are opt-in.

**Evidence:**
- [docs/architecture/renderer-technology-choice.md § Frame-Time Budget &amp; Degradation](../architecture/renderer-technology-choice.md#frame-time-budget--degradation)
- [docs/readiness-audit/09-performance.md](./09-performance.md) — companion audit entry
- [docs/architecture/glossary.md](../architecture/glossary.md) — "frame-time tier"

---

### Q: 5. Is the game state a single immutable tree, a mutable graph, or a normalized store?

**Status:** ⚠ Partial

**Answer:**
Conceptually a **single state value** consumed by a pure reducer
(`state' = apply(state, command)`), implying a tree-shaped value that
is replaced (or shallow-copied) per command. The exact shape — fully
immutable, structural sharing, or normalized — is not pinned down.
Tactical battle state is explicitly nested as its own sub-state with
its own command alphabet.

**Evidence:**
- [docs/architecture/command-schema.md:11-15](../architecture/command-schema.md#L11-L15) — pure reducer signature
- [docs/architecture/state-flow.md:50-58](../architecture/state-flow.md#L50-L58) — nested tactical reducer
- ⚠ No top-level `GameState` schema exists; no statement about immutability or normalization

---

### Q: 6. Is state stored as plain data, ECS components, or class instances?

**Status:** ✔ Defined

**Answer:**
**Plain data.** The whole architecture is "engine pure, rules data".
Records are JSON, schemas are authoritative, commands are pure data
("no methods, no side effects"), and the engineering guide forbids
god-objects and deep inheritance. There is no ECS in scope.

**Evidence:**
- [docs/architecture/overview.md:7-11](../architecture/overview.md#L7-L11)
- [docs/architecture/command-schema.md:11-15](../architecture/command-schema.md#L11-L15) — "Commands are pure data"
- [AGENTS.md:97-115](../../AGENTS.md#L97-L115) — patterns to prefer/avoid
- No ECS / component-store reference anywhere in `docs/architecture/`

---

### Q: 7. How are entity IDs allocated, and are they stable across saves and replays?

**Status:** ⚠ Partial

**Answer:**
Two ID layers exist:

- **Content stable IDs** — `<packId>:<kind>:<local>` strings, public
  API, never reused, aliased on rename. Allocated by pack authors;
  validated at load.
- **Runtime entity IDs** (heroId, townId, stackId, mineId, etc.) —
  string IDs "defined at scenario load" and required to be "stable
  across sessions". They are referenced by every command in the
  schema, so they must be identical across saves and replays for the
  command log to reproduce state.

What is **not** defined: the allocation algorithm for runtime IDs
(deterministic counter? hash of position + creation tick? prefix per
type?), and the rule for IDs created mid-game (e.g. recruited
stacks, captured mines, generated random-map objects).

**Evidence:**
- [docs/architecture/glossary.md:30-34](../architecture/glossary.md#L30-L34) — Stable ID definition
- [docs/architecture/command-schema.md:466-468](../architecture/command-schema.md#L466-L468) — "All string IDs … must be stable across sessions (defined at scenario load)"
- ❌ No documented allocator for mid-game ID minting

---

### Q: 8. Is determinism enforced via fixed-point math, seeded RNG, or both?

**Status:** ✔ Defined

**Answer:**
**Both, plus more.** The non-negotiable determinism stack is, in
order: seeded RNG (PCG32, named sub-streams), fixed-point math
(integer arithmetic with explicit num/den ratios), command dispatcher
(pure reducer), canonical serializer + xxh64 state hash, replay API,
fuzz harness. All six layers are mandatory.

**Evidence:**
- [docs/architecture/determinism.md:7-19](../architecture/determinism.md#L7-L19) — full stack
- [docs/architecture/overview.md:42-55](../architecture/overview.md#L42-L55) — required order

---

### Q: 9. Where exactly does floating-point math touch the simulation, if anywhere?

**Status:** ✔ Defined

**Answer:**
**Nowhere in the deterministic path.** Floats are explicitly
forbidden in gameplay math. Damage, HP, and resources are integers;
ratios are stored as paired numerator/denominator integers; `multiply
first, divide with floor last`. State numbers must serialize as
integer JSON literals — no exponents, no `Infinity`, no `NaN`.
Floats are only acceptable in non-deterministic surfaces such as
renderer transforms, camera, and tween interpolation.

**Evidence:**
- [docs/architecture/determinism.md:21-26](../architecture/determinism.md#L21-L26) — forbidden list
- [docs/architecture/determinism.md:40-52](../architecture/determinism.md#L40-L52) — fixed-point conventions
- [docs/architecture/determinism.md:62-67](../architecture/determinism.md#L62-L67) — cross-platform portability rules

---

### Q: 10. Is the RNG stream split per-system, per-entity, or global?

**Status:** ⚠ Partial

**Answer:**
**Per-named-sub-stream.** PCG32 with "named sub-streams" is required.
The naming convention (e.g. one stream per system: `damage`, `morale`,
`luck`, `mage-guild`; or per battle/turn) is not enumerated anywhere.
There is no global single-stream usage; that is the only constraint
explicitly stated.

**Evidence:**
- [docs/architecture/determinism.md:9-11](../architecture/determinism.md#L9-L11) — "PCG32 with named sub-streams"
- ❌ No catalogue of canonical sub-stream names anywhere in `docs/architecture/`

---

### Q: 11. How is RNG seeded for new games, loaded games, and replays?

**Status:** ⚠ Partial

**Answer:**
- **New games / scenarios:** the seed is supplied as part of the
  `SCENARIO_LOAD` command (`seed: number`). Pack content hashes are
  pinned at the same moment.
- **Loaded games:** the save's pinned `(seed, contentHashes,
  command log)` triple is replayed. A `contentHash` mismatch fails
  loud at load.
- **Replays:** identical to loaded games — `(seed, content hashes,
  ordered command log)` is the canonical triple.

What is **not** defined: how the seed is sourced for a brand-new
session (UI input? wall-clock at session start? `scenario.seed`
field? RMG seed via `rollRmgSeed` command?). The schema only states
that `SCENARIO_LOAD.seed` exists as a number.

**Evidence:**
- [docs/architecture/command-schema.md:392-413](../architecture/command-schema.md#L392-L413) — `SCENARIO_LOAD`
- [docs/architecture/state-flow.md:60-69](../architecture/state-flow.md#L60-L69) — `(seed, content hashes, command log)` triple
- [docs/architecture/determinism.md:55-59](../architecture/determinism.md#L55-L59) — content + engine hash pinning
- ❌ No documented seed-source policy for fresh sessions

---

### Q: 12. What is the canonical command schema (action, payload, actor, timestamp)?

**Status:** ✔ Defined

**Answer:**
Every command is a closed-schema JSON object with:

- `kind: <closed enum>` — discriminator
- per-kind payload fields (e.g. `heroId`, `path`, `townId`,
  `buildingId`, …)
- dispatcher-added metadata: `{ kind, …, turn: number,
  playerId: number }`
- no methods, no side effects, no circular references
- round-trips byte-equal under canonical JSON

There is **no wall-clock `timestamp`** — that would break
determinism. Logical ordering is "ordered command log" plus the
`turn` and `playerId` metadata.

**Evidence:**
- [docs/architecture/command-schema.md:1-20](../architecture/command-schema.md#L1-L20) — contract
- [docs/architecture/command-schema.md:460-468](../architecture/command-schema.md#L460-L468) — serialization contract
- [content-schema/schemas/command.schema.json](../../content-schema/schemas/command.schema.json) — closed-schema enumeration of every command kind

---

### Q: 13. Are commands the ONLY way to mutate state?

**Status:** ✔ Defined

**Answer:**
**Yes.** Stated as a hard rule in three places: `state' =
apply(state, command)` is the only mutation path; the UI emits
commands but "never mutates state directly"; the renderer "subscribes
to state; never mutates"; "no other mutation path exists".

**Evidence:**
- [docs/architecture/command-schema.md:11](../architecture/command-schema.md#L11) — "Commands are the only way to mutate game state"
- [docs/architecture/state-flow.md:54-58](../architecture/state-flow.md#L54-L58) — "F → O is the only path state changes take. … No other mutation path exists."

---

### Q: 14. Are commands validated before, during, or after dispatch?

**Status:** ✔ Defined

**Answer:**
**Before dispatch.** A `validate(command: unknown)` step returns
`{ valid: true, command } | { valid: false, error }` and is run
before the reducer is called. Validation is three layered checks:

1. Closed-schema validation (no `additionalProperties`)
2. Semantic validation (hero exists, resources available, etc.)
3. State validation (transition is legal for current `state.phase`)

**Evidence:**
- [docs/architecture/command-schema.md:471-484](../architecture/command-schema.md#L471-L484)
- Per-command "Validation:" sections throughout `command-schema.md`

---

### Q: 15. Is there a queue, and what happens when it overflows?

**Status:** ⚠ Partial

**Answer:**
A **command log** exists (commands are "logged in order for replay
and multiplayer sync"), and `BATTLE_WAIT` / battle initiative use a
domain-level queue. There is **no documented input/dispatch queue**
that buffers pending player commands, no documented backpressure,
and no overflow policy. Because the engine is turn-based and command
dispatch is synchronous (`apply`), a real input queue may not be
needed — but multiplayer lockstep (M5) will require one and the
design is silent on it.

**Evidence:**
- [docs/architecture/command-schema.md:13-15](../architecture/command-schema.md#L13-L15) — command log
- [docs/architecture/command-schema.md:248-285](../architecture/command-schema.md#L248-L285) — initiative queue (gameplay queue, not dispatcher queue)
- ❌ No mention of queue capacity, overflow, or backpressure in any architecture doc

---

### Q: 16. Are commands idempotent? If not, why?

**Status:** ⚠ Partial

**Answer:**
**No, commands are not idempotent**, and this is intentional. They
are atomic state transitions whose effects (consume MP, deduct
resources, advance day, append to log) inherently change state on
each application. Idempotency is unnecessary because:

- the command log is the source of truth and is append-only
- replays apply the log once in order
- multiplayer lockstep also applies each command once in agreed order

What is **not** explicitly defined: at-most-once delivery guarantees
at the network/UI boundary (what stops a UI button double-click or a
network retry from dispatching the same command twice?). This is
elided in the current docs.

**Evidence:**
- [docs/architecture/command-schema.md:11-15](../architecture/command-schema.md#L11-L15) — pure reducer; effects are state-mutating
- Per-command "Effects:" sections throughout `command-schema.md`
- ❌ No de-duplication / idempotency-key / nonce strategy documented

---

### Q: 17. How are commands ordered across multiple actors in the same tick?

**Status:** ❌ UNKNOWN

**Answer:**
There is no concept of a "tick" because the loop is turn-based and
synchronous. Within a player's turn, commands are dispatched
sequentially in the order the player issues them and appended to the
log. **Cross-player ordering** is not specified: there is no
documented policy for hotseat handoff order beyond the screen
(`63-hotseat-turn-handoff`), and no lockstep ordering rule for
multiplayer (M5 deferred). Battle initiative ordering for tactical
units is documented (initiative queue), but that is unit ordering,
not multi-actor command ordering.

**Evidence:**
- [docs/architecture/command-schema.md:14-15](../architecture/command-schema.md#L14-L15) — "logged in order"
- [docs/architecture/glossary.md:128-131](../architecture/glossary.md#L128-L131) — M5 lockstep deferred
- ❌ No documented tie-breaker or canonical multi-actor ordering rule

---

### Q: 18. What is the explicit boundary between engine, UI, AI, and network layers?

**Status:** ✔ Defined

**Answer:**
Boundaries are pinned by directory and contract:

| Layer | Path | Role |
|---|---|---|
| Engine (sim) | `src/engine/` | Deterministic reducer, command dispatch, replay |
| Rules | `src/rules/` | Formula AST evaluator |
| Content runtime | `src/content-runtime/` | Pack loading, override resolution, hash pinning |
| Renderer | `src/renderer/` | Read-only snapshot/event-log consumer |
| UI | `src/ui/` | Emits commands; never mutates state |
| AI | `src/ai/` | Bots and balancing; emits commands like UI does |
| Network | `src/net/` | Lockstep multiplayer transport |
| Persistence | `src/persistence/` | Saves, replays, scenarios |

Direction of dependency: high-level (UI/AI/net) depends on engine
contracts; engine depends only on schemas/registries (dependency
inversion).

**Evidence:**
- [docs/architecture/overview.md:25-41](../architecture/overview.md#L25-L41) — repo shape table
- [docs/architecture/state-flow.md:46-58](../architecture/state-flow.md#L46-L58) — boundary responsibilities
- [AGENTS.md:82-115](../../AGENTS.md#L82-L115) — SOLID-style boundary rules

---

### Q: 19. Can the engine run with zero UI attached?

**Status:** ✔ Defined

**Answer:**
**Yes, by design.** The engine is a pure reducer with no I/O, no
timing, and no UI dependency. Headless usage is required for: the
fuzz harness ("N random commands replayed bit-identically"), the
auto-balancer ("headless-battle runner"), and the replay API. The
renderer "does not depend on simulation code" — and the engine
likewise does not depend on the renderer or UI.

**Evidence:**
- [docs/architecture/determinism.md:18-19](../architecture/determinism.md#L18-L19) — fuzz harness
- [docs/architecture/glossary.md:115-118](../architecture/glossary.md#L115-L118) — headless auto-balancer
- [docs/architecture/state-flow.md:48-54](../architecture/state-flow.md#L48-L54) — engine has no UI dependency

---

### Q: 20. Can two engines run in the same process for hot-loaded comparison?

**Status:** ⚠ Partial

**Answer:**
**Implicitly yes**, but not stated as an explicit goal. Because the
engine is a pure reducer over plain data with no globals, no
singletons, and no `Math.random()`/wall-clock dependencies, two
engine instances should be trivially constructable side-by-side.
This is a direct prerequisite of the desync-detection use case
("multiplayer lockstep, and desync detection all pin on `(seed,
content hashes, command log)`"). However, no architecture doc
explicitly authorizes or describes a multi-engine harness, and there
is no test fixture or wrapper documented for it.

**Evidence:**
- [docs/architecture/state-flow.md:60-65](../architecture/state-flow.md#L60-L65) — desync detection rationale (implies parallel engines)
- [docs/architecture/command-schema.md:11-15](../architecture/command-schema.md#L11-L15) — purity of reducer
- ❌ No "multi-engine harness" doc

---

### Q: 21. Is there a hard rule preventing UI from mutating state directly?

**Status:** ✔ Defined

**Answer:**
**Yes, hard rule.** The UI "emits commands; never mutates state
directly". The state-flow diagram explicitly states: "F → O is the
only path state changes take. … No other mutation path exists."
This is reinforced by the command schema: "Commands are the only way
to mutate game state."

**Evidence:**
- [docs/architecture/state-flow.md:54-58](../architecture/state-flow.md#L54-L58)
- [docs/architecture/command-schema.md:3-15](../architecture/command-schema.md#L3-L15)

---

### Q: 22. What enforces system boundaries — types, modules, runtime checks, or convention?

**Status:** ⚠ Partial

**Answer:**
A **layered combination**, but mostly contract + convention today:

- **Schemas + types** — commands are validated against
  `command.schema.json` (closed schema, no `additionalProperties`);
  formulas are validated AST data, not strings.
- **Module boundaries** — directory split (`src/engine/`,
  `src/renderer/`, …) plus AGENTS.md SOLID-style rules and
  task-system "Owned Paths" enforcement (`npm run validate:tasks`).
- **Runtime checks** — `contentHash` / `engineHash` pinning at load,
  formula AST evaluator (rejects raw strings), no `eval` /
  `new Function`.
- **Convention** — "patterns to avoid" list (no god-objects, no
  hardcoded factions in engine code, no raw asset paths in gameplay
  data); enforced by review and the validation scripts in AGENTS.md.

What is **not** in place yet: there is no documented module-graph
linter, no architectural-fitness function (e.g. dependency-cruiser or
ts-arch). Most actual code is not yet written, so type-level
enforcement is largely aspirational.

**Evidence:**
- [docs/architecture/command-schema.md:471-484](../architecture/command-schema.md#L471-L484) — schema validation
- [docs/architecture/determinism.md:21-38](../architecture/determinism.md#L21-L38) — runtime forbiddances
- [AGENTS.md:140-160](../../AGENTS.md#L140-L160) — task-system ownership enforcement
- ❌ No documented architectural-fitness check / module-graph linter

---

### Q: 23. Is there a kernel/driver split, and what lives in each?

**Status:** ⚠ Partial

**Answer:**
The repo does **not use the term "kernel/driver"**, but the design
maps onto the equivalent shape:

- **Kernel** (deterministic core) — `src/engine/` (reducer,
  dispatcher, RNG, fixed-point), `src/rules/` (formula AST eval),
  `src/content-schema/` (validation, migrations).
- **Drivers** (adapters at boundaries) — `src/content-runtime/`
  (pack loader), `src/renderer/` (read-only presentation),
  `src/ui/` (input → command emission), `src/net/` (transport),
  `src/persistence/` (save/load + replay), `src/ai/` (bot
  command-emission). AGENTS.md calls these "adapters at
  boundaries: pack loader, schema validator, renderer asset
  resolver".

The split is real and explicit; only the terminology differs.

**Evidence:**
- [docs/architecture/overview.md:25-41](../architecture/overview.md#L25-L41)
- [docs/architecture/state-flow.md:46-58](../architecture/state-flow.md#L46-L58)
- [AGENTS.md:97-115](../../AGENTS.md#L97-L115) — "adapters at boundaries"

---

### Q: 24. What is the dependency graph between core systems, and is it acyclic?

**Status:** ⚠ Partial

**Answer:**
The intended dependency graph is acyclic and unidirectional:

```
content-schema  ←  rules            ←  engine  ←  ai
       ↑              ↑                  ↑       ←  ui      → (emit) → engine
       │              │                  │       ←  net
       │              │                  ↑
       │              └──────────────────┤
       └────── content-runtime ──────────┘
                                          ↑
                                  persistence (save/load + replay)
                                          ↑
                                   renderer (read-only)
```

Stated rules that imply acyclicity:
- engine "should not know specific factions / asset file paths"
- renderer "does not depend on simulation code" and "never calls back"
- UI / AI / net only emit commands into the engine
- high-level systems depend on schemas/registries, not on
  hardcoded content (dependency inversion)

What is **not** in place:
- no documented graph artifact (e.g. a `dependency-graph.md` or
  generated `madge` / `dependency-cruiser` report)
- no automated cycle detection in CI for the `src/` graph
  (the task-system already validates *its* dependency graph for
  cycles via `npm run validate:tasks`, but that is task ordering,
  not module imports)

So: the **design is acyclic**, but **acyclicity is not enforced**
yet for runtime modules.

**Evidence:**
- [docs/architecture/overview.md:14-22](../architecture/overview.md#L14-L22) — what the engine should/should not know
- [docs/architecture/state-flow.md:46-58](../architecture/state-flow.md#L46-L58) — boundary table
- [AGENTS.md:90-115](../../AGENTS.md#L90-L115) — dependency-inversion + adapters
- [AGENTS.md:140-148](../../AGENTS.md#L140-L148) — task-graph cycle check (not module-graph)
- ❌ No runtime module-graph artifact or CI cycle check

---

## 🔍 Summary

### Missing Logic

- **Frame-time degradation policy (Q4):** no threshold, no fallback path
  (e.g. drop animation layer, cut to Canvas 2D, throttle event log
  playback).
- **Top-level `GameState` shape (Q5):** no schema. Immutability,
  structural sharing, and normalization are not pinned.
- **Runtime entity-ID allocator (Q7):** mid-game ID minting (recruited
  stacks, generated random-map objects) has no documented
  deterministic allocation rule.
- **RNG sub-stream catalogue (Q10):** "named sub-streams" required, but
  the canonical names (`damage`, `morale`, `luck`, `mage-guild`, …)
  are not enumerated anywhere.
- **Fresh-session seed source (Q11):** how a brand-new game derives
  its seed is undocumented (UI input vs. `rollRmgSeed` vs. scenario
  field).
- **Command-dispatcher input queue & overflow policy (Q15):** no
  buffering, backpressure, or capacity rule. Required before
  multiplayer (M5).
- **Command de-duplication / idempotency keys (Q16):** at-most-once
  delivery at UI / network boundary is not addressed.
- **Cross-actor command ordering (Q17):** no canonical tie-breaker
  for multi-player or AI co-actor turns; M5 lockstep ordering rule
  absent.
- **Multi-engine / desync-detection harness (Q20):** implied by
  desync rationale, never specified.
- **Module-graph cycle enforcement (Q22, Q24):** no `dependency-cruiser`
  or equivalent CI check; acyclicity is design intent, not enforced.

### Risks

- **Determinism gaps via under-specified RNG sub-streams.** A team
  member adds `rng.next()` without choosing a named sub-stream, and
  state silently diverges across replays.
- **Mid-game ID collisions or non-determinism.** Without a documented
  allocator, two implementers will pick different schemes; replays
  built on machine A will not load on machine B.
- **UI / network double-dispatch.** Without a nonce or idempotency
  key on commands, a rebroadcast or rapid double-click can append a
  duplicate command to the log and corrupt replays.
- **Multiplayer ordering ambiguity.** M5 lockstep cannot ship
  without a documented cross-actor ordering rule; current docs leave
  it implicit.
- **Architectural drift.** "Engine pure / renderer read-only" is
  policy-only today. The first PR that imports `src/renderer/` from
  `src/engine/` will pass review unless a fitness function is added.
- **No frame-time budget.** Without a degradation policy, the
  renderer will silently violate its own 60 FPS target on tablets or
  large maps with no automated signal.

### Improvements

- Add `docs/architecture/state-shape.md` defining the top-level
  `GameState` tree, immutability strategy, and normalization rule.
- Add `docs/architecture/rng-streams.md` enumerating canonical
  sub-stream names with the system that owns each.
- Document the runtime ID allocator (deterministic counter or hash)
  and pin it in `glossary.md`.
- Extend `command-schema.md` with: idempotency-key/nonce field,
  dispatcher input-queue policy, and cross-actor ordering rule for
  multiplayer.
- Add a CI architectural-fitness check (e.g. `dependency-cruiser` or
  `ts-arch`) so the design's acyclic boundary graph is enforced, not
  just stated.
- Add a frame-time budget + degradation table to
  `09-performance.md` and `renderer-technology-choice.md`.

### AI-Readiness

Score: **6.5 / 10**

Reason: Determinism, command schema, and layer boundaries are well
specified — enough that an AI agent can implement the engine reducer,
formula evaluator, and command dispatcher with high confidence. But
several adjacent contracts an autonomous implementer will hit on the
*first day* of work are missing or under-specified: top-level state
shape, RNG sub-stream names, mid-game ID allocator,
command-idempotency/nonce, queue + overflow, multi-actor ordering,
and module-graph cycle enforcement. Each gap is small and resolvable
in a focused doc edit, but together they force AI agents to invent
conventions ad hoc — which directly threatens the determinism
guarantees that the rest of the design depends on.
