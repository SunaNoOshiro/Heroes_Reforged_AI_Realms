# Edge-Case Policy

The single source of truth for the corner cases that pack authors and
reducer authors would otherwise each invent. Each rule is pinned so
two engines / two replays / two pack mixes cannot disagree.

## 1. Empty hero army

A hero whose `army` array is empty:

- **On the adventure map:** the hero may still move (so the player
  can route them back to a town for re-recruitment). Visiting an
  enemy town or an enemy hero with zero stacks is permitted; the
  hero is auto-defeated at the start of the next combat resolution.
- **At combat-start:** if a hero arrives at a battle with zero
  stacks, the battle reducer skips initiative and emits
  `BATTLE_RESOLVED` immediately with a defeat outcome for that
  hero's side.
- **Game-end interaction:** an auto-defeated hero is removed via
  the same reducer that handles HP-zero deaths; scenario `defeat`
  conditions evaluate normally.

## 2. Simultaneous death (defender killed by attacker's strike)

A defender whose HP drops to `0` from the incoming strike, before
retaliation resolution, **does not retaliate**. Retaliation is gated
on `defender.hp > 0` after the attack damage is applied. This is
consistent with `mvp.09-tactical-combat.05-retaliation-once-per-round-nullification`.

`unlimited_retaliation` does not override death — a dead stack
cannot retaliate.

## 3. Stack-count cap (army)

`hero.army.maxItems = 7` is **schema-enforced**
(see [`hero.schema.json`](../../content-schema/schemas/hero.schema.json)).
The runtime additionally enforces it on every reducer that grows an
army:

- `RECRUIT_UNITS`, `TRANSFER_HERO_ARMY_STACK`,
  `TRANSFER_TOWN_ARMY_STACK`, and the post-battle skeleton-raise hook
  reject creation of an 8th stack with `STACK_CAP_EXCEEDED`.
- A merge into an existing same-unit stack is preferred (e.g.
  Necromancy raising Skeleton Warriors when the hero already holds
  Skeleton Warriors).
- Battlefield stack cap is `ruleset.combat.battlefieldMaxStacks = 14`
  (see [`in-combat-stack-rules.md`](in-combat-stack-rules.md)) — a
  separate cap from the 7-stack army cap.

## 4. Simultaneous game-end

When a single command resolution would satisfy both a victory and a
defeat condition for the same player on the same step, **defeat
takes precedence**. Evaluation order on a tie:

1. Run all `defeat` predicates against the post-command state.
2. If any defeat fires for the affected player, mark them defeated
   regardless of any concurrent victory predicate.
3. Otherwise, run `victory` predicates.

This rule extends to multi-player ties: if defeating the loser also
satisfies the survivor's victory condition, the survivor wins
*after* the loser is marked defeated; the order in the log is fixed
(`defeat` event first, then `victory`).

## 5. HP overflow

Damage is **clamped to remaining HP**. The runtime never stores
negative HP. After a strike that exceeds remaining HP, the stack is
removed (or transitioned to "destroyed") and excess damage is
discarded — it does not splash to neighbours.

For multi-hit effects (e.g. `double_strike`), each strike resolves
sequentially: the second strike sees the post-first-strike HP and
clamps again.

## 6. Fuzz harness

Every rule above is enforced by deterministic fixtures in
[`tasks/mvp/09-tactical-combat/12-edge-case-fuzz-harness.md`](../../tasks/mvp/09-tactical-combat/12-edge-case-fuzz-harness.md).
The harness fires each edge case in isolation and as combinations
(empty army → simultaneous game-end, simultaneous death → stack cap
on raise, etc.).

## 7. Owning tasks

| Rule | Owning task |
|---|---|
| Empty army move + auto-defeat | [`mvp.05-adventure-map.01-strategic-game-state-model`](../../tasks/mvp/05-adventure-map/01-strategic-game-state-model.md), [`mvp.09-tactical-combat.08-battle-end-condition`](../../tasks/mvp/09-tactical-combat/08-battle-end-condition.md) |
| Simultaneous death no retaliation | [`mvp.09-tactical-combat.05-retaliation-once-per-round-nullification`](../../tasks/mvp/09-tactical-combat/05-retaliation-once-per-round-nullification.md) |
| 7-stack army cap | [`mvp.05-adventure-map.01-strategic-game-state-model`](../../tasks/mvp/05-adventure-map/01-strategic-game-state-model.md) |
| Simultaneous game-end | [`mvp.05-adventure-map.07-victory-defeat-conditions`](../../tasks/mvp/05-adventure-map/07-victory-defeat-conditions.md) |
| HP overflow | [`mvp.09-tactical-combat.03-damage-formula`](../../tasks/mvp/09-tactical-combat/03-damage-formula.md) |
| Fuzz harness | [`mvp.09-tactical-combat.12-edge-case-fuzz-harness`](../../tasks/mvp/09-tactical-combat/12-edge-case-fuzz-harness.md) |
