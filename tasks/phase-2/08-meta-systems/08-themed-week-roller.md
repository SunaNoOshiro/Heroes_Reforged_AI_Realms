# Themed-Week Roller

Status: planned

Module: [Meta Systems (M3)](../08-meta-systems.md)

Description:
Pick one themed-week record at every `WEEK_START` event using a
weighted random draw seeded by
`rng("themed-week", scenarioId, weekIndex)`. Apply the chosen
record's effects, expose its localized description to the
`58-week-month-popup` screen, and decay the effects at the next
`WEEK_START`.

Read First:
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`content-schema/schemas/themed-week.schema.json`](../../../content-schema/schemas/themed-week.schema.json)
- `docs/architecture/wiki/screens/58-week-month-popup/interactions.md`

Inputs:
- Themed-week records loaded from active packs
- `WEEK_START` boundary in
  [`mvp.05-adventure-map.02-turn-structure`](../../mvp/05-adventure-map/02-turn-structure.md)
- Scenario id + week index
- Seeded RNG substream

Outputs:
- `src/engine/themed-week-roller.ts`
- `rollThemedWeek(packs, scenarioId, weekIndex, rng) → ThemedWeek`
- WEEK_START reducer extension that captures the rolled themed-week
  id on the active scenario state and applies its effects
- Acknowledgement payload extension: the
  `15-acknowledge-week-month-event-command` payload carries the rolled
  themed-week id

Owned Paths:
- `src/engine/themed-week-roller.ts`
- `content-schema/examples/records/themed-weeks/`

Dependencies:
- mvp.05-adventure-map.02-turn-structure
- mvp.05-adventure-map.15-acknowledge-week-month-event-command

Acceptance Criteria:
- Same `(packs, scenarioId, weekIndex, seed)` → same themed-week id
- Effects fire deterministically at WEEK_START via the standard
  effect handler registry (`growth_modifier`, `resource_bonus`,
  `set_flag`, `award_resources`)
- Decayed effects do not leak past the next WEEK_START
- ≥6 baseline themed-week records ship in
  `content-schema/examples/records/themed-weeks/`
- Replay determinism: 3 runs of the same scenario over 12 weeks
  produce identical themed-week sequences

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
