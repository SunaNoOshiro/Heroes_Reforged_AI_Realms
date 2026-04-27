# Trade Resources Command

Status: planned

Module: [Adventure Map (M1)](../05-adventure-map.md)

Description:
Implement marketplace exchange as a deterministic command. Rates come
from marketplace-rate content, owned marketplace count, and ruleset
modifiers; command handlers never hard-code exchange tables.

Read First:
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- `docs/architecture/wiki/screens/26-marketplace/interactions.md`

Inputs:
- Marketplace rate tables from `mvp.02-content-schemas.19-tavern-and-marketplace-tables`
- Strategic resource state from Task 1
- Town ownership and marketplace building state from Task 5

Outputs:
- `src/engine/commands/marketplace-commands.ts`
- `TRADE_RESOURCES` reducer and semantic validator
- Regression tests for rate modifiers and insufficient resources

Owned Paths:
- `src/engine/commands/marketplace-commands.ts`

Dependencies:
- mvp.05-adventure-map.01-strategic-game-state-model
- mvp.05-adventure-map.05-town-visit-recruit-build-mage-guild
- mvp.02-content-schemas.19-tavern-and-marketplace-tables

Acceptance Criteria:
- `TRADE_RESOURCES` deducts and grants integer resource quantities from
  the active player only
- Rate lookup uses content tables and owned-marketplace modifiers
- Invalid resource IDs, negative amounts, and unaffordable trades return
  `ValidationError` without mutating state
- Screen 26 can dispatch the command through the normal UI hook

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
