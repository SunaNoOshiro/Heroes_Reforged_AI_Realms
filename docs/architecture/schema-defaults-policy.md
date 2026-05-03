# Schema Defaults Policy

This file is the canonical procedure for declaring default values in
schemas under [`content-schema/schemas/`](../../content-schema/schemas/)
and the matching `.default(...)` calls in the Zod validators authored
under
[`tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md`](../../tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md).

Two validators ship in the project: the JSON Schema walker in
[`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs)
and the Zod adapter under `src/content-schema/`. If the two fill
defaults differently, the canonical-JSON serialization of "the same"
record will differ, which breaks `contentHash`, which breaks every
save/replay/multiplayer guarantee that pins on it.

This policy makes that divergence impossible.

## When to declare a default

Declare a `default` when **all** of the following hold:

1. The field is **optional** in the schema (not in `required`).
2. The field has a documented expected behaviour when omitted (prose
   already says "if absent, defaults to N" or "derive from baseN").
3. The default is a **canonical scalar**: integer, boolean, the empty
   array `[]`, the empty object `{}`, or a string that matches the
   field's `pattern`/`enum`. **Never floats** —
   [`determinism.md`](./determinism.md) bans them in deterministic
   code paths and the float-ban ESLint rule covers
   `src/content-schema/`.

Do **not** declare a default when:

- The field is required for gameplay correctness — defaults must not
  paper over missing content.
- The "default" is computed from another field at runtime (those
  derivations live in selectors or rules code, not in schemas).

## Authoring rules

- JSON Schema: add `"default": <canonical-value>` next to `type`.
- Zod: mirror with `.default(<same-canonical-value>)` on the field.
- Examples: either omit the field (the validators fill it) **or**
  emit the default explicitly. Both are valid; do not mix within a
  single example.
- The defaulted value, after either validator runs, must be byte-equal
  to the canonical-JSON serialization the other validator produces.

## CI parity test

Task 10's acceptance criteria are extended to require:

> For every JSON example under `content-schema/examples/**/*.json`,
> the JSON-Schema-defaulted output and the Zod-defaulted output
> produce byte-identical canonical-JSON. Disagreement fails the
> build.

The test lives under `scripts/__tests__/` once Task 10 lands the Zod
adapter.

## Examples

### Allowed
```json
{
  "type": "integer",
  "minimum": 0,
  "default": 0,
  "description": "Tier of the unit. Defaults to 0 (peasant tier) if absent."
}
```

```ts
z.number().int().min(0).default(0)
```

### Forbidden
```json
{
  "type": "number",
  "default": 0.5
}
```
Floats are banned in deterministic gameplay paths.

```json
{
  "type": "object",
  "required": ["hp"],
  "properties": {
    "hp": { "type": "integer", "default": 100 }
  }
}
```
`hp` is required — defaults must not paper over a missing required
gameplay value.

## Related docs

- [`determinism.md`](./determinism.md) — float ban that this policy
  enforces.
- [`schema-migration-policy.md`](./schema-migration-policy.md) —
  introducing a new default on an existing optional field is
  additive; bumping a default value's meaning is a migration.
- [`tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md`](../../tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md)
  — Zod adapter that mirrors these defaults.
