# Edge-Case Scenario Fixtures

Minimal scenario records that exercise the corner cases enumerated.
§ Q258. Each scenario is consumed by the golden-state suite to
produce a checked-in expected-state hash; refactors that change
behavior in any of these corners fail the suite. Owned by
[`tasks/mvp/02-tooling/05-edge-case-fixtures.md`](../../../tasks/mvp/02-tooling/05-edge-case-fixtures.md).

| File | Edge it exercises |
|---|---|
| `empty-garrison.scenario.json` | Defending town has zero garrisoned units; pins the auto-loss rule for an undefended siege. |
| `stack-1-vs-1000.scenario.json` | Single-unit stack against a 1000-unit stack; pins damage rounding at extremes. |
| `all-heroes-dead-victory.scenario.json` | Loss condition fires on the next turn after the last hero is killed. |
| `resource-overflow-turn.scenario.json` | Day-one resource accrual is seeded to overflow `MAX_RESOURCE`; pins the saturation rule from `docs/architecture/edge-cases-policy.md` § 6. |
| `full-inventory-pickup.scenario.json` | Hero with a full backpack visits an artifact pile; pins the inventory-full reject path. |
| `zero-mana-spell-attempt.scenario.json` | Hero attempts a spell with insufficient mana; pins the resource-exhausted reject path. |

## Naming Convention

`<edge-name>.scenario.json` lowercase-kebab. Files validate against
[`content-schema/schemas/scenario.schema.json`](../../../content-schema/schemas/scenario.schema.json)
through the scenario loader pinned by
[`tasks/mvp/08-persistence/04-scenario-loader.md`](../../../tasks/mvp/08-persistence/04-scenario-loader.md).

## Adding A New Scenario

1. Author the scenario record using the same minimal shape (one
   player slot per side, the single condition that exercises the
   edge, the smallest pack pin that loads).
2. Add an INDEX entry above explaining the edge in one line.
3. Add a paired golden fixture under
   `tests/__fixtures__/golden/<edge>.golden-fixture.json` so the
   golden-state suite locks the expected hash.
