# Map Trigger Engine

Module: [Meta Systems (M3)](../08-meta-systems.md)

Description:
Implement the deterministic runtime evaluator for `MapTrigger`
records authored against
[`content-schema/schemas/map-trigger.schema.json`](../../../content-schema/schemas/map-trigger.schema.json).
Triggers fire at command-loop boundaries; the evaluator uses the
seeded RNG substream `rng("map-triggers", scenarioId)`.

Read First:
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`content-schema/schemas/map-trigger.schema.json`](../../../content-schema/schemas/map-trigger.schema.json)

Inputs:
- `AdventureState`
- `Scenario.triggers[]` from
  [`content-schema/schemas/scenario.schema.json`](../../../content-schema/schemas/scenario.schema.json)
- Seeded RNG substream
- Effect-handler registry

Outputs:
- `src/engine/map-triggers.ts`
- `evaluateMapTriggers(state, scenario, ctx) → TriggerFireRecord[]`
- Trigger fires emit existing effect kinds — `spawn_army`, `set_flag`,
  `award_resources`, `resource_bonus`, etc. — through the standard
  effect-handler registry.

Owned Paths:
- `src/engine/map-triggers.ts`

Dependencies:
- mvp.05-adventure-map.01-strategic-game-state-model
- mvp.05-adventure-map.02-turn-structure
- mvp.01-engine-core.06-command-dispatcher

Acceptance Criteria:
- Triggers fire deterministically at command-loop boundaries; no
  trigger fires inside the middle of a reducer
- `once: true` triggers fire exactly once per scenario
- `repeatEveryDays: N` triggers fire every Nth day after first match,
  bounded by `once == false`
- Each `when.kind` is supported: `on_day`, `on_week_index`,
  `on_tile_visit`, `on_army_defeat`, `on_resource_threshold`,
  `on_flag_set`, `on_object_owned`
- The same scenario + same command log produces byte-equal trigger
  fire records across two engines
- `set_flag` records persist on the scenario flag bag and are
  consulted by `on_flag_set` triggers in subsequent ticks

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
