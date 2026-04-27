# Split Army Stack Command

Status: planned

Module: [Adventure Map (M1)](../05-adventure-map.md)

Description:
Implement stack splitting as a deterministic command for hero and town
armies. The reducer moves a positive quantity from one source slot into
an empty or compatible destination slot without letting UI drag state
mutate gameplay records directly.

Read First:
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- `docs/architecture/wiki/screens/51-split-stack-dialog/interactions.md`

Inputs:
- `AdventureState` army containers from Task 1
- Command payload from `content-schema/schemas/command.schema.json`
- Army slot capacity and same-creature merge rules from the baseline ruleset

Outputs:
- `src/engine/commands/split-army-stack.ts`
- `SPLIT_ARMY_STACK` reducer and semantic validator
- Tests for hero army, town garrison, empty target slot, and merge target cases

Owned Paths:
- `src/engine/commands/split-army-stack.ts`

Dependencies:
- mvp.05-adventure-map.01-strategic-game-state-model
- mvp.01-engine-core.06-command-dispatcher

Acceptance Criteria:
- `SPLIT_ARMY_STACK` validates army ownership, source slot existence,
  target slot bounds, and quantity `1..source.count - 1`
- Splitting into an empty slot creates a new stack with the same stable
  creature ID and deterministic stack ID
- Splitting into a compatible stack merges counts without exceeding
  declared stack limits
- Invalid splits return `ValidationError` without mutating source or
  target armies
- Screen 51 can dispatch the command through the shared command hook

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
