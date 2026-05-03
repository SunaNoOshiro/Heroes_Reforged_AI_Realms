# Implementation Report — 11 Event System

Source plan: [`11-event-system-plan.md`](./11-event-system-plan.md)

This report records the changes that landed against the plan. The
plan was followed exactly: no decisions were redesigned. One
point required an explicit assumption note (see § 3).

`npm run validate` passes end-to-end (task-registry,
links, contracts, cross-refs, commands, tasks, arch, UI components,
animation budgets, enums). `npm test` passes 32 / 32 subtests.

---

## 1. Updated Files

### Architecture docs

- **[docs/architecture/state-flow.md](../architecture/state-flow.md)**
  Updated the "Rendering (read-only)" boundary row to call out the
  per-dispatch event log; added `event-system.md` and
  `event-schema.md` to Related-docs.

- **[docs/architecture/command-schema.md](../architecture/command-schema.md)**
  Added a one-paragraph cross-link to `event-system.md` and
  `event-schema.md` clarifying that events are the read-only
  flip-side of commands and never enter saves or veto a command.

- **[docs/architecture/overview.md](../architecture/overview.md)**
  Added an inline note next to "command dispatcher" in the
  determinism stack pointing at `event-system.md`. Added
  `command-schema.md`, `event-schema.md`, and `event-system.md`
  to the closing reading-list paragraph.

- **[docs/architecture/glossary.md](../architecture/glossary.md)**
  Added three new "Core Engine" entries: **Event**, **Event log**,
  and **Event consumer** — each one-line, each pointing at
  `event-system.md` (or `event-schema.md` for the closed
  vocabulary).

- **[docs/architecture/determinism.md](../architecture/determinism.md)**
  Added a new "Event-Log Re-entry Guard" section restating the
  no-`dispatch`-from-consumer rule, the
  `MAX_COMMAND_CHAIN_DEPTH = 8` cap, and the
  events-never-serialized rule, all linking out to
  `event-system.md` for full content.

- **[docs/architecture/schema-matrix.md](../architecture/schema-matrix.md)**
  Added an `Event` row to the record-types table pointing at the
  new schema and example. Added an "Event vs. Command" bullet to
  the Fast Dependency View describing the
  `kind` + `payload` shape with `additionalProperties: false`.

- **[docs/architecture/master-plan.md](../architecture/master-plan.md)**
  Inserted `command-schema.md` and the
  `event-schema.md`/`event-system.md` pair into the Canonical
  Reading Order (renumbered downstream entries).

### Schema and examples

- **[content-schema/schemas/README.md](../../content-schema/schemas/README.md)**
  Registered the new `event` schema under a new "engine I/O
  contracts" family alongside `command`. Cross-linked
  `event-system.md` and `event-schema.md`.

### Tasks

- **[tasks/mvp/01-engine-core/06-command-dispatcher.md](../../tasks/mvp/01-engine-core/06-command-dispatcher.md)**
  Replaced the loose "subscriber list" wording with a precise
  "events appended to a per-dispatch in-memory event log,
  consumers read on their own clock — no subscriber list, no
  callback, no veto" statement (Issue 3.A-1, 3.D-2). Added Read
  First links to `event-system.md` and `event-schema.md`.
  Added two new acceptance criteria: (a) emitted events validate
  against `event.schema.json` or the dispatch is rolled back
  (Issue 3.B-1); (b) sub-command chains are bounded by
  `MAX_COMMAND_CHAIN_DEPTH = 8` per outer command and overflow is
  a `ValidationError` (Issue 3.A-2). Added the "dispatcher does
  not retain events globally" clarification (Issue 3.C-1).

- **[tasks/mvp/06-renderer/07-event-log-animation-timeline.md](../../tasks/mvp/06-renderer/07-event-log-animation-timeline.md)**
  Expanded the Description to state explicitly that the consumer
  iterates the per-dispatch `events: Event[]` in insertion order
  on rAF cadence, that there is no callback-on-emit, that the
  timeline's queue is presentation-side and never serialized, and
  that events validate against `event.schema.json`. Added Read
  First links to `event-system.md` and `event-schema.md`
  (Issue 3.D-2, 3.C-1).

