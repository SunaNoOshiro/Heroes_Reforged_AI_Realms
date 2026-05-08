# Event Golden Tests Harness

Module: [Engine Core (M0)](../01-engine-core.md)

Description:
Pin the exact `events: Event[]` returned by `dispatch` for every
command kind in `command.schema.json`. The dispatcher already
asserts state correctness; this harness asserts event-shape
correctness so that two implementers writing the same command
handler cannot produce two different event payload shapes without
CI catching it.

Each command kind owns a fixture `tests/events/<command>.golden.json`
that pins one canonical input plus the exact emitted event list.
A diff is a test failure; updating a golden requires an explicit
command-line flag so an implementer cannot silently overwrite the
contract. Replays re-derive events from the command log per
[`event-system.md` § 7](../../../docs/architecture/event-system.md#7-save--load),
so byte-identical replay parity at the event level falls out of the
golden suite automatically.

Read First:
- [`docs/architecture/event-system.md`](../../../docs/architecture/event-system.md)
- [`docs/architecture/event-schema.md`](../../../docs/architecture/event-schema.md)
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- [`content-schema/schemas/event.schema.json`](../../../content-schema/schemas/event.schema.json)

Inputs:
- `Command` union from `content-schema/schemas/command.schema.json`
- `Event` union from `content-schema/schemas/event.schema.json`
- Dispatcher signature
  `dispatch(state, cmd) → Result<{state, events: Event[]}, ValidationError>`
  from `mvp.01-engine-core.06-command-dispatcher`

Outputs:
- `tests/events/` directory (one `<command>.golden.json` per command
  kind, populated alongside each command's implementing task)
- `scripts/run-event-goldens.mjs` (Node test runner that loads each
  golden, dispatches the canonical command, and compares
  `Result.events` with the golden's `expectedEvents` array)
- `npm test -- events` wires the runner into the existing test
  command
- An `--update-goldens` flag on the runner that rewrites every
  fixture from current dispatcher output (must NOT be the default
  for `npm test`)

Owned Paths:
- `tests/events/`
- `scripts/run-event-goldens.mjs`

Owned Paths (shared):
- `package.json`

Dependencies:
- mvp.01-engine-core.06-command-dispatcher
- mvp.01-engine-core.06b-extend-command-schema-coverage-checklist

Acceptance Criteria:
- Each command kind in `content-schema/schemas/command.schema.json`
  has a corresponding `tests/events/<command>.golden.json` fixture
  by the time that command's implementing task is `done`; commands
  whose fixture is missing fail the harness with a clear
  `missing golden for kind <KIND>` message
- Each fixture contains: `command` (a single canonical command
  envelope), `state` (input fixture state or a reference to one
  under `tests/fixtures/`), and `expectedEvents` (the exact
  `Event[]` the dispatcher must return)
- Every event in `expectedEvents` validates against
  `content-schema/schemas/event.schema.json`
- Running the harness against unchanged code produces zero diffs;
  any payload-shape change in a command handler that drifts from
  its golden is a test failure
- The `--update-goldens` flag is gated: it only fires when the
  flag is passed on the command line; `npm test` runs it without
  the flag and never rewrites a fixture
- `npm test -- events` exits non-zero on any diff, missing golden,
  or schema-validation failure
- Fixtures use canonical-JSON byte ordering (sorted keys, integer
  literals only) so a passing fixture round-trips through
  `canonical-json.ts` byte-identically
- Shared path work is additive only: extend `package.json`'s test
  scripts to wire in the event-golden runner without rewriting the
  primary `npm test` contract owned by
  `mvp.01-engine-core.10-github-actions-ci`. The golden harness is
  a sibling to the existing test surface, never a replacement.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
