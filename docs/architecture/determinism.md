# Determinism

> State-hash primitive (xxh64) is catalogued in
> [`crypto-primitives.md`](./crypto-primitives.md).

Hard constraint: the same seed, the same commands, and the same content
hashes produce the same state on any machine, any time.

> Companion docs: this file enumerates what is **forbidden** in the
> deterministic core. The per-module ledger of *permitted* side effects
> lives in [`side-effect-matrix.md`](./side-effect-matrix.md), and the
> data-flow boundaries that protect determinism live in
> [`state-flow.md`](./state-flow.md).

## Non-Negotiable Stack

The engine must provide these, in this order:

1. **Seeded RNG** (PCG32 with named sub-streams, no
   `Math.random()`). The canonical sub-stream catalogue lives in
   [`rng-streams.md`](./rng-streams.md); every `rng.next()` site
   MUST cite a stream from that table.
2. **Fixed-point math** (integer arithmetic with explicit
   numerator/denominator ratios).
3. **Command dispatcher** (pure reducer: `state = apply(state, command)`).
4. **Canonical serializer + state hash** (sorted keys, no whitespace,
   xxh64 over canonical bytes).
5. **Replay API** (seed + command log reproduces final state). The
   seed itself is resolved by the precedence list in
   [`command-schema.md` § Seed Source Precedence](./command-schema.md#seed-source-precedence)
   and pinned into `SCENARIO_LOAD`.
6. **Fuzz harness** (N random commands replayed bit-identically). The
   companion **multi-engine harness** runs two `createEngine()`
   instances in parallel and compares hashes per step; see
   [`multi-engine-harness.md`](./multi-engine-harness.md). The fuzz
   harness's Node-only output is additionally cross-validated against
   the browser engines pinned by
   [`runtime-requirements.md` RR-08](./runtime-requirements.md#rr-08-browser-engine-floor)
   and RR-09 by the Playwright job owned by
   [`tasks/mvp/01-engine-core/09b-cross-environment-canonical-bytes-test.md`](../../tasks/mvp/01-engine-core/09b-cross-environment-canonical-bytes-test.md).

## Forbidden In Deterministic Paths

- `Math.random()` and `Date.now()` / `performance.now()`.
- JavaScript floats in gameplay math.
- `eval` / `new Function(...)` / runtime-parsed formula strings.
- Map/Set iteration where order matters without an explicit sort.
- Async timing (no `setTimeout`-based race decisions).
- **Wall-clock-driven AI truncation.** AI search budgets are pure
  functions of difficulty and game-state size (`maxNodes`,
  `maxDepth`); a wall-clock timer may run as a warn-only watchdog
  but MUST NOT truncate the search. See "AI Compute Budget" below
  and [`performance.md` § 6](./performance.md#6-ai-compute-budget).
- **Hosted AI-provider calls.** `GenerationRequest.seed` is a
  best-effort reproducibility hint only — provider output is not
  guaranteed deterministic. Determinism in the AI generation
  pipeline begins at Stage 4 onward, once shape and coherence have
  been validated. See
  [`ai-generation-pipeline.md` § Determinism boundary`](./ai-generation-pipeline.md#determinism-boundary).

### Signaling and lobby identifiers — CSPRNG mandate

Signaling-server room codes, room secrets, and any other
lobby-identifier surface MUST use a cryptographically-secure RNG
(`crypto.randomBytes` server-side). The deterministic engine PRNG
(PCG32) is forbidden in `services/signaling/`. Lobby identifiers do
not enter `state.*` and are therefore outside the determinism
contract; they are governed by
[`lobby-identifiers.md`](./lobby-identifiers.md).

## AI Compute Budget

The AI search budget is part of the determinism contract. Two
identically-seeded clients on different hardware MUST produce
identical commands during AI turns.

The budget is a deterministic iteration / node-count limit keyed
by difficulty and map size:

- AI workers stop when `nodesExpanded >= maxNodes(difficulty,
  mapDims)` or `searchDepth >= maxDepth(difficulty)`, whichever
  fires first.
- The wall-clock timer remains, **only as a watchdog**, that logs
  a warning if a single AI move exceeds 2 s on the current
  machine. It never truncates the search. An over-budget
  difficulty level is a bug, tuned against the bench harness's
  Scenario C — not silently absorbed at runtime.
- The per-difficulty `maxNodes` / `maxDepth` constants are pinned
  in
  [`ai-contract.md` § 4 Per-Turn Budget Table](./ai-contract.md#4-per-turn-budget-table)
  (the **only authoritative source**). The implementing tasks
  ([Pawn / Knight](../../tasks/mvp/10-heuristic-ai/05-difficulty-levels-pawn-and-knight.md),
  Grand Master, Lord, Immortal — see ai-contract.md § 4 Implementing
  tasks) cite that table; do not duplicate the numbers elsewhere.
  The worker-side enforcement is owned by
  [`tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md`](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md).
- Wall-clock hard-timeout fallbacks are permitted **only** in the
  broadcaster-elected AI worker; non-broadcaster peers consume the
  resulting `Command` from the lockstep log. See
  [`ai-contract.md` § 6 (AI Determinism Under Wall-Clock Budgets)](./ai-contract.md#ai-determinism-under-wall-clock-budgets)
  for the structural rule that keeps replay deterministic even
  when machine speed determines whether `wallClockHardMs` fires.

The fuzz harness
([`tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md`](../../tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md))
includes a `searchBudget` determinism case: identical seed +
state + budget on two simulated rate environments produces
identical commands.

## Pathfinder Cache Invariants

Memoization of pure pathfinder results is determinism-safe:
`findPath(...)` and `reachable(...)` are pure functions of
`(map, terrain, src, mpBudget, zocTiles)`, so a cache hit returns
the same value as a cache miss.

The cache key includes `mapVersion` and `zocVersion`, which are
fields on `GameState` (additive `number`, default `0`) bumped
deterministically by the command dispatcher:

- `mapVersion` increments on any command that mutates terrain
  (terraform-effect, bridge-built).
- `zocVersion` increments on any command that changes hero
  occupancy of a tile (hero-move, hero-spawn, hero-defeat).

The cache is flushed at every End-Day turn boundary as a
belt-and-braces guard. Implementation is owned by
[`tasks/mvp/03-map-system/11-pathfinder-cache.md`](../../tasks/mvp/03-map-system/11-pathfinder-cache.md);
the version-bump invariants are owned by
[`tasks/mvp/01-engine-core/06-command-dispatcher.md`](../../tasks/mvp/01-engine-core/06-command-dispatcher.md).

## Formulas Are Data

Ruleset formulas live as structured fixed-point ASTs (see
[`content-schema/schemas/formula.schema.json`](../../content-schema/schemas/formula.schema.json)),
not strings. The evaluator is a small pure function over named
variables: `add`, `sub`, `mul`, `divFloor`, `ratio`, `min`, `max`,
`clamp`, `neg`, `abs`.

This avoids a second parser, prevents code-injection via packs, and
keeps determinism portable across languages.

## Fixed-Point Conventions

- Damage, HP, and resources are integers.
- Ratios are stored as paired constants (e.g.
  `atkBonusPerPointNum=1, atkBonusPerPointDen=20` for 0.05 per ATK
  differential).
- Multiply first, divide with floor last. Document overflow bounds in
  the ruleset.
- Caps live as integer **stat-differential points**, not percent of
  base. `atkBonusCap=60` and `defReductionCap=60` are clamped before
  the per-point ratio is applied. The JSON
  ([`baseline.ruleset.json`](../../content-schema/examples/records/rulesets/baseline.ruleset.json))
  is the single source of truth; update it first and re-run
  `npm test` before editing this prose.

## Saturation policy

Cross-cutting overflow handling is pinned in
[`edge-cases-policy.md` § 6](./edge-cases-policy.md#6-overflow--saturation-q210).
The rule is `clamp` saturates at the cap; never wraps.

| Constant | Value | Scope |
|---|---|---|
| `MAX_RESOURCE` | `2_000_000_000` | per resource per player |
| `MAX_UNIT_COUNT` | `1_000_000` | per stack |
| `MAX_HERO_STAT` | ruleset-pack-driven (default `99`) | per primary stat |
| `MAX_INTERMEDIATE` | `2 ** 53 - 1` | every formula step |

- Dev builds raise `OverflowError` when an intermediate result
  exceeds `MAX_INTERMEDIATE`.
- Prod builds saturate to the documented cap and emit a
  warn-level telemetry counter; never wrap.
- The constants themselves live in `src/engine/constants.ts`.
  Schemas reference the maxima via `content-schema/schemas/numeric.json`
  (see [`command-schema.md` § Numeric invariants](./command-schema.md#numeric-invariants)).
- The fuzz target `tests/fuzz/overflow.fuzz.ts` is owned by
  [`tasks/phase-2/09-quality/01-overflow-fuzz.md`](../../tasks/phase-2/09-quality/01-overflow-fuzz.md)
  and asserts the saturation policy under near-`MAX_INTERMEDIATE`
  inputs.

## State-shape invariants

The canonical state serializer asserts the following after every
accepted dispatch; cross-cutting policy lives in
[`edge-cases-policy.md` § 7](./edge-cases-policy.md#7-negative-resources-q211).

- `state.players[*].resources[k] ≥ 0` for every `k`.
- Every `unit.count ≥ 0` everywhere a stack is stored.
- Drain-against-zero floors at `0`; no debt accumulates (see
  [`effect-registry.md` § Drain semantics](./effect-registry.md#drain-semantics)).

Dev builds raise `InvariantViolation`; prod builds clamp to `0` and
emit a warn-level telemetry counter. The serializer is the single
chokepoint, so a future reducer bug or malformed pack cannot leak a
negative balance to UI render code.

## Wall-clock readers

`Date.now()` and wall-clock time are forbidden in deterministic paths
(see "Forbidden In Deterministic Paths" above and the lint rule in
[`tasks/mvp/01-engine-core/11-no-wall-clock-lint.md`](../../tasks/mvp/01-engine-core/11-no-wall-clock-lint.md)).
The exhaustive list of subsystems allowed to read wall-clock and
their behavior on a backward / DST jump:

| Subsystem | Reads | On jump |
|---|---|---|
| `SaveRecord.metadata.createdAt` | wall-clock at save time | captures the jumped value; sort uses `max(savedAt, createdAt)` for stability |
| `SaveRecord.metadata.savedAt` | wall-clock at save time | as above |
| Save-list "modified N minutes ago" | `Date.now() - savedAt` | display only; negative values render as "just now" |
| Signaling-server room TTL | wall-clock | server-side; client reads server time; immune to client clock |
| Renderer rAF delta-time | `performance.now()` (monotonic) | immune |
| Audio scheduling | `audioContext.currentTime` (monotonic) | immune |

No other subsystem may read wall-clock. The lint rule scopes the ban
to `src/engine/`, `src/rules/`, `src/content-runtime/`,
`src/net/webrtc/` (the M5 lockstep transports already covered by the
existing rule).

## Content Hash + Engine Hash

Every pack manifest carries a `contentHash` (canonical-JSON digest of
all records) and an `engineHash` (build digest). Saves, replays, and
multiplayer pin both. Any mismatch fails loud at load time; never
silent.

### Seed Establishment Protocol — Multiplayer

In **single-player and replay-from-save**, the seed is pinned by
save metadata per the precedence list in
[`command-schema.md` § Seed Source Precedence](./command-schema.md#seed-source-precedence).

In **multiplayer**, the seed is **always** the output of the
three-phase commit-reveal handshake pinned in
[`match-handshake.md`](./match-handshake.md):

```text
seed = xxh64( bytes(nonceA) || bytes(nonceB) )    // lex peerId order
```

The host-unilateral path is forbidden in multiplayer; both peers
contribute equal entropy, and `(contentHash, engineHash,
packManifestDigest, bundleSha256)` are mutually verified before any
`seq=0` envelope is permitted.

Tamper detection that the seed binding does not catch — information
leaks via local memory read, host-side speculative apply, etc. — is
covered by
[`security-model.md`](./security-model.md). Read it before designing
any feature that depends on hidden information.

## Save Artifact Byte Determinism

The save artifact's gzip layer is pinned to **`pako` at level 6** so
on-disk bytes are reproducible across machines for the same canonical
input (see
[`tasks/mvp/08-persistence/02-log-only-save-format.md`](../../tasks/mvp/08-persistence/02-log-only-save-format.md) §
"Compression contract"). The pin applies to the save artifact only —
it is **not** part of the determinism contract for engine state
itself, which is owned by the canonical serializer + xxh64 hash above.

Two saves of the same `stateHash` produce identical
`canonicalContentHash` (xxh64 over the content-bearing subset of the
record, excluding dynamic metadata: `id`, `name`, `createdAt`,
`savedAt`, `mp`). Full on-disk byte equality across arbitrary saves
is **not** a contract; canonical-content-hash equality is. The
fuzz-harness CI gate
([`tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md`](../../tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md))
asserts this equivalence by re-saving and re-loading every fixture
and comparing `canonicalContentHash` and post-replay `stateHash`.

## Golden-State Regression

Differential fuzz catches non-determinism between two live engine
instances; it does not catch an unintended *intentional* rule
change that silently shifts a canonical state hash. The golden-
state regression suite owned by
[`tasks/mvp/01-engine-core/12-golden-state-suite.md`](../../tasks/mvp/01-engine-core/12-golden-state-suite.md)
is the canonical drift sentinel: every fixture under
`tests/__fixtures__/golden/` pins
`(scenarioId, seed, commandLog) → expectedStateHash`, and a drift
fails CI with a canonical-JSON diff. Blessing is gated behind a
human-only `test:golden:bless` script that refuses to run in CI.

The replay-regression suite owned by
[`tasks/mvp/01-engine-core/13-replay-regression-suite.md`](../../tasks/mvp/01-engine-core/13-replay-regression-suite.md)
extends the same pattern to checked-in replay artifacts under
`tests/replays/`: every fixed mechanics bug ships with one replay
that fails before the fix and passes after, locking the fix forever.

The deterministic NetSim transport pinned in
[`net-transport.md`](./net-transport.md) is PCG32-seeded; chaos test
failures owned by
[`tasks/phase-3/01-multiplayer/12-network-chaos-harness.md`](../../tasks/phase-3/01-multiplayer/12-network-chaos-harness.md)
are reproducible by `(seed, scenario)` alone.

## Snapshot Rebase

Saves bound their command log via snapshot-and-rebase
([`tasks/mvp/08-persistence/07-snapshot-rebase.md`](../../tasks/mvp/08-persistence/07-snapshot-rebase.md)).
The contract:

> Replay from `(snapshot, log_since_snapshot)` is **bit-identical**
> to replay from `(seed, full_log)` for any verified snapshot.

A snapshot is a canonical-JSON serialization of `GameState` hashed
with the same xxh64 used for `stateHash`. Restoring from a snapshot
does **not** weaken the determinism guarantee — the canonical
serializer and the reducer are the only sources of truth, and a
snapshot is just a memoized prefix of the replay.

## Tamper Detection vs. Forgery

The xxh64 `stateHash` and `canonicalContentHash` detect **accidental**
corruption and replay drift. They do **not** detect adversarial
forgery: xxh64 is non-keyed, so a motivated user can re-author the
command log and re-hash. This is acceptable for single-player and
cooperative multiplayer (where per-turn state-hash exchange catches
divergence), but any future ranked / leaderboard / tournament feature
must add an HMAC over `canonicalContentHash` keyed by a server-issued
match secret.

That work is **deferred to the phase that introduces ranked mode**.
The gap is documented here so the implementer of that phase does not
have to design the scheme under shipping pressure.

## Cross-Platform Portability

- All state numbers serialize as integer JSON literals. No exponents,
  no `Infinity`, no `NaN`.
- String order is Unicode-codepoint ascending.
- Map iteration uses explicit sorted keys where it affects state.

## UI Draft Slice

The UI may render optimistic placeholders bound to draft state under
`state.ui.<screen>.draft.*`. Drafts are excluded from the canonical
serializer input and never enter the command log. This rule is the
sole exception to "every state shape is reducer-owned"; it is pinned
in [`ui-frame-lag-contract.md` § Optimistic UI](./ui-frame-lag-contract.md#2-optimistic-ui).
Drafts must clear when the matching command resolves; persisting a
draft across save/load is a determinism leak.

## UI Selector Purity

Selectors live in `src/ui/` and the UI layer is non-deterministic at
the input boundary, but selectors themselves MUST be pure functions
of state. The full rule — no `Math.random()`, `Date.now()`,
`performance.now()`, `crypto.randomUUID()`, no async, no I/O, no
module-level mutable state — is pinned in
[`ui-state-contract.md` § Selector Purity](./ui-state-contract.md#selector-purity).
A selector that consults the wall clock or local storage will
diverge between M5 peers even when the state is identical, producing
apparent UI desync invisible to the hash-based replay check.

## Event-Log Re-entry Guard

The dispatcher returns `events: Event[]` alongside the next state on
every accepted command. Consumers (animation timeline, sound system)
iterate the log read-only on their own clock; they MUST NOT call
`dispatch` from inside log iteration. Chained gameplay behaviour
(e.g. arrival → mine capture → battle) is modelled as a chain of
**commands**, never as a chain of events, and is bounded by
`MAX_COMMAND_CHAIN_DEPTH = 8` per outer command. The full contract,
including retention, save/load, and error-isolation rules, lives in
[`event-system.md`](./event-system.md). Replays re-derive events
from the command log — events are never serialized into saves.

## Single-emit Per Input Gesture

The reducer is synchronous; `requestAnimationFrame` and React
batching can deliver two browser events in the same logical frame.
To keep the command log identical across input modalities and across
M5 peers, the DOM shell enforces a per-control debounce token: a
gesture starts at `pointerdown` / `keydown` and ends at `pointerup` /
`keyup`, and emits at most one command per gesture. First-event-wins
on click + hotkey races. The full rule lives in
[`ui-input-arbitration.md`](./ui-input-arbitration.md).

## Multiplayer Determinism Appendix

The four sections below pin operational rules that the M5 lockstep
transport, snapshot-resync recovery, bot scheduling, and
non-deterministic time sources rely on. They are part of the
determinism contract — a multiplayer match that violates any of them
will desync.

### Canonical Command Key

Every command on the wire is keyed by `(playerId, seq)` where
`playerId` is the multiplayer peer slot and `seq` is the per-peer
monotonic sequence number assigned at emit time. The pair is the
**primary key on the command log**: the lockstep transport drops
duplicates silently before they reach the reducer and emits the
counter `dup_command_dropped_total` to telemetry.

This rule is what makes reconnection (Task 6) safe: the log-range
response from the host will overlap commands the client already
replayed, and the dedupe set is the single point that prevents
double-application. Implementers MUST treat `(playerId, seq)` as a
contract, not a hint.

### Clock Policy

Wall-clock readings (`Date.now()`, `performance.now()`,
`crypto.randomUUID()`'s embedded timestamp, `Intl.DateTimeFormat()`
with `now`) are forbidden in `state.*` (the deterministic slice that
feeds the canonical serializer and the per-turn state hash). They
are allowed only in:

- `state.net.*` — the non-deterministic networking namespace
  (heartbeat scheduling, last-seen-turn timestamps for the UI status
  indicator, telemetry stamps).
- Pure side-effect contexts that never enter the reducer or the
  canonical hash: telemetry transports, UI debounces, animation
  schedulers, log emitters.

The lint that enforces this is the existing float-ban rule extended
to flag any `Date.now()` / `performance.now()` import inside
`src/engine/**`, `src/rules/**`, and `src/net/webrtc/**` (the M5
lockstep, sync-check, bisect, reconnection, host-migration, and
snapshot transports). UI selector purity (already pinned in
[`ui-state-contract.md` § Selector Purity](./ui-state-contract.md#selector-purity))
covers the same forbidden surface from the read side.

The legacy "synchronized clocks" note in
[`diagrams/26-multiplayer-sync.md`](./diagrams/26-multiplayer-sync.md)
is wrong and has been removed in favor of this policy: M5 peers do
not need synchronized wall clocks because nothing in `state.*`
reads one.

### Snapshot Cadence and Resync

`DESYNC_DETECTED` (Task 4) does not abort the match by default.
Both peers maintain a ring of the last **5 canonical state
snapshots** taken every **20 turns** (configurable per match via the
scenario record), keyed by command-log offset:

```
{ seqOffset, turn, contentHash, engineHash, canonicalState, stateHash }
```

On desync:

1. Peers exchange `SNAPSHOT_TAKEN` digests for every snapshot in the
   ring (compact: `(seqOffset, stateHash)` pairs only — no payload).
2. Peers walk the ring newest-to-oldest and look for the first
   `seqOffset` whose `stateHash` agrees on both sides.
3. If a pair agrees, both peers emit `SNAPSHOT_AGREE { seqOffset }`,
   restore that snapshot's `canonicalState`, and re-apply commands
   from `seqOffset + 1` through the lockstep transport.
4. If no pair agrees, fall through to the existing bisect-and-quit
   path (Task 5).

The snapshot artifact is hashed and serialized through the same
canonical serializer used for the per-turn state hash. The ring is
in-memory only; saves persist the full state, not the ring. Because
each snapshot pins `contentHash` and `engineHash`, restoring across
a pack or engine upgrade fails loudly the same way save-load does.

### Bot RNG Sub-Streams

Bots run on **every** peer using the shared match seed. Each bot
draws from a dedicated PCG32 sub-stream named in
[`rng-streams.md`](./rng-streams.md):

```
botRngStreamId = hash(matchSeed, botId)
```

This guarantees every peer computes bit-identical bot decisions, so
no peer is privileged for bot logic and replay-bit-identity is
preserved across a re-host.

To avoid O(N) wire traffic per bot, the lockstep transport elects
exactly one peer as the **broadcaster** (the first peer in the
deterministic peer-priority order from Task 7's host-migration
election). Only the broadcaster's emitted bot commands are accepted
on the wire; non-broadcasters compute the same commands and verify
them locally but do not transmit. The receiving side gates on
`(playerId=botId, seq)` exactly like a human player, so the
canonical command key (above) keeps the dedupe contract uniform.

A re-election of the broadcaster (host migration) does not require
restarting bot decision sequences — both peers are at the same RNG
position because both have been computing in lockstep.
