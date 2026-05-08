# Replay Smoke Test — 20-Round Battle

Module: [Tactical Combat (M2)](../09-tactical-combat.md)

Description:
Scripted integration test that replays a full 20-round battle between
two Emberwild armies, verifying that state hashes are identical across
three independent replays with the same seed.

The scripted commands are driven through `scriptedBot(commands)`
(`BotProvider` id `"scripted"`) from
[`tasks/mvp/10-heuristic-ai/10-bot-provider-interface.md`](../10-heuristic-ai/10-bot-provider-interface.md),
not ad-hoc fixture code.

Read First:
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)
- [`docs/architecture/ai-contract.md`](../../../docs/architecture/ai-contract.md) § 8 BotProvider

Inputs:
- All tasks in this module

Outputs:
- `src/engine/__tests__/battle-smoke.test.ts`
- Script: Phoenix Vanguard vs Phoenix Vanguard (Emberwild T7), 5 per side, 20 rounds of scripted commands
- Compares hash at round 5, 10, 15, 20
- Driven by `scriptedBot(commands)` (`BotProvider` id `"scripted"`)
  for both sides

Owned Paths:
- `src/engine/__tests__/battle-smoke.test.ts`

Dependencies:
- mvp.09-tactical-combat.01-battlestate-init-army-placement-plus-speed-order
- mvp.09-tactical-combat.02-initiative-queue-speed-order-wait-defend-morale
- mvp.09-tactical-combat.03-damage-formula
- mvp.09-tactical-combat.04-ranged-attack-obstacle-check-range-limit
- mvp.09-tactical-combat.05-retaliation-once-per-round-nullification
- mvp.09-tactical-combat.06-morale-and-luck-rolls
- mvp.09-tactical-combat.07-unit-abilities-flying-double-strike-breath-no-retaliation
- mvp.09-tactical-combat.08-battle-end-condition
- mvp.09-tactical-combat.09-replace-auto-resolve-with-real-battle
- mvp.10-heuristic-ai.10-bot-provider-interface

Acceptance Criteria:
- 3 replays of same battle produce identical hashes at all checkpoints
- Test completes in < 5 seconds
- If a hash mismatch occurs, test output names the round and dumps both states

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
