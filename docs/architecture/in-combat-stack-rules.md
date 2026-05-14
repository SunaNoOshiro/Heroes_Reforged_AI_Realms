# In-Combat Stack Rules

Pins how battlefield stacks are created and merged once a battle is
in progress. Reducer authors and pack authors do not invent local
rules for either question:

- Can a stack be split mid-combat? — § 1.
- Where do `summon` / `raise` / `resurrect` units land? — § 2.

Companion docs:

- [`edge-case-policy.md`](./edge-case-policy.md) — § 3 defines the
  parallel **7-stack hero-army cap** (`hero.army.maxItems = 7`) that
  applies after battle resolution.
- [`mechanics-coverage.md`](./mechanics-coverage.md) — registers
  in-combat split as `out-of-scope` and in-combat merge as the
  Necromancy `phase-2` mechanic.
- [`command-schema.md`](./command-schema.md) — `BATTLE_INITIATED`
  event payload (combat begins).
- [`ruleset.schema.json`](../../content-schema/schemas/ruleset.schema.json)
  — `combat.battlefieldMaxStacks` field; baseline value `14` in
  [`baseline.ruleset.json`](../../content-schema/examples/records/rulesets/baseline.ruleset.json).

## 1. In-combat split

**Out of scope.** A battlefield stack cannot be split into two stacks
once `BATTLE_INITIATED` has fired. Splits happen on the adventure
map before combat, via
[`mvp.05-adventure-map.17-split-army-stack-command`](../../tasks/mvp/05-adventure-map/17-split-army-stack-command.md).

Recorded as a baseline-corridor `out-of-scope` row in
[`mechanics-coverage.md`](./mechanics-coverage.md).

## 2. In-combat merge

`summon`, `raise`, and `resurrect` effects must place units somewhere
on the battlefield. The placement rule is fixed:

1. **Prefer existing same-unit stack.** If the caster's side already
   holds a stack of the same `unitId`, the new units join that stack
   and its HP / count is increased.
2. **Otherwise create a new stack.** A new battlefield stack is
   created at the effect's chosen hex.
3. **Battlefield stack cap.** Total stacks on the battlefield
   (initial placement + summoned + raised) may not exceed
   `ruleset.combat.battlefieldMaxStacks` (default `14`, set in
   [`baseline.ruleset.json`](../../content-schema/examples/records/rulesets/baseline.ruleset.json)).
   The reducer firing the effect rejects past the cap with
   `BATTLEFIELD_STACK_CAP_EXCEEDED`.

### Battlefield cap vs. army cap