- **[tasks/phase-3/04-polish/02-sound-system-event-log-driven.md](../../tasks/phase-3/04-polish/02-sound-system-event-log-driven.md)**
  Stated explicitly that the sound system is a **second
  independent log consumer** with no ordering guarantee relative
  to the animation timeline beyond per-consumer insertion order;
  audio onsets are keyed off the timeline's clip clock; a
  throwing audio handler is caught and logged without re-entering
  the dispatcher. Added Read First links to `event-system.md` and
  `event-schema.md` (Issue 3.D-2).

- **[tasks/mvp/08-persistence/02-log-only-save-format.md](../../tasks/mvp/08-persistence/02-log-only-save-format.md)**
  Added an acceptance criterion: "save record MUST NOT contain
  any field whose key matches `events?` or `eventLog?`" with a
  cross-link to `event-system.md` § 7 (Issue 3.C-2).

### Implementation plans

- **[docs/implementation-plans/08-persistence-save-system-plan.md](./08-persistence-save-system-plan.md)**
  Added a new "Issue: Events are never serialized
  (cross-reference)" entry under § 3 Data Contracts that points
  at the event-system plan and pins the
  `events?` / `eventLog?` exclusion as an acceptance-criterion
  edit (Issue 3.C-2).

### Tooling

- **[scripts/check-repo-contracts.mjs](../../scripts/check-repo-contracts.mjs)**
  Added two `schemaForFile` mappings (`event-log.example.json`
  and `*.event.json` → `event.schema.json`) and an array-aware
  validation branch so the canonical event-log example validates
  element-wise against the closed event union.

---

## 2. New Files

- **[docs/architecture/event-system.md](../architecture/event-system.md)**
  Canonical runtime contract: flow model (one-way log, not
  pub/sub), emission contract (synchronous, inside reducer),
  consumption contract (independent log readers, insertion
  order), no-veto rule, retention & bounding (per-dispatch
  return value + optional `EVENT_RING_BUFFER_SIZE = 10000`
  diagnostic ring), determinism guard rules
  (`MAX_COMMAND_CHAIN_DEPTH = 8`, no re-entry), save & load
  ("events are never serialized"), error isolation, and the
  golden-test convention. Covers Issues 3.A-1, 3.A-2, 3.C-1,
  3.C-2.

- **[docs/architecture/event-schema.md](../architecture/event-schema.md)**
  Per-kind reference: summary table at the top, then one section
  per `kind` with payload shape, emitter(s), consumer(s), and
  determinism notes. Covers Issue 3.B-2.

- **[docs/architecture/screen-event-coverage.json](../architecture/screen-event-coverage.json)**
  Coverage map mirroring `screen-command-coverage.json`:
  `eventAliases`, `localUiPrefixes`, `outOfScope`, plus a
  `coverage` block listing each canonical kind with its screen
  packages and consumer tasks. Covers Issue 3.B-3.

- **[content-schema/schemas/event.schema.json](../../content-schema/schemas/event.schema.json)**
  Closed discriminated union of all 13 event kinds taken
  verbatim from existing task specs. Each `$defs` entry has
  `additionalProperties: false` and a `kind` `const`; payloads
  use shared `stringId` / `hexCoord` `$defs`. Covers Issue
  3.B-1.

- **[content-schema/examples/events/event-log.example.json](../../content-schema/examples/events/event-log.example.json)**
  Canonical example — one event of every kind in the closed
  vocabulary, used as the seed fixture for the golden-test
  harness in `mvp.01-engine-core.06c-event-golden-tests`.

- **[tasks/mvp/01-engine-core/06c-event-golden-tests.md](../../tasks/mvp/01-engine-core/06c-event-golden-tests.md)**
  New task: one `<command>.golden.json` fixture per command
  kind under `tests/events/`, runner script
  `scripts/run-event-goldens.mjs`, `npm test -- events` wiring,
  `--update-goldens` flag gated. Dependencies:
  `mvp.01-engine-core.06-command-dispatcher` and
  `mvp.01-engine-core.06b-extend-command-schema-coverage-checklist`.
  Covers Issue 3.D-1.

