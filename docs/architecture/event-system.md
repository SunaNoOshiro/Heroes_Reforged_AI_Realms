# Event System

Runtime contract for the deterministic engine's event log. Pinned
parallel to [`command-schema.md`](./command-schema.md): commands are
the only way state mutates; events are the read-only flip-side that
consumers (animation timeline, sound system, future replay
diagnostics) iterate to drive presentation.

This doc owns every contract clause an event consumer needs.
Per-`kind` payload shape and the closed event vocabulary live in
[`event-schema.md`](./event-schema.md) and
[`content-schema/schemas/event.schema.json`](../../content-schema/schemas/event.schema.json).

---

## 1. Flow Model

The event system is a **one-way event log**, not a pub/sub bus.

- The reducer (`dispatch(state, cmd)`) returns
  `Result<{state, events: Event[]}, ValidationError>`. The `events`
  array is the **only** mechanism by which events leave the engine.
- Consumers iterate that array on their own clock. There is nothing
  to subscribe to: no callback registration, no listener priority,
  no unsubscription protocol.
- The dispatcher does not retain events globally. The
  presentation-side timeline owns its own queue (see
  [§ 5 Retention & Bounding](#5-retention--bounding)).

The log model is intentional. A pub/sub bus opens four failure modes
(re-entry, listener-throw cascades, ordering ambiguity, replay
divergence) that the log forecloses by construction.

---

## 2. Emission Contract

- Emission is **synchronous**, inside the reducer. A command handler
  computes the next state and the emitted events together; events
  appear on the `dispatch` return value before any consumer runs.
- A handler MAY emit zero, one, or many events.
- Emitted events MUST validate against
  [`event.schema.json`](../../content-schema/schemas/event.schema.json).
  Any extra property, unknown `kind`, or malformed payload is a
  `ValidationError` that aborts the dispatch and rolls back state
  exactly as a malformed command would.
- Events carry no wall-clock timestamps and no presentation-only
  fields. Anything timing-related is owned by the consumer (the
  animation timeline assigns frames; the sound scheduler assigns
  audio onsets) — never by the reducer.
- Events do not consume RNG draws on their own. If a handler needs
  RNG to compute an event payload, the draw is attributed to the
  command handler under the appropriate named sub-stream per
  [`rng-streams.md`](./rng-streams.md); the event payload is the
  deterministic projection of that draw.

---

## 3. Consumption Contract

Consumers are independent log readers, not ordered subscribers.

- The animation timeline iterates the log in **insertion order** on
  `requestAnimationFrame` cadence and translates each event into one
  or more animation clips.
- The sound system iterates the log in **insertion order**, keyed
  off the animation timeline's clip clock so audio onsets line up
  with visible motion.
- Each consumer owns its own iteration cursor. Consumers do not
  acknowledge events back to the engine and do not coordinate with
  each other.
- Consumers MUST NOT mutate, reorder, or replace events. They MAY
  filter events they do not care about and MAY translate one event
  into many presentation clips.

### Cross-consumer ordering

Each consumer iterates the log in insertion order. There is **no
ordering guarantee between consumers** beyond per-consumer insertion
order:

- The animation timeline may render `UNIT_DIED` on frame N while the
  sound system schedules the corresponding death cry on frame N + 1,
  or vice versa.
- This is a feature: each consumer batches on its own clock and the
  reducer never blocks on a consumer.

If a feature requires a tighter cross-consumer guarantee (e.g.
"impact frame and impact sound MUST land on the same clip"), encode
it inside the consumer pair, not in the engine — the sound system
reads the animation timeline's clip clock for exactly this reason.

---

## 4. No-Veto Rule

Consumers may not cancel, mutate, or replace events.

- There is no `event.preventDefault()`, no `return false` early-exit,
  no per-consumer veto.
- A consumer that "rejects" an event simply ignores it and advances
  its cursor. The reducer is unaware.
- Cascading game logic (e.g. arrival → mine capture → battle) is
  modelled as a chain of **commands**, never as a chain of events.
  See [§ 6 Determinism Guard Rules](#6-determinism-guard-rules).

---

## 5. Retention & Bounding

A two-tier policy. The first tier is canonical; the second is
diagnostic-only.

### Per-command return value (canonical)

`dispatch` returns `events: Event[]` for the current command. That
array is the source of truth. Consumers consume from it directly;
the engine does not retain events globally.

A command that emits zero events returns `[]`; consumers treat the
empty array as a normal frame.

### Per-battle event log

`AUTO_RESOLVE_BATTLE` returns a per-battle `eventLog: Event[]` (see
[`06-auto-resolve-combat.md`](../../tasks/mvp/05-adventure-map/06-auto-resolve-combat.md)).
This array is consumed once by the auto-resolve UI to drive the
post-battle summary animation, then dropped. It is **never**
serialized into a save record (see
[§ 7 Save & Load](#7-save--load)).

### Optional diagnostic ring buffer

Implementations MAY maintain a presentation-side ring buffer for
dev-overlay diagnostics:

- Capacity: `EVENT_RING_BUFFER_SIZE = 10000` events.
- Owner: dev overlay (e.g.
  [`docs/architecture/wiki/screens/67-animation-debug-overlay/`](./wiki/screens/67-animation-debug-overlay/)),
  outside `src/engine/`.
- Read-only to gameplay code: nothing in `src/engine/`,
  `src/rules/`, or `src/persistence/` may read this buffer.
- Never serialized into a save, replay, or wire message.

The ring is a pure observability aid; turning it on or off MUST NOT
change the replay hash, the command log, or the state hash.

---

## 6. Determinism Guard Rules

Part of the determinism contract. A reducer that violates these
rules will desync between machines, between save/replay loads, and
between M5 lockstep peers.

### No re-entry from a consumer

Consumers MUST NOT call `dispatch(...)`. The reducer is not
re-entrant from inside log iteration. Two reasons:

1. The events list is computed before any consumer runs; a consumer
   that re-dispatched would interleave a new state transition into
   the middle of its own log, breaking insertion-order semantics.
2. Two consumers iterating the same log on different clocks would
   each produce a different cascade if either could re-enter the
   reducer.

If a chained behaviour needs to occur (e.g. arrival-on-tile → mine
capture → battle), it is modelled as a **follow-up command** emitted
by the original command's handler at the outer reducer level. This
is the same pattern already used by `INITIATE_BATTLE` →
`AUTO_RESOLVE_BATTLE` (see
[`command-schema.md` § INITIATE_BATTLE](./command-schema.md#initiate_battle)).

### Maximum command chain depth

A single user gesture may produce a deterministic chain of follow-up
commands (move → arrive → capture → battle → resolve → loot →
level-up → end-turn marker). The dispatcher caps this chain.

- Constant: `MAX_COMMAND_CHAIN_DEPTH = 8`.
- Scope: counted per outer command, reset between outer commands.
- Overflow: the dispatcher raises a `ValidationError`, rolls back
  the outer command, and the command log is unchanged. The cap is a
  hard determinism guard, not a soft tuning knob.

The constant is sized to cover the observed worst-case
"move → arrive → capture → battle → resolve → loot → level-up →
end-turn-marker" without permitting unbounded recursion.

### No async, no I/O

Reducers do not `await`, do not read `Date.now()` /
`performance.now()`, do not read `localStorage` or IndexedDB. This
rule is owned by [`determinism.md`](./determinism.md) and restated
here because event handlers are inside the reducer: emitting an
event is a pure projection of the next state, not a notification
call.

---

## 7. Save & Load

Events are **never serialized**.

- Save records contain `(seed, content hashes, command log, state
  snapshot)`. They do **not** contain an `events` field, an
  `eventLog` field, or any equivalent.
- On `LOAD_GAME` (or any save replay) the engine re-runs the
  command log; events are re-derived deterministically from each
  replayed command. Replays produce byte-identical event sequences
  to the live session because both come from the same reducer with
  the same inputs.
- The animation timeline rehydrates **empty** after a load. It does
  not replay historical events at speed 0; the world picks up "from
  now". The sound system does the same. This matches the rule that
  presentation/animation state stays outside deterministic gameplay
  state (see
  [`ui-frame-lag-contract.md`](./ui-frame-lag-contract.md)).
- The per-battle `eventLog: Event[]` returned by
  `AUTO_RESOLVE_BATTLE` is one-shot UI-bound and never enters the
  save record.
- The diagnostic ring buffer (§ 5) is never serialized.

The save schema's acceptance criterion enforces this rule: a save
record MUST NOT contain any field whose key matches `events?` or
`eventLog?`. See
[`tasks/mvp/08-persistence/02-log-only-save-format.md`](../../tasks/mvp/08-persistence/02-log-only-save-format.md).

---

## 8. Error Isolation

A consumer that throws while iterating the log MUST NOT propagate
the throw back into the engine.

- Each consumer runs inside its own host loop:
  - The animation timeline runs inside the renderer's
    `requestAnimationFrame` callback.
  - The sound system runs inside the audio scheduler.
- The host loop wraps consumer iteration in `try { ... } catch (err)
  { console.error(...); }`. On catch, the loop logs the error,
  advances the cursor past the offending event, and continues with
  the next event. The dispatcher is never re-entered from a catch
  block.
- A throwing consumer therefore degrades that consumer (audio
  silenced, animation skipped) but does NOT freeze the engine, the
  command log, or the other consumer.
- A consumer that throws on every event of a kind MUST surface a
  user-facing diagnostic via
  [`error-state.schema.json`](../../content-schema/schemas/error-state.schema.json)
  so the failure is visible to QA, not silent.

This rule protects the renderer-side guarantee in
[`tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md`](../../tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md):
zero calls into `src/engine` modules from inside the rAF callback,
even on the exception path.

---

## 9. Testing Convention

Per-command event shapes are pinned by golden-file fixtures under
[`tests/events/`](../../tests/events/). The harness contract lives
in
[`tasks/mvp/01-engine-core/06c-event-golden-tests.md`](../../tasks/mvp/01-engine-core/06c-event-golden-tests.md):

- For each `kind` in `command.schema.json`, a fixture
  `tests/events/<command>.golden.json` pins the exact `events:
  Event[]` returned by `dispatch` for one canonical input.
- A diff is a test failure. Updating a golden requires an explicit
  command-line flag.
- The harness runs as part of `npm test -- events`.

Replay parity is asserted on state by the existing fuzz harness
([`tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md`](../../tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md));
event parity is asserted by the golden-file harness above. A
presentation regression (e.g. missing `PROJECTILE_FIRED`) breaks the
golden even if the state hash is unchanged.

---

## 10. Related Docs

- [`command-schema.md`](./command-schema.md) — events are the
  read-only flip-side of commands; emitter / consumer mapping per
  kind lives in [`event-schema.md`](./event-schema.md).
- [`state-flow.md`](./state-flow.md) — how dispatch, events, and
  the rendering loop fit into one turn.
- [`determinism.md`](./determinism.md) — non-negotiable
  deterministic-path rules; the guard rules in § 6 are part of that
  contract.
- [`event-schema.md`](./event-schema.md) — per-kind payload,
  emitter, and consumer table.
- [`screen-event-coverage.json`](./screen-event-coverage.json) —
  closed-set validator for ALL_CAPS event tokens in screen
  packages.

---

## 🔍 Sync Check

- **UI: ✔** — Diagnostic ring-buffer owner
  [`wiki/screens/67-animation-debug-overlay/`](./wiki/screens/67-animation-debug-overlay/)
  exists; this doc names it as the only legal reader of
  `EVENT_RING_BUFFER_SIZE` and the screen package's
  `architecture.md` carries the matching read-only contract.
- **Schema: ✔** — `events: Event[]` shape, closed `kind` discriminator,
  `additionalProperties: false`, and the never-serialized rule all
  agree with
  [`event.schema.json`](../../content-schema/schemas/event.schema.json),
  the `Event` row in
  [`schema-matrix.md`](./schema-matrix.md), and the
  `events?`/`eventLog?` ban in
  [`tasks/mvp/08-persistence/02-log-only-save-format.md`](../../tasks/mvp/08-persistence/02-log-only-save-format.md).
  `error-state.schema.json` cited in § 8 also resolves.
- **Tasks: ✔** — Animation-timeline owner
  [`tasks/mvp/06-renderer/07-event-log-animation-timeline.md`](../../tasks/mvp/06-renderer/07-event-log-animation-timeline.md),
  presentation-loop owner
  [`tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md`](../../tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md),
  golden-test harness
  [`tasks/mvp/01-engine-core/06c-event-golden-tests.md`](../../tasks/mvp/01-engine-core/06c-event-golden-tests.md),
  fuzz harness
  [`tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md`](../../tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md),
  and auto-resolve owner
  [`tasks/mvp/05-adventure-map/06-auto-resolve-combat.md`](../../tasks/mvp/05-adventure-map/06-auto-resolve-combat.md)
  all resolve in `tasks/task-registry.json`. The
  `MAX_COMMAND_CHAIN_DEPTH = 8` constant matches
  [`tasks/mvp/01-engine-core/06-command-dispatcher.md`](../../tasks/mvp/01-engine-core/06-command-dispatcher.md)
  and [`determinism.md` § Event-Log Re-entry Guard](./determinism.md#event-log-re-entry-guard).

## ⚠ Issues

- **Stale line-anchor in the per-battle eventLog reference.** Before
  the rewrite, § 5 linked
  `06-auto-resolve-combat.md:43-44` (`#L43-L44`), but the current
  `eventLog: Event[]` lines in
  [`06-auto-resolve-combat.md`](../../tasks/mvp/05-adventure-map/06-auto-resolve-combat.md)
  are 41–42, so the GitHub line anchor pointed past the field. The
  rewrite drops the line range and links the file plain (anchors of
  this kind are not enforced and decay with edits). No invariant
  changed; flagged here so a future contract-line-anchor policy
  decision can re-introduce a stable anchor if desired.
