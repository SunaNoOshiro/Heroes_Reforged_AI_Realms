# Hire Tavern Hero Command

Module: [Adventure Map (M1)](../05-adventure-map.md)

Description:
Implement tavern hero hiring. The tavern pool is generated
deterministically from content, seed, town state, and day number; hiring
deducts gold and adds the hero to the player's roster.

Read First:
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- `docs/architecture/wiki/screens/28-tavern/interactions.md`

Inputs:
- Tavern offer schema from `mvp.02-content-schemas.19-tavern-and-marketplace-tables`
- Hero schema and strategic player state
- Town visit state from Task 5

Outputs:
- `src/engine/commands/tavern-commands.ts`
- `HIRE_TAVERN_HERO` reducer and validator
- Deterministic tavern pool helper

Owned Paths:
- `src/engine/commands/tavern-commands.ts`

Dependencies:
- mvp.05-adventure-map.01-strategic-game-state-model
- mvp.05-adventure-map.05-town-visit-recruit-build-mage-guild
- mvp.02-content-schemas.19-tavern-and-marketplace-tables

Acceptance Criteria:
- Hiring deducts the exact gold cost from the active player
- The hired hero appears at the tavern town with stable hero ID and
  starting army from content
- A hero cannot be hired twice from the same offer
- Same seed and same history produce the same tavern offer sequence

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
