# Save Envelope & `intent` Discriminator

Status: planned

Module: [Persistence (M1)](../08-persistence.md)

Description:
Author the `save-envelope.schema.json` outer wrapper and wire the
`intent` discriminator (`save | replay | fixture`) into the load /
export pipeline. The envelope is the surface that future cloud-sync
and shared-replay flows extend; M4 produces unsigned envelopes and
M5+ flips the `mac` field to required for `intent === "save"` per
[`save-envelope-mac.md`](../../../docs/architecture/save-envelope-mac.md).
Plan 27 § Critical Fix 4.

Read First:
- [`docs/architecture/save-migration.md`](../../../docs/architecture/save-migration.md)
- [`docs/architecture/save-envelope-mac.md`](../../../docs/architecture/save-envelope-mac.md)
- [`docs/architecture/security-model.md`](../../../docs/architecture/security-model.md)
- [`content-schema/schemas/save-envelope.schema.json`](../../../content-schema/schemas/save-envelope.schema.json)

Inputs:
- Migrated `SaveRecord.body` from
  [`tasks/mvp/08-persistence/02-log-only-save-format.md`](./02-log-only-save-format.md).
- Active pack registry (`contentPackHashes`).

Outputs:
- `content-schema/schemas/save-envelope.schema.json` (already
  authored at task-creation time; this task owns its evolution).
- `content-schema/examples/save-envelope/` — fixtures:
  `canonical-save-no-mac`, `canonical-save-with-mac`,
  `canonical-replay-stripped`, `canonical-fixture-signed`.
- `src/persistence/envelope.ts` — `wrap(body, intent, opts)` and
  `unwrap(envelope, opts) → { ok, body | reason }`.
- `IntentBadge` component on screen 55 (Save/Load) per
  [`docs/architecture/wiki/screens/55-save-load/spec.md`](../../../docs/architecture/wiki/screens/55-save-load/spec.md).

Owned Paths:
- `content-schema/schemas/save-envelope.schema.json`
- `content-schema/examples/save-envelope/`
- `src/persistence/envelope.ts`

Owned Paths (shared):
- `docs/architecture/wiki/screens/55-save-load/spec.md` — adds the
  `IntentBadge` component as an additive entry; existing component
  rows must not be rewriting (no rewrite, no relax). The screen package as a whole is
  owned by [`tasks/mvp/08-persistence/03-save-load-ui.md`](./03-save-load-ui.md);
  primary owner of the spec file is task 03.

Dependencies:
- mvp.08-persistence.16-parser-hardening
- mvp.02-content-schemas.28-save-schema

Acceptance Criteria:
- The schema validates each canonical envelope fixture.
- `wrap` produces an envelope whose `body` validates against
  `save.schema.json`.
- `unwrap` rejects an envelope whose `intent === "fixture"` is
  missing `signature`, with closed reason `fixtureNotSigned`.
- Converting `intent: "save"` to `intent: "replay"` strips the
  player-identifying fields declared in
  [`save-migration.md` § Privacy strip on replay export](../../../docs/architecture/save-migration.md);
  the resulting envelope validates and contains no
  `metadata.playerName`, `metadata.playerHash`,
  `metadata.playerLabel`, or `metadata.thumbnail`.
- An envelope with a tampered `saveVersion` and a present `mac`
  fails verification under the M5+ MAC contract (M4: `mac` is
  absent, this branch is gated off).
- The `IntentBadge` component renders distinct badges for
  `save | replay | fixture` per the screen 55 spec. The badge is
  an additive entry on the screen package; the existing component
  rows must not be rewriting (no rewrite, no relax). Primary owner of the screen package
  is [`tasks/mvp/08-persistence/03-save-load-ui.md`](./03-save-load-ui.md).

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
