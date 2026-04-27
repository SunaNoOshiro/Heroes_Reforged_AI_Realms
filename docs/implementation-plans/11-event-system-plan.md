# Implementation Plan: 11 — Event System

> Source audit: [docs/readiness-audit/11-event-system.md](../readiness-audit/11-event-system.md)
>
> The audit file is **not** modified. This plan converts every
> ❌ UNKNOWN, ⚠ Partial, Missing-Logic, and Risk item from the audit into
> concrete documentation, schema, task, and tooling work.
>
> Nothing here invents gameplay. Every change formalizes a contract that
> is already implied by the deterministic-dispatcher / event-log /
> animation-timeline triangle but is not yet pinned down.

---

## 1. Overview

**Scope.** Close the eleven gaps the event-system audit flagged as
blocking determinism, replay safety, multi-agent implementation, and
multiplayer parity:

1. No canonical Event schema (Q199)
2. No closed Event vocabulary (Q199)
3. No listener API contract — emission model is "event log", not bus (Q193)
4. Sync-vs-async semantics under-specified (Q194)
5. Cancellation / veto semantics undocumented (Q195)
6. Cross-consumer ordering guarantee absent (Q196)
7. Re-entrancy / dispatch-from-listener rule unstated (Q197)
8. No cascade-depth budget (Q198)
9. Event-log retention / bounding policy missing (Q200)
10. Save/load behaviour of the event log undocumented (Q201)
11. Error-isolation policy and listener-throw semantics absent (Q203)
12. No event testing convention (Q202)

**Readiness state today.** AI-Readiness scored **3 / 10** — the weakest
system in the audit. The dispatcher signature
(`dispatch(state, cmd) → Result<{state, events: Event[]}, ValidationError>`)
exists, and a fragmentary vocabulary of ~13 event kinds is scattered
across task specs, but every contract a code generator needs to safely
produce or consume events is missing. Two parallel agents implementing
the dispatcher and the sound system today would invent disjoint payload
shapes.

**Out of scope.** Authoring runtime engine code, building the renderer's
animation timeline, shipping the sound system. This plan only formalizes
the contracts those layers must satisfy. No gameplay event is invented;
the closed vocabulary is the union of event kinds **already named** in
existing tasks.

---

## 2. Critical Fixes (Must Do First)

These four items must land before any deterministic-engine task starts
emitting `Event` objects. Each one, if left open, will cause silent
event-shape drift between the dispatcher, the animation timeline, and
the sound system.

1. **Canonical Event schema (Issue 3.B-1)** — without
   `event.schema.json`, the first commit that emits an `Event` poisons
   every consumer with an ad-hoc shape.
2. **Event vocabulary doc (Issue 3.B-2)** — must enumerate every
   kind, payload, emitting command(s), and consumer(s); parallel to
   `command-schema.md`.
3. **Listener / consumer contract (Issue 3.A-1)** — pins "emit-only,
   no veto, no re-entrancy, log iteration in insertion order" before
   any consumer is written.
4. **Determinism guard rules (Issue 3.A-2)** — formal "consumers may
   not dispatch commands from inside log iteration; chained behaviour
   must use follow-up commands at the outer reducer level".

Items 1–4 are documentation + schema only; no runtime code is required.
After they land, the renderer (`mvp.06-renderer.07`) and sound system
(`phase-3.04-polish.02`) tasks can be unblocked.

---

## 3. System Improvements

Issues are grouped by the audit's natural axes: **Architecture &
Contracts**, **Schemas**, **Tasks**, and **Persistence / Multiplayer**.

### Architecture & Contracts

#### Issue 3.A-1: Listener / consumer contract is undefined

**Source:** Q193 (⚠ Partial), Q194 (⚠ Partial), Q195 (❌ UNKNOWN),
Q196 (❌ UNKNOWN), Q203 (❌ UNKNOWN); Missing-Logic bullets 3, 4, 8.

