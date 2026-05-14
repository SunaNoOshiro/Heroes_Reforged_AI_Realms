# Spells, Mastery, and the Mage Guild

End-to-end spell design: shape, mastery scaling, town offerings,
faction restrictions, mana economy, and damage scaling. Points at
authoritative schemas and tasks — this file owns no scalar values
of its own.

Companion docs:
[`command-schema.md`](./command-schema.md) (`LEARN_SPELL`,
`SPELL_CAST`),
[`stat-composition-order.md`](./stat-composition-order.md) (final
hero stat values),
[`effect-registry.md`](./effect-registry.md) (effect kinds),
[`rng-streams.md`](./rng-streams.md) (`mage-guild` sub-stream),
[`schema-matrix.md`](./schema-matrix.md) (`Spell` row).

## 1. Spell shape

A spell is one record conforming to
[`spell.schema.json`](../../content-schema/schemas/spell.schema.json):

- `school` — closed enum: `fire`, `water`, `earth`, `air`, `light`,
  `dark`, `arcane`, `nature`.
- `level` — integer 1–5; maps directly to the mage-guild level that
  offers the spell.
- `scope` — `combat`, `adventure`, or `both`.
- `manaCost` — non-negative integer.
- `targeting` — `$ref` to `targeting.schema.json`.
- `masteryTiers.{basic,advanced,expert}` — required object; each
  tier carries its own `effects: Effect[]` (`minItems: 1`). Mastery
  is a **replacement effect list**, not a multiplier — authors can
  change shape, not just magnitude, at higher mastery.

## 2. Mastery progression

The hero's mastery in a school is provided by hero secondary skills
(the Wisdom / school-skill family in
[`shared-skills/`](../../content-schema/examples/packs/shared-skills/)).
On cast, the engine reads the hero's mastery for the spell's
`school` and selects the matching tier:

- no mastery → `basic`
- advanced mastery → `advanced`
- expert mastery → `expert`

Because the schema requires all three tiers (each with at least one
effect), every spell is playable at every mastery level. Empty tier
lists fail validation; tiers never silently fall back.

Example: a `basic` fireball deals damage only, while `expert` also
applies a short burn status.

## 3. Mage guild offerings

Each town's mage guild (levels 1–5) offers a deterministic-but-random
selection of spells from the registered pool. Owned by
[`tasks/phase-2/01-spells-artifacts/04b-mage-guild-content-level-15-random-selection.md`](../../tasks/phase-2/01-spells-artifacts/04b-mage-guild-content-level-15-random-selection.md):

- Guild level N offers M spells of level N (M grows with level — see
  task acceptance criteria).
- Selection is seeded per-town at map generation; same seed → same
  spells on every replay.
- Higher guild levels add spells; they never replace lower-level
  offerings.

The named sub-stream `mage-guild` (see
[`rng-streams.md`](./rng-streams.md)) keeps spell draws independent
of combat rolls; the per-town fork is keyed by `townId`.

## 4. Faction restrictions

Factions may narrow the pool for their own towns. The 04b task
reserves `excludeSchools: string[]` and per-school allow/deny lists
at the faction-pack level. These fields are **not yet** in
[`faction.schema.json`](../../content-schema/schemas/faction.schema.json) —
they land when the Phase 2 task is implemented, with a
schema-version bump.

Until then, the schema-absent default is "no restrictions" — the
whole registered pool is eligible.

## 5. Hero specialty interaction

Hero specialty (see
[`hero.schema.json`](../../content-schema/schemas/hero.schema.json))
can buff a specific spell via the `spell_bonus` variant of the
discriminated specialty union:

- `kind: "spell_bonus"`
- `targetSpellId: string`
- `bonus.kind ∈ {damage, duration, range}`
- `bonus.value: integer`

The runtime reads specialty **after** mastery-tier selection and
applies the bonus to the tier's effect vector, so mastery and
specialty compose without double-dipping.

## 6. Learning a spell

