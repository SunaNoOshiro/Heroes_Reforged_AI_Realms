# ValidationError Contract

Status: planned

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Land the canonical `ValidationError` JSON schema and route every
validator in the project through it. Today
[`scripts/check-repo-contracts.mjs`](../../../scripts/check-repo-contracts.mjs)
emits ad-hoc strings, runtime loaders log their own format, and the
Zod adapter (Task 10) returns raw Zod errors. Without a unified shape,
editor surfacing, the Phase-3 AI generation feedback loop, and any
multi-validator parity test cannot consume errors generically.

Source plan:
[`docs/implementation-plans/06-data-contracts-and-schema-plan.md`](../../../docs/implementation-plans/06-data-contracts-and-schema-plan.md)
(§ ValidationError shape, T-15).

Read First:
- [`docs/implementation-plans/06-data-contracts-and-schema-plan.md`](../../../docs/implementation-plans/06-data-contracts-and-schema-plan.md)
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
- [`content-schema/schemas/error-state.schema.json`](../../../content-schema/schemas/error-state.schema.json)

Inputs:
- Existing CI script
  [`scripts/check-repo-contracts.mjs`](../../../scripts/check-repo-contracts.mjs)
- Zod validator entry point from Task 10
  ([`tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md`](./10-zod-validators-for-all-schemas.md))

Outputs:
- `content-schema/schemas/validation-error.schema.json`
- `content-schema/examples/records/validation-error/missing-required.error.json`
- `content-schema/examples/records/validation-error/unknown-enum.error.json`
- `src/content-schema/validation-error.ts` (TS type + Zod schema mirror)
- `scripts/check-repo-contracts.mjs` refactored to emit
  `ValidationError[]`; `--json` flag exposes the structured array

Owned Paths:
- `content-schema/schemas/validation-error.schema.json`
- `content-schema/examples/records/validation-error/missing-required.error.json`
- `content-schema/examples/records/validation-error/unknown-enum.error.json`
- `src/content-schema/validation-error.ts`

Owned Paths (shared):
- `scripts/check-repo-contracts.mjs`

Dependencies:
- None

Acceptance Criteria:
- The shared edit to `scripts/check-repo-contracts.mjs` is **additive**:
  it adds the `--json` flag and the `ValidationError[]` emitter without
  removing the existing human-readable output. The script's primary
  contract remains owned by the engine-core CI task; this task must
  not rewrite its file-walking, JSON-Schema-walking, or task-doc lint
  logic.
- `validation-error.schema.json` parses as JSON Schema 2020-12 with
  `additionalProperties: false`.
- Required fields are `schemaId`, `jsonPointer`, `rule`, `message`.
  `rule` is a closed enum that matches every validator the project
  ships (`enum`, `required`, `additional`, `type`, `minimum`,
  `maximum`, `minLength`, `maxLength`, `pattern`, `format`, `const`,
  `uniqueItems`, `minItems`, `maxItems`, `oneOf`, `anyOf`, `allOf`,
  `discriminator`, `ref`, `custom`).
- Both canonical examples validate against the schema; they cover one
  `required` and one `enum` failure across two different schemas
  (`unit` and `spell`).
- `scripts/check-repo-contracts.mjs` accepts `--json` and emits a
  structured `ValidationError[]` array on stdout; default human output
  is preserved.
- The Zod adapter from Task 10 lands an export
  `toValidationErrors(zodError, ctx): ValidationError[]` so consumers
  never see raw Zod internals.
- `docs/architecture/schema-matrix.md` lists `ValidationError` under a
  new "Validator output" family with a link to the schema.
- A snapshot test in
  [`scripts/__tests__/`](../../../scripts/__tests__) runs both
  validators on the malformed example fixtures and asserts the
  resulting `ValidationError[]` matches a committed snapshot.

Verify:
- npm run validate:contracts
- npm run validate:tasks
- npm run validate

Estimated Time:
- 3 hours
