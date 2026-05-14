# Effect Registry

Closed list of effect kinds consumed by spells, abilities, artifacts,
skills, and buildings. New kinds enter via schema + runtime handler —
never as free-form strings.

Schema:
[`effect.schema.json`](../../content-schema/schemas/effect.schema.json).

Companion docs:

- [`schema-matrix.md`](./schema-matrix.md) — `Effect`, `Targeting`,
  `Formula` registry rows.
- [`status-effects.md`](./status-effects.md) — full lifecycle of
  `kind = "status"`.
- [`stat-composition-order.md`](./stat-composition-order.md) —
  pipeline order for `modify_stat` / `modify_primary_stat`.
- [`mechanics-coverage.md`](./mechanics-coverage.md) — PvP-diplomacy
  scope row.
- [`edge-cases-policy.md`](./edge-cases-policy.md),
  [`determinism.md`](./determinism.md) — state-shape invariants
  consumed by drain effects.

## Contract

- Every effect object has a `kind` field that picks one closed
  subschema; the schema root is `additionalProperties: false`.
- Adding a new kind requires (1) a new subschema, (2) a registered
  runtime handler under `src/rules/effects/`, (3) a row in this
  doc.
- Numeric scaling (`damage.amount`, `heal.amount`, `summon.count`)
  uses the formula AST
  ([`formula.schema.json`](../../content-schema/schemas/formula.schema.json)),
  never raw integers when authoring scaling content.
- The schema is canonical. If this doc and the schema disagree,
  the schema wins.

## Kinds

| Kind | Required fields | Used by | Notes |
|---|---|---|---|
| `damage` | `amount` | spells, abilities | `damageType` enum: `physical`, `fire`, `cold`, `lightning`, `earth`, `air`, `holy`, `shadow`, `pure`. Optional `target`, `condition`. |
| `heal` | `amount` | spells, abilities | `target` defaults to `ally`. |
| `status` | `status` | spells, abilities | Named status with optional `duration`. `durationUnit ∈ {rounds, turns, days}` (default `rounds` for combat scope, `days` for adventure). Default `stacking = highest_magnitude_refresh_duration`; override via `{stack, refresh, highest_magnitude_refresh_duration, ignore}`. Lifecycle: [`status-effects.md`](./status-effects.md). |
| `modify_stat` | `stat`, `value` | abilities, artifacts | Integer delta over the combat-stat enum. Composition order pinned by [`stat-composition-order.md`](./stat-composition-order.md). |
| `modify_primary_stat` | `stat`, `value` | artifacts, skills | Hero `attack` / `defense` / `power` / `knowledge`. |
| `summon` | `unitId`, `count` | spells | `count` is a formula. |
| `dispel` | — | spells | `scope ∈ {positive, negative, all}`. |
| `resource_bonus` | `resource`, `amount` | artifacts, buildings | `cadence ∈ {once, daily, weekly}`. |
| `grant_spell` | `spellId` | artifacts, heroes | Adds to hero spellbook. |
| `grant_ability` | `abilityId` | artifacts, buildings | Adds to unit/hero ability list. |
| `unlock_unit` | `unitId` | buildings | Dwellings producing recruitable units. |
| `unlock_building` | `buildingId` | buildings | Opens the next-tier slot. |
| `spawn_army` | `stacks`, `q`, `r` | map triggers | Fixed army at a hex; bound by 7-stack cap. |
| `set_flag` | `flagId`, `value` | map triggers, quests | Boolean scenario flag consumed by `on_flag_set` triggers. |
| `award_resources` | `amounts` | map triggers, quest rewards | One-time multi-resource payout to a player. |
| `growth_modifier` | `unitId`, `multiplierNum`, `multiplierDen` | themed weeks | Multiplicative weekly growth. `unitId = "*"` applies to all units. |

## Spell school ↔ damage type mapping

`spell.school` is catalog/mastery metadata; individual `damage`
effects carry `damageType` for resistance, immunity, and mitigation.
The two are **intentionally decoupled** — a `nature` spell may deal
`physical` or `poison`-flavoured damage; non-damage spells omit
`damageType` entirely.

