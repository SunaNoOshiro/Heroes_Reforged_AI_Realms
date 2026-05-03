# Transfer Stack Commands

Status: planned

Module: [Adventure Map (M1)](../05-adventure-map.md)

Description:
Implement deterministic army stack transfer reducers for the town,
garrison, and hero-meeting surfaces. Transfers must handle moves,
partial moves, legal merges, swaps, and rejection without relying on
screen-local drag state.

Read First:
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- `docs/architecture/wiki/screens/22-garrison-structure/interactions.md`
- `docs/architecture/wiki/screens/24-town-screen/interactions.md`
- `docs/architecture/wiki/screens/49-hero-meeting/interactions.md`

Inputs:
- `AdventureState` hero, town, and garrison army containers from Task 1
- `TRANSFER_GARRISON_STACK`, `TRANSFER_TOWN_ARMY_STACK`, and
  `TRANSFER_HERO_ARMY_STACK` payloads from `command.schema.json`
- Hero adjacency and town-visiting context from movement and town-visit tasks

Outputs:
- `src/engine/commands/transfer-stack-commands.ts`
- `TRANSFER_GARRISON_STACK` reducer and validator
- `TRANSFER_TOWN_ARMY_STACK` reducer and validator
- `TRANSFER_HERO_ARMY_STACK` reducer and validator
- `SWAP_TOWN_HEROES` reducer and validator
  (`{ townId }` → swaps `town.garrisonHeroId` and `town.visitingHeroId`;
  see [`mvp.05-adventure-map.01-strategic-game-state-model`](01-strategic-game-state-model.md);
  token cost = 0; deterministic; rejected during active siege per
  [`docs/architecture/edge-case-policy.md`](../../../docs/architecture/edge-case-policy.md))
- Shared pure helper for move, merge, split-transfer, and swap outcomes

Owned Paths:
- `src/engine/commands/transfer-stack-commands.ts`

Dependencies:
- mvp.05-adventure-map.01-strategic-game-state-model
- mvp.05-adventure-map.03-hero-movement
- mvp.05-adventure-map.05-town-visit-recruit-build-mage-guild
- mvp.01-engine-core.06-command-dispatcher

Acceptance Criteria:
- `TRANSFER_GARRISON_STACK` moves stacks within a town garrison and
  rejects illegal source/target slots atomically
- `TRANSFER_TOWN_ARMY_STACK` moves stacks between a visiting hero and
  town garrison only when the hero is at that town
- `TRANSFER_HERO_ARMY_STACK` moves stacks between adjacent heroes and
  fails if either hero is missing, enemy-owned, or not adjacent
- Merge and swap outcomes preserve stable stack IDs deterministically
  and never leave an army with zero-count stacks
- `SWAP_TOWN_HEROES` requires both `garrisonHeroId` and
  `visitingHeroId` to be set; rejects during active siege; reversible
  (swap → swap-back is byte-equal); replay-deterministic
- Screens 22, 24, and 49 dispatch live commands once this task is done

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
