# Canonical-Packs Registry + Bundle Verifier

Module: [Pack Runtime / Mod System (M4)](../05-mod-system.md)

Description:
Ship the static registry of first-party packs pinned to the engine
build at
[`resources/canonical-packs.json`](../../../resources/canonical-packs.json),
authored against
[`content-schema/schemas/canonical-packs.schema.json`](../../../content-schema/schemas/canonical-packs.schema.json).
At startup, the bundle verifier loads the registry and confirms, for
every `required: true` entry, that a pack with that `id` is loaded,
its `version` satisfies the pinned version, its `signature.keyId`
matches `signatureKeyId`, and its `contentHash` matches. Failure
blocks game start with `pack.error.canonical.missing` or
`pack.error.canonical.mismatch`. `required: false` entries are
optional bundles (extra factions, asset packs).

Read First:
- [`docs/architecture/content-system-policy.md`](../../../docs/architecture/content-system-policy.md)
- [`docs/architecture/pack-error-codes.md`](../../../docs/architecture/pack-error-codes.md)
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)

Inputs:
- `content-schema/schemas/canonical-packs.schema.json`
- `resources/canonical-packs.json`
- Resolver output from
  `mvp.02b-asset-pipeline.12-pack-resolver-algorithm`

Outputs:
- `src/content-runtime/canonical-packs.ts` exporting
  `verifyBundle(loadedPacks, registry)` returning
  `{ ok: true } | { ok: false, code, missing }`.
- A test fixture proving that a missing `required: true` entry
  produces `pack.error.canonical.missing` and a mismatched
  `contentHash` produces `pack.error.canonical.mismatch`.

Owned Paths:
- `src/content-runtime/canonical-packs.ts`

Owned Paths (shared):
- `resources/canonical-packs.json`

Dependencies:
- mvp.02b-asset-pipeline.12-pack-resolver-algorithm
- mvp.02b-asset-pipeline.16-pack-error-code-catalog
- phase-2.05-mod-system.02-ed25519-signature-verification
- phase-2.05-mod-system.05a-baseline-ruleset-and-shared-library-packs
- phase-2.05-mod-system.05b-sylvan-and-stormspire-reference-packs
- phase-2.05-mod-system.05c-ashlord-and-deepway-reference-packs

Acceptance Criteria:
- The shipped `resources/canonical-packs.json` validates against
  `content-schema/schemas/canonical-packs.schema.json`.
- A boot fixture missing a `required: true` entry refuses to start
  with `pack.error.canonical.missing`.
- A boot fixture whose loaded pack has a different `contentHash`
  than the registry entry refuses to start with
  `pack.error.canonical.mismatch`.
- `required: false` entries are skipped silently when absent.
- Schema reference: `content-schema/schemas/canonical-packs.schema.json`.
- Shared-path edits to `resources/canonical-packs.json` are
  additive only — entries may be appended for new first-party
  packs; must not rewrite the schemaVersion or engineHash without
  an engine-build bump; primary owner of the registry file is this
  task.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