The table below pins the *conventional primary* damage type each
school emits. Authors and AI generators follow it unless fiction
demands otherwise; deviations are legal as long as the chosen value
is in the `damage.damageType` enum.

| `spell.school` | Conventional `damageType` | Also acceptable | Notes |
|---|---|---|---|
| `fire`   | `fire`      | —                          | Ignition / burning bias. |
| `water`  | `cold`      | `pure` (scrying / drain)   | Water school covers cold/ice in this setting. |
| `earth`  | `earth`     | `physical`                 | `physical` reserved for kinetic projectiles. |
| `air`    | `lightning` | `physical` (gusts)         | Lightning is the default air damage. |
| `light`  | `holy`      | `pure` (radiant burn)      | Undead / demonic immunity keys off `holy`. |
| `dark`   | `shadow`    | `pure` (entropy)           | Drain / curse effects use `shadow`. |
| `arcane` | `pure`      | any                        | `pure` bypasses most resistances; use sparingly. |
| `nature` | `physical`  | `cold`, `fire`             | Spans vines, frost, wildfire — pick by effect fiction. |

Rules of thumb:

- A non-damaging spell (buff, summon, dispel, status) omits
  `damageType` entirely — never fill it defensively.
- Multi-tier mastery may emit different `damageType`s only when the
  fiction demands it; prefer consistency.
- Resistance / immunity lookups key on `damageType`, never on
  `school`. The school is catalog metadata, not a combat axis.

## Friendly-fire Defaults

Whether a damaging effect can hit allies is decided by the parent
spell/ability's `targeting.allowFriendly` flag (see
[`targeting.schema.json`](../../content-schema/schemas/targeting.schema.json)).

| Targeting kind | Convention for `allowFriendly` | Override |
|---|---|---|
| `self` | n/a — caster only | — |
| `single_unit` | `false` (single-target) | Validity is driven by `allegiance`; `allowFriendly` is rejected here. |
| `hex` | `false` (single-target) | Author may pin `true`. |
| `unit_or_hex` | `false` | Author may opt in. |
| `area` | **`true`** (AOE shape) | Author may pin `false`; field is `required` in the schema for `area` and `line`. |
| `line` | **`true`** (AOE shape) | Author may pin `false`; field is `required` in the schema. |
| `all` | inferred from `allegiance` | Optional explicit pin. |

The `breath_attack` ability (see
[`tasks/mvp/09-tactical-combat/07-unit-abilities-flying-double-strike-breath-no-retaliation.md`](../../tasks/mvp/09-tactical-combat/07-unit-abilities-flying-double-strike-breath-no-retaliation.md))
defaults `allowFriendly: true` because it sweeps a multi-hex line —
an ally standing in the second hex is damaged.

## Drain semantics

Drain effects (resource drain, mana drain, hit-point drain) **floor
at `0` per tick**; no debt accumulates.

- A curse / status that drains 5 mana per round against a stack with
  3 mana drains 3 mana, leaves the stack at 0, and never produces a
  negative balance.
- The state serializer runs the canonical state-shape invariants
  (`resources[k] ≥ 0`, `unit.count ≥ 0`); any drain that would
  breach the floor clamps before assertion.
