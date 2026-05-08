# Necromancy Mechanic — Raise Skeletons After Combat

Module: [Second Faction — Necropolis (M3)](../03-second-faction.md)

Description:
After any combat where Necropolis units participate, a percentage of enemy killed units are converted to Skeleton Warriors and added to the hero's army. This requires a post-battle hook that fires when battle resolves.

Read First:
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)

Inputs:
- `BattleResult` (`09-tactical-combat.md` Task 8)
- Hero Necromancy skill level
- Killed enemy units list

Formula (default values in `baseline.ruleset.json`, overridable per pack):
```
skeletonsRaised = floor(totalEnemyHPKilled / skeletonHP × necromancyRate)
necromancyRate: Basic=0.10, Advanced=0.20, Expert=0.30
```

Outputs:
- `src/engine/necromancy.ts`
- `applyNecromancy(battleResult, hero, ruleset): ArmyStack[]` — returns new/updated skeleton stacks
- Post-battle hook in `BATTLE_RESOLVED` command handler
- `SKELETONS_RAISED` event emitted

Owned Paths:
- `src/engine/necromancy.ts`

Dependencies:
- mvp.09-tactical-combat.08-battle-end-condition

Acceptance Criteria:
- Necromancer with Expert Necromancy raises correct number of Skeleton Warriors
- Hero at 7-stack army limit: new skeletons added to existing Skeleton stack (if any) or discarded
- Non-undead enemies are raised; undead enemies are NOT raised
- Skeletons raised are always Skeleton Warriors (not base Skeletons)
- In-combat raise (mid-battle, not just post-battle) follows the merge
  rule pinned in
  [`docs/architecture/in-combat-stack-rules.md`](../../../docs/architecture/in-combat-stack-rules.md):
  prefer existing same-unit stack, else create new (subject to
  `ruleset.combat.battlefieldMaxStacks`).

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
