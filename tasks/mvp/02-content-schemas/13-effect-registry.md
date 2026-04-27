# Effect Registry (schema + handler dispatch)

Status: planned

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Implement the closed effect registry defined in
[`content-schema/schemas/effect.schema.json`](../../../content-schema/schemas/effect.schema.json)
as TypeScript discriminated unions plus a single dispatch table keyed
on `kind`. Spells, abilities, and artifacts all consume this registry —
no record anywhere else in the codebase is allowed to define a new
effect kind inline. Adding a new effect kind is a three-step change:
schema variant → TS union case → handler registration. CI fails
otherwise.

Closed kinds (initial):
`damage`, `heal`, `status`, `modify_stat`, `modify_primary_stat`,
`summon`, `dispel`, `resource_bonus`, `grant_spell`, `grant_ability`,
`unlock_unit`, `unlock_building`.

Read First:
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)

Inputs:
- `content-schema/schemas/effect.schema.json`
- `content-schema/schemas/ability.schema.json`
- `content-schema/schemas/condition.schema.json`
- `content-schema/schemas/stat-id.schema.json`
- `content-schema/schemas/status-id.schema.json`
- `content-schema/schemas/target-scope.schema.json`
- `content-schema/schemas/targeting.schema.json`
- Formula AST evaluator from Task 12
- Ruleset constants from
  [`06-ruleset-schema.md`](./06-ruleset-schema.md)

Outputs:
- `src/rules/effects/types.ts` — one TS interface per `kind`, exported
  as a discriminated union `Effect`
- `src/rules/effects/registry.ts` — `const effectHandlers: Record<Effect["kind"], Handler>`;
  exhaustiveness enforced via `satisfies` on the `kind` union
- `src/rules/effects/apply.ts` — `applyEffect(effect, ctx): EffectResult`
  that dispatches through the registry and returns a structured
  `EffectResult` (damage dealt, statuses added, etc.) — never mutates
  state directly
- `src/rules/effects/validator.ts` — parse JSON blob → typed `Effect`;
  reject unknown kinds at load
- Unit tests for every handler including `condition` gating,
  target-scope correctness, and deterministic formula evaluation

Owned Paths:
- `src/rules/effects/types.ts`
- `src/rules/effects/registry.ts`
- `src/rules/effects/apply.ts`
- `src/rules/effects/validator.ts`

Dependencies:
- mvp.02-content-schemas.12-formula-dsl
- mvp.02-content-schemas.03-spell-schema
- mvp.02-content-schemas.04-artifact-schema

Acceptance Criteria:
- TypeScript refuses to compile if a handler is missing for any
  `kind` in the union
- Adding a new `kind` to the schema without registering a handler
  breaks CI (tested by a commented-out handler in a failure fixture)
- No file outside `src/rules/effects/` defines or dispatches on
  `effect.kind` — enforced by an ESLint rule referencing
  `src/rules/effects/` as the only allowed owner
- Every effect record in the example packs validates against the
  registry schema

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
