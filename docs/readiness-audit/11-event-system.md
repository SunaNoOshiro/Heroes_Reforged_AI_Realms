# 11. EVENT SYSTEM

> Audit pass over the questions originally listed in this file. Each
> question is preserved verbatim and answered against the current repo
> state (planning + content schemas + task specs; runtime engine code
> does not yet exist).
>
> **Important framing:** the repo does not describe a generic
> publish/subscribe event bus. It describes a one-way **event log**
> emitted as a byproduct of the deterministic command dispatcher and
> consumed read-only by the renderer (animation timeline) and the
> sound system. There is no `event.schema.json`, no listener API
> contract, no cancellation/veto semantics, and no formal Event
> taxonomy. Most questions in this section therefore land at
> ⚠ Partial or ❌ UNKNOWN.

---

### Q: 193. Is there a single global event bus, or scoped buses per system?

**Status:** ⚠ Partial

**Answer:**
**Neither — a one-way event log, not a bus.** The command dispatcher
is the single emitter:
`dispatch(state, cmd) → Result<{state, events: Event[]}, ValidationError>`.
Events flow out of the reducer as an ordered array attached to the
result and are appended to a shared event log. The renderer's
animation timeline (Task `mvp.06-renderer.07`) and the Phase-3 sound
system (Task `phase-3.04-polish.02`) both read from this same log.
There is no scoped bus, no inter-system pub/sub, and no second
emitter — sim code never publishes to a generic channel; renderer
code never publishes at all. UI emits **commands** (not events) into
the dispatcher.

What is **not** pinned: whether the "subscriber list" mentioned in
the dispatcher task is a real runtime API or just a conceptual log
poll. The two known consumers (animation timeline, sound system) are
described as reading the log, not as registering listeners.

