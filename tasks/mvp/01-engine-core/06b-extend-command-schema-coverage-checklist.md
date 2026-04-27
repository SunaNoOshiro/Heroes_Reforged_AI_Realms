# Extend Command Schema Coverage Checklist

Status: planned

Module: [Engine Core (M0)](../01-engine-core.md)

Description:
Keep the command schema closed and aligned with screen interaction
contracts. Every ALL_CAPS token in screen `interactions.md` must be a
schema command, an alias to a schema command, a UI-local token, or an
explicitly out-of-scope future command with an owning task.

Read First:
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- [`docs/architecture/screen-command-coverage.json`](../../../docs/architecture/screen-command-coverage.json)

Inputs:
- `content-schema/schemas/command.schema.json`
- Screen packages under `docs/architecture/wiki/screens/`
- `scripts/check-command-coverage.mjs`

Outputs:
- `docs/architecture/screen-command-coverage.json`
- Command-schema follow-up notes in `docs/architecture/command-schema.md`
- Validation remains wired through `npm run validate:commands`

Owned Paths:
- `docs/architecture/screen-command-coverage.json`
- `docs/architecture/command-schema.md`

Owned Paths (shared):
- `content-schema/schemas/command.schema.json`
- `scripts/check-command-coverage.mjs`
- `package.json`

Dependencies:
- mvp.01-engine-core.06-command-dispatcher

Acceptance Criteria:
- `npm run validate:commands` passes with zero uncovered screen tokens
- A new screen command fails validation unless it is schema-backed,
  aliased, UI-local, or out-of-scope with an owning task ID
- `command.schema.json` remains the canonical closed gameplay command
  union
- UI tasks may not add reducer behavior for out-of-scope commands
- Shared path work is additive only: extend command-schema coverage and
  npm wiring without rewriting the primary command contract owned by
  `docs/architecture/command-schema.md` and
  `mvp.01-engine-core.06-command-dispatcher`

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
