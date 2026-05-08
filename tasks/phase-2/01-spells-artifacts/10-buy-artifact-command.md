# Buy Artifact Command

Module: [Spells, Artifacts & Hero Skills (M3)](../01-spells-artifacts.md)

Description:
Implement artifact merchant and black-market purchase/sell commands.
Offers come from content and deterministic market state; purchases
deduct resources and add artifacts to hero inventory.

Read First:
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- `docs/architecture/wiki/screens/32-artifact-merchant-black-market/interactions.md`

Inputs:
- Artifact schema and paper-doll inventory state
- Marketplace/merchant content tables
- Strategic resource state

Outputs:
- `src/engine/commands/artifact-market-commands.ts`
- `BUY_ARTIFACT` and `SELL_ARTIFACT` reducers

Owned Paths:
- `src/engine/commands/artifact-market-commands.ts`

Dependencies:
- phase-2.01-spells-artifacts.05-artifact-paper-doll-system
- mvp.05-adventure-map.01-strategic-game-state-model

Acceptance Criteria:
- Purchase validates offer availability, hero ownership, inventory
  capacity, and resource cost
- Selling an artifact removes it from inventory and grants the quoted
  resources
- Market offers are deterministic for the same seed and content hashes
- Screen 32 enables purchase buttons only after validator approval

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
