# Combination Artifacts — Detect Set, Apply Bonus

Module: [Spells, Artifacts & Hero Skills (M3)](../01-spells-artifacts.md)

Description:
The baseline corridor defines combination artifacts: named sets of equipment pieces that grant an extra bonus when all pieces are equipped at once. Detect when a hero completes a set and apply the set bonus.

Read First:
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)

Inputs:
- Artifact schema (combo fields), hero artifact slots (Task 5)

Outputs:
- `src/engine/artifact-combos.ts`
- `detectCombos(hero): ArtifactCombo[]` — returns all active combinations
- Combo bonus applied via same `ComputedStats` path
- Combo bonus removed if any piece is unequipped

Baseline corridor combinations to implement (minimum 3 distinct shapes — concrete names and themes are defined by the content pack, not the engine):
- **Large set (6 pieces)** → hero is immune to all negative spells, all units get +3 morale
- **Faction-specific set (4 pieces)** → cast all combat debuffs simultaneously at start of combat
- **Small set (2 pieces)** → hero has 0 naval/terrain-specific movement cost

Owned Paths:
- `src/engine/artifact-combos.ts`

Dependencies:
- phase-2.01-spells-artifacts.05-artifact-paper-doll-system

Acceptance Criteria:
- Equipping all 6 pieces of a large set triggers the combo bonus
- Removing one piece removes the bonus immediately
- `detectCombos` returns empty array when no sets are complete

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
