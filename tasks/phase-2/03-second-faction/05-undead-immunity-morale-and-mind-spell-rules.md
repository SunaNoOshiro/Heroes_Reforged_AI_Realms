# Undead Immunity — Morale and Mind-Spell Rules

Module: [Second Faction — Necropolis (M3)](../03-second-faction.md)

Description:
Undead units have special rules: they are immune to morale rolls (neither positive nor negative) and immune to mind-affecting spells (Blind, Berserk, Hypnotize).

Read First:
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)
- [`docs/architecture/spells-and-mage-guild.md`](../../../docs/architecture/spells-and-mage-guild.md)

Inputs:
- `09-tactical-combat.md` Tasks 6–7
- `01-spells-artifacts.md` Task 2

Outputs:
- Update `morale-luck.ts` (`09-tactical-combat.md` Task 6): undead units return "neutral" always
- Update `spell-targets.ts`: a spell whose `tags` array contains
  `"mind"` cannot target a unit with the `undead` ability. The `mind`
  tag is the canonical marker — the rule is data-driven, not a
  hard-coded ID list.
- `SPELL_CAST` validation rejects mind spells on undead targets with clear error message

Owned Paths:
- `morale-luck.ts`
- `09-tactical-combat.md`
- `spell-targets.ts`

Dependencies:
- mvp.09-tactical-combat.06-morale-and-luck-rolls

Acceptance Criteria:
- A spell with `tags` ⊇ `["mind"]` cast on an `undead` unit returns
  `ValidationError: "Undead units are immune to mind spells"` (e.g.
  Blind, Forgetfulness, Hypnotize, Berserk in the baseline roster)
- Undead units in a mixed army do not reduce morale of other units
- Undead units themselves always have 0 morale (no lucky strikes, no fumbles)
- The `mind` tag is data-driven; adding a new mind-tagged spell
  through pack content auto-extends the rule without engine edits

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
