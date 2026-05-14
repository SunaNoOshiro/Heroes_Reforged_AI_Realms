# Schema Migration Policy

Canonical procedure for evolving any schema in
[`content-schema/schemas/`](../../content-schema/schemas/). Read this
before bumping a `schemaVersion`, renaming a field, or removing an
enum value. The migration runner stub at
[`src/content-schema/migrate.ts`](../../src/content-schema/) and the
companion registry at
[`src/content-schema/migrations/`](../../src/content-schema/migrations/)
discover entries that follow the rules below.

## Why one policy

The first migration sets the load-bearing precedent every later
migration copies. Writing the procedure now keeps that precedent
from being invented under deadline pressure; future migrations
become mechanical.

## When to bump `schemaVersion`

Every record schema carries `schemaVersion: integer`. Bump it
**only** when the change is **not** backward-compatible — i.e. an
existing record satisfying schema vN no longer satisfies vM.

| Bump | Do **not** bump (additive per [`content-platform.md`](./content-platform.md)) |
|---|---|
| Rename a required field | Add a new optional field |
| Remove an enum value | Append an enum value to the end of a closed list |
| Change the meaning of an existing field (semantic break) | Tighten a description without touching constraints |
| Split one field into many, or merge many into one | |

Decision rule: does an existing valid record still validate after the
change? Yes → no bump. No → bump and add a migration entry.

## Migration entry layout

One entry is one file under
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

- `to === from + 1`. Multi-step migrations are separate entries;
  `migrate.ts` chains them.
- `migrate` is **pure**: same input → same output; no I/O, no clock,
  no `Math.random`.
- Returns canonical-JSON-shaped output. Any default values the entry
  fabricates follow
  [`schema-defaults-policy.md`](./schema-defaults-policy.md)
  (canonical scalars only — no floats).
- Preserve every field the entry does not rewrite. Mutating unrelated
  keys is forbidden.

## Required test

Each entry ships with `<entry-name>.test.ts` in the same folder.
The test must:

1. Load `<entry-name>.input.json` (schema vN).
2. Run `migrate(input)` and assert byte-equal output against
   `<entry-name>.expected.json` (schema vM).
3. Re-validate the output against schema vM (`validate-contracts`
   walker or the runtime Zod adapter — whichever is wired first).

Layout:

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
release the field/value can be removed cleanly — every in-the-wild
record has already been migrated.

"One minor release" is interpreted against the manifest's `version`
string in the canonical pack. For pre-release work (`0.x`) the
window is one milestone (e.g. M2 → M3).

## Enum aliases

Renaming an enum value is a `migrate` entry **plus** an `aliases`
table the loader consults during validation. Aliases live next to
the schema:

```
content-schema/schemas/<record>.aliases.json
```

Shape:

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

## Worked example

The first end-to-end migration ships under
[`src/content-schema/migrations/example-v1-to-v2-rename-field.ts`](../../src/content-schema/migrations/example-v1-to-v2-rename-field.ts).
It is **illustrative only** — no shipping schema currently uses it
(its `appliesTo` is the placeholder
`heroes-reforged/_example-only.schema.json`, which the runner skips).
Treat it as the template to clone when you author the first real
migration. The
[migrations folder README](../../src/content-schema/migrations/README.md)
explains its illustrative status and the entry-authoring checklist.

## Related docs

- [`content-platform.md`](./content-platform.md) — additive-first rule
  this policy enforces.
- [`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md) — how alias
  entries interact with the enum-snapshot gate.
- [`schema-defaults-policy.md`](./schema-defaults-policy.md) — default
  declarations and JSON Schema ↔ Zod parity rules referenced from the
  Migration entry layout above.
- [`version-policy.md`](./version-policy.md) — refuse / migrate /
  degrade matrix that consults this policy during loads.
- [`schema-matrix.md`](./schema-matrix.md) — record table; new
  migration entries should add a footnote here when first authored.

---

## 🔍 Sync Check

- **UI: ✔** — Loader-internal policy doc; no screen-package surface to cross-check. The `ValidationError` `severity: warn` claim is consistent with [`validation-error.schema.json`](../../content-schema/schemas/validation-error.schema.json) and the Decision Matrix in [`version-policy.md`](./version-policy.md).
- **Schema: ⚠** — File-layout claims match disk: [`src/content-schema/migrations/`](../../src/content-schema/migrations/) holds the example entry, its test, and a `fixtures/` folder with `*.input.json` + `*.expected.json` exactly as documented; [`example-v1-to-v2-rename-field.ts`](../../src/content-schema/migrations/example-v1-to-v2-rename-field.ts) exports `from = 1`, `to = 2`, `appliesTo = ["heroes-reforged/_example-only.schema.json"]`, and a pure `migrate`. Two minor drifts surfaced — see `## ⚠ Issues`.
- **Tasks: ✔** — Owning task [`mvp.02-content-schemas.23-schema-migration-policy-and-example`](../../tasks/mvp/02-content-schemas/23-schema-migration-policy-and-example.md) names this file in `Owned Paths` and `Read First`. Consuming tasks [`mvp.02-content-schemas.11-schema-version-field-plus-migration-stub`](../../tasks/mvp/02-content-schemas/11-schema-version-field-plus-migration-stub.md) and [`mvp.02-content-schemas.27-reserve-ai-profile-schema`](../../tasks/mvp/02-content-schemas/27-reserve-ai-profile-schema.md) reference it correctly. No orphan tasks; no `Status:` field present (compliant with the task-status ledger doctrine).

## ⚠ Issues

- **`migrate.ts` runner is documented as a stub but does not yet exist on disk.** The opening paragraph links `src/content-schema/migrate.ts` (resolved to the parent directory by the original author so the link does not 404). The file is owned by [`mvp.02-content-schemas.11-schema-version-field-plus-migration-stub`](../../tasks/mvp/02-content-schemas/11-schema-version-field-plus-migration-stub.md) (Outputs section), which has not yet shipped. Per Hard Prohibition D the audit did not author the file; the wording was preserved unchanged. When Task 11 lands, the inline link should be tightened from the directory to the file.
- **Original prose said "Defaults must be integers per `schema-defaults-policy.md`"; that doc actually allows a wider canonical-scalar set.** [`schema-defaults-policy.md` § When to declare a default](./schema-defaults-policy.md#when-to-declare-a-default) authorises integer, boolean, empty array `[]`, empty object `{}`, **or** a pattern/enum-matching string — not integers only. The audit rewrote the bullet to "canonical scalars only — no floats" so the cross-reference does not contradict its target. No code change implied; the substantive constraint that motivated the original line ("no floats") is preserved verbatim. This is the only meaning-touching edit in the rewrite and is called out per § 8 Option A of the doc-audit skill.
