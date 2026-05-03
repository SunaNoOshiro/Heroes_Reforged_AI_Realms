# Schema Migrations Registry

This folder holds one file per migration entry. The runner at
[`../migrate.ts`](../) discovers entries here and chains them in
ascending order from the source `schemaVersion` to the target.

Read [`docs/architecture/schema-migration-policy.md`](../../../docs/architecture/schema-migration-policy.md)
before adding an entry — it pins file naming, required exports, the
canonical fixture layout, the deprecation window, and how enum
aliases interact with the snapshot gate.

## Entry conventions

Each entry consists of three files:

```
v<N>-to-v<M>-<short-purpose>.ts
v<N>-to-v<M>-<short-purpose>.test.ts
fixtures/
  v<N>-to-v<M>-<short-purpose>.input.json
  v<N>-to-v<M>-<short-purpose>.expected.json
```

The runtime contract:

```ts
export const from: number;
export const to: number;          // always from + 1
export const appliesTo: string[]; // schema $ids the entry rewrites
export function migrate(record: unknown): unknown;
```

`migrate` is **pure**: same input → same output, no I/O.

## Registry order

Entries are loaded in lexicographic filename order, then sorted by
the `from` field. `migrate.ts` chains contiguous `(from → to)` pairs
to walk a record forward across multiple version bumps in one call.

## Illustrative entry

[`example-v1-to-v2-rename-field.ts`](./example-v1-to-v2-rename-field.ts)
is the worked example. It is not wired against any shipping schema —
the runner explicitly skips entries whose `appliesTo` ids do not match
a real schema. Treat it as the template to clone when you author the
first real migration.

## Adding a real migration

1. Bump `schemaVersion` on the affected schema(s) per
   [`schema-migration-policy.md`](../../../docs/architecture/schema-migration-policy.md).
2. Author the entry file using `example-v1-to-v2-rename-field.ts` as
   the template. Replace `appliesTo` with real schema ids.
3. Add input/expected fixtures under `fixtures/`.
4. Add the test file. Mirror the example test.
5. If the change is a rename of an enum value, also add an
   `aliases.json` next to the schema — see
   [`enum-lifecycle-policy.md`](../../../docs/architecture/enum-lifecycle-policy.md).
6. Run `npm run validate`.
