# Edge-Case Policy

Single source of truth for the **gameplay** corner cases that pack
authors and reducer authors would otherwise each invent. Each rule
is pinned so two engines, two replays, or two pack mixes cannot
disagree.

Companion docs:

- [`edge-cases-policy.md`](./edge-cases-policy.md) — paired
  *infrastructure* edges (invalid commands, current-actor gate,
  overflow, save gating, asset-load failure, …). This file is the
  *gameplay* half.
- [`in-combat-stack-rules.md`](./in-combat-stack-rules.md) — split,
  merge, and battlefield stack cap (the 14-stack cap referenced in
  § 3).
- [`command-schema.md`](./command-schema.md) — canonical command
  payloads (`RECRUIT_UNITS`, `BATTLE_ATTACK`, `BATTLE_RESOLVED`,
  `TRANSFER_HERO_ARMY_STACK`, `TRANSFER_TOWN_ARMY_STACK`).
- [`hero.schema.json`](../../content-schema/schemas/hero.schema.json)
  — schema-level enforcement of `army.maxItems = 7` (§ 3).

## 1. Empty hero army

A hero whose `army` array is empty:

- **Adventure map.** May still move (so the player can route them
  back to a town for re-recruitment). Visiting an enemy town or
  enemy hero with zero stacks is permitted.
- **Combat-start.** If a hero arrives at battle with zero stacks,
  the battle reducer skips initiative and emits `BATTLE_RESOLVED`
  immediately with a defeat outcome for that hero's side.
- **Game-end interaction.** An auto-defeated hero is removed via
  the same reducer path as HP-zero deaths; scenario `defeat`
  predicates evaluate normally.

## 2. Simultaneous death (defender killed by attacker's strike)

A defender whose `hp` drops to `0` from the incoming strike, before
retaliation resolution, **does not retaliate**. Retaliation is
gated on `defender.hp > 0` *after* attack damage is applied. This
matches `mvp.09-tactical-combat.05-retaliation-once-per-round-nullification`.

`unlimited_retaliation` does **not** override death — a dead stack
cannot retaliate.

## 3. Stack-count cap (army)

`hero.army.maxItems = 7` is **schema-enforced** in
[`hero.schema.json`](../../content-schema/schemas/hero.schema.json).
The runtime additionally enforces it on every reducer that grows an
army:

- `RECRUIT_UNITS`, `TRANSFER_HERO_ARMY_STACK`,
  `TRANSFER_TOWN_ARMY_STACK`, and the post-battle skeleton-raise hook
  reject creation of an 8th stack with `STACK_CAP_EXCEEDED`.
- A merge into an existing same-unit stack is preferred (e.g.
  Necromancy raising Skeleton Warriors when the hero already holds
  Skeleton Warriors).
- Battlefield stack cap is `ruleset.combat.battlefieldMaxStacks = 14`
  (see [`in-combat-stack-rules.md`](./in-combat-stack-rules.md)) — a
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
removed (or transitioned to `destroyed`) and excess damage is
discarded — it does not splash to neighbours.

For multi-hit effects (e.g. `double_strike`), each strike resolves
sequentially: the second strike sees the post-first-strike HP and
clamps again.

## 6. Fuzz harness

Every rule above is enforced by deterministic fixtures in
[`tasks/mvp/09-tactical-combat/12-edge-case-fuzz-harness.md`](../../tasks/mvp/09-tactical-combat/12-edge-case-fuzz-harness.md).
The harness fires each edge case in isolation **and** as
combinations (empty army → simultaneous game-end, simultaneous death
→ stack cap on raise, …). Adding a new rule to this doc requires
adding a fixture; CI fails if a rule has no fixture.

## 7. Owning tasks