**Problem:**
The dispatcher task mentions a "subscriber list" once
([06-command-dispatcher.md:11-13](../../tasks/mvp/01-engine-core/06-command-dispatcher.md#L11-L13))
but there is no documented API for registration, ordering, priority,
unsubscription, or error isolation. The two known consumers (animation
timeline, sound system) are described as reading the log, not as
registering listeners — and even that read model is under-specified.

**Impact:**
- Animation timeline and sound system will diverge on whether they
  poll snapshots, subscribe via callback, or pull a streaming queue.
- A throwing consumer could silently freeze animation or audio with
  no documented recovery; the renderer-side task profile criterion
  ("zero calls into `src/engine` modules from inside the rAF callback")
  could be violated through a thrown exception path.
- Cross-consumer ordering ambiguity will manifest as "sound played
  before its frame rendered" bugs that are nearly impossible to
  diagnose without a written rule.

**Solution:**
Author `docs/architecture/event-system.md` defining:
- The flow model: **one-way event log**, not pub/sub bus.
- Emission contract: synchronous, inside the reducer; events appear
  on `dispatch` return value before any consumer runs.
- Consumption contract: consumers iterate the in-memory log on their
  own clock (`requestAnimationFrame` for animation, animation-keyed
  for sound); no callback-on-emit.
- Cross-consumer ordering: each consumer iterates the log in
  insertion order; consumers run independently and have no ordering
  guarantee relative to each other.
- No-veto rule: consumers may not cancel, mutate, or replace events.
- Error isolation: a thrown consumer is caught by its host loop
  (rAF for animation, audio scheduler for sound), logged via
  `console.error`, and the next event is processed; the dispatcher
  is never re-entered from a catch block.

**Files to Update:**
- [docs/architecture/state-flow.md](../architecture/state-flow.md)
  — link the new event-system doc from the "Rendering (read-only)"
  section.
- [docs/architecture/command-schema.md](../architecture/command-schema.md)
  — add a one-paragraph cross-link explaining that events are the
  read-only flip-side of commands.
- [docs/architecture/overview.md](../architecture/overview.md)
  — mention the event log alongside the command log in the layer map.
- [docs/architecture/glossary.md](../architecture/glossary.md)
  — add `Event`, `Event log`, `Event consumer` terms with one-line
  definitions, all pointing to `event-system.md`.
- [tasks/mvp/01-engine-core/06-command-dispatcher.md](../../tasks/mvp/01-engine-core/06-command-dispatcher.md)
  — replace the loose "subscriber list" wording with a precise
  "events are appended to a shared in-memory log; consumers read,
  do not subscribe" statement.

**New Files:**
- `docs/architecture/event-system.md` — canonical reference.

**Implementation Steps:**
1. Draft `event-system.md` enumerating the eight contract clauses
   above (one short section each).
2. Reword the dispatcher task to drop the "subscriber list" phrase
   and link to `event-system.md`.
3. Cross-link from `state-flow.md`, `command-schema.md`,
   `overview.md`, and `glossary.md`.
4. Add the doc to the `links` validator's allowlist if any internal
   anchor regex requires it.
5. Run `npm run validate` to catch broken links.

**Dependencies:**
- None — pure documentation. Can land first.

**Complexity:** **M** (one new doc + four touch points; no schema work).

---

#### Issue 3.A-2: No re-entrancy / cascade-depth rule

**Source:** Q197 (❌ UNKNOWN), Q198 (❌ UNKNOWN); Risks bullet 1.

**Problem:**
There is no written rule preventing a consumer from calling
`dispatch(...)` while iterating the event log, and no maximum
cascade depth for command handlers that emit events whose consumers
might (in a future, careless implementation) push more commands.
The renderer side has a guard
([08-presentation-loop-decoupled-from-sim.md:34](../../tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md#L34))
but it is not generalised across consumers.

**Impact:**
- A future feature (e.g. arrival-on-tile → mine capture → battle)
  could be implemented either as **command-level chaining** (safe)
  or as **event-driven re-entry** (would re-introduce the
  non-determinism the pure reducer was designed to prevent).
- Without a depth budget, any accidental cascade is an unbounded
  stack risk on long-running sessions.

**Solution:**
Add a "Determinism Guard Rules" section to `event-system.md`:
- Consumers MUST NOT call `dispatch`. Chained behaviour MUST be
  modelled as a follow-up **command** emitted by the original
  command's handler at the outer reducer level (pattern already
  used by `INITIATE_BATTLE` → `AUTO_RESOLVE_BATTLE`, see
  [command-schema.md:226](../architecture/command-schema.md#L226)).
- Command handlers MAY emit multiple events but MUST NOT re-enter
  `dispatch` recursively from inside an event consumer.
- Maximum sub-command chain depth per outer command: **N = 8**
  (declared as a constant in `event-system.md`; rationale: covers
  observed worst case "move → arrive → capture → battle → resolve →
  loot → level-up → end-turn-marker" without permitting unbounded
  recursion). Exceeding N raises a `ValidationError` and rolls back
  the outer command.

**Files to Update:**
- `docs/architecture/event-system.md` (created in 3.A-1) — new
  "Determinism Guard Rules" section.
- [tasks/mvp/01-engine-core/06-command-dispatcher.md](../../tasks/mvp/01-engine-core/06-command-dispatcher.md)
  — add an acceptance criterion: "Dispatcher rejects sub-command
  chains deeper than 8 levels with a `ValidationError`".
- [docs/architecture/determinism.md](../architecture/determinism.md)
  — add the no-re-entry rule to the determinism contract.

**New Files:**
- None.

**Implementation Steps:**
1. Author the "Determinism Guard Rules" section as part of 3.A-1's
   doc draft.
2. Add the depth constant `MAX_COMMAND_CHAIN_DEPTH = 8` to a new
   subsection.
3. Update the dispatcher task acceptance criteria.
4. Cross-link from `determinism.md`.

**Dependencies:**
- 3.A-1 must land first (the doc this section lives in).

**Complexity:** **S**.

---

### Schemas

#### Issue 3.B-1: No canonical `event.schema.json`

**Source:** Q199 (⚠ Partial); Missing-Logic bullets 1, 2; Risks bullet 2.

**Problem:**
[content-schema/schemas/](../../content-schema/schemas/) holds 33
closed schemas (`command.schema.json` among them) but **no**
`event.schema.json`. The TypeScript intent is "Event is a
discriminated union" but the union is informal and not validatable.
A single source of truth is required so consumers (animation, sound,
future replay diagnostics) bind against one closed shape.

**Impact:**
- Animation timeline and sound system will invent disjoint payload
  shapes; integration discovers the divergence late.
- AI agents implementing tasks will hallucinate optional fields on
  events to fit local needs.
- No CI gate can fail on an event with an unknown `kind` or extra
  property — the most common AI-error class is silently accepted.

**Solution:**
Author `content-schema/schemas/event.schema.json` as a closed
discriminated union of every event kind named in current task specs.
Parallel construction to `command.schema.json`:
- Top-level `oneOf` enumerating every `$defs/<eventKind>`.
- Each `$defs` entry: `{ kind: const, payload: { ... } }` with
  `additionalProperties: false`.
- All numeric IDs/quantities use the existing `stat-id`,
  `resource-id`, `status-id` schema references.

**Authoritative initial vocabulary (taken verbatim from existing
task specs — no invention):**

Combat-tactical (from
[06-renderer/07](../../tasks/mvp/06-renderer/07-event-log-animation-timeline.md#L26-L31)):
- `UNIT_MOVED`
- `UNIT_ATTACKED`
- `UNIT_DIED`
- `PROJECTILE_FIRED`
- `SPELL_CAST`

Adventure-map (from
[05-adventure-map/02](../../tasks/mvp/05-adventure-map/02-turn-structure.md#L29-L33),
[05-adventure-map/03](../../tasks/mvp/05-adventure-map/03-hero-movement.md),
[phase-3/04-polish/02](../../tasks/phase-3/04-polish/02-sound-system-event-log-driven.md#L21-L27)):
- `MINE_CAPTURED`
- `BATTLE_INITIATED`
- `TOWN_VISITED`
- `BUILDING_BUILT`
- `HERO_LEVEL_UP`

Turn markers (from
[task-command-token-coverage.json:9-26](../architecture/task-command-token-coverage.json#L9-L26)):
- `DAY_START`
- `DAY_END`
- `WEEK_START`

**Files to Update:**
- [docs/architecture/schema-matrix.md](../architecture/schema-matrix.md)
  — add an "Event" row pointing at `event.schema.json` and example.
- [content-schema/schemas/README.md](../../content-schema/schemas/README.md)
  — register the new schema.
- [content-schema/examples/](../../content-schema/examples/) —
  add a canonical example file.

**New Files:**
- `content-schema/schemas/event.schema.json` — closed discriminated
  union of all 13 event kinds.
- `content-schema/examples/events/event-log.example.json` — a
  canonical example showing one event of every kind (for golden
  tests in 3.D-1).

**Implementation Steps:**
1. Read every task file referencing an event (5 known) and extract
   the payload fields (e.g. `UNIT_MOVED` → `{ unitId, fromHex, toHex,
   path, durationFrames }`). Where a field is implied but not named,
   leave a `TODO(payload)` placeholder rather than invent.
2. Author the JSON schema with `additionalProperties: false` on every
   `$defs` entry and the top-level `oneOf`.
3. Cross-reference existing primitives: hex coordinates from
   `targeting.schema.json`, IDs via `stat-id`, `resource-id`,
   `status-id`.
4. Add the event-log example file.
5. Run `npm run validate:contracts` — should pass.
6. Update `schema-matrix.md` and the schemas-README index.

**Dependencies:**
- None at the doc level. The placeholder payload fields can be filled
  in by the task that originally names the event (e.g.
  `06-renderer/07` for `UNIT_MOVED`) at implementation time without
  re-opening the schema (additive evolution).

**Complexity:** **L** (13 event kinds × payload extraction; closed
schema with cross-references).

---

#### Issue 3.B-2: No human-readable event-vocabulary doc

**Source:** Q199 (⚠ Partial); Missing-Logic bullet 2; Improvements 2.

**Problem:**
Even with `event.schema.json` in place, the schema alone does not
describe **which command emits which event** or **which consumer
binds to which kind**. `command-schema.md` provides this for
commands; there is no parallel for events.

**Impact:**
- Implementers cannot answer "if I implement
  `MOVE_HERO`, what events am I obligated to emit?" without a
  spec-wide grep.
- Consumers (animation, sound) cannot enumerate which kinds they
  must handle for full coverage.
- AI agents asked to add a new event will not know where to anchor
  the cross-system contract.

**Solution:**
Author `docs/architecture/event-schema.md` (parallel to
`command-schema.md`):
- One section per event kind.
- Each section lists: `kind`, payload fields (with types &
  references), emitting command(s), consumer(s), notes on
  determinism (e.g. "no RNG", "carries seed-stream id").
- A summary table at the top: `kind | emitter(s) | consumers |
  payload one-liner`.

**Files to Update:**
- [docs/architecture/overview.md](../architecture/overview.md) —
  link new doc next to `command-schema.md`.
- [docs/architecture/glossary.md](../architecture/glossary.md) —
  point `Event` term at the new doc.
- [docs/architecture/master-plan.md](../architecture/master-plan.md)
  — register the doc in the milestone references if it tracks
  contract docs.

**New Files:**
- `docs/architecture/event-schema.md`.

**Implementation Steps:**
1. Generate the doc from `event.schema.json` plus a manual emitter /
   consumer table.
2. Add the summary table at the top.
3. Add per-event sections.
4. Cross-link from each `tasks/mvp/06-renderer/07-*` and
   `tasks/phase-3/04-polish/02-*` so consumers know where the
   contract lives.

**Dependencies:**
- 3.B-1 (the schema must exist first; doc derives from it).

**Complexity:** **M** (mostly mechanical from the schema, plus
emitter/consumer table requiring a careful read of dispatch sites).

---

#### Issue 3.B-3: No screen/consumer event-coverage validator

**Source:** Q199 (⚠ Partial); Improvements 3; Risks bullet 4.

**Problem:**
[docs/architecture/screen-command-coverage.json](../architecture/screen-command-coverage.json)
is the closed vocabulary that the screen-package validator binds
against for **commands**. There is no equivalent for **events**, so
a UI/HUD consumer (e.g. floating-damage-text reading `UNIT_DIED`)
can drift from the canonical kind list without CI catching it.

**Impact:**
- Renderer / HUD / sound consumers and the dispatcher will silently
  disagree on event kinds.
- Adding a new screen package that listens for events has no
  validator to keep it honest.

**Solution:**
Add `docs/architecture/screen-event-coverage.json` modelled on the
command-coverage file:
- `eventAliases`: maps any UI-local synonyms (`SHOW_DAMAGE_FLOAT`,
  `PLAY_DEATH_RATTLE`) to canonical kinds.
- `localUiPrefixes`: presentation-only event-shaped tokens (e.g.
  `ANIMATE_`, `SOUND_`) that do not enter the deterministic event
  log.
- A coverage block listing each canonical kind and the screen
  packages / consumer tasks that bind it.

Extend the existing coverage validator (the script behind
`npm run validate:tasks`) to load this file and fail on undeclared
event tokens in
[docs/architecture/wiki/screens/*/interactions.md](../architecture/wiki/screens/).

**Files to Update:**
- The script powering `validate:tasks` (path discoverable via
  `package.json` → `scripts.validate:tasks`).
- [docs/architecture/task-command-token-coverage.json](../architecture/task-command-token-coverage.json)
  — extend if it should also cover event-log markers, or split out
  a sibling file for clarity.

**New Files:**
- `docs/architecture/screen-event-coverage.json`.

**Implementation Steps:**
1. Author the JSON file mirroring the command-coverage layout.
2. Populate from the 13 known event kinds.
3. Wire the validator to read it and assert closed-set membership
   for any ALL_CAPS event token in screen `interactions.md` files.
4. Run `npm run validate:tasks` — expected to pass since no
   undeclared events should currently exist.

**Dependencies:**
- 3.B-1 (kinds must be canonical first).
- 3.B-2 (consumer table identifies which screens bind which event).

**Complexity:** **M**.

---

### Persistence, Retention & Save/Load

#### Issue 3.C-1: Event-log retention / bounding policy is undefined

**Source:** Q200 (⚠ Partial); Missing-Logic bullet 6; Risks bullet 5;
Improvements 5.

**Problem:**
The command log is canonical and persisted; the event log is a
deterministic byproduct, but it is unclear whether the in-memory
event log is unbounded, ring-buffered, or drained on consumption.
A long auto-resolve marathon could grow it without limit.

**Impact:**
- Memory pressure during long sessions.
- Implementers will ad-hoc choose a retention strategy at the first
  performance concern; that ad-hoc choice will leak into save/load
  semantics if not pinned.

**Solution:**
Pin a two-tier policy in `event-system.md`:
- **Per-command return value**: `events: Event[]` returned from
  `dispatch` is the canonical mechanism. Consumers consume from
  this array directly; nothing is retained globally by the
  dispatcher.
- **Optional diagnostic ring buffer**: if a session-wide log is
  needed for replay diagnostics, it is a **ring buffer of N = 10000
  events**, owned outside the deterministic engine (e.g. in a dev
  overlay). It is NEVER read by gameplay code and NEVER serialized.
- Auto-resolve battles return their own per-battle `eventLog:
  Event[]` ([06-auto-resolve-combat.md:43-44](../../tasks/mvp/05-adventure-map/06-auto-resolve-combat.md#L43-L44))
  which is consumed once by the UI and then dropped.

**Files to Update:**
- `docs/architecture/event-system.md` (3.A-1) — add "Retention &
  Bounding" section.
- [tasks/mvp/01-engine-core/06-command-dispatcher.md](../../tasks/mvp/01-engine-core/06-command-dispatcher.md)
  — clarify that the dispatcher does not retain events globally.
- [tasks/mvp/06-renderer/07-event-log-animation-timeline.md](../../tasks/mvp/06-renderer/07-event-log-animation-timeline.md)
  — clarify that the timeline's queue is presentation-side, not the
  source of truth.

**New Files:**
- None.

**Implementation Steps:**
1. Author the retention section in `event-system.md`.
2. State the constant `EVENT_RING_BUFFER_SIZE = 10000` for the
   diagnostic-only ring buffer.
3. Update task wording.

**Dependencies:**
- 3.A-1.

**Complexity:** **S**.

---

#### Issue 3.C-2: Save/load behaviour for events is unspecified

**Source:** Q201 (⚠ Partial); Missing-Logic bullet 7; Risks bullet 3;
Improvements 7.

**Problem:**
Saves persist `(seed, content hashes, command log)` plus state
snapshot. Whether events are explicitly excluded, and how the
animation timeline rehydrates after `LOAD_GAME`, is not written
down. A partial-persist mistake would cause replay desync between
state and presentation.

**Impact:**
- A future implementer might naively serialize the event log into
  the save file; replays would then diverge from re-derived events.
- The renderer's animation timeline could attempt to "replay
  history" on load, producing a flickering catch-up animation
  on the first frame.

**Solution:**
State explicitly in `event-system.md` and in the save-system task:
- Events are **NEVER serialized**. Saves contain `(seed, content
  hashes, command log, state snapshot)`; events are re-derived only
  if and when a command is replayed.
- The animation timeline rehydrates **empty** after a load. It does
  not replay historical events at speed 0; the world picks up
  "from now". This matches the existing rule that presentation/animation
  state stays outside deterministic gameplay state.
- Per-battle `eventLog: Event[]` returned from
  `AUTO_RESOLVE_BATTLE` is one-shot UI-bound and never enters the
  save record.

**Files to Update:**
- `docs/architecture/event-system.md` (3.A-1) — add "Save & Load"
  section.
- The save-system task (path resolved via `npm run tasks:show -- <id>`
  for the M-tier save task; if missing, this plan flags it as a gap
  for the persistence-plan to absorb).
- [docs/implementation-plans/08-persistence-save-system-plan.md](./08-persistence-save-system-plan.md)
  — cross-reference the rule so the persistence plan owns the save
  schema mention.

**New Files:**
- None.

**Implementation Steps:**
1. Author the "Save & Load" section.
2. Add an explicit acceptance criterion to the save-system task:
   "save record MUST NOT contain any field whose key matches
   `events?` or `eventLog?`".
3. Cross-link from the persistence plan.

**Dependencies:**
- 3.A-1.

**Complexity:** **S**.

---

### Tasks

#### Issue 3.D-1: No event golden-file / fixture testing convention

**Source:** Q202 (❌ UNKNOWN); Missing-Logic bullet 9; Improvements 6.

**Problem:**
The dispatcher task acceptance criteria
([06-command-dispatcher.md:40-48](../../tasks/mvp/01-engine-core/06-command-dispatcher.md#L40-L48))
test command behaviour but say nothing about asserting emitted-event
shapes or sequences. There is no `tests/events/` convention, no
golden-file approach, and no coverage matrix tying commands to
their expected event output.

**Impact:**
- Two implementers writing the same command handler will produce
  two different event payload shapes and neither will be caught by
  CI.
- Replay parity cannot be asserted on events — only on state — so a
  presentation regression (e.g. missing `PROJECTILE_FIRED` event)
  silently breaks the timeline without breaking determinism tests.

**Solution:**
Add a new task
`tasks/mvp/01-engine-core/06c-event-golden-tests.md`:
- Acceptance: for each command kind in `command.schema.json`, a
  fixture file `tests/events/<command>.golden.json` exists that
  pins the exact `events: Event[]` returned by `dispatch` for one
  canonical input.
- Run via `npm test -- events`.
- A diff is a test failure; updating a golden requires an explicit
  command-line flag.

**Files to Update:**
- [tasks/mvp/01-engine-core/](../../tasks/mvp/01-engine-core/) —
  add new task `06c-event-golden-tests.md`.
- [tasks/task-registry.json](../../tasks/task-registry.json)
  — regenerate via `npm run generate:task-registry`.

**New Files:**
- `tasks/mvp/01-engine-core/06c-event-golden-tests.md`.
- `tests/events/.gitkeep` (initial placeholder; fixtures land
  alongside each command's implementation task).

**Implementation Steps:**
1. Author the new task with `Owned Paths`, `Owned Paths (shared)`,
   `Dependencies`, `verifyCommands` per the project's task template.
2. Set `Dependencies` to include `mvp.01-engine-core.06`
   (dispatcher) and `mvp.01-engine-core.06b` (command-schema
   coverage), so the golden harness is added immediately after the
   dispatcher lands.
3. Run `npm run validate:tasks` to confirm the task lints.
4. Run `npm run generate:task-registry`.

**Dependencies:**
- 3.B-1 (event schema).
- 3.B-2 (event docs — emitter mapping needed for golden coverage).

**Complexity:** **M**.

---

#### Issue 3.D-2: Existing dispatcher / renderer / sound tasks under-specify the event contract

**Source:** Q193, Q194, Q197, Q199, Q203 (consumer-side ambiguity).

**Problem:**
[06-command-dispatcher.md](../../tasks/mvp/01-engine-core/06-command-dispatcher.md),
[07-event-log-animation-timeline.md](../../tasks/mvp/06-renderer/07-event-log-animation-timeline.md),
and
[02-sound-system-event-log-driven.md](../../tasks/phase-3/04-polish/02-sound-system-event-log-driven.md)
each reference the event log but give incompatible descriptions of
how it is consumed (subscriber list / read-only log / synchronized
timeline). Unifying language is a small but high-leverage edit.

**Impact:**
- An AI agent picking up any of these three tasks will follow that
  task's local wording and produce contract-incompatible code.

**Solution:**
Three minimal task edits, each pointing at the new
`event-system.md`:
1. Dispatcher task: replace "Emits typed `Event` objects to a
   subscriber list" with "Emits typed `Event` objects appended to a
   shared in-memory event log; consumers read from it. See
   [event-system.md](../../docs/architecture/event-system.md)".
2. Animation-timeline task: state explicitly that the consumer iterates
   the log in insertion order and runs on rAF; cross-reference
   `event-system.md`.
3. Sound-system task: state that audio is keyed off the animation
   timeline (already present) **and** that it is a second
   independent log consumer with no ordering guarantee relative to
   the animation consumer beyond per-consumer insertion order.

**Files to Update:**
- [tasks/mvp/01-engine-core/06-command-dispatcher.md](../../tasks/mvp/01-engine-core/06-command-dispatcher.md)
- [tasks/mvp/06-renderer/07-event-log-animation-timeline.md](../../tasks/mvp/06-renderer/07-event-log-animation-timeline.md)
- [tasks/phase-3/04-polish/02-sound-system-event-log-driven.md](../../tasks/phase-3/04-polish/02-sound-system-event-log-driven.md)

**New Files:**
- None.

**Implementation Steps:**
1. Apply the three task wording edits.
2. Run `npm run validate:tasks` and `npm run generate:task-registry`.

**Dependencies:**
- 3.A-1 (the doc the tasks now reference).

**Complexity:** **S**.

---

## 4. Suggested Task Breakdown

Each item below is sized to be a single Markdown task file under
`tasks/`. IDs are suggestions; the final IDs are produced by the
task-registry generator.

- [ ] **`mvp.01-engine-core.06c` — Event schema & vocabulary**
      Author `event.schema.json`, `event-schema.md`,
      `screen-event-coverage.json`, register in `schema-matrix.md`.
      Covers Issues 3.B-1, 3.B-2, 3.B-3.
- [ ] **`mvp.01-engine-core.06d` — Event-system contract doc**
      Author `event-system.md` covering listener model, sync/async
      semantics, no-veto, ordering, retention, save/load, error
      isolation, re-entrancy guard rules, `MAX_COMMAND_CHAIN_DEPTH`.
      Covers Issues 3.A-1, 3.A-2, 3.C-1, 3.C-2.
- [ ] **`mvp.01-engine-core.06e` — Event golden tests harness**
      Add `tests/events/`, write the golden-file framework, hook
      into `npm test`. Covers Issue 3.D-1.
- [ ] **`mvp.01-engine-core.06f` — Tighten existing dispatcher /
      renderer / sound task wording**
      Three small edits cross-linking `event-system.md`. Covers
      Issue 3.D-2.

The four tasks should be added under `tasks/mvp/01-engine-core/`
(naming follows existing pattern: `06b-` already exists, so
`06c–06f` are the next free slots) and the registry regenerated
with `npm run generate:task-registry`.

---

## 5. Execution Order

The four tasks have a strict dependency chain. Land them in order:

1. **`06d` — Event-system contract doc** (Issues 3.A-1, 3.A-2, 3.C-1,
   3.C-2). Pure docs, no schema. Unblocks every downstream
   conversation about the event log.
2. **`06c` — Event schema & vocabulary** (Issues 3.B-1, 3.B-2,
   3.B-3). Must follow `06d` because the schema's "no extra
   properties" rule needs `event-system.md` for consumers to
   reference.
3. **`06f` — Task wording cleanups** (Issue 3.D-2). Trivial edits;
   land third so they can cross-link `event-system.md` and
   `event-schema.md`.
4. **`06e` — Event golden tests harness** (Issue 3.D-1). Land last
   because it consumes both the schema and the contract doc; future
   command tasks will add their own goldens against it.

After step 4, the event surface is fully specified; `mvp.06-renderer.07`
(animation timeline) and `phase-3.04-polish.02` (sound system) can
proceed without contract ambiguity.

---

## 6. Risks if Not Implemented

- **Determinism leakage.** A handler emits a command from inside a
  consumer; replay diverges between machines. Manifests as a
  multiplayer desync that bisects to "renderer changed".
- **Event-vocabulary drift.** Animation timeline asserts on
  `UNIT_DIED.unitId`; sound system reads `UNIT_DIED.id`; CI passes
  because no closed schema gates either consumer. Caught at
  integration test time, costs 1–2 days per drift.
- **Replay desync in saves.** A future contributor serializes the
  ring buffer; reload re-derives different events; presentation
  diverges from the deterministic state. Hard to diagnose without
  the explicit "events are never serialized" rule.
- **Memory unbounded.** Long auto-resolve marathon retains every
  per-battle `eventLog`; session crashes after N battles.
- **Cross-consumer race.** Sound plays before the corresponding
  frame renders, or after the next frame; rule for ordering is
  ambient and varies by implementer.
- **Silent UX failure.** A throwing consumer freezes audio with no
  log line; QA cannot reproduce because the failure is consumer-side
  and the deterministic state is fine.
- **AI-agent divergence.** Two parallel agents implementing the
  dispatcher and the sound system invent disjoint payload shapes
  with no validator to flag the divergence — exactly the
  AI-readiness failure mode the audit calls out (3 / 10).

---

## 7. AI Implementation Readiness

**Score after plan executes: 8 / 10** (from current 3 / 10).

After the four tasks land, an AI agent given the docs can:

- Look up every event kind, payload, emitter, and consumer in one
  place (`event-schema.md`).
- Validate any emitted event against `event.schema.json` with the
  same `validate:contracts` gate that already polices commands.
- Read precise contract clauses for emission timing, consumer
  iteration, no-veto, no re-entry, retention, save/load, and error
  isolation in one doc (`event-system.md`).
- Run `npm test -- events` and immediately see a golden-file diff
  for any handler that drifts.
- Trust that the dispatcher / animation / sound tasks all link to
  the same source of truth.

**Why not 10 / 10:** payload field details for some events
(`UNIT_MOVED.path`, `SPELL_CAST.targets`) will be filled in by the
implementing tasks at code-time, not pre-pinned in the schema. This
is intentional — the additive-first evolution rule lets each
gameplay task own its event payload extension without re-opening
the schema. An AI agent implementing one of those gameplay tasks
will need to read both `event-schema.md` and the specific gameplay
task to produce a complete payload. The remaining 2 points reflect
that one-step indirection.
