# Schema Migration Policy

This file is the canonical procedure for evolving any schema in
[`content-schema/schemas/`](../../content-schema/schemas/). Read it
before bumping a `schemaVersion`, renaming a field, or removing an
enum value. The migration runner stub at
[`src/content-schema/migrate.ts`](../../src/content-schema/) and its
companion registry at
[`src/content-schema/migrations/`](../../src/content-schema/migrations/)
discover entries that follow the rules below.

## Why one policy

The first migration the project ships sets the load-bearing precedent
copied by every subsequent migration. Without a written procedure,
that precedent is invented under deadline pressure. With one, future
migrations are mechanical.

## When to bump `schemaVersion`

Every record schema carries a `schemaVersion: integer`. Bump it
**only** when a change is **not** backward-compatible — i.e. an
existing record satisfying schema vN no longer satisfies the new
schema. Examples that bump:

- Renaming a required field.
- Removing an enum value.
- Changing the meaning of an existing field (semantic break).
- Splitting one field into many or vice versa.

Examples that **do not** bump (additive-first per
[`content-platform.md`](./content-platform.md)):

- Adding a new optional field.
- Adding a new enum value at the end of a closed list.
- Tightening a description without touching constraints.

When in doubt, the question is: does an existing valid record still
validate after the change? If yes, no bump. If no, bump and add a
migration entry.

## Migration entry layout

One migration entry is one file under
[`src/content-schema/migrations/`](../../src/content-schema/migrations/)
with the canonical filename:

```
v<N>-to-v<M>-<short-purpose>.ts
```

Examples:

- `v1-to-v2-rename-field.ts`
- `v2-to-v3-split-stats-into-base-and-modifiers.ts`
- `v3-to-v4-deprecate-curse-effect-kind.ts`

Required exports:

```ts
export const from: number;        // source schemaVersion
export const to: number;          // target schemaVersion (always from + 1)
export const appliesTo: string[]; // schema $ids the entry rewrites
                                  // (e.g. ["heroes-reforged/unit.schema.json"])
export function migrate(record: unknown): unknown;
```

Rules:

- `to === from + 1`. Multi-step migrations are separate entries.
  `migrate.ts` chains them.
- `migrate` is **pure**: same input → same output, no I/O, no clock,
  no random.
- `migrate` returns canonical-JSON-shaped output. Defaults must be
  integers per
  [`schema-defaults-policy.md`](./schema-defaults-policy.md).
- The function must preserve any field it does not rewrite. Mutation
  of unrelated keys is forbidden.

## Required test

Each entry ships with `<entry-name>.test.ts` in the same folder. The
test must:

1. Load an `input.json` fixture (schema vN).
2. Run `migrate(input)` and assert byte-equal output against
   `expected.json` (schema vM).
3. Re-validate the output against the schema vM (`validate-contracts`
   walker or the runtime Zod adapter — either is fine; whichever is
   wired first).

Fixtures live alongside the entry:

```
src/content-schema/migrations/
  v1-to-v2-rename-field.ts
  v1-to-v2-rename-field.test.ts
  fixtures/
    v1-to-v2-rename-field.input.json
    v1-to-v2-rename-field.expected.json
```

## Deprecation window

When a migration lands, the **old** field, enum value, or shape stays
**readable** by the loader for one full minor release after the
migration ships. The loader emits a structured `ValidationError` of
`severity: warn` per surfaced legacy record. After the next minor
release, the field/value can be removed cleanly because every
in-the-wild record has already been migrated.

"One minor release" is interpreted against the manifest's `version`
string in the canonical pack. For pre-release work (`0.x`), the
deprecation window is one milestone (e.g. M2 → M3).

## Enum aliases

Renaming an enum value is a `migrate` entry plus an `aliases` table
the loader consults during validation. Aliases live next to the
schema itself:

```
content-schema/schemas/<record>.aliases.json
```

with shape:

```json
{
  "<jsonPointer>": {
    "<old-value>": "<new-value>"
  }
}
```

The loader rewrites `old-value → new-value` before validation. The
enum-snapshot CI gate (see
[`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md)) treats an
alias entry as authorisation to remove `old-value` from the schema.

## Worked Example

The first end-to-end migration ships under
[`src/content-schema/migrations/example-v1-to-v2-rename-field.ts`](../../src/content-schema/migrations/example-v1-to-v2-rename-field.ts).
It is **illustrative only** — no shipping schema currently uses it.
Treat it as the template to clone when you author the first real
migration. The accompanying README in the migrations folder explains
its illustrative status.

## Related Docs

- [`content-platform.md`](./content-platform.md) — additive-first rule
  this policy enforces.
- [`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md) — how
  alias entries interact with the enum snapshot gate.
- [`version-policy.md`](./version-policy.md) — refuse / migrate /
  degrade matrix that consults this policy during loads.
- [`schema-matrix.md`](./schema-matrix.md) — record table; new
  migration entries should add a footnote here when the entry is
  first authored.
