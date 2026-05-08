# 7-Day Playable Smoke Test

Module: [Adventure Map (M1)](../05-adventure-map.md)

Description:
Integration test that runs a scripted 7-day game session: player moves
heroes, captures mines, builds in towns, and triggers
`AUTO_RESOLVE_BATTLE` through the command dispatcher. Verifies that all
subsystems work together correctly end-to-end.

The scripted opponent is wired through `scriptedBot(commands)` (provider
id `"scripted"`) from the `BotProvider` interface owned by
[`tasks/mvp/10-heuristic-ai/10-bot-provider-interface.md`](../10-heuristic-ai/10-bot-provider-interface.md),
not as ad-hoc fixture code. This keeps the swap point uniform across
M2 / M3 / M7 regression suites.

Read First:
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)
- [`docs/architecture/ai-contract.md`](../../../docs/architecture/ai-contract.md) § 8 BotProvider

Inputs:
- All tasks in this module
- All of `03-map-system.md`, `04-faction-emberwild.md`

Outputs:
- `src/engine/__tests__/adventure-smoke.test.ts`
- Script: Day 1 → move hero → capture mine; Day 3 → visit town →
  build building; Day 5 → trigger battle and dispatch
  `AUTO_RESOLVE_BATTLE`; Day 7 → week growth fires
- Driven by `scriptedBot(commands)` (`BotProvider` id
  `"scripted"`) instead of ad-hoc fixture code

Owned Paths:
- `src/engine/__tests__/adventure-smoke.test.ts`

Dependencies:
- mvp.05-adventure-map.01-strategic-game-state-model
- mvp.05-adventure-map.02-turn-structure
- mvp.05-adventure-map.03-hero-movement
- mvp.05-adventure-map.04-resource-mine-capture-plus-daily-income
- mvp.05-adventure-map.05-town-visit-recruit-build-mage-guild
- mvp.05-adventure-map.06-auto-resolve-combat
- mvp.05-adventure-map.07-victory-defeat-conditions
- mvp.05-adventure-map.21-map-object-visit-and-battle-initiation-commands
- mvp.10-heuristic-ai.10-bot-provider-interface

Acceptance Criteria:
- 7-day scripted session runs without throwing
- Day 5 combat is resolved by dispatching `AUTO_RESOLVE_BATTLE`, not by
  calling the auto-resolve evaluator directly
- State hash at end of day 7 is identical across 3 runs with same seed
- Weekly growth fires exactly on day 7
- All resource updates are correct

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours (scripted, not exploratory — all paths predetermined)