**Evidence:**
- [tasks/mvp/01-engine-core/06-command-dispatcher.md:11-13](../../tasks/mvp/01-engine-core/06-command-dispatcher.md#L11-L13) — "Emits typed `Event` objects to a subscriber list" / "Appends the command to the command log"
- [tasks/mvp/01-engine-core/06-command-dispatcher.md:29](../../tasks/mvp/01-engine-core/06-command-dispatcher.md#L29) — `dispatch(...): Result<{state, events: Event[]}, ValidationError>`
- [tasks/mvp/06-renderer/07-event-log-animation-timeline.md:8](../../tasks/mvp/06-renderer/07-event-log-animation-timeline.md#L8) — "Consume the event log emitted by the sim and build an animation timeline"
- [tasks/phase-3/04-polish/02-sound-system-event-log-driven.md:8-19](../../tasks/phase-3/04-polish/02-sound-system-event-log-driven.md#L8-L19) — "sound system listens to the event log (same source as the animation timeline)"
- [docs/architecture/state-flow.md:53-54](../architecture/state-flow.md#L53-L54) — "Rendering (read-only) … Subscribes to state; never mutates"
- ❌ No file describes a `EventBus`, `subscribe`, `unsubscribe`, channel scoping, or per-system bus

---

### Q: 194. Are events synchronous or async?

**Status:** ⚠ Partial

**Answer:**
**Emission is synchronous; consumption is async.** The dispatcher is
a pure synchronous reducer (`state' = apply(state, command)`); when
it returns, the new state and the events emitted by that command are
both already produced. Consumers, however, run on a different clock:
the renderer's presentation loop reads snapshots/event log on
`requestAnimationFrame` and is explicitly decoupled from the sim
("the sim can update asynchronously; the renderer just draws
whatever snapshot it currently holds"). The sound system is
described as playing audio "synchronized with the animation
timeline (not raw event time)" — so audio is also async relative to
emission. There is no callback-on-emit contract.

**Evidence:**
- [docs/architecture/command-schema.md:13](../architecture/command-schema.md#L13) — "Command dispatcher is a pure reducer: `state' = apply(state, command)`"
- [docs/architecture/state-flow.md:50](../architecture/state-flow.md#L50) — "Command dispatch … Pure reducer; no I/O, no timing"
- [tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md:8](../../tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md#L8) — "presentation loop runs at 60 fps via `requestAnimationFrame` … sim can update asynchronously"
- [tasks/phase-3/04-polish/02-sound-system-event-log-driven.md:29](../../tasks/phase-3/04-polish/02-sound-system-event-log-driven.md#L29) — "Sound plays synchronized with the animation timeline (not raw event time)"
- ❌ No spec for whether sim-internal handlers run synchronously inside the dispatcher

---

### Q: 195. Can events be cancelled or vetoed by listeners?

**Status:** ❌ UNKNOWN

**Answer:**
**No mechanism documented, and the architecture argues against it.**
Events are a *result* of command application — they describe what
already happened (`UNIT_MOVED`, `MINE_CAPTURED`, `DAY_END`,
`WEEK_START`, etc.). Cancellation belongs at the **command
validation** stage (the dispatcher returns `ValidationError` and
does not mutate state). Once a command applies, the events it
produced are facts; allowing a listener to veto them would let a
non-deterministic consumer corrupt replay/multiplayer parity, which
the determinism contract forbids. No file mentions cancellation,
preventDefault, or veto semantics on events.

**Evidence:**
- [docs/architecture/command-schema.md:475-484](../architecture/command-schema.md#L475-L484) — Validation Framework: invalid → returns error before dispatch
- [tasks/mvp/01-engine-core/06-command-dispatcher.md:41](../../tasks/mvp/01-engine-core/06-command-dispatcher.md#L41) — "Dispatching an invalid command returns an error and does NOT mutate state"
- [docs/architecture/determinism.md](../architecture/determinism.md) — bit-identical state requirement (incompatible with consumer-side veto)
- ❌ No `cancel`, `veto`, `preventDefault`, `stopPropagation` keyword in any doc or task

---

### Q: 196. What is the listener ordering guarantee?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** The two known consumers (animation timeline, sound
system) read the same log but operate independently — animation
sequencing is "Timeline correctly sequences concurrent events
(multiple units dying at once)", and sound is keyed off the
animation timeline rather than raw event order. Within a single
consumer, events are processed in the order they appear in the log
(which is itself ordered by command application). But there is no
documented contract for cross-consumer ordering, registration order,
priority levels, or deterministic listener scheduling.

**Evidence:**
- [tasks/mvp/06-renderer/07-event-log-animation-timeline.md:40](../../tasks/mvp/06-renderer/07-event-log-animation-timeline.md#L40) — "Timeline correctly sequences concurrent events"
- [tasks/phase-3/04-polish/02-sound-system-event-log-driven.md:29](../../tasks/phase-3/04-polish/02-sound-system-event-log-driven.md#L29) — "synchronized with the animation timeline"
- ❌ No doc describes listener priority, registration order, or ordering guarantees

---

### Q: 197. Are listeners allowed to dispatch new events synchronously?

**Status:** ❌ UNKNOWN

**Answer:**
**Architecturally discouraged but not explicitly ruled out.** The
renderer is forbidden from calling back into `src/engine` modules
("Profiling shows zero calls into `src/engine` modules from inside
the rAF callback"), which precludes the renderer from generating
new commands or events as a side effect of processing an existing
event. Internally, command handlers may, in principle, emit
multiple events for one command (e.g. `MOVE_HERO` arriving on a
mine triggers a `CAPTURE_MINE` flow with `MINE_CAPTURED` event +
movement events). Whether this is modelled as "the handler appends
events" vs. "a sub-handler dispatches a follow-up command" is not
written down.

**Evidence:**
- [tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md:34](../../tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md#L34) — "Profiling shows zero calls into `src/engine` modules from inside the rAF callback"
- [tasks/mvp/05-adventure-map/03-hero-movement.md](../../tasks/mvp/05-adventure-map/03-hero-movement.md) — `MOVE_HERO` → `MINE_CAPTURED` event chain implied
- [docs/architecture/command-schema.md:226](../architecture/command-schema.md#L226) — "If autoResolve: dispatches AUTO_RESOLVE_BATTLE command" (command-level chaining, not event-level)
- ❌ No doc specifies whether listeners can re-enter `dispatch`, or whether handlers may push events that fire other handlers within the same reducer pass

---

### Q: 198. Is there a maximum event-cascade depth?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified anywhere.** No file mentions cascade limits, recursion
depth, fuel/budget counters, or stack-overflow safeguards. The
underlying flow (commands produce events; events do not produce
commands) makes pathological cascades unlikely, but if a future
handler chains commands inside command handlers (e.g. arrival on
tile → mine capture → battle initiation), a maximum depth needs to
be defined to keep replay deterministic and bounded.

**Evidence:**
- ❌ No mention of cascade depth, recursion limits, event budget, or
  re-entrancy protection in any architecture doc, task, or schema

---

### Q: 199. Are all events typed and enumerated?

**Status:** ⚠ Partial

**Answer:**
**Typed in TypeScript intent, not enumerated in schema.** Tasks
reference `Event` and `Event[]` as a typed discriminated union
("Emits typed `Event` objects"), and a partial vocabulary appears
across task specs: `UNIT_MOVED`, `UNIT_ATTACKED`, `UNIT_DIED`,
`PROJECTILE_FIRED`, `SPELL_CAST`, `MINE_CAPTURED`,
`BATTLE_INITIATED`, `TOWN_VISITED`, `DAY_START`, `DAY_END`,
`WEEK_START`, `BUILDING_BUILT`, `HERO_LEVEL_UP`. There is **no**
canonical enumeration: no `event.schema.json` in
[content-schema/schemas/](../../content-schema/schemas/), no section
in [`command-schema.md`](../architecture/command-schema.md) listing
events, and no equivalent of
[`screen-command-coverage.json`](../architecture/screen-command-coverage.json)
for events. The task-command-token-coverage doc treats `DAY_START`,
`DAY_END`, `WEEK_START` as "event-log markers" rather than commands
but does not provide a closed list.

**Evidence:**
- [tasks/mvp/01-engine-core/06-command-dispatcher.md:12](../../tasks/mvp/01-engine-core/06-command-dispatcher.md#L12) — "Emits typed `Event` objects"
- [tasks/mvp/06-renderer/07-event-log-animation-timeline.md:26-31](../../tasks/mvp/06-renderer/07-event-log-animation-timeline.md#L26-L31) — partial event enum (UNIT_MOVED, UNIT_ATTACKED, UNIT_DIED, PROJECTILE_FIRED, SPELL_CAST)
- [tasks/phase-3/04-polish/02-sound-system-event-log-driven.md:21-27](../../tasks/phase-3/04-polish/02-sound-system-event-log-driven.md#L21-L27) — additional events (BUILDING_BUILT, MINE_CAPTURED, HERO_LEVEL_UP, DAY_END)
- [tasks/mvp/05-adventure-map/02-turn-structure.md:29-33](../../tasks/mvp/05-adventure-map/02-turn-structure.md#L29-L33) — DAY_START, DAY_END, WEEK_START as event-log entries
- [docs/architecture/task-command-token-coverage.json:9-26](../architecture/task-command-token-coverage.json#L9-L26) — DAY_END/DAY_START/WEEK_START flagged as "event-log marker emitted by …"
- ❌ Missing: `content-schema/schemas/event.schema.json` (no canonical, validatable Event union)

---

### Q: 200. Are events logged for replay, and is the log bounded?

**Status:** ⚠ Partial

**Answer:**
**Logged — yes, in two senses; bounded — not specified.** The
**command** log is the canonical replay source ("Replays,
multiplayer lockstep, and desync detection all pin on `(seed,
content hashes, command log)`"); events are a deterministic
byproduct, so replaying commands re-derives them identically and
they do not strictly need to be persisted. Inside a single run,
auto-resolve returns its own per-battle `eventLog: Event[]`, and
the dispatcher returns `events: Event[]` per command — these are
in-memory queues consumed by the animation timeline. Whether the
*global* event log is retained for the full session, ring-buffered,
or discarded once consumed by the timeline is not specified.

**Evidence:**
- [docs/architecture/state-flow.md:62-66](../architecture/state-flow.md#L62-L66) — "Command log = source of truth … Replays, multiplayer lockstep, and desync detection all pin on `(seed, content hashes, command log)`"
- [tasks/mvp/01-engine-core/06-command-dispatcher.md:13](../../tasks/mvp/01-engine-core/06-command-dispatcher.md#L13) — "Appends the command to the command log"
- [tasks/mvp/05-adventure-map/06-auto-resolve-combat.md:43-44](../../tasks/mvp/05-adventure-map/06-auto-resolve-combat.md#L43-L44) — `eventLog: Event[]` returned per battle
- [docs/architecture/command-schema.md:14-15](../architecture/command-schema.md#L14-L15) — "Commands are logged in order for replay and multiplayer sync"
- ❌ No retention policy, ring-buffer size, or upper bound for the event log

---

### Q: 201. Are events part of save state or transient?

**Status:** ⚠ Partial

**Answer:**
**Transient by design.** Saves persist `(seed, content hashes,
command log)` plus state snapshot; the canonical reference makes no
mention of events being saved. Because events are deterministically
re-derivable from replaying commands against the seeded engine, they
can (and should) be regenerated on load rather than serialized.
Per-battle `eventLog: Event[]` returned from `AUTO_RESOLVE_BATTLE`
appears to be a one-shot return value used to drive UI, not part of
the persistent battle record. This is consistent with the
"presentation/animation frame stays outside deterministic gameplay
state" rule echoed across screen `interactions.md` files.

What is **not** pinned: whether the in-memory event log is
explicitly excluded from saves (e.g. via a save-shape schema), and
how the renderer's animation timeline rehydrates after a load
(does it replay all historical events at speed 0, or pick up from
"now"?).

**Evidence:**
- [docs/architecture/state-flow.md:62-66](../architecture/state-flow.md#L62-L66) — `(seed, content hashes, command log)` as canonical state, not events
- [tasks/mvp/05-adventure-map/06-auto-resolve-combat.md:43](../../tasks/mvp/05-adventure-map/06-auto-resolve-combat.md#L43) — eventLog returned per battle (not stored on state)
- ❌ No save-schema task or doc explicitly lists what is or isn't persisted from the event log
- ❌ No reload/rehydration spec for the animation timeline after a save load

---

### Q: 202. How are events tested independently?

**Status:** ❌ UNKNOWN

**Answer:**
**No test plan documented.** The dispatcher task acceptance criteria
test command behavior ("Dispatching an invalid command returns an
error", "100 % TypeScript coverage", referential immutability) but
say nothing about asserting emitted-event shapes or sequences. The
animation-timeline task asserts behavior over events (sequencing,
finishing) but does not describe how event fixtures are produced or
versioned. No "event matrix" / "event golden file" testing approach
is described, and there is no `tests/events/` or analogous directory.

**Evidence:**
- [tasks/mvp/01-engine-core/06-command-dispatcher.md:40-48](../../tasks/mvp/01-engine-core/06-command-dispatcher.md#L40-L48) — acceptance criteria do not mention event-shape assertions
- [tasks/mvp/06-renderer/07-event-log-animation-timeline.md:37-41](../../tasks/mvp/06-renderer/07-event-log-animation-timeline.md#L37-L41) — behavioral acceptance criteria for the consumer, no fixture spec
- ❌ No event golden-file convention, no event fixture directory, no test task targeting the event vocabulary

---

### Q: 203. What happens if a listener throws?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** No file describes error isolation between
listeners, whether a thrown listener crashes the frame, whether
errors are logged to a developer console, whether the renderer's
event-timeline consumer continues with the next event after a
malformed clip, or whether the sound system silently drops on
failure. Given the strict separation (renderer cannot call into sim
code, sim is a pure reducer), a thrown consumer cannot corrupt
deterministic state — but UX failure modes (silent black screen,
stuck animation, audio cut-off) are uncharacterised.

**Evidence:**
- ❌ No error-handling, try/catch, or fault-isolation policy documented for event consumers
- ❌ No mention in [docs/architecture/determinism.md](../architecture/determinism.md), [tasks/mvp/01-engine-core/06-command-dispatcher.md](../../tasks/mvp/01-engine-core/06-command-dispatcher.md), or renderer tasks of listener exception semantics

---

## 🔍 Summary

### Missing Logic
- **No canonical Event schema.** No `content-schema/schemas/event.schema.json` exists, so the Event discriminated union is informal and not validatable.
- **No closed event vocabulary.** Event kinds are scattered across task specs (`UNIT_MOVED`, `MINE_CAPTURED`, `DAY_START`, etc.) without an authoritative list parallel to `command-schema.md`.
- **No listener API contract.** "Subscriber list" is mentioned once but never defined: registration, priority, ordering, unsubscription, and re-entrancy semantics are absent.
- **No cancellation / veto semantics.** Architecturally implied to be unsupported, but not stated.
- **No cascade-depth or re-entrancy budget.** Behaviour under deep chains is undefined.
- **No retention / bounding policy.** It is unclear whether the global event log is unbounded, ring-buffered, or discarded after consumption.
- **No save/load behaviour for the event log.** Whether saves exclude events and how the animation timeline rehydrates is undocumented.
- **No error-isolation policy.** Behaviour when a listener throws is not specified.
- **No event testing convention.** No fixture format, golden-file approach, or coverage matrix.

### Risks
- **Determinism leakage** if a future handler emits commands as a side effect of consuming events (would re-introduce non-determinism the command-only reducer was designed to prevent).
- **Event-vocabulary drift.** Without a closed schema, animation timeline, sound system, and engine handlers will silently disagree on event payload shapes; AI agents implementing tasks will invent ad-hoc fields.
- **Replay desync** if the event log is partially persisted and partially re-derived — replays may diverge from original presentation.
- **Cross-consumer ordering bugs.** Animation and sound both anchor off the timeline, but no rule pins which consumer observes which event first when both subscribe.
- **Memory pressure.** Unbounded in-memory event log over a long session/auto-resolve marathon could grow without limit.
- **UX failure-mode opacity.** A throwing listener could silently freeze animation or audio with no documented recovery.

### Improvements
1. Add `content-schema/schemas/event.schema.json` enumerating every Event kind with closed-schema validation, parallel to `command.schema.json`.
2. Add `docs/architecture/event-schema.md` listing every event, its payload, its emitting command(s), and its consumers.
3. Add `docs/architecture/screen-event-coverage.json` (or extend the command-coverage validator) so renderer/sound/UI consumers have a closed vocabulary to bind against.
4. Specify in `dispatcher.ts` task: "events are emit-only; consumers may not mutate state nor dispatch commands; listeners that throw are caught, logged, and skipped".
5. Decide and document the event-log retention policy (e.g. "log is replayed once per command, then drained" or "ring buffer of N=10000 for diagnostics").
6. Add event golden-file tests: feed a command into the dispatcher, snapshot `events: Event[]`, fail on diff.
7. Document save semantics: events are NOT serialized; animation timeline rehydrates as empty after load (no historical replay).
8. Pin cross-consumer ordering: "consumers iterate the log in insertion order; registration order does not affect emission order; consumers run independently of one another".
9. State the "no veto" rule explicitly so future contributors don't reinvent cancellation.
10. Add a re-entrancy guard: "command handlers may emit events but may not re-enter `dispatch` from inside an event consumer; chained behavior must use follow-up commands at the outer reducer level".

### AI-Readiness
Score: **3/10**

Reason: An AI agent given the current docs can plausibly emit `events: Event[]` from the dispatcher (the signature is written) and consume them in the animation timeline (one task lists 5 event kinds explicitly). Beyond that, almost every contract a code generator would need is missing: no closed Event union, no listener registration API, no cancellation semantics, no ordering guarantees, no retention policy, no save behaviour, no error model, no test convention. Two independent agents implementing the dispatcher and the sound system today would invent disjoint payload shapes and reconcile only at integration time. The event surface is the weakest-specified system in the audit and needs a dedicated `event-schema.md` + `event.schema.json` before it is safe to delegate to autonomous implementation.
