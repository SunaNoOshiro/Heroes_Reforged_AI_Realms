# Effect Registry

The canonical list of effect kinds consumed by spells, abilities,
artifacts, skills, and buildings. Schema:
[`content-schema/schemas/effect.schema.json`](../../content-schema/schemas/effect.schema.json).

## Contract

- Every effect object has a `kind` field that picks one closed
  subschema.
- Adding a new kind requires: (1) a new subschema, (2) a registered
  runtime handler, (3) an update to this doc.
- Numeric effect scaling (damage amount, heal amount, summon count)
  uses the formula AST
  ([`formula.schema.json`](../../content-schema/schemas/formula.schema.json)).

## Kinds

| Kind | Required fields | Used by | Notes |
|---|---|---|---|
| `damage` | `amount` | spells, abilities | `damageType` is an enum, not free-form. Optional `target` and `condition`. |
| `heal` | `amount` | spells, abilities | `target` defaults to `ally`. |
| `status` | `status` | spells, abilities | Named status effect with optional `duration`. |
| `modify_stat` | `stat`, `value` | abilities, artifacts | Integer delta. Stat is enum over combat stats. |
| `modify_primary_stat` | `stat`, `value` | artifacts, skills | Hero attack/defense/power/knowledge. |
| `summon` | `unitId`, `count` | spells | `count` is a formula. |
| `dispel` | — | spells | `scope` filters positive/negative. |
| `resource_bonus` | `resource`, `amount` | artifacts, buildings | `cadence` enum: `once`, `daily`, `weekly`. |
| `grant_spell` | `spellId` | artifacts, heroes | Adds to hero spellbook. |
| `grant_ability` | `abilityId` | artifacts, buildings | Adds to unit or hero ability list. |
| `unlock_unit` | `unitId` | buildings | Dwellings producing recruitable units. |
| `unlock_building` | `buildingId` | buildings | Opens the next-tier slot. |

## Secondary Skill Boundary

Secondary skills may use the effect registry for generic stat and
resource changes, but not every skill behavior is a reusable effect.
The canonical roster and ID table live in
[`research/deep-research-report.md`](../../research/deep-research-report.md),
section "Secondary Skills".

Runtime-handler-backed skills such as Archery, Offense, Logistics,
Scouting, Wisdom school mastery, Diplomacy, and Necromancy are keyed by
stable skill IDs and implemented by dedicated skill appliers. Do not
invent free-form effect kinds inside skill records to express those
behaviors. If a skill behavior should become reusable by spells,
artifacts, abilities, and buildings, add a new closed effect kind here
and in [`content-schema/schemas/effect.schema.json`](../../content-schema/schemas/effect.schema.json)
before content depends on it.

## Spell School ↔ Damage Type Mapping

Spells carry a `school` for catalog/mastery purposes; individual
`damage` effects carry a `damageType` for mitigation, immunity, and
resistance lookups. They are **intentionally decoupled** — a
`nature` spell may deal `physical` or `poison`-flavoured damage, an
`arcane` spell may pick any type, and non-damage spells have no
`damageType` at all.

The table below lists the *conventional primary* damage type each
school emits when the spell deals damage. Authors and AI generators
should follow it unless they have a concrete reason to deviate.
Deviations are legal as long as the `damageType` exists in the
`damage` effect enum ([`effect.schema.json`](../../content-schema/schemas/effect.schema.json)).

| `spell.school` | Conventional `damageType` | Also acceptable | Notes |
|---|---|---|---|
| `fire`   | `fire`      | —                    | Ignition / burning bias. |
| `water`  | `cold`      | `pure` (for scrying/drain) | Water school covers cold/ice in this setting. |
| `earth`  | `earth`     | `physical`           | Physical is reserved for kinetic projectiles. |
| `air`    | `lightning` | `physical` (gusts)   | Lightning is the default for air damage. |
| `light`  | `holy`      | `pure` (radiant burn) | Undead/demonic immunity driven off `holy`. |
| `dark`   | `shadow`    | `pure` (entropy)     | Drain/curse effects use `shadow`. |
| `arcane` | `pure`      | any                  | Pure bypasses most resistances; use sparingly. |
| `nature` | `physical`  | `cold`, `fire`       | Nature spans vines, frost, wildfire — pick by effect fiction. |

Rules of thumb:

- A spell that deals no damage (buff, summon, dispel, status) omits
  `damageType` entirely — do not fill it defensively.
- A single spell may have multiple mastery tiers with *different*
  damage types only if the fiction demands it; prefer consistency.
- Immunity / resistance lookups key on `damageType`, never on
  `school`. The school is catalog metadata, not a combat axis.

## Adding A New Kind

1. Add the `$defs` subschema in `effect.schema.json` (required: `kind`,
   closed properties, `additionalProperties: false`).
2. Add a `$ref` entry to the root `oneOf`.
3. Add one example record that exercises the new kind to
   `content-schema/examples/records/`.
4. Register the runtime handler under `src/rules/effects/`.
5. Document the row in this file.

## Anti-Patterns

- ❌ `additionalProperties: true` on the effect root — defeats the
  discriminator.
- ❌ Free-form `type: string` for new effects — hides typos.
- ❌ Storing formulas as strings — breaks determinism.
- ❌ Embedding asset paths in effect records — presentation is separate.
