# Balance Check — Emberwild vs Necropolis Headless Games

Status: planned

Module: [Second Faction — Necropolis (M3)](../03-second-faction.md)

Description:
Run headless games Emberwild vs Necropolis (both at Knight difficulty)
to check for severe imbalances before shipping Phase 2.

Read First:
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- All tasks in this module, `02-strategic-ai.md`

Outputs:
- `src/ai/bots/__tests__/emberwild-vs-necropolis.test.ts`
- Run ≥ 200 games, report win rate per faction with Wilson 95 % CI
- Flag if either faction's Wilson lower bound exceeds 65 % (threshold
  for "severely imbalanced")

Owned Paths:
- `src/ai/bots/__tests__/emberwild-vs-necropolis.test.ts`

Dependencies:
- phase-2.03-second-faction.01-necropolis-units-json-7-units-plus-upgrades
- phase-2.03-second-faction.02-necropolis-building-tree-json
- phase-2.03-second-faction.03-necropolis-hero-roster-json
- phase-2.03-second-faction.04-necromancy-mechanic-raise-skeletons-after-combat
- phase-2.03-second-faction.05-undead-immunity-morale-and-mind-spell-rules

Acceptance Criteria:
- Neither faction's 95 % Wilson lower bound is above 65 %
- 200 games complete in < 60 seconds
- Win-rate report printed to test output for manual review

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
