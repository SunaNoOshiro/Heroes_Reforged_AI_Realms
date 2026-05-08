# Override Precedence + Patch Merge

Module: [Pack Runtime / Mod System (M4)](../05-mod-system.md)

Description:
Implement the explicit `overrides` channel from
[`content-system-policy.md` § 3](../../../docs/architecture/content-system-policy.md#3-override-precedence)
and [`pack-resolver.md` § 4](../../../docs/architecture/pack-resolver.md).
A pack declaring `overrides[]` may legally replace or JSON-merge-patch
records contributed by packs in its dependency chain. Two packs in
unrelated dep subtrees overriding the same target must be rejected
with `pack.error.override.unordered`. The mod manager surfaces
`overrides[].source` and `overrides[].reason` per affected target so
the player sees *why* a baseline record was replaced.

Read First:
- [`docs/architecture/content-system-policy.md`](../../../docs/architecture/content-system-policy.md)
- [`docs/architecture/pack-resolver.md`](../../../docs/architecture/pack-resolver.md)
- [`docs/architecture/pack-error-codes.md`](../../../docs/architecture/pack-error-codes.md)

Inputs:
- `content-schema/schemas/manifest.schema.json` (`overrides` block)
- Resolver output from
  `mvp.02b-asset-pipeline.12-pack-resolver-algorithm`
- Override fixtures under
  `content-schema/examples/packs/__tests__/overrides/`

Outputs:
- `src/content-runtime/overrides.ts` — applies replace/patch
  overrides on top of the resolved registry, returns the
  `overrideMap` consumed by the mod manager.
- Override fixtures: legal replace, legal patch, override of
  non-dep target (rejected), unordered override (rejected).

Owned Paths:
- `src/content-runtime/overrides.ts`
- `content-schema/examples/packs/__tests__/overrides/`

Dependencies:
- mvp.02b-asset-pipeline.12-pack-resolver-algorithm
- mvp.02b-asset-pipeline.16-pack-error-code-catalog
- phase-2.05-mod-system.01-zip-pack-loader-jszip-plus-manifest-parser

Acceptance Criteria:
- Legal-replace fixture: an overriding pack `dependencies` the
  providing pack and replaces a record; registry entry reflects the
  overriding pack's content; `overrideMap[target]` returns the
  overriding pack's id.
- Legal-patch fixture: JSON-merge-patch (RFC 7396) applied to the
  base record; only the patched fields change.
- Override-of-non-dep fixture: pack overrides a target that is not
  in its transitive dep closure → rejected with
  `pack.error.override.unordered`.
- Unordered-override fixture: two packs in unrelated dep subtrees
  override the same target → rejected with
  `pack.error.override.unordered`.
- Schema reference: `content-schema/schemas/manifest.schema.json`.

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
