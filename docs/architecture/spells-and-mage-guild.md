# Spells, Mastery, and the Mage Guild

A single place to read the spell design end-to-end: how spells are
shaped, how mastery scales them, how towns offer them, and how
factions restrict them. Points at the authoritative schemas and
tasks — this file has no numbers of its own.

## 1. Spell shape

A spell is one record conforming to
[`spell.schema.json`](../../content-schema/schemas/spell.schema.json).
Key fields:

- `school` — closed enum (`fire`, `water`, `earth`, `air`, `light`,
  `dark`, `arcane`, `nature`).
- `level` — integer 1–5. Maps directly to the mage-guild level that
  offers the spell.
- `scope` — `combat`, `adventure`, or `both`.
- `manaCost` — integer, deterministic.
- `targeting` — reference to a closed targeting shape.
- `masteryTiers.{basic,advanced,expert}` — required object; each
  tier carries its own `effects: Effect[]`. Mastery is not a
  multiplier; it is a replacement effect list per tier.

## 2. Mastery progression

The hero's mastery of a school is provided by hero secondary skills
(the Wisdom / school-skill family in
[`shared-skills/`](../../content-schema/examples/packs/shared-skills/)).
When the hero casts a spell, the engine reads the hero's mastery in
that spell's `school` and evaluates the matching tier:

- no mastery → `basic` tier effects
- advanced mastery → `advanced` tier effects
- expert mastery → `expert` tier effects

The tiers are separate effect lists (not scalar multipliers) so
authors can change shape, not just magnitude, at higher mastery.
Example: a `basic` fireball may deal damage only, while `expert`
also applies a short burn status.

The spell schema requires all three tiers, so every spell is
playable at every mastery level. Effect tiers never silently fall
back — if a tier list is empty, validation fails.

## 3. Mage guild offerings

Each town's mage guild (levels 1–5) offers a deterministic-but-random
selection of spells drawn from the registered spell pool. Selection
is driven by
[`tasks/phase-2/01-spells-artifacts/04b-mage-guild-content-level-15-random-selection.md`](../../tasks/phase-2/01-spells-artifacts/04b-mage-guild-content-level-15-random-selection.md):

- Guild level N offers M spells of level N (M grows with level — see
  task).
- Selection is seeded per-town at map generation; same seed → same
  spells on every replay.
- Higher guild levels add spells; they do not replace lower-level
  offerings.

The RNG substream used is `rng("mage-guild", townId)` to keep spell
draws independent of combat rolls.

## 4. Faction restrictions

Factions may narrow the spell pool for their own towns. The task
above reserves `excludeSchools: string[]` and per-school allow/deny
lists at the faction-pack level. These fields are not yet in
[`faction.schema.json`](../../content-schema/schemas/faction.schema.json)
— they land when the Phase 2 spell task is implemented, with a
schema-version bump.

Until then, the schema-absent default is "no restrictions" — the
whole registered pool is eligible.

## 5. Hero specialty interaction

Hero specialty (see
[`hero.schema.json`](../../content-schema/schemas/hero.schema.json))
can buff a specific spell via the `spell_bonus` variant of the
discriminated specialty union:

- `kind: "spell_bonus"`, `targetSpellId`, `bonus.kind ∈ {damage,
  duration, range}`, `bonus.value: integer`.

The runtime reads specialty after mastery-tier selection and applies
the bonus to the tier's effect vector, so mastery and specialty
compose without double-dipping.

## 6. Learning a spell

`LEARN_SPELL` command
(see
[`tasks/mvp/05-adventure-map/05-town-visit-recruit-build-mage-guild.md`](../../tasks/mvp/05-adventure-map/05-town-visit-recruit-build-mage-guild.md)):
`{ heroId, townId, spellId }`. Validated by:

- Spell must be in the town's current offering.
- Hero must meet `knowledge` threshold for the spell's level.

The command is deterministic; no randomness at the learn step.

## 6a. Mana pool

A hero's maximum mana is a deterministic function of `knowledge`
(post stat-composition-order), the ruleset constant
`magic.manaPerKnowledge`, and the sum of any Mysticism /
mana-bonus contributions emitted by skill appliers:

```
maxMana(hero) =
    hero.knowledge × ruleset.magic.manaPerKnowledge
  + Σ (mysticism / mana-cap bonuses from 07d skill appliers)
```

The `hero.knowledge` value passed in is the **final** value from the
canonical stat composition pipeline
([`stat-composition-order.md`](stat-composition-order.md)) — i.e.
after all sources are summed and clamped. Mana never reads the raw
hero record.

Daily regeneration:

```
manaRegenPerDay(hero) =
    ruleset.magic.mysticismRegenBase
  + skill.mysticism.level × ruleset.magic.mysticismRegenPerLevel
```

`skill.mysticism.level` is `0` if the skill is unlearned. All
arithmetic is integer; the regen value is added at `DAY_END` and
capped at `maxMana(hero)`.

## 6b. Spell damage scaling

For any `effect.kind = "damage"` carried by a spell, the dealt damage
is:

```
spellDamage =
    baseAmountAt(masteryTier)
  + hero.power × ruleset.magic.spellPowerDamageMultiplier
```

`baseAmountAt(masteryTier)` is the AST-evaluated `amount` for the tier
selected per §2 above. `hero.power` is again the post-pipeline value.
`spellPowerDamageMultiplier` is integer; if a pack wants fractional
scaling it should split the spell's `amount` AST instead of changing
this constant.

The formula is applied **after** mastery-tier selection, **before**
spell-specific damageType resistance / immunity lookups. Specialty
`spell_bonus.kind = "damage"` value is added to `baseAmountAt` so it
benefits from the power scaling.

Fixture test (referenced from
[`tasks/phase-2/01-spells-artifacts/02-combat-spells.md`](../../tasks/phase-2/01-spells-artifacts/02-combat-spells.md)):
hero `{power: 10, knowledge: 8}` casting `magic_arrow` at basic
mastery yields a fixed damage value reproducible by both engines.

## 7. What's not in MVP

- Spell creation / custom spell editor — phase 2.
- Cross-school interaction (meta-magic) — not designed; explicitly
  out of scope until a ruleset pack adds capabilities.
- Faction-defined schools — not in scope; schools are the closed
  enum in the spell schema. Adding a new school requires a library
  pack and a schema-version bump.

## Source of truth map

| Concern | Authoritative source |
|---|---|
| Spell shape | [`spell.schema.json`](../../content-schema/schemas/spell.schema.json) |
| Mastery effect lists | `spell.masteryTiers` |
| Mastery unlock order | [`shared-skills/`](../../content-schema/examples/packs/shared-skills/) |
| Mage-guild offering algorithm | [`tasks/.../04b-mage-guild-content-level-15-random-selection.md`](../../tasks/phase-2/01-spells-artifacts/04b-mage-guild-content-level-15-random-selection.md) |
| Learn command | [`tasks/.../05-town-visit-recruit-build-mage-guild.md`](../../tasks/mvp/05-adventure-map/05-town-visit-recruit-build-mage-guild.md) |
| Hero specialty bonus | [`hero.schema.json`](../../content-schema/schemas/hero.schema.json) |