`LEARN_SPELL` command (see
[`command-schema.md`](./command-schema.md#learn_spell); owned by
[`tasks/mvp/05-adventure-map/05-town-visit-recruit-build-mage-guild.md`](../../tasks/mvp/05-adventure-map/05-town-visit-recruit-build-mage-guild.md)):
`{ heroId, townId, spellId }`. Validation:

- Spell is in the town's current offering.
- Hero meets the `knowledge` threshold for the spell's level.

The command is deterministic; no randomness at the learn step.

## 7. Mana pool

Maximum mana is a deterministic function of the hero's `knowledge`,
the ruleset constant `magic.manaPerKnowledge`, and the sum of
Mysticism / mana-cap bonuses emitted by 07d skill appliers:

```
maxMana(hero) =
    hero.knowledge × ruleset.magic.manaPerKnowledge
  + Σ (mysticism / mana-cap bonuses from 07d skill appliers)
```

`hero.knowledge` is the **final** value from the canonical pipeline
in [`stat-composition-order.md`](./stat-composition-order.md) —
i.e. summed and clamped across all sources. Mana never reads the
raw hero record.

Daily regeneration:

```
manaRegenPerDay(hero) =
    ruleset.magic.mysticismRegenBase
  + skill.mysticism.level × ruleset.magic.mysticismRegenPerLevel
```

`skill.mysticism.level` is `0` if the skill is unlearned. All
arithmetic is integer; the regen value is added at `DAY_END` and
capped at `maxMana(hero)`.

## 8. Spell damage scaling

For any `effect.kind = "damage"` carried by a spell:

```
spellDamage =
    baseAmountAt(masteryTier)
  + hero.power × ruleset.magic.spellPowerDamageMultiplier
```

- `baseAmountAt(masteryTier)` is the AST-evaluated `amount` for the
  tier selected per § 2.
- `hero.power` is the post-pipeline value (see
  [`stat-composition-order.md`](./stat-composition-order.md)).
- `spellPowerDamageMultiplier` is integer; if a pack wants
  fractional scaling, split the spell's `amount` AST instead of
  changing this constant.

The formula applies **after** mastery-tier selection and **before**
the `damageType` resistance / immunity lookup. The specialty
`spell_bonus.kind = "damage"` value is added to `baseAmountAt` so
it benefits from power scaling.

Fixture test (referenced from
[`tasks/phase-2/01-spells-artifacts/02-combat-spells.md`](../../tasks/phase-2/01-spells-artifacts/02-combat-spells.md)):
hero `{power: 10, knowledge: 8}` casting `magic_arrow` at basic
mastery yields a fixed damage value reproducible by both engines.

## 9. Out of MVP scope

- **Spell creator / custom-spell editor** — Phase 2.
- **Cross-school interaction (meta-magic)** — not designed; out of
  scope until a ruleset pack adds capabilities.
- **Faction-defined schools** — out of scope; schools are the closed
  enum in the spell schema. A new school requires a library pack
  and a schema-version bump per
  [`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md).

## Source of truth map

| Concern | Authoritative source |
|---|---|
| Spell shape | [`spell.schema.json`](../../content-schema/schemas/spell.schema.json) |
| Mastery effect lists | `spell.masteryTiers` |
| Mastery unlock order | [`shared-skills/`](../../content-schema/examples/packs/shared-skills/) |
| Mage-guild offering algorithm | [`tasks/.../04b-mage-guild-content-level-15-random-selection.md`](../../tasks/phase-2/01-spells-artifacts/04b-mage-guild-content-level-15-random-selection.md) |
| Learn command | [`tasks/.../05-town-visit-recruit-build-mage-guild.md`](../../tasks/mvp/05-adventure-map/05-town-visit-recruit-build-mage-guild.md) |
| Hero specialty bonus | [`hero.schema.json`](../../content-schema/schemas/hero.schema.json) |

---

## 🔍 Sync Check

- **UI: ⚠** — `Spell` shape, `LEARN_SPELL` payload, and `mage-guild`
  selectors match
  [`wiki/screens/29-mage-guild/spec.md`](./wiki/screens/29-mage-guild/spec.md)
  and
  [`data-contracts.md`](./wiki/screens/29-mage-guild/data-contracts.md).
  However, screen 29 binds eligibility for higher spell levels to
  `hero.wisdom` (`state.heroes.byId[visiting].skills.wisdom`),
  while § 6 of this doc names `knowledge`. Detail in `## ⚠ Issues`.
- **Schema: ✔** — Every `spell.schema.json` field cited (`school`
  enum, `level` 1–5, `scope`, `manaCost`, `targeting`,
  `masteryTiers.{basic,advanced,expert}` with required
  non-empty `effects`) matches the schema; `Spell` row present in
  [`schema-matrix.md`](./schema-matrix.md). The `spell_bonus`
  specialty union in [`hero.schema.json`](../../content-schema/schemas/hero.schema.json)
  matches § 5.
- **Tasks: ⚠** — Owning tasks exist and reference this doc in their
  Read First (`01b-spell-school-loader-plus-mastery-scaling`,
  `02-combat-spells`, `04b-mage-guild-content-level-15-random-selection`,
  `07d-magic-economy-and-special-skill-appliers`,
  `mvp/05-adventure-map/05-town-visit-recruit-build-mage-guild`).
  Drift surfaced for mana-regen formula vs 01b task wording, an
  `excludeSchools` example value outside the schema enum, and the
  § 8 `magic_arrow` fixture not yet pinned by 02-combat-spells.
  Detail in `## ⚠ Issues`.

## ⚠ Issues

- **Knowledge vs. Wisdom drift on the learn-spell gate.** § 6
  states the learn-spell gate is "hero meets the `knowledge`
  threshold for the spell's level", and
  [`command-schema.md` § `LEARN_SPELL`](./command-schema.md#learn_spell)
  agrees ("Hero has sufficient Knowledge stat for spell level").
  The opposing files name **wisdom**: screen 29
  [`spec.md`](./wiki/screens/29-mage-guild/spec.md) binds
  `hero.wisdom → skills.wisdom` for "Eligibility for higher spell
  levels"; the MVP task
  [`tasks/mvp/05-adventure-map/05-town-visit-recruit-build-mage-guild.md`](../../tasks/mvp/05-adventure-map/05-town-visit-recruit-build-mage-guild.md)
  validates "mage guild level and hero wisdom"; and
  [`tasks/phase-2/01-spells-artifacts/07d-magic-economy-and-special-skill-appliers.md`](../../tasks/phase-2/01-spells-artifacts/07d-magic-economy-and-special-skill-appliers.md)
  asserts "Wisdom school mastery gates spell learning and spell
  casting through `SPELL_CAST` / learn-spell validation". The split
  is genuine and not silently rewritable. Per the Heroes lineage and
  the 07d task, **wisdom** is canonical for the gate and **knowledge**
  is the mana-pool input. Owner: the 05-town-visit (MVP) task and
  `command-schema.md` `LEARN_SPELL` § must align — either reword
  this doc and `command-schema.md` to name `wisdom`, or update
  screen 29 + the MVP task to name `knowledge`. Flagged here per
  Hard Prohibitions A and D.
- **Mana-regen formula contradicts 01b task acceptance criterion.**
  § 7 of this doc defines `manaRegenPerDay = mysticismRegenBase +
  skill.mysticism.level × mysticismRegenPerLevel`. The acceptance
  criterion in
  [`tasks/phase-2/01-spells-artifacts/01b-spell-school-loader-plus-mastery-scaling.md`](../../tasks/phase-2/01-spells-artifacts/01b-spell-school-loader-plus-mastery-scaling.md)
  reads "Mana regenerates at +knowledge/day at start of each
  adventure map day", which conflates the regen formula with the
  knowledge stat. The 07d task is the canonical owner of magic /
  economy appliers and matches this doc's split. Owner: 01b task
  must be reworded to refer to the Mysticism formula (or to delegate
  to 07d) without changing this doc's invariant. Flagged per Hard
  Prohibition D.
- **`excludeSchools: ["necromancy"]` example uses a value outside
  the spell-schema enum.** § 4 reserves `excludeSchools` at the
  faction-pack level, and the 04b task's acceptance criterion
  cites `excludeSchools: ["necromancy"]`. The closed `school` enum
  in [`spell.schema.json`](../../content-schema/schemas/spell.schema.json)
  is `fire | water | earth | air | light | dark | arcane | nature`
  — `necromancy` is not a school. Either the example must be
  reworded to use `dark` (the lineage-equivalent shadow school) or
  a new school must be added through
  [`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md). Owner:
  the 04b task. Flagged per Hard Prohibition D — not rewritten in
  the doc because the doc itself does not assert `necromancy` and
  the 04b acceptance criterion is the load-bearing string.
- **§ 8 `magic_arrow` fixture is not pinned by the 02-combat-spells
  task.** The doc references a deterministic fixture
  `{power: 10, knowledge: 8}` casting `magic_arrow` at basic
  mastery, citing
  [`tasks/phase-2/01-spells-artifacts/02-combat-spells.md`](../../tasks/phase-2/01-spells-artifacts/02-combat-spells.md).
  That task lists Fireball, Lightning Bolt, Blind, Slow, and Haste
  as its 5 implementable spells; `magic_arrow` exists as a record
  fixture
  ([`magic-arrow.spell.json`](../../content-schema/examples/records/spells/combat/magic-arrow.spell.json))
  but the task has no acceptance criterion or test vector for it.
  Suggested values: 02-combat-spells must add an acceptance line
  pinning the deterministic damage value for `magic_arrow` at
  basic mastery, or this doc must reference the new owner. Owner:
  02-combat-spells task. Flagged per Hard Prohibition D.
