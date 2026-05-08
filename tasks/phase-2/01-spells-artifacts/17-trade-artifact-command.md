# Trade Artifact Command

Module: [Spells, Artifacts & Hero Skills (M3)](../01-spells-artifacts.md)

Description:
Implement artifact marketplace trade as a deterministic command. The
command validates offered artifacts, selected quote, market availability,
locked equipment, backpack capacity, and resource outcomes before
moving or removing artifacts.

Read First:
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- `docs/architecture/wiki/screens/36-marketplace-artifact-trading/interactions.md`

Inputs:
- Artifact paper-doll and backpack rules from Task 5
- Artifact market pricing and offer state from Task 10
- `TRADE_ARTIFACT` payload from `command.schema.json`

Outputs:
- `src/engine/commands/trade-artifact.ts`
- `TRADE_ARTIFACT` reducer and semantic validator
- Tests for locked equipped artifact, unaffordable quote, missing offer,
  and deterministic resource deltas

Owned Paths:
- `src/engine/commands/trade-artifact.ts`

Dependencies:
- phase-2.01-spells-artifacts.05-artifact-paper-doll-system
- phase-2.01-spells-artifacts.10-buy-artifact-command
- mvp.01-engine-core.06-command-dispatcher

Acceptance Criteria:
- `TRADE_ARTIFACT` validates hero ownership, artifact ownership,
  marketplace availability, quote ID, and destination capacity
- Locked or equipped artifacts cannot be traded unless the quote rules
  explicitly allow unequip-through-trade
- Resource deltas are integer-only and applied atomically with artifact
  movement
- Market offer state updates deterministically for the same content
  hashes and command log
- Screen 36 dispatches the command through the shared command hook

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
