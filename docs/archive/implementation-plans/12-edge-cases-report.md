# Implementation Report — 12 Edge Cases

Source plan:
[`docs/archive/implementation-plans/12-edge-cases-plan.md`](./12-edge-cases-plan.md)

This report enumerates every file created or updated while applying
the plan, the assumptions made when the plan was ambiguous, and any
remaining blockers.

---

## 1. Updated Files

### Architecture docs

- `docs/architecture/command-schema.md` — added Gate 0 (current-actor)
  framework, ValidationError taxonomy, Single-flight commands, and
  Numeric invariants sections.
- `docs/architecture/determinism.md` — added Saturation policy,
  State-shape invariants, and Wall-clock readers sections.
- `docs/architecture/state-flow.md` — added Save eligibility section.
- `docs/architecture/content-platform.md` — added Asset-Load Failure
  Policy section.
- `docs/architecture/effect-registry.md` — added Drain semantics
  section.
- `docs/architecture/ai-generation-pipeline.md` — added Gameplay vs
  Presentation Boundary section.
- `docs/architecture/diagrams/18-string-resolution.md` — added
  Mid-Game Locale Swap section.
- `docs/architecture/diagrams/19-locale-variants.md` — added
  Fallback Chain Order and Battle Canvas Mirroring sections.
- `CLAUDE.md` — inserted `edge-cases-policy.md` into the Read-First
  list at position 4 (between determinism and content-platform);
  shifted all subsequent numbers.

### Schemas

- `content-schema/schemas/command.schema.json` — added
  `positiveInteger`, `nonNegativeInteger`, `resourceAmount` shared
  `$defs` re-using the public contract from
  `numeric.json`.
- `content-schema/schemas/unit.schema.json` — added `maximum`
  (`MAX_RESOURCE = 2_000_000_000`) to `cost`.
- `content-schema/schemas/building.schema.json` — added `maximum`
  to `cost`.

### Screen interaction packages

- `docs/architecture/wiki/screens/07-adventure-map/interactions.md`
  — added end-day debounce + single-flight policy.
- `docs/architecture/wiki/screens/38-combat-screen/interactions.md`
  — added end-turn debounce policy and Multiplayer Disconnect
  section.
- `docs/architecture/wiki/screens/38-combat-screen/data-contracts.md`
  — added `OpponentDisconnect` selector and
  `mp.combat.disconnect_banner` / `mp.combat.forfeit_modal`
  localization keys.
- `docs/architecture/wiki/screens/54-system-menu/interactions.md`
  — added save-eligibility predicate references and debounce note.
- `docs/architecture/wiki/screens/55-save-load/interactions.md` —
  added save-eligibility disable rules and storage-warning toast
  surfaces.
- `docs/architecture/wiki/screens/56-options/interactions.md` —
  added Locale Swap section.

### Tasks

- `tasks/mvp/01-engine-core/06-command-dispatcher.md` — added
  acceptance criteria for Gate 0, ValidationError taxonomy,
  single-flight, and state-shape invariants.
- `tasks/mvp/01-engine-core/06b-extend-command-schema-coverage-checklist.md`
  — added numeric-invariants acceptance criterion.
- `tasks/mvp/01-engine-core.md` — added entry for new Task 11
  (no-wall-clock lint).
- `tasks/mvp/02-content-schemas/12-formula-dsl.md` — added
  saturation-policy acceptance criterion.
- `tasks/mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md`
  — added fallback chain, retry policy, notification, and
  gameplay-vs-presentation boundary acceptance criteria.
- `tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md`
  — added Rehydration Mode and Visibility Hooks sections.
- `tasks/mvp/08-persistence/01-indexeddb-wrapper.md` — rewrote
  Quota Policy section to reference the eviction module and
  StorageError taxonomy; updated acceptance criteria.
- `tasks/mvp/08-persistence/02-log-only-save-format.md` — added
  `localeAtSave` field and acceptance criteria for save-eligibility,
  animation rehydration, locale metadata, and tab-resume autosave.
- `tasks/mvp/08-persistence/06-autosave.md` — added Tab-Resume
  Autosave section.
- `tasks/mvp/08-persistence.md` — added entry for new Task 9
  (quota handling).
- `tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md`
  — added Combat-Specific Behaviour section.
- `tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md`
  — added `WILL_BACKGROUND` extension acceptance criterion.

---

## 2. New Files

### Architecture docs

- `docs/architecture/edge-cases-policy.md` — canonical
  cross-cutting policy doc (15 sections covering Q204–Q218).
- `docs/architecture/storage-policy.md` — per-store byte budgets,
  eviction order, Safari constraint, StorageError taxonomy.
- `docs/architecture/visibility-policy.md` — per-subsystem
  `visibilitychange` / `pagehide` behavior.

### Schemas

- `content-schema/schemas/numeric.json` — shared `$defs`
  (`positiveInteger`, `nonNegativeInteger`, `resourceAmount`,
  `unitCount`, `intermediate`).
- `content-schema/schemas/dispatcher-validation-error.schema.json`
  — closed `oneOf` over `MALFORMED_PAYLOAD`, `NOT_CURRENT_ACTOR`,
  `ENTITY_NOT_FOUND`, `INSUFFICIENT_RESOURCES`, `ILLEGAL_PHASE`,
  `OWNERSHIP_VIOLATION`, `UNREACHABLE_TARGET`, `DUPLICATE_INTENT`.
- `content-schema/schemas/storage-error.schema.json` — closed
  `oneOf` over `QUOTA_EXCEEDED`, `IDB_VERSION_ERROR`, `IDB_BLOCKED`,
  `IDB_DATA_CORRUPTION`.

### Schema examples

