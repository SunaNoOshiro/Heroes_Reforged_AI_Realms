# Adventure Map Spell Effects

Status: planned

Module: [Spells, Artifacts & Hero Skills (M3)](../01-spells-artifacts.md)

Description:
Implement the 3 core adventure map spells that change strategic
mobility and town access as spell records plus runtime handlers executed
through the canonical `SPELL_CAST` command. Do not add spell-specific
command kinds.

| Spell | School | Effect |
|---|---|---|
| Town Portal | Earth | Teleport hero to any owned town (Basic: random, Expert: chosen) |
| Fly | Air | Hero ignores terrain movement costs for N days |
| Dimension Door | Air | Teleport hero to any explored tile (2 casts/day, Expert: 3) |

Read First:
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- [`docs/architecture/spells-and-mage-guild.md`](../../../docs/architecture/spells-and-mage-guild.md)
- [`content-schema/schemas/spell.schema.json`](../../../content-schema/schemas/spell.schema.json)
- [`content-schema/schemas/command.schema.json`](../../../content-schema/schemas/command.schema.json)

Inputs:
- `AdventureState`
- Spell records from the active content registry
- `SPELL_CAST` command payload from
  `content-schema/schemas/command.schema.json`

Outputs:
- `src/engine/spells/adventure-spells.ts`
- `applyAdventureSpellCast(state, command: SpellCastCommand)`
- Content examples for Town Portal, Fly, and Dimension Door using stable
  spell IDs
- Any required effect-registry expansion must happen through a dedicated
  prerequisite task before this runtime handler consumes it

Owned Paths:
- `src/engine/spells/adventure-spells.ts`
- `content-schema/examples/records/spells/`

Dependencies:
- phase-2.01-spells-artifacts.01b-spell-school-loader-plus-mastery-scaling
- mvp.05-adventure-map.01-strategic-game-state-model
- mvp.01-engine-core.06-command-dispatcher

Acceptance Criteria:
- No spell-specific command kind is introduced
- `SPELL_CAST` validates hero, spell ID, mana cost, scope, visibility,
  and target
- Town Portal moves hero to chosen (or random) owned town in same day
- Fly status effect persists for correct number of days and removes on expiry
- Dimension Door cannot teleport to hidden (fogged) tile
- Replays of identical spell-cast command logs are byte-identical

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