- Cross-cutting framing:
  [`edge-cases-policy.md` § 7](./edge-cases-policy.md#7-negative-resources)
  and
  [`determinism.md` § State-shape invariants](./determinism.md#state-shape-invariants).

## Diplomacy scope

Player-vs-player diplomacy / treaties are **out of scope through
Phase 2** — see the corresponding row in
[`mechanics-coverage.md`](./mechanics-coverage.md). Effects that
interact with neutrals (e.g. neutral-stack negotiation) flow through
the existing `dispel`, `award_resources`, and `set_flag` kinds; no
PvP-treaty effect kind exists.

## Secondary-skill boundary

Secondary skills may use the effect registry for generic stat and
resource changes, but not every skill behavior is a reusable effect.
The canonical roster and ID table live in
[`research/deep-research-report.md`](../../research/deep-research-report.md)
§ Secondary Skills.

Runtime-handler-backed skills — Archery, Offense, Logistics,
Scouting, Wisdom school mastery, Diplomacy, Necromancy — are keyed
by stable skill IDs and implemented by dedicated skill appliers. Do
not invent free-form effect kinds inside skill records to express
those behaviors. If a skill behavior should become reusable by
spells, artifacts, abilities, and buildings, add a new closed effect
kind here and in
[`effect.schema.json`](../../content-schema/schemas/effect.schema.json)
*before* content depends on it.

## AI-profile want weights

[`ai-profile.schema.json`](../../content-schema/schemas/ai-profile.schema.json)
exposes an optional `weights: Record<WantType, number>` map consumed
by the heuristic AI's wants engine
([`tasks/mvp/10-heuristic-ai/02-wants-engine-strategic-action-prioritization.md`](../../tasks/mvp/10-heuristic-ai/02-wants-engine-strategic-action-prioritization.md)).
Weights are **priority knobs, not effects** — they multiply
per-`Want` scores before action selection, never change command
legality, and never enter the canonical command log. The schema is
empty-but-valid in MVP; populating it is M3+ content work per
[`ai-contract.md` § 7](./ai-contract.md) and
[§ 8](./ai-contract.md).

## Adding a new kind

1. Add the `$defs` subschema in `effect.schema.json` (required
   `kind`, closed properties, `additionalProperties: false`).
2. Add a `$ref` entry to the root `oneOf`.
3. Add one example record exercising the new kind under
   `content-schema/examples/records/`.
4. Register the runtime handler under `src/rules/effects/` (per
   [`tasks/mvp/02-content-schemas/13-effect-registry.md`](../../tasks/mvp/02-content-schemas/13-effect-registry.md)).
5. Document the row in this file.
6. Run `npm run generate:enum-snapshot` if any enum / `const`
   changed; commit the snapshot diff.

## Anti-patterns

- ❌ `additionalProperties: true` on the effect root — defeats the
  discriminator.
- ❌ Free-form `type: string` for new effects — hides typos.
- ❌ Storing formulas as strings — breaks determinism.
- ❌ Embedding asset paths in effect records — presentation is
  separate.

---

## 🔍 Sync Check

- **UI: ✔** — No UI surfaces named in this doc; the only screen-side
  reference (`breath_attack` friendly-fire) resolves to the owning
  task and matches its description.
- **Schema: ✔** — All 16 kinds in the Kinds table match
  [`effect.schema.json`](../../content-schema/schemas/effect.schema.json)
  exactly (one-to-one with the root `oneOf`); `damageType` enum
  matches the `damage` subschema; targeting kinds and `allowFriendly`
  semantics match
  [`targeting.schema.json`](../../content-schema/schemas/targeting.schema.json);
  `Effect`, `Targeting`, and `Formula` rows present in
  [`schema-matrix.md`](./schema-matrix.md).
- **Tasks: ✔** — Owning task
  [`mvp.02-content-schemas.13-effect-registry`](../../tasks/mvp/02-content-schemas/13-effect-registry.md)
  lists this doc in `Read First`; multiple downstream tasks reference
  it via `task-registry.json` (verified by grep). PvP-diplomacy scope
  matches the `out-of-scope` row in
  [`mechanics-coverage.md`](./mechanics-coverage.md).

## ⚠ Issues

- **Stale `q211` anchor on the outbound link to `edge-cases-policy.md` § 7.**
  The pre-rewrite text linked
  `./edge-cases-policy.md#7-negative-resources-q211`, but the heading
  in that file is `## 7. Negative resources` — anchor never resolved.
  The rewrite drops the `-q211` suffix to match the live heading. Per
  [`edge-cases-policy.md` § 16 `## ⚠ Issues`](./edge-cases-policy.md)
  ("Inbound `qNNN` anchors broken across the corpus"), the same
  stale suffix appears in
  [`determinism.md` § State-shape invariants](./determinism.md#state-shape-invariants)
  (line 185) and several files under `tasks/`. Suggested values: the
  corpus-wide sweep already begun in `446a5a8` should drop `-qNNN`
  from every inbound anchor pointing at `edge-cases-policy.md`. The
  audit did not edit `determinism.md` or other sibling files (Hard
  Prohibition D — never edit cross-checked files).
