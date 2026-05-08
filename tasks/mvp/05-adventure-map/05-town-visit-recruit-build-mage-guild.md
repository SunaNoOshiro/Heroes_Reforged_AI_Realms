# Town Visit (Recruit, Build, Mage Guild)

Module: [Adventure Map (M1)](../05-adventure-map.md)

Description:
When a hero enters a friendly town, they can recruit units, construct buildings, and learn spells. These actions consume resources and must be validated.

Read First:
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Inputs:
- `AdventureState` (Task 1)
- Emberwild content pack (`04-faction-emberwild.md`)

Outputs:
- `src/engine/commands/town-commands.ts`
- Commands to implement:
  - `RECRUIT_UNITS`: `{ heroId, townId, dwellingUnitId, quantity }` — validates population, costs
  - `BUILD_BUILDING`: `{ townId, buildingId }` — validates requirements, costs, one-per-day rule
  - `LEARN_SPELL`: `{ heroId, townId, spellId }` — validates mage guild level and hero wisdom
- Town visit triggers `TOWN_VISITED` event (hero gains morale bonus if re-visiting own town)

Owned Paths:
- `src/engine/commands/town-commands.ts`

Dependencies:
- mvp.05-adventure-map.01-strategic-game-state-model
- mvp.05-adventure-map.02-turn-structure
- mvp.04-faction-emberwild.02-emberwild-town-building-tree

Acceptance Criteria:
- Recruiting 5 T7 units costs the integer gold + resources from the
  pack data (no hard-coded numbers in the command handler)
- Building a tier-2 dwelling when its prerequisite is unmet returns
  `ValidationError` with the missing requirement ID
- Only one building can be constructed per town per day
- Recruited units are added to hero army (or town garrison if hero is
  full)

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
