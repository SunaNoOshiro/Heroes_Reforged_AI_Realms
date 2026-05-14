# Enum Value Lifecycle Policy

Canonical procedure for adding, deprecating, aliasing, and removing
values from any closed enum in
[`content-schema/schemas/`](../../content-schema/schemas/). Closed
enums (`command.kind`, `manifest.capabilities`, `resource-id`,
`stat-id`, `status-id`, effect kinds, spell schools, …) are public
contract: every save and replay in the wild may reference any value
that was ever valid, so silent removal corrupts those records.

The CI snapshot gate
([`scripts/snapshot-enums.mjs`](../../scripts/snapshot-enums.mjs),
[`scripts/check-enum-snapshot.mjs`](../../scripts/check-enum-snapshot.mjs))
enforces this policy by failing any PR that drops a baseline value
without authorisation.

## 1. Lifecycle states

A value moves through four states:

| State | Schema | Loader | Snapshot gate |
|---|---|---|---|
| **additive** | newly appended to `enum` | accepts | no diff (new entries only) |
| **deprecated** | listed in `enum`; flagged `"deprecated": true` or moved into a sibling `deprecated/` description block (per JSON Schema 2020-12) | accepts; authoring tools warn | still requires the value to remain in `enum` (deprecation alone does not authorise removal) |
| **aliased** | absent from `enum`; `old → new` entry in `<record>.aliases.json` | rewrites `old → new` before validation | accepts the removal because the alias entry plus a registered migration authorise it |
| **removed** | absent from `enum`; absent from `aliases.json` | rejects | accepts only after one full deprecation cycle (one minor release per [`schema-migration-policy.md` § Deprecation window](./schema-migration-policy.md#deprecation-window)); historical change tracked in `content-schema/enums.removed.json` |

## 2. Workflow per change

### Add a value
1. Append the value to the `enum` array.
2. `npm run generate:enum-snapshot`; commit the snapshot diff.
3. Done — no migration needed (additive).

### Deprecate a value (still accepted)
1. Annotate the value as deprecated in the schema (description block
   or `"deprecated": true`).
2. Surface a warning in authoring tools when an editor picks the
   value.
3. Leave the value in the `enum` array — the snapshot gate keeps
   requiring it until aliased or removed.

### Rename / alias a value
1. Add the new value to the `enum` array.
2. Add the alias entry to `<record>.aliases.json`:
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
5. `npm run generate:enum-snapshot`; commit. The check gate sees the
   alias and accepts the removal.

### Remove a value (no replacement)
1. Confirm one full deprecation cycle has elapsed.
2. Add the value to `content-schema/enums.removed.json` with a
   `since:` entry naming the release.
3. Remove the value from the `enum` array.
4. `npm run generate:enum-snapshot`; commit.

## 3. CI gate

`npm run validate:enums` re-walks every `*.schema.json`, collects
`enum` arrays and `const` values inside discriminated unions, and
diffs against `content-schema/enums.snapshot.json`.

A removed value must satisfy at least one of:

- present in the schema's `<record>.aliases.json` **and** referenced
  by a migration entry under `src/content-schema/migrations/`, or
- listed in `content-schema/enums.removed.json` with a `since:`
  release tag.

Otherwise the check fails with a `ValidationError` of `rule: enum`.

`npm run generate:enum-snapshot` regenerates the snapshot. The CI
invocation runs the check, never the regeneration — to update the
baseline, regenerate locally and commit the diff.

## Related Docs

- [`schema-migration-policy.md`](./schema-migration-policy.md) —
  alias entries that authorise removals live in the migration
  registry.
- [`content-platform.md`](./content-platform.md) — additive-first
  rule that motivates this policy.
- [`version-policy.md`](./version-policy.md) — what happens at load
  time when a record references a value that has been removed without
  an alias.

---

## 🔍 Sync Check

- **UI: ✔** — CI-gate policy doc; no UI surface to cross-check.
- **Schema: ⚠** — All referenced paths exist ([`scripts/snapshot-enums.mjs`](../../scripts/snapshot-enums.mjs), [`scripts/check-enum-snapshot.mjs`](../../scripts/check-enum-snapshot.mjs), [`content-schema/enums.snapshot.json`](../../content-schema/enums.snapshot.json), [`content-schema/enums.removed.json`](../../content-schema/enums.removed.json), [`src/content-schema/migrations/`](../../src/content-schema/migrations/)), and the alias-file shape matches `aliasCoversValue` in the check script. The documented `since:` tag in `enums.removed.json` is not currently parsed by the gate; see `## ⚠ Issues`.
- **Tasks: ✔** — Owning task [`mvp.02-content-schemas.24-enum-lifecycle-and-snapshot-gate`](../../tasks/mvp/02-content-schemas/24-enum-lifecycle-and-snapshot-gate.md) names this file in both `Owned Paths` and `Read First`; no orphan tasks reference it.

## ⚠ Issues

- **`since:` tag is documented but not enforced by the gate.** Both this policy and the owning task ([`mvp.02-content-schemas.24-enum-lifecycle-and-snapshot-gate.md`](../../tasks/mvp/02-content-schemas/24-enum-lifecycle-and-snapshot-gate.md) Acceptance Criteria, branch `(b)`) require `enums.removed.json` entries to carry a `since:` release tag. The current implementation in [`scripts/check-enum-snapshot.mjs`](../../scripts/check-enum-snapshot.mjs) treats `removedForSchema[pointerKey]` as a flat `string[]` and only calls `.includes(value)` — it neither reads nor validates `since:`. Per CLAUDE.md root contract on schema evolution and the task's own Acceptance Criteria, the gate must enforce the `since:` tag. Suggested values: store entries as `{ "<value>": { "since": "<release>" } }` or `[ { "value": "<v>", "since": "<release>" } ]` and fail the check on missing `since:`. Skill did not change either file (Hard Prohibition D — never edit cross-checked files); the fix belongs in a follow-up PR owned by `mvp.02-content-schemas.24`.
