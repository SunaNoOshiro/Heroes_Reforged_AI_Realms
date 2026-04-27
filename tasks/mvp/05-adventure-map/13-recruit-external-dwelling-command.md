# Recruit External Dwelling Command

Status: planned

Module: [Adventure Map (M1)](../05-adventure-map.md)

Description:
Implement recruitment from neutral or owned external dwellings on the
adventure map. Growth, available quantity, costs, and ownership rules
come from content and weekly turn state.

Read First:
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- `docs/architecture/wiki/screens/21-external-dwelling/interactions.md`

Inputs:
- Strategic game state and weekly growth from Tasks 1 and 2
- Map object state from Task 9
- Unit and building content registries

Outputs:
- `src/engine/commands/external-dwelling-commands.ts`
- `RECRUIT_EXTERNAL_DWELLING_UNITS` reducer and validator

Owned Paths:
- `src/engine/commands/external-dwelling-commands.ts`

Dependencies:
- mvp.05-adventure-map.01-strategic-game-state-model
- mvp.05-adventure-map.02-turn-structure
- mvp.05-adventure-map.09-map-object-dialogs

Acceptance Criteria:
- Available unit count uses deterministic weekly growth
- Recruitment deducts resources and adds units to the visiting hero or
  valid garrison destination
- Invalid quantity, unaffordable cost, or unreachable dwelling returns
  `ValidationError`
- Screen 21 can enable controls only after validator approval

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