- `content-schema/examples/records/dispatcher-validation-error/`
  with one example per code: `malformed-payload.error.json`,
  `not-current-actor.error.json`, `entity-not-found.error.json`,
  `insufficient-resources.error.json`, `illegal-phase.error.json`,
  `ownership-violation.error.json`, `unreachable-target.error.json`,
  `duplicate-intent.error.json`.

### Content-schema docs

- `content-schema/save-eligibility.md` — `canSaveNow(state)`
  predicate and reason-ID localization keys.

### Engine planning stubs

- `src/engine/constants.ts` — central numeric-cap export
  (`MAX_RESOURCE`, `MAX_UNIT_COUNT`, `MAX_HERO_STAT_DEFAULT`,
  `MAX_INTERMEDIATE`).

### Tasks

- `tasks/mvp/01-engine-core/11-no-wall-clock-lint.md` — ESLint
  rule task.
- `tasks/mvp/08-persistence/09-quota-handling.md` — per-store
  budget tracker + LRU eviction + warning toast.
- `tasks/phase-2/09-quality.md` — new module file for the Phase-2
  quality bar.
- `tasks/phase-2/09-quality/01-overflow-fuzz.md` — overflow /
  saturation fuzz target task.

---

## 3. Assumptions

⚠️ **Assumption:** the plan's `content-schema/$defs/numeric.json`
path was interpreted as `content-schema/schemas/numeric.json`,
because every other schema in the repo lives under
`content-schema/schemas/` and `$defs` is a JSON-Schema keyword
(not a directory convention used elsewhere).

⚠️ **Assumption:** the plan's
`content-schema/validation-error.schema.json` was authored as
`content-schema/schemas/dispatcher-validation-error.schema.json`
because `content-schema/schemas/validation-error.schema.json`
already exists with a different purpose (CI / Zod / record-level
errors per `tasks/mvp/02-content-schemas/22-validation-error-contract.md`).
Renaming or clobbering the existing schema would have broken its
owning task and the AI-feedback-loop consumer the schema cites.
The new dispatcher-side taxonomy lives in a sibling file and
covers the runtime command-dispatch codes named in the plan.

⚠️ **Assumption:** the plan's `tasks/phase-2/01-quality/` path was
authored as `tasks/phase-2/09-quality/` because
`tasks/phase-2/01-spells-artifacts/` already occupies the `01`
slot. A new module file `tasks/phase-2/09-quality.md` was added
to register the module.

⚠️ **Assumption:** the plan's `tasks/mvp/02-rules-engine/` path
was interpreted as the existing
`tasks/mvp/02-content-schemas/12-formula-dsl.md` (the formula
evaluator), which is the canonical owner of the formula-step
math. There is no `02-rules-engine` module today.

⚠️ **Assumption:** the plan referenced screens `04-adventure-map`,
`12-battle-screen`, `54-system-menu`. These were mapped to the
real screen IDs `07-adventure-map`, `38-combat-screen`,
`54-system-menu` from `docs/architecture/wiki/screens/index.json`.

⚠️ **Assumption:** for Issue 3.B-1, the schema refactor was scoped
to introducing the shared `$defs` in `numeric.json`, mirroring
them as same-file `$defs` inside `command.schema.json` for
existing-pipeline compatibility, and adding `maximum: MAX_RESOURCE`
to clearly resource-shaped `cost` fields on `unit.schema.json` and
`building.schema.json`. A full sweep of every integer field in
every schema was out of scope for this plan; the public contract
is the new shared `numeric.json`, and follow-up authoring (covered
by `06b-extend-command-schema-coverage-checklist.md`) will
broaden coverage under that contract.

⚠️ **Assumption:** the plan's `tests/fuzz/overflow.fuzz.ts`
location was kept verbatim in the new fuzz task even though the
existing fuzz harness lives at
`src/engine/__tests__/fuzz.test.ts`. The new task is owned by the
Phase-2 quality module and is free to choose a different folder
when implemented; the plan's path is preserved in the task spec.

⚠️ **Assumption:** numeric maximum literals in the schemas use
`2000000000` (without underscores) because JSON-Schema integer
literals are JSON, which forbids numeric separators.

---

## 4. Blockers

None. Every section of the plan was either implemented in code /
schema / task form, or recorded as a documented assumption when a
literal path resolution required interpretation.

The following items the plan explicitly listed as **out of scope**
remain in their owning audits:

- Q160 autosave cadence — owned by the persistence audit's plan;
  the tab-resume autosave hook here is best-effort until that
  cadence policy lands.
- Q146 bot-ownership-in-MP — owned by the multiplayer audit's
  plan; combat-disconnect (Issue 3.E-2) explicitly defers AI
  takeover to that work.
- Q201 animation-timeline rehydration — touched by Issue 3.C-1
  but the full timeline shape lives in the event-system audit's
  plan.
- Phase-3 AI-generation pipeline runtime safety — only the
  presentation-vs-gameplay boundary is sharpened here; the full
  validation pipeline is owned by `tasks/phase-3/02-ai-generation/`.

---

## Validation

After this change set, the following sweep should be run before
handoff:

```
npm run validate
```

This regenerates the task registry and runs links, contracts,
cross-refs, and task lint. Two new tasks
(`mvp.01-engine-core.11-no-wall-clock-lint`,
`mvp.08-persistence.09-quota-handling`,
`phase-2.09-quality.01-overflow-fuzz`) need to land in the
registry; the dispatcher-validation-error and storage-error
schemas need to be picked up by `validate:schemas`. If
`validate:enums` flags missing entries (no enum literals in
`enums.snapshot.json` were touched here), re-run
`generate:enum-snapshot` after a sanity check.
