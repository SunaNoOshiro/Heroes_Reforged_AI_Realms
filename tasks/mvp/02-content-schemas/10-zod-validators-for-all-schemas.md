# Zod Validators for All Schemas

Status: planned

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Wire all schemas into a single `validate` export that takes a raw JSON object + schema name and returns a typed result. Used by the content loader (Task 5 of `04-faction-emberwild.md`) to reject bad content at load time.

Read First:
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)

Inputs:
- All schemas from Tasks 1–9 and 12–15

Outputs:
- `src/content-schema/validate.ts`
- `validate<T>(data: unknown, schema: ZodSchema<T>): Result<T, ZodError>`
- `validateAll(pack: ContentPack): Result<ValidatedPack, ValidationReport>` where `ValidationReport` lists all errors across all assets

Owned Paths:
- `src/content-schema/validate.ts`

Dependencies:
- mvp.02-content-schemas.01-unit-schema
- mvp.02-content-schemas.02-faction-schema
- mvp.02-content-schemas.03-spell-schema
- mvp.02-content-schemas.04-artifact-schema
- mvp.02-content-schemas.05-building-schema
- mvp.02-content-schemas.06-ruleset-schema
- mvp.02-content-schemas.07-hero-schema
- mvp.02-content-schemas.08-adventure-building-plus-map-object-schemas
- mvp.02-content-schemas.09-animation-vfx-sound-townpresentation-schemas
- mvp.02-content-schemas.12-formula-dsl
- mvp.02-content-schemas.13-effect-registry
- mvp.02-content-schemas.14-localization-schema
- mvp.02-content-schemas.15-world-schema
- mvp.02-content-schemas.02-faction-schema
- mvp.02-content-schemas.03-spell-schema
- mvp.02-content-schemas.04-artifact-schema
- mvp.02-content-schemas.05-building-schema
- mvp.02-content-schemas.06-ruleset-schema

Acceptance Criteria:
- `validateAll` on the reference Emberwild content pack returns `Ok`
- `validateAll` on a pack with one malformed unit returns `Err` with the unit ID and field path in the error
- Errors are human-readable (not raw Zod internals)
- Effects use `z.discriminatedUnion("kind", ...)` over the 12 effect
  kinds in [`effect.schema.json`](../../../content-schema/schemas/effect.schema.json);
  an unknown `kind` value fails with a clear "unknown effect kind X"
  error, not a generic union miss
- Hero specialty uses the same discriminated-union pattern keyed by
  `kind`; cross-kind fields (e.g. `targetSpellId` inside
  `unit_bonus`) fail with a field-path error
- A round-trip test asserts every JSON example under
  `content-schema/examples/**/*.json` validates under both the JSON
  Schema (existing CI) and the Zod validator; disagreement fails the
  build

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
