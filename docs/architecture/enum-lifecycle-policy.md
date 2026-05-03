# Enum Value Lifecycle Policy

This file is the canonical procedure for adding, deprecating,
aliasing, and removing values from any closed enum in
[`content-schema/schemas/`](../../content-schema/schemas/). Closed
enums (`command.kind`, `manifest.capabilities`, `resource-id`,
`stat-id`, `status-id`, effect kinds, spell schools, …) are part of
the public contract: every save and replay in the wild may reference
any value that was ever valid. Removing a value silently breaks every
save that references it.

This policy + the CI snapshot gate
([`scripts/snapshot-enums.mjs`](../../scripts/snapshot-enums.mjs) and
[`scripts/check-enum-snapshot.mjs`](../../scripts/check-enum-snapshot.mjs))
make removals impossible without a deliberate, reviewable step.

## States

A value moves through four states:

1. **additive** — newly added at the end of an `enum` array. Records
   may reference it. No CI gate fires.
2. **deprecated** — annotated in the schema but still validated by
   the loader. New records should not use the value; old records do.
   The schema entry is moved into a sibling `deprecated/` block in the
   schema's description **or** annotated `"deprecated": true` per
   JSON Schema 2020-12.
3. **aliased** — listed in the per-schema
   `<record>.aliases.json` file. The loader rewrites
   `old → new` before validation. The `enum` array can drop the old
   value because the snapshot gate sees the alias entry as
   authorisation.
4. **removed** — gone from the schema, gone from `aliases.json`. Only
   permitted after one full deprecation cycle (one minor release per
   [`schema-migration-policy.md` § Deprecation window](./schema-migration-policy.md#deprecation-window)).
   Removed values are tracked in `content-schema/enums.removed.json`
   so the snapshot gate keeps recognising the historical change.

## Workflow per kind of change

### Add a value
1. Append the value to the `enum` array.
2. Run `npm run generate:enum-snapshot`; commit the updated snapshot.
3. Done. No migration needed (additive).

### Deprecate a value (still accepted)
1. Annotate the value as deprecated in the schema description.
2. Update authoring tools to surface a warning when an editor picks
   the value.
3. The snapshot gate continues to require the value to be present in
   the schema's `enum` array (deprecation alone does not authorise
   removal).

### Rename / alias a value
1. Add the new value to the `enum` array.
2. Add the alias entry to the schema's `<record>.aliases.json`:
   ```json
   {
     "<jsonPointer>": {
       "<old-value>": "<new-value>"
     }
   }
   ```
3. Author a migration entry under
   [`src/content-schema/migrations/`](../../src/content-schema/migrations/)
   that rewrites `old → new` for any record carrying the old value.
4. Remove the old value from the `enum` array.
5. Run `npm run generate:enum-snapshot`; commit. The check gate sees the
   alias and accepts the removal.

### Remove a value (no replacement)
1. Confirm one full deprecation cycle has elapsed.
2. Add the value to `content-schema/enums.removed.json` with a
   `since:` entry naming the release.
3. Remove the value from the `enum` array.
4. Run `npm run generate:enum-snapshot`; commit.

## CI Gate

`npm run validate:enums` re-walks every `*.schema.json`, collects
`enum` arrays and `const` values inside discriminated unions, and
diffs against `content-schema/enums.snapshot.json`.

Removed values must satisfy at least one of:

- present in a `<record>.aliases.json` next to the schema **with** a
  registered migration entry under `src/content-schema/migrations/`,
  **or**
- listed in `content-schema/enums.removed.json` with a `since:`
  release tag.

Otherwise the check fails with a `ValidationError` of `rule: enum`.

`npm run generate:enum-snapshot` regenerates the snapshot. The CI invocation
of `validate:enums` runs the check, not the regeneration. To update
the baseline you must run the regenerator locally and commit the
diff.

## Related Docs

- [`schema-migration-policy.md`](./schema-migration-policy.md) —
  alias entries that authorise removals live in the migration
  registry.
- [`content-platform.md`](./content-platform.md) — additive-first
  rule that motivates this policy.
- [`version-policy.md`](./version-policy.md) — what happens at load
  time when a record references a value that has been removed without
  an alias.