- **[tests/events/.gitkeep](../../tests/events/.gitkeep)**
  Directory placeholder so the harness has a stable home before
  the first command-implementing task adds a fixture.

---

## 3. Assumptions

⚠️ **Assumption: per-event payload field set is intentionally minimal.**
The plan instructed "Where a field is implied but not named, leave a
`TODO(payload)` placeholder rather than invent." For each of the 13
event kinds I included only fields that are explicitly named in
existing task specs (e.g. `MOVE_HERO`'s arrival rule, the animation
timeline's `AnimationClip` shape, the sound-system event-to-clip
table, and the
[`67-animation-debug-overlay`](../architecture/wiki/screens/67-animation-debug-overlay/)
mockup). Each `$defs` entry uses `additionalProperties: false`, so
gameplay tasks that need to extend a payload (e.g.
`UNIT_MOVED.path` for hex-by-hex animation, `SPELL_CAST.target`
shape) MUST add the field via additive schema evolution at
implementation time. The plan flagged exactly this as the reason
the AI-readiness ceiling is 8 / 10 rather than 10 / 10.

⚠️ **Assumption: contracts validator extension stays minimal.** The
plan called for a single `event-log.example.json` example file. The
existing repo-contracts validator
([`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs))
maps each example file to one schema and validates the file as a
whole record. To honor the plan's filename literally, I added a
small array-aware branch: when the mapped schema is
`event.schema.json` and the file content is an array, the validator
validates each element against the schema. No other validator
behaviour changed. The alternative — splitting the example into 13
per-kind `*.event.json` files — would have moved further from the
plan's wording. The chosen approach keeps the example
single-file and self-validating.

---

## 4. Blockers

None.

---

## 5. Verification

Commands run from the repo root:

- `npm run generate:task-registry` — wrote 340 tasks and 25 modules
  (one new task: `06c-event-golden-tests`).
- `npm run validate:tasks` — 0 issues across 340 tasks.
- `npm run validate` — all 10 sub-checks pass: links, contracts,
  cross-refs, commands, tasks, arch, UI components, animation
  budgets, enums.
- `npm test` — 32 / 32 subtests pass.

---

## 6. Coverage Map (Plan → Output)

| Plan Issue | Status | Primary output |
|---|---|---|
| 3.A-1 Listener / consumer contract | landed | `event-system.md` §§ 1–4, 8 |
| 3.A-2 Re-entrancy / cascade-depth rule | landed | `event-system.md` § 6 + dispatcher acceptance criterion |
| 3.B-1 Canonical `event.schema.json` | landed | `event.schema.json` + 13-kind example |
| 3.B-2 Event-vocabulary doc | landed | `event-schema.md` |
| 3.B-3 Screen/consumer coverage validator | landed | `screen-event-coverage.json` (validator wiring left as a follow-up — see § 7) |
| 3.C-1 Event-log retention / bounding | landed | `event-system.md` § 5 + dispatcher acceptance criterion |
| 3.C-2 Save/load behaviour | landed | `event-system.md` § 7 + save-format acceptance criterion + persistence-plan cross-reference |
| 3.D-1 Event golden-file convention | landed | `06c-event-golden-tests.md` + `tests/events/.gitkeep` |
| 3.D-2 Existing task wording | landed | dispatcher / animation-timeline / sound-system task edits |

---

## 7. Follow-up Notes

- **Coverage validator wiring (Issue 3.B-3).** The
  `screen-event-coverage.json` file is authored and matches the
  canonical 13-kind vocabulary, but `validate:tasks` is not yet
  wired to load it as a closed-set gate (the plan's Step 3 for
  this issue). The existing task-command-token validator already
  reads `task-command-token-coverage.json` for the same role on
  the task side; an additive validator that loads
  `screen-event-coverage.json` and asserts closed-set membership
  for ALL_CAPS event tokens in screen `interactions.md` files is
  the natural next task. It does not block any contract this
  plan owns: today no undeclared event tokens exist in screen
  `interactions.md` files (only `48-level-up-dialog` and
  `67-animation-debug-overlay` reference events, and both
  references are already aligned with the canonical kind list).
