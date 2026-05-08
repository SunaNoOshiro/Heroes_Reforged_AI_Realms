# Reserve `ai-profile.schema.json` Slot

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Reserve `content-schema/schemas/ai-profile.schema.json` as an
empty-but-valid schema with a stable `$id` and a single optional
`weights` map. Add an optional `aiProfileId` field to
`faction.schema.json` and `hero.schema.json`. Do **not** populate
any first-party content. M3-or-later tasks fill the slot per
[`tasks/phase-2/02-strategic-ai.md`](../../phase-2/02-strategic-ai.md)
and [`tasks/phase-2/03-second-faction.md`](../../phase-2/03-second-faction.md).

This locks personalities as a pure additive extension. Without
the reservation, M3+ would force a non-additive change across
faction.schema.json + hero.schema.json + every existing pack —
exactly the migration cost the project's "additive-first" rule
exists to avoid.

Read First:
- [`docs/architecture/ai-contract.md`](../../../docs/architecture/ai-contract.md)
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)
- [`docs/architecture/schema-migration-policy.md`](../../../docs/architecture/schema-migration-policy.md)

Inputs:
- Existing `faction.schema.json` and `hero.schema.json`
- The wants vocabulary from
  [`mvp.10-heuristic-ai.02-wants-engine-strategic-action-prioritization`](../10-heuristic-ai/02-wants-engine-strategic-action-prioritization.md)

Outputs:
- `content-schema/schemas/ai-profile.schema.json`:
  - `$id: "heroes-reforged/ai-profile.schema.json"`
  - Required: `schemaVersion`, `id`
  - Optional: `name`, `description`, `weights: Record<string, number>`
  - `additionalProperties: false`
- `content-schema/examples/records/ai-profiles/default.ai-profile.json`:
  - Canonical empty profile (`id` only, no weights → identical
    behavior to no profile reference).
- Additive edits to `content-schema/schemas/faction.schema.json`:
  - Optional `aiProfileId: string` field, no validators yet.
- Additive edits to `content-schema/schemas/hero.schema.json`:
  - Optional `aiProfileId: string` field, no validators yet.
- Schema-matrix row added in
  [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md).

Owned Paths:
- `content-schema/schemas/ai-profile.schema.json`
- `content-schema/examples/records/ai-profiles/default.ai-profile.json`

Owned Paths (shared):
- `content-schema/schemas/faction.schema.json` — additively adds
  optional `aiProfileId`. Primary owner remains
  [`02-faction-schema.md`](./02-faction-schema.md).
- `content-schema/schemas/hero.schema.json` — additively adds
  optional `aiProfileId`. Primary owner remains
  [`07-hero-schema.md`](./07-hero-schema.md).
- `docs/architecture/schema-matrix.md` — additively adds the
  `AiProfile` row.

Dependencies:
- mvp.02-content-schemas.02-faction-schema
- mvp.02-content-schemas.07-hero-schema
- mvp.02-content-schemas.10-zod-validators-for-all-schemas

Acceptance Criteria:
- `npm run validate:contracts` passes; the new schema validates
  the canonical `default.ai-profile.json` example.
- `aiProfileId` is optional on faction and hero records: every
  existing example in `content-schema/examples/packs/` continues
  to validate.
- The schema declares `additionalProperties: false`.
- The schema-matrix entry references the canonical example and
  cites the `Want`-weight consumer in
  [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md).
- No first-party pack populates `aiProfileId` in this task; that
  is M3-or-later content work.
- Shared-path edits to `faction.schema.json`, `hero.schema.json`,
  and `schema-matrix.md` are **additive**: the optional
  `aiProfileId` field and the new matrix row land without
  changing existing required fields, validators, or other rows.
  This task **must not** rewrite the faction or hero schema
  shapes — those remain owned by the **primary owner**
  [`02-faction-schema.md`](./02-faction-schema.md) (faction)
  and [`07-hero-schema.md`](./07-hero-schema.md) (hero). The
  primary contract on `schema-matrix.md` is owned by
  [`mvp.02-content-schemas` schema authoring tasks](../02-content-schemas.md).

Verify:
- npm run validate:contracts
- npm run validate:tasks
- npm run validate

Estimated Time:
- 2 hours
