# Determinism

Hard constraint: the same seed, the same commands, and the same content
hashes produce the same state on any machine, any time.

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
   [`multi-engine-harness.md`](./multi-engine-harness.md).

## Forbidden In Deterministic Paths

- `Math.random()` and `Date.now()` / `performance.now()`.
- JavaScript floats in gameplay math.
- `eval` / `new Function(...)` / runtime-parsed formula strings.
- Map/Set iteration where order matters without an explicit sort.
- Async timing (no `setTimeout`-based race decisions).

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

## Content Hash + Engine Hash

Every pack manifest carries a `contentHash` (canonical-JSON digest of
all records) and an `engineHash` (build digest). Saves, replays, and
multiplayer pin both. Any mismatch fails loud at load time; never
silent.

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
