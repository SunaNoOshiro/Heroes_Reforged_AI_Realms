# Scenario Loader

Status: planned

Module: [Persistence (M1)](../08-persistence.md)

Description:
Scenarios are pre-built map + starting state JSON files (authored
overland-strategy maps: starting towns, neutral stacks, objective
conditions). They're loaded as read-only seeds — the player starts
fresh from the scenario each time. See
[`scenario.schema.json`](../../../content-schema/schemas/scenario.schema.json)
for the canonical shape.

Read First:
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)
- [`content-schema/schemas/scenario.schema.json`](../../../content-schema/schemas/scenario.schema.json)

Inputs:
- IndexedDB `scenarios` store (Task 1)
- `AdventureState` type

Outputs:
- `src/persistence/scenario-loader.ts`
- `ScenarioRecord`: `{ id, name, description, seed, map, startingState, victoryConditions }`
- `loadScenario(id): Promise<AdventureState>` — builds initial state from scenario, generates fresh seed
- `SCENARIO_LOAD` command binding that validates a scenario ID and
  installs the resulting initial `AdventureState`
- `listScenarios(): Promise<ScenarioRecord[]>`
- One built-in scenario: "Two Towers" (1v1 Emberwild vs Emberwild, 32×32 map)

Owned Paths:
- `src/persistence/scenario-loader.ts`

Dependencies:
- mvp.08-persistence.01-indexeddb-wrapper
- mvp.05-adventure-map.01-strategic-game-state-model

Acceptance Criteria:
- `loadScenario("two_towers")` returns a valid `AdventureState` ready to play
- Dispatching `SCENARIO_LOAD` with an unknown scenario ID returns
  `ValidationError` and leaves the current state untouched
- Loading the same scenario twice always starts from the same initial map state
- Scenario seed is separate from save seed (playing same scenario can have different games)

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
