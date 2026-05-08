# Official Pack Signing + Bundle Verification

Module: [Pack Runtime / Mod System (M4)](../05-mod-system.md)

Description:
Finish the official reference bundle by signing every first-party pack,
verifying declared load order and dependencies, and proving the whole
bundle can be loaded as one coherent set.

Read First:
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)

Inputs:
- Official packs from Tasks 5a–5c
- Signature verification flow from Task 2
- Mod loader and mod manager outputs from Tasks 1 and 4

Outputs:
- signed `manifest.json` files for every official pack
- bundle-level verification notes in `resources/packs/README.md`
- one repeatable verification command or script for the official bundle

Owned Paths (shared):
- `resources/packs/*/manifest.json`

Owned Paths:
- `resources/packs/README.md`

Dependencies:
- phase-2.05-mod-system.02-ed25519-signature-verification
- phase-2.05-mod-system.04-mod-manager-ui-install-enable-disable
- phase-2.05-mod-system.05a-baseline-ruleset-and-shared-library-packs
- phase-2.05-mod-system.05b-sylvan-and-stormspire-reference-packs
- phase-2.05-mod-system.05c-ashlord-and-deepway-reference-packs

Acceptance Criteria:
- Every official pack carries `contentHash`, `engineHash`, and official
  signature metadata
- Bundle verification reports missing dependencies or bad load order
  before runtime load
- Bundle verification consults the canonical-packs registry from
  [`phase-2.05-mod-system.09-canonical-packs-registry`](./09-canonical-packs-registry.md)
  and refuses to start if a `required: true` entry is missing
  (`pack.error.canonical.missing`) or its hash/version mismatches
  (`pack.error.canonical.mismatch`).
- The full official bundle passes `npm run validate` with zero errors
- Loading all official packs does not require any hard-coded faction or
  pack ordering in the engine
- Shared path work is additive only: add signature metadata to manifests
  without rewriting the primary manifest contract owned by the pack
  authoring tasks in `phase-2.05-mod-system.05a` through `05c`

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
