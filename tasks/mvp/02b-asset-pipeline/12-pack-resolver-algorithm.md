# Pack Resolver Algorithm

Module: [Asset Pipeline & Content Pack Architecture (M0/M1)](../02b-asset-pipeline.md)

Description:
Implement the pack resolver against the contract pinned in
[`docs/architecture/pack-resolver.md`](../../../docs/architecture/pack-resolver.md).
The resolver reads installed manifests, builds the dependency graph,
runs Kahn's topological sort with lexicographic tie-break, performs
node-semver range matching, evaluates override edges, and produces a
deterministic `loadedPacks` array plus a resolution trace consumed by
the mod manager UI. This is the single source of cross-pack load
order and gates everything that depends on `contentHash` equality
(saves, replays, multiplayer).

Read First:
- [`docs/architecture/pack-resolver.md`](../../../docs/architecture/pack-resolver.md)
- [`docs/architecture/content-system-policy.md`](../../../docs/architecture/content-system-policy.md)
- [`docs/architecture/pack-error-codes.md`](../../../docs/architecture/pack-error-codes.md)

Inputs:
- `content-schema/schemas/manifest.schema.json`
- Resolver fixtures under `content-schema/examples/packs/__tests__/resolver/`

Outputs:
- `src/content-runtime/pack-resolver.ts` exporting
  `resolvePacks(manifests: Manifest[]): ResolverResult`
- Test fixtures under `content-schema/examples/packs/__tests__/resolver/`
  covering linear chain, diamond, cycle, missing dep, version
  conflict.

Owned Paths:
- `src/content-runtime/pack-resolver.ts`
- `content-schema/examples/packs/__tests__/resolver/`

Dependencies:
- mvp.02b-asset-pipeline.11-content-system-policy-doc
- mvp.02b-asset-pipeline.16-pack-error-code-catalog
- mvp.02b-asset-pipeline.01-manifest-format-plus-pack-registry

Acceptance Criteria:
- Linear-chain fixture loads in `loadedPacks` order (deps first,
  dependents last).
- Diamond fixture: tie-break is lexicographic on namespaced `id`;
  byte-identical `loadedPacks` order across two runs.
- Cycle fixture rejects with `pack.error.dependency.cycle` listing
  every pack in the cycle in lexicographic order.
- Missing-dep fixture rejects with `pack.error.dependency.missing`.
- Version-conflict fixture rejects with
  `pack.error.dependency.version-conflict`.
- A pack manifest using a plain string in `dependencies[]` is
  accepted with a deprecation warning during the migration window
  documented in `pack-resolver.md` § 1.
- `manifest.schema.json` is referenced by canonical path so
  `validate:tasks` recognizes the schema link.

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
