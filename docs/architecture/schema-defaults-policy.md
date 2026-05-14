# Schema Defaults Policy

Canonical procedure for declaring default values in
[`content-schema/schemas/`](../../content-schema/schemas/) and the
matching `.default(...)` calls in the Zod validator authored under
[`tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md`](../../tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md).

Two validators run against pack content: the JSON Schema walker in
[`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs)
and the Zod adapter under `src/content-schema/`. If they fill
defaults differently, "the same" record canonical-serializes to
different bytes, which breaks `contentHash`, which breaks every
save / replay / multiplayer guarantee that pins on it. This policy
makes that divergence impossible.

## When to declare a default

Declare `default` when **all** hold:

1. The field is **optional** (not in `required`).
2. Schema prose documents an omission behaviour ("if absent,
   defaults to N", "derive from baseN", etc.).
3. The default is a **canonical scalar**: integer, boolean, the
   empty array `[]`, the empty object `{}`, or a string that
   matches the field's `pattern` / `enum`.

**Never declare a float default.**
[`determinism.md`](./determinism.md) bans floats in deterministic
code paths, and the float-ban ESLint rule
([`tasks/mvp/01-engine-core/05-eslint-rule-ban-math-random-and-floats-in-src-engine.md`](../../tasks/mvp/01-engine-core/05-eslint-rule-ban-math-random-and-floats-in-src-engine.md))
covers `src/content-schema/`.

Do **not** declare a default when:

- The field is required for gameplay correctness — a default must
  not paper over missing content.
- The "default" is computed from another field at runtime —
  derivations live in selectors or rules code, not in schemas.

## Authoring rules

- **JSON Schema:** add `"default": <canonical-value>` next to
  `type`.
- **Zod:** mirror with `.default(<same-canonical-value>)` on the
  field.
- **Examples:** either omit the field (validators fill it) **or**
  emit the default explicitly. Both are valid; do not mix within a
  single example.
- **Byte parity:** after either validator runs, the defaulted value
  must be byte-equal in canonical-JSON to what the other validator
  produces.

## CI parity test

[`tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md`](../../tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md)
carries the parity gate as an acceptance criterion:

> For every JSON example under `content-schema/examples/**/*.json`,
> the JSON-Schema-defaulted output and the Zod-defaulted output
> produce byte-identical canonical-JSON. Disagreement fails the
> build.

The test lives under `scripts/__tests__/` once Task 10 lands the
Zod adapter.

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
  introducing a default on an existing optional field is additive;
  changing a default's meaning is a migration.
- [`tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md`](../../tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md)
  — Zod adapter that mirrors these defaults.

---

## 🔍 Sync Check

- **UI: ✔** — No UI surface; nothing to cross-check against screen specs.
- **Schema: ✔** — `content-schema/schemas/` and `content-schema/examples/` exist; the JSON Schema walker `scripts/check-repo-contracts.mjs` exists; back-links from [`schema-matrix.md`](./schema-matrix.md) and [`content-platform.md`](./content-platform.md) point here as the canonical defaults / Zod-parity rule.
- **Tasks: ✔** — Owning task [`mvp.02-content-schemas.25-default-declarations-and-zod-parity`](../../tasks/mvp/02-content-schemas/25-default-declarations-and-zod-parity.md) lists this file under `Owned Paths`; consuming task [`mvp.02-content-schemas.10-zod-validators-for-all-schemas`](../../tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md) already carries the byte-identical-defaults acceptance criterion this policy quotes (its bullet "the JSON-Schema-defaulted output and the Zod-defaulted output produce **byte-identical** canonical-JSON").

## ⚠ Issues

_None._
