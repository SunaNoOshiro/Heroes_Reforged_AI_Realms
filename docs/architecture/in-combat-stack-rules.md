# In-Combat Stack Rules

Pins how stacks are created and merged once a battle is in progress.
Both questions — split mid-combat? merge raised units back into an
existing stack? — are answered here so reducer and pack authors do
not invent local rules.

## 1. In-combat split

**Out of scope.** A stack on the battlefield cannot be split into two
stacks once `BATTLE_INITIATED` has fired. Splits happen on the
adventure map (see
[`mvp.05-adventure-map.17-split-army-stack-command`](../../tasks/mvp/05-adventure-map/17-split-army-stack-command.md))
before the battle.

This is recorded as a baseline-corridor `out-of-scope` row in
[`mechanics-coverage.md`](mechanics-coverage.md).

## 2. In-combat merge

`summon`, `raise`, and `resurrect` effects must place units somewhere.
Policy:

1. **Prefer existing same-unit stack.** If the caster's side already
   has a stack of the same unit ID, the new units join that stack and
   the stack's HP / count is increased.
2. **Otherwise create a new stack.** A new battlefield stack is
   created and placed at the effect's chosen hex.
3. **Battlefield stack cap.** Total stacks on the battlefield
   (initial placement + summoned + raised) may not exceed
   `ruleset.combat.battlefieldMaxStacks` (default `14`). The reducer
   that fires the effect rejects past the cap with
   `BATTLEFIELD_STACK_CAP_EXCEEDED`.

The 14-cap is a battlefield-only cap. The 7-stack hero-army cap (see
[`edge-case-policy.md`](edge-case-policy.md) §3) governs what stays
in the army after the battle resolves. Any "raised" or "summoned"
stack that has no surviving same-unit stack on the army at battle
end is discarded if accepting it would breach the army's 7-stack cap.

## 3. Determinism

- Choice of "existing stack vs. new stack" is decided by the lowest
  stable stack ID among matching candidates, then by the lowest
  battlefield position `(q, r)`.
- Placement of a newly-created stack is decided by the effect's
  declared target hex; if multiple legal hexes are available, prefer
  the lowest `(q, r)` one.
- All decisions are pure functions of `(BattleState, effect,
  callerId)`.

## 4. Owning tasks

| Concern | Owning task |
|---|---|
| Battlefield-stack cap enforcement | [`mvp.09-tactical-combat.01-battlestate-init-army-placement-plus-speed-order`](../../tasks/mvp/09-tactical-combat/01-battlestate-init-army-placement-plus-speed-order.md) |
| Necromancy raise-into-existing-stack | [`phase-2.03-second-faction.04-necromancy-mechanic-raise-skeletons-after-combat`](../../tasks/phase-2/03-second-faction/04-necromancy-mechanic-raise-skeletons-after-combat.md) |
| Summon spells | [`phase-2.01-spells-artifacts.02-combat-spells`](../../tasks/phase-2/01-spells-artifacts/02-combat-spells.md) |
| Edge-case fuzz coverage | [`mvp.09-tactical-combat.12-edge-case-fuzz-harness`](../../tasks/mvp/09-tactical-combat/12-edge-case-fuzz-harness.md) |