| Rule | Owning task |
|---|---|
| Empty army move + auto-defeat | [`mvp.05-adventure-map.01-strategic-game-state-model`](../../tasks/mvp/05-adventure-map/01-strategic-game-state-model.md), [`mvp.09-tactical-combat.08-battle-end-condition`](../../tasks/mvp/09-tactical-combat/08-battle-end-condition.md) |
| Simultaneous death no retaliation | [`mvp.09-tactical-combat.05-retaliation-once-per-round-nullification`](../../tasks/mvp/09-tactical-combat/05-retaliation-once-per-round-nullification.md) |
| 7-stack army cap | [`mvp.05-adventure-map.01-strategic-game-state-model`](../../tasks/mvp/05-adventure-map/01-strategic-game-state-model.md) |
| Simultaneous game-end | [`mvp.05-adventure-map.07-victory-defeat-conditions`](../../tasks/mvp/05-adventure-map/07-victory-defeat-conditions.md) |
| HP overflow | [`mvp.09-tactical-combat.03-damage-formula`](../../tasks/mvp/09-tactical-combat/03-damage-formula.md) |
| Fuzz harness | [`mvp.09-tactical-combat.12-edge-case-fuzz-harness`](../../tasks/mvp/09-tactical-combat/12-edge-case-fuzz-harness.md) |

---

## 🔍 Sync Check

- **UI: ✔** — Doc carries no UI copy-strings; combat / town /
  hero-meeting screens that surface the relevant commands
  (`RECRUIT_UNITS`, transfer commands, `BATTLE_RESOLVED`) live
  under [`wiki/screens/`](./wiki/screens/) and consume them
  unchanged.
- **Schema: ✔** — `army.maxItems = 7` matches
  [`hero.schema.json`](../../content-schema/schemas/hero.schema.json)
  line 34, including the inline `description` that back-points to
  this doc § 3. Schema row present in
  [`schema-matrix.md`](./schema-matrix.md) (`Hero`).
- **Tasks: ✔** — All six task IDs in § 7 exist on disk; the fuzz
  harness (`mvp.09-tactical-combat.12-edge-case-fuzz-harness`)
  Reads First this doc, and the retaliation task
  (`mvp.09-tactical-combat.05`) and strategic-state task
  (`mvp.05-adventure-map.01`) both back-link to it from their
  Acceptance Criteria.

## ⚠ Issues

- **`STACK_CAP_EXCEEDED` not registered in the validation-error
  taxonomy.** Section 3 names the rejection code, and
  `mvp.05-adventure-map.01-strategic-game-state-model` AC repeats it,
  but the closed enum in
  [`dispatcher-validation-error.schema.json`](../../content-schema/schemas/dispatcher-validation-error.schema.json)
  (per [`edge-cases-policy.md` § 11](./edge-cases-policy.md))
  lists only `MALFORMED_PAYLOAD`, `NOT_CURRENT_ACTOR`,
  `ENTITY_NOT_FOUND`, `INSUFFICIENT_RESOURCES`, `ILLEGAL_PHASE`,
  `OWNERSHIP_VIOLATION`, `UNREACHABLE_TARGET`, `DUPLICATE_INTENT`.
  If the army cap is intended to be a dispatcher-surfaced typed
  code (so UIs can localize it), the enum needs an entry; if it is
  a reducer-internal `Result` code never seen by the dispatcher,
  the policy doc should state that explicitly. Per
  CLAUDE.md root contract on closed-union schemas, the runtime
  owner — `mvp.05-adventure-map.01-strategic-game-state-model` (or
  the dispatcher task `mvp.01-engine-core.06-command-dispatcher` if
  the gate is upstream) — must close the gap. Suggested values:
  add `STACK_CAP_EXCEEDED` (and the parallel
  `BATTLEFIELD_STACK_CAP_EXCEEDED` from
  [`in-combat-stack-rules.md`](./in-combat-stack-rules.md) § 2.3)
  to the closed enum, or add a one-line "scope: reducer-internal,
  not a dispatcher code" note here. This skill did not edit either
  schema or the sibling doc (Hard Prohibition D).
- **Doc unindexed in `INDEX.md`.** Already flagged in
  [`INDEX.md` § ⚠ Issues](./INDEX.md#-issues): entry #4 lists the
  plural `edge-cases-policy.md` (infrastructure edges) without a
  Companions bullet for this gameplay-edges file. Surfaced again
  here for traceability; resolution is the index owner's call.