The `14` cap is **battlefield-only** (the tactical grid). The
**7-stack hero-army cap** (`hero.army.maxItems = 7`, see
[`edge-case-policy.md` § 3](./edge-case-policy.md#3-stack-count-cap-army))
governs what survives back into the army after the battle resolves:

- Any raised or summoned stack with **no surviving same-unit stack**
  in the army at battle end is **discarded** if accepting it would
  breach the 7-stack cap.

## 3. Determinism

All decisions are pure functions of `(BattleState, effect, callerId)`.

- **Existing-stack vs. new-stack tie-break.** Lowest stable stack ID
  among matching candidates, then lowest battlefield position
  `(q, r)`.
- **Placement of a new stack.** The effect's declared target hex; if
  multiple legal hexes are available, prefer the lowest `(q, r)`.

## 4. Owning tasks

| Concern | Owning task |
|---|---|
| Battlefield-stack cap enforcement | [`mvp.09-tactical-combat.01-battlestate-init-army-placement-plus-speed-order`](../../tasks/mvp/09-tactical-combat/01-battlestate-init-army-placement-plus-speed-order.md) |
| Necromancy raise-into-existing-stack | [`phase-2.03-second-faction.04-necromancy-mechanic-raise-skeletons-after-combat`](../../tasks/phase-2/03-second-faction/04-necromancy-mechanic-raise-skeletons-after-combat.md) |
| Summon spells | [`phase-2.01-spells-artifacts.02-combat-spells`](../../tasks/phase-2/01-spells-artifacts/02-combat-spells.md) |
| Edge-case fuzz coverage | [`mvp.09-tactical-combat.12-edge-case-fuzz-harness`](../../tasks/mvp/09-tactical-combat/12-edge-case-fuzz-harness.md) |

---

## 🔍 Sync Check

- **UI: ✔** — Doc carries no UI copy-strings; battlefield rendering
  consumes the same `BattleState` shape that the reducer enforces.
  `BATTLE_INITIATED` is the only event referenced and is defined in
  [`event-schema.md`](./event-schema.md) § `BATTLE_INITIATED`.
- **Schema: ✔** — `ruleset.combat.battlefieldMaxStacks` matches
  [`ruleset.schema.json`](../../content-schema/schemas/ruleset.schema.json)
  (lines 76–82); baseline value `14` matches
  [`baseline.ruleset.json`](../../content-schema/examples/records/rulesets/baseline.ruleset.json).
  `Ruleset` row present in
  [`schema-matrix.md`](./schema-matrix.md).
- **Tasks: ✔** — All four task IDs in § 4 exist on disk. The split
  task (`mvp.05-adventure-map.17`), the cap-enforcement task
  (`mvp.09-tactical-combat.01`), the necromancy task
  (`phase-2.03-second-faction.04`), and the fuzz harness
  (`mvp.09-tactical-combat.12`) all back-link to this doc from their
  Acceptance Criteria or Read First. `mechanics-coverage.md` rows
  for both "In-combat split" (`out-of-scope`) and "In-combat merge"
  (`phase-2`) are present.

## ⚠ Issues

- **`BATTLEFIELD_STACK_CAP_EXCEEDED` not in the dispatcher
  validation-error closed enum.** § 2.3 names the rejection code,
  and `mvp.09-tactical-combat.12-edge-case-fuzz-harness` exercises
  it, but the closed `oneOf` in
  [`dispatcher-validation-error.schema.json`](../../content-schema/schemas/dispatcher-validation-error.schema.json)
  (per [`edge-cases-policy.md` § 11](./edge-cases-policy.md))
  does not include it; nor does it include the parallel
  `STACK_CAP_EXCEEDED` from
  [`edge-case-policy.md` § 3](./edge-case-policy.md#3-stack-count-cap-army).
  Both are already flagged in
  [`edge-cases-policy.md` § ⚠ Issues](./edge-cases-policy.md) and
  [`edge-case-policy.md` § ⚠ Issues](./edge-case-policy.md);
  surfaced again here for traceability. Per CLAUDE.md root contract
  on closed-union schemas, the runtime owner —
  [`mvp.09-tactical-combat.01-battlestate-init-army-placement-plus-speed-order`](../../tasks/mvp/09-tactical-combat/01-battlestate-init-army-placement-plus-speed-order.md)
  for the battlefield cap, or the dispatcher task
  `mvp.01-engine-core.06-command-dispatcher` if the gate is
  upstream — must close the gap. Suggested values: add
  `BATTLEFIELD_STACK_CAP_EXCEEDED` and `STACK_CAP_EXCEEDED` to the
  closed enum, or add a one-line "scope: reducer-internal, not a
  dispatcher code" note here. This skill did not edit the schema or
  the sibling docs (Hard Prohibition D).
- **`raise` and `resurrect` are not effect-registry kinds.** § 2
  speaks of `summon`, `raise`, and `resurrect` as a single class.
  [`effect-registry.md`](./effect-registry.md) currently registers
  only `summon` (plus `spawn_army` for map triggers); `raise` is
  treated as a Necromancy mechanic in
  [`phase-2.03-second-faction.04`](../../tasks/phase-2/03-second-faction/04-necromancy-mechanic-raise-skeletons-after-combat.md)
  rather than a generic effect kind, and `resurrect` does not exist
  in the registry at all. Either the registry needs the additional
  `kind` rows so this doc's framing is accurate, or this doc should
  scope down to "any effect that materializes a battlefield stack
  (e.g. `summon`, Necromancy raise, future resurrect)". The skill
  did not narrow the wording because doing so would change which
  future effects are bound by the rule (Hard Prohibition A).
  Owner: the effect-registry maintainer, or the
  `phase-2.01-spells-artifacts` module if `resurrect` is intended to
  enter as a registered kind. Suggested values: add `raise` and
  `resurrect` rows to the effect-kind table in
  [`effect-registry.md`](./effect-registry.md), or amend § 2 here
  to drop the implication of registered effect kinds.
- **Doc not listed in [`INDEX.md`](./INDEX.md).** The index does
  not include this file, even though
  [`edge-case-policy.md` § 3](./edge-case-policy.md#3-stack-count-cap-army)
  and [`mechanics-coverage.md`](./mechanics-coverage.md) both
  cross-link it as the canonical home of the battlefield-stack cap.
  Same shape as the existing
  [`INDEX.md` § ⚠ Issues](./INDEX.md#-issues) flag for
  `edge-case-policy.md`. Resolution is the index owner's call;
  suggested values: add as a Companions bullet on entry #4
  (`edge-cases-policy.md`) alongside `edge-case-policy.md`. Skill
  did not edit `INDEX.md` (Hard Prohibition D).
