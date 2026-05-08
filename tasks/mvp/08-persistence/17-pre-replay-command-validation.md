# Pre-Replay Command-Log Validation

Module: [Persistence (M1)](../08-persistence.md)

Description:
Run the entire `commandLog` against `command.schema.json` and the
active pack registry **before** the reducer is invoked. A malformed
command surfaces at a clean rejection point with full context
instead of mid-replay, so a 300-turn match never aborts at turn 200
with a half-loaded state. Plan 27 § Critical Fix 3.

Read First:
- [`docs/architecture/parser-hardening.md`](../../../docs/architecture/parser-hardening.md)
- [`docs/architecture/save-migration.md`](../../../docs/architecture/save-migration.md)
- [`docs/architecture/security-model.md`](../../../docs/architecture/security-model.md)
- [`docs/architecture/diagrams/25-load-flow.md`](../../../docs/architecture/diagrams/25-load-flow.md)
- [`content-schema/schemas/command.schema.json`](../../../content-schema/schemas/command.schema.json)
- [`content-schema/schemas/save.schema.json`](../../../content-schema/schemas/save.schema.json)

Inputs:
- Loaded `SaveEnvelope.body.commandLog` after parser-hardening,
  schema validation, migration chain, and pack-hash gate succeed.
- Active pack registry (the resolver's output of unit / spell /
  faction / hero / artifact IDs).

Outputs:
- `src/persistence/validate-command-log.ts` — pure function
  `validateCommandLog(log, registry, expectedTurnRange) → { ok, log | reason, index, context }`
- Wiring into the load pipeline so the reducer never sees an
  un-pre-validated entry.
- Closed lowercase rejection-reason enum
  (`schemaInvalid`, `unknownUnit`, `unknownSpell`, `unknownFaction`,
  `unknownHero`, `unknownArtifact`, `turnOutOfRange`,
  `negativeNumeric`, `nonIntegerNumeric`) — full vocabulary
  pinned in `parser-hardening.md` cross-link.
- Golden tests in `scripts/check-command-log-validation.mjs`.

Owned Paths:
- `src/persistence/validate-command-log.ts`
- `scripts/check-command-log-validation.mjs`

Owned Paths (shared):
- `content-schema/schemas/save.schema.json` — Plan 27 contributes
  the tamper-relevant rules (per-array `maxItems` cap on the
  command log, integer-only numerics, capped `packHashes`); the
  schema *file* and its canonical example remain owned by
  [`tasks/mvp/02-content-schemas/28-save-schema.md`](../../mvp/02-content-schemas/28-save-schema.md).
  Contributions are additive only — pre-existing constraints must
  not be rewritten or weakened. Primary owner: task 28.

Dependencies:
- mvp.08-persistence.16-parser-hardening
- mvp.02-content-schemas.28-save-schema
- mvp.02-content-schemas.10-zod-validators-for-all-schemas

Acceptance Criteria:
- `validateCommandLog` is pure-deterministic: same inputs always
  produce the same `ok` / `reason` / `index`.
- The function walks every entry once; on first failure it returns
  the failing index plus the failing command kind in `context`.
- Hooked into the load pipeline immediately after the pack-hash
  gate succeeds and before the reducer is invoked. The reducer
  never sees an unvalidated command.
- The Save/Load screen surfaces the failing index and command kind
  via the existing
  [55-save-load](../../../docs/architecture/wiki/screens/55-save-load/data-contracts.md)
  failure-mode table.
- Golden tests pass under `npm run validate:command-log`; wired
  into `npm run validate`.
- The shared-ownership additions to `save.schema.json` are pinned
  with `additionalProperties: false` on the envelope-body shape and
  with `maxItems` on every array field that can grow without bound.
  Contributions are strictly additive; pre-existing schema fields
  and constraints must not be rewriting (no rewrite, no relax). Primary owner of the
  schema file remains [`tasks/mvp/02-content-schemas/28-save-schema.md`](../../mvp/02-content-schemas/28-save-schema.md).

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
