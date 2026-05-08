# Collect Creature Bank Reward Command

Module: [Adventure Map (M1)](../05-adventure-map.md)

Description:
Implement reward collection for creature-bank objects after their guard
battle is resolved. Rewards are generated from content tables and RNG
sub-streams, acknowledged once, and stored as deterministic state.

Read First:
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- `docs/architecture/wiki/screens/12-creature-bank-loot/interactions.md`

Inputs:
- Map object state from Task 9
- Auto-resolve or tactical battle results
- Effect registry reward payloads

Outputs:
- `src/engine/commands/creature-bank-commands.ts`
- `COLLECT_CREATURE_BANK_REWARD` reducer and validator

Owned Paths:
- `src/engine/commands/creature-bank-commands.ts`

Dependencies:
- mvp.05-adventure-map.06-auto-resolve-combat
- mvp.05-adventure-map.09-map-object-dialogs
- mvp.02-content-schemas.13-effect-registry

Acceptance Criteria:
- Reward collection is available only after the bank is cleared
- Reward effects apply through the effect registry
- Collection is idempotent; a second collection attempt fails loudly
- Loot generation consumes a named RNG sub-stream and is replay-stable

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
