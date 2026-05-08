# Content Loader — Validate on Load

Module: [Faction — Emberwild (M1)](../04-faction-emberwild.md)

Description:
Write the content loader that reads faction packs from disk (or
IndexedDB in browser), validates them against every schema, resolves
cross-references (unit ids, building ids), and builds a typed in-memory
`ContentPack` object used by the sim.

Read First:
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)

Inputs:
- Schema validators (`02-content-schemas.md` Task 10)
- Emberwild JSON files (Tasks 1–4 of this module)

Outputs:
- `src/content-runtime/content-loader.ts`
- `loadContentPack(rawJson: unknown): Result<ContentPack, ContentLoadError>`
- `ContentPack`: fully validated, cross-reference-resolved, immutable
  object

Cross-reference validation:
- Every `unitId` in faction → must exist in units map
- Every `buildingId` in faction → must exist in buildings map
- Every `requires` in a building → must exist in the same pack
- No circular building dependencies
- `effect.kind` values must be present in the effect registry

Owned Paths:
- `src/content-runtime/content-loader.ts`

Dependencies:
- mvp.02-content-schemas.10-zod-validators-for-all-schemas
- mvp.02-content-schemas.13-effect-registry
- mvp.04-faction-emberwild.01-emberwild-units-7-units-plus-upgrades
- mvp.04-faction-emberwild.02-emberwild-town-building-tree
- mvp.04-faction-emberwild.03-emberwild-hero-roster
- mvp.04-faction-emberwild.04-baseline-ruleset

Acceptance Criteria:
- `loadContentPack(emberwildJson)` returns `Ok` with no errors
- A unit with an invalid `factionId` returns `Err` with a clear path
- A building cycle returns `Err` with the cycle listed
- An unknown `effect.kind` returns `Err` referencing the effect
  registry
- `ContentPack` is frozen after load (mutations throw in dev mode)

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
