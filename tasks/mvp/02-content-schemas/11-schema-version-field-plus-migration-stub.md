# Schema Version Field + Migration Stub

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Every schema includes a `schemaVersion: number` field. The content loader checks this against the engine's expected version and runs migrations if the version is behind. Implement the migration runner stub — actual migrations will be added as schemas evolve.

Read First:
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)

Inputs:
- All schemas from Tasks 1–15

Outputs:
- `schemaVersion` field added to all schemas
- `src/content-schema/migrate.ts` — `migrate(data: unknown, fromVersion: number, toVersion: number): unknown`
- Discovers entries from `src/content-schema/migrations/` (not an inline empty array) per [`docs/architecture/schema-migration-policy.md`](../../../docs/architecture/schema-migration-policy.md)
- Initial migration table contains only the illustrative example entry (`example-v1-to-v2-rename-field.ts`); no shipping schema is migrated yet

Owned Paths:
- `src/content-schema/migrate.ts`

Dependencies:
- mvp.02-content-schemas.10-zod-validators-for-all-schemas
- mvp.02-content-schemas.02-faction-schema
- mvp.02-content-schemas.03-spell-schema
- mvp.02-content-schemas.04-artifact-schema
- mvp.02-content-schemas.05-building-schema
- mvp.02-content-schemas.06-ruleset-schema
- mvp.02-content-schemas.07-hero-schema
- mvp.02-content-schemas.08-adventure-building-plus-map-object-schemas
- mvp.02-content-schemas.09-animation-vfx-sound-townpresentation-schemas
- mvp.02-content-schemas.10-zod-validators-for-all-schemas
- mvp.02-content-schemas.12-formula-dsl
- mvp.02-content-schemas.13-effect-registry

Acceptance Criteria:
- Content with `schemaVersion: 1` loads in an engine expecting version 1 with no warnings
- Content with `schemaVersion: 0` triggers migration attempt (currently a no-op) with a console warning
- Content with `schemaVersion: 99` (future) fails with clear error: "Content version 99 requires engine upgrade"
- The runner discovers migration entries from `src/content-schema/migrations/` and refuses to ship if an entry violates the file naming, exports, or `to === from + 1` rules from [`schema-migration-policy.md`](../../../docs/architecture/schema-migration-policy.md)
- The illustrative `example-v1-to-v2-rename-field.ts` entry's tests pass under `node --test` and serve as the worked-example template

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
