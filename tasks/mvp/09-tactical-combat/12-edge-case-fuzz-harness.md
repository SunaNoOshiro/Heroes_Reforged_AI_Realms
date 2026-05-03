# Edge-Case Fuzz Harness

Status: planned

Module: [Tactical Combat (M2)](../09-tactical-combat.md)

Description:
Deterministic fuzz harness that triggers each rule pinned in
[`docs/architecture/edge-case-policy.md`](../../../docs/architecture/edge-case-policy.md)
in isolation and as combinations. The harness is the canonical guard
against any reducer drifting from the policy.

Read First:
- [`docs/architecture/edge-case-policy.md`](../../../docs/architecture/edge-case-policy.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- Tactical-combat reducers (`BATTLE_ATTACK`, `BATTLE_RESOLVED`,
  retaliation, summon)
- Strategic reducers (`MOVE_HERO`, `RECRUIT_UNITS`,
  `TRANSFER_HERO_ARMY_STACK`)
- Scenario victory/defeat predicate evaluator
- Seeded RNG harness

Outputs:
- `src/engine/__tests__/edge-cases.fuzz.ts`
- Per-rule fixtures under
  `src/engine/__tests__/fixtures/edge-cases/`

Owned Paths:
- `src/engine/__tests__/edge-cases.fuzz.ts`
- `src/engine/__tests__/fixtures/edge-cases/`

Dependencies:
- mvp.05-adventure-map.01-strategic-game-state-model
- mvp.05-adventure-map.07-victory-defeat-conditions
- mvp.09-tactical-combat.03-damage-formula
- mvp.09-tactical-combat.05-retaliation-once-per-round-nullification
- mvp.09-tactical-combat.08-battle-end-condition

### Test cases (one per rule)

- **Empty army:** hero with `army = []` moves into an enemy hero;
  combat reducer emits `BATTLE_RESOLVED` with the empty-army hero's
  side defeated, no initiative was rolled.
- **Simultaneous death:** attacker strikes defender for HP exact;
  defender does not retaliate. Repeat with `unlimited_retaliation`
  → still no retaliation.
- **Stack-cap army:** `RECRUIT_UNITS` into a 7-stack hero rejects
  with `STACK_CAP_EXCEEDED`. Necromancy raise into a 7-stack hero
  routes into existing same-unit stack instead.
- **Stack-cap battlefield:** `summon` past
  `ruleset.combat.battlefieldMaxStacks` rejects.
- **Simultaneous game-end:** scenario in which a single command
  satisfies both the player's victory and defeat predicates; defeat
  fires first.
- **HP overflow:** strike for 10× target HP clamps damage to
  remaining HP; no negative HP serialized.

Acceptance Criteria:
- Each fixture is a JSON file checked under
  `fixtures/edge-cases/<rule>.json` with input state, command
  sequence, and expected post-state hash.
- The harness runs each fixture 3× and asserts byte-identical state
  hashes.
- Adding a new rule to `edge-case-policy.md` requires adding a
  fixture; CI fails if a rule has no fixture.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
