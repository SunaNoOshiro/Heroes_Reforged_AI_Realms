# Emberwild Town Building Tree JSON

Status: planned

Module: [Faction — Emberwild (M1)](../04-faction-emberwild.md)

Description:
Write the complete Emberwild town building dependency tree. The tree
unlocks unit dwellings, the spell library, and income bonuses.

Read First:
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)

Inputs:
- Baseline building table in `research/deep-research-report.md`
- Building schema (`02-content-schemas.md` Task 5)
- Effect registry
  ([`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md))

Outputs:
- `resources/packs/emberwild-faction/buildings/` — one
  `.building.json` file per building

Owned Paths:
- `resources/packs/emberwild-faction/buildings/`

Buildings to include:
- Resource chain: Village Hall → Town Hall → City Hall → Capitol
- Defense chain: Fort → Citadel → Fortress
- Dwellings: Scout Camp, Kennels, Archery Post, Cinder Stables, Ember
  Library, Warden Hall, Phoenix Roost
- Spell Library levels 1–5
- Tavern, Forge, Market, Resource Vault (gold)

Each building must:
- list `requires[]` prerequisite building ids
- specify integer `cost`
- use only effect registry kinds for `effects` (for example
  `unlock_unit`, `unlock_building`, `resource_bonus`)

Dependencies:
- mvp.02-content-schemas.05-building-schema

Acceptance Criteria:
- All building records validate against `building.schema.json`
- The dependency graph has no cycles (topological sort passes)
- Capitol requires City Hall requires Town Hall requires Village Hall
- Each dwelling is required before its upgrade dwelling
- No effect uses a `kind` outside the effect registry

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
