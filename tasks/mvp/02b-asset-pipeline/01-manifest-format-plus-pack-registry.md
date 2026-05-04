# Manifest Format + Pack Registry

Status: planned

Module: [Asset Pipeline & Content Pack Architecture (M0/M1)](../02b-asset-pipeline.md)

Description:
Wire the manifest schema (already defined in
`content-schema/schemas/manifest.schema.json`) into a runtime validator,
and implement the `PackRegistry` that tracks all loaded packs.

The manifest schema is the single source of truth — do not redefine
required fields in this task. If the field list feels wrong, change the
schema, not this file.

Read First:
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)
- [`docs/architecture/content-system-policy.md`](../../../docs/architecture/content-system-policy.md)

Inputs:
- `content-schema/schemas/manifest.schema.json`
- `docs/architecture/pack-contract.md`
- `docs/architecture/content-system-policy.md`

Outputs:
- `src/content-schema/manifest.ts` — compiled TypeScript types plus a
  runtime validator generated from the JSON schema
- `src/content-runtime/pack-registry.ts` — `PackRegistry`

Canonical example manifest (reference, not normative):

```json
{
  "schemaVersion": 1,
  "id": "emberwild-faction",
  "version": "1.0.0",
  "name": "Emberwild",
  "author": "Heroes Reforged",
  "kind": "faction-pack",
  "engine": ">=1.0.0",
  "dependencies": [
    { "id": "baseline-ruleset", "version": ">=1.0.0" }
  ],
  "capabilities": [],
  "provides": {
    "factions": ["emberwild"],
    "abilities": ["pack-hunt"],
    "spells": [],
    "artifacts": []
  },
  "sandboxed": false
}
```

`PackRegistry`:

```typescript
class PackRegistry {
  register(pack: LoadedPack): void
  unregister(packId: string): void
  getFaction(factionId: string): FactionPack | null
  getAbility(abilityId: string): AbilityDef | null
  getSpell(spellId: string): SpellDef | null
  getArtifact(artifactId: string): ArtifactDef | null
  listFactions(): FactionPack[]
}
```

Owned Paths:
- `src/content-schema/manifest.ts`
- `src/content-runtime/pack-registry.ts`

Dependencies:
- mvp.02-content-schemas.01-unit-schema
- mvp.02-content-schemas.02-faction-schema
- mvp.02-content-schemas.03-spell-schema
- mvp.02-content-schemas.04-artifact-schema
- mvp.02-content-schemas.05-building-schema
- mvp.02-content-schemas.06-ruleset-schema
- mvp.02-content-schemas.07-hero-schema

Acceptance Criteria:
- `manifest.json` missing required fields → clear error with JSON path
  from the validator (code `pack.error.manifest.schema` per
  [`pack-error-codes.md`](../../../docs/architecture/pack-error-codes.md)).
- A manifest whose `id` violates the namespace pattern in
  [`content-system-policy.md` § 1](../../../docs/architecture/content-system-policy.md#1-pack-identity)
  rejects with `pack.error.manifest.id-pattern`.
- `PackRegistry.getFaction("emberwild")` returns the Emberwild faction
  after the pack is registered.
- Unregistering a pack removes all its entities from the registry.
- Two packs declaring the same provided id without a matching
  `overrides` entry → `pack.error.override.unordered` (load is
  rejected; no silent last-wins). Resolver semantics — including
  `dependencies[]` object form, version-range matching, topological
  order, and override evaluation — are owned by
  [`mvp.02b-asset-pipeline.12-pack-resolver-algorithm`](./12-pack-resolver-algorithm.md);
  this task delegates rather than re-specifying them.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
