# Quest Log Engine

Module: [Campaign, Quest, And Status Meta Systems (P2)](../08-meta-systems.md)

Description:
Implement quest state, objective progress, completion checks, and reward
granting. Quest logic is driven by quest records and condition/effect
registries rather than screen-specific code.

Read First:
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)
- `docs/architecture/wiki/screens/11-quest-log/interactions.md`

Inputs:
- `content-schema/schemas/quest.schema.json`
- Strategic game events and effect registry
- Status history store from Task 5

Outputs:
- `src/engine/quests/quest-state.ts`
- `src/engine/quests/quest-reducer.ts`
- Quest selectors for UI screens

Owned Paths:
- `src/engine/quests/quest-state.ts`
- `src/engine/quests/quest-reducer.ts`

Dependencies:
- mvp.02-content-schemas.16-quest-schema
- mvp.05-adventure-map.09-map-object-dialogs

Acceptance Criteria:
- Objective progress updates from deterministic game events
- Completion checks are pure and replay-stable
- Rewards apply through the effect registry and cannot be claimed twice
- Screen 11 reads quest selectors and does not compute hidden quest
  state locally

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
