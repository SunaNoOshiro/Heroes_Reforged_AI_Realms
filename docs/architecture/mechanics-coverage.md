# Mechanic Coverage Register (SSOT)

The single source of truth for which gameplay mechanics live inside
the baseline corridor and which milestone each one lands in. Every
`## Not in scope` clause inside a `tasks/**/*.md` file or an
architecture doc must be matched by exactly one row in the register
below — see [§ Lint contract](#lint-contract).

## Scope vocabulary

| Scope | Meaning |
|---|---|
| `mvp` | Implemented during the MVP slice (M0–M2). |
| `phase-2` | Implemented in Phase 2 (M3–M4). |
| `phase-3` | Implemented in Phase 3 (M5–M7) — multiplayer, generation, polish. |
| `deferred` | In the corridor but not currently scheduled; revisit when an owning pack/task is filed. |
| `out-of-scope` | Explicitly rejected from baseline; only a future major-version revision can change this. |

## Spec status vocabulary

| Spec status | Meaning |
|---|---|
| `defined` | Formal rule, schema, or formula exists and is canonical. |
| `partial` | Some rule pinned, but at least one detail still open. |
| `placeholder` | Numeric values exist but are pre-balance (must be tuned in a future task). |
| `unspecified` | The mechanic is named in scope but has no rule yet — usually a `deferred` row. |

## Register

| Mechanic | Scope | Owning Task | Spec Status | Notes |
|---|---|---|---|---|
| Adventure-map turn structure (player → AI → end-day → week 7 growth) | `mvp` | [`mvp.05-adventure-map.02-turn-structure`](../../tasks/mvp/05-adventure-map/02-turn-structure.md) | `defined` | `WEEK_START` event hook is live; themed-week content rides on the [Themed-Week roller](#themed-week-content). |
| Hero movement + adventure-map A* pathfinder | `mvp` | [`mvp.05-adventure-map.03-hero-movement`](../../tasks/mvp/05-adventure-map/03-hero-movement.md), [`mvp.03-map-system.04-a-pathfinder-with-terrain-cost-plus-zoc`](../../tasks/mvp/03-map-system/04-a-pathfinder-with-terrain-cost-plus-zoc.md) | `defined` | All terrain costs are integer ×100 ([diagrams/23](diagrams/23-hero-movement.md)). |
| Pathfinding deterministic tie-break (q ascending then r ascending) | `mvp` | [`mvp.03-map-system.07-unit-test-suite-for-pathfinder-edge-cases`](../../tasks/mvp/03-map-system/07-unit-test-suite-for-pathfinder-edge-cases.md) | `defined` | Pinned in [`mvp.05-adventure-map.03-hero-movement`](../../tasks/mvp/05-adventure-map/03-hero-movement.md) §"Determinism contract". |
| Tactical-combat pathfinder (hex A* with flying / wall awareness) | `mvp` | [`mvp.09-tactical-combat.04a-tactical-pathfinder`](../../tasks/mvp/09-tactical-combat/04a-tactical-pathfinder.md) | `defined` | Reuses the same axial utilities; LoS-aware. |
| Line-of-sight algorithm (cube-interpolation hex line) | `mvp` | [`mvp.09-tactical-combat.04-ranged-attack-obstacle-check-range-limit`](../../tasks/mvp/09-tactical-combat/04-ranged-attack-obstacle-check-range-limit.md) | `defined` | Spec in [`line-of-sight.md`](line-of-sight.md). |
| Friendly-fire policy for AOE / breath | `mvp` | [`mvp.09-tactical-combat.07-unit-abilities-flying-double-strike-breath-no-retaliation`](../../tasks/mvp/09-tactical-combat/07-unit-abilities-flying-double-strike-breath-no-retaliation.md) | `defined` | Default OFF for single-target, ON for AOE; per-spell override via `targeting.allowFriendly`. |
| Stat composition order (base → level-up → skill → specialty → artifact → aura → clamp) | `mvp` | [`phase-2.01-spells-artifacts.07e-stat-composition-pipeline`](../../tasks/phase-2/01-spells-artifacts/07e-stat-composition-pipeline.md) | `defined` | Spec in [`stat-composition-order.md`](stat-composition-order.md). |
| Edge-case policy (empty army, simultaneous death, stack cap, simultaneous game-end, HP overflow) | `mvp` | [`mvp.09-tactical-combat.12-edge-case-fuzz-harness`](../../tasks/mvp/09-tactical-combat/12-edge-case-fuzz-harness.md) | `defined` | Spec in [`edge-case-policy.md`](edge-case-policy.md); `hero.army.maxItems = 7` is schema-enforced. |
| Status duration unit + stacking policy | `mvp` | [`phase-2.01-spells-artifacts.02-combat-spells`](../../tasks/phase-2/01-spells-artifacts/02-combat-spells.md) | `defined` | Spec in [`status-effects.md`](status-effects.md); `effect.status.durationUnit ∈ {rounds, turns, days}`. |
| Mana pool + spell damage scaling | `phase-2` | [`phase-2.01-spells-artifacts.01b-spell-school-loader-plus-mastery-scaling`](../../tasks/phase-2/01-spells-artifacts/01b-spell-school-loader-plus-mastery-scaling.md) | `defined` | Formulas pinned in [`spells-and-mage-guild.md`](spells-and-mage-guild.md) §"Mana pool" and §"Spell damage scaling". |
| Per-class hero level-up weights (Knight / Cleric / Ranger / Druid / Necromancer) | `phase-2` | [`phase-2.01-spells-artifacts.00-hero-leveling`](../../tasks/phase-2/01-spells-artifacts/00-hero-leveling.md) | `placeholder` | Weights live in `ruleset.heroLevelup.classWeights`; balance-pass task to be authored against the M2 balance corridor in [`non-functional-requirements.md`](non-functional-requirements.md). |
| Per-tier town income (Village / Town / City Hall / Capitol) | `mvp` | [`mvp.04-faction-emberwild.02-emberwild-town-building-tree`](../../tasks/mvp/04-faction-emberwild/02-emberwild-town-building-tree.md) | `placeholder` | Values live in `ruleset.townTier.<tier>.goldPerDay`. |
| Siege constants (wall HP, gate HP, moat damage, towers) | `phase-2` | [`phase-2.01-spells-artifacts.13-siege-state-machine`](../../tasks/phase-2/01-spells-artifacts/13-siege-state-machine.md) | `placeholder` | Shape lives in `ruleset.siege.*`; balance-tune task scheduled inside the same phase-2 module. |
| Themed-week random-event content | `phase-2` | [`phase-2.08-meta-systems.08-themed-week-roller`](../../tasks/phase-2/08-meta-systems/08-themed-week-roller.md) | `defined` | Schema: [`themed-week.schema.json`](../../content-schema/schemas/themed-week.schema.json); ≥6 baseline records ship under `content-schema/examples/records/themed-weeks/`. |
| Map scripting / trigger engine | `phase-2` | [`phase-2.08-meta-systems.07-map-trigger-engine`](../../tasks/phase-2/08-meta-systems/07-map-trigger-engine.md) | `defined` | Schema: [`map-trigger.schema.json`](../../content-schema/schemas/map-trigger.schema.json). Used for `on_day` / `on_tile_visit` / `on_resource_threshold` / etc. |
| Two-hero-per-town protocol (visiting + garrisoned) | `mvp` | [`mvp.05-adventure-map.18-transfer-stack-commands`](../../tasks/mvp/05-adventure-map/18-transfer-stack-commands.md), [`mvp.05-adventure-map.01-strategic-game-state-model`](../../tasks/mvp/05-adventure-map/01-strategic-game-state-model.md) | `defined` | `SWAP_TOWN_HEROES` command; denied during active siege. |
| In-combat split | `out-of-scope` | (none) | `defined` | Explicitly excluded; see [`in-combat-stack-rules.md`](in-combat-stack-rules.md). |
| In-combat merge (`summon` / `raise` / `resurrect` reuse) | `phase-2` | [`phase-2.03-second-faction.04-necromancy-mechanic-raise-skeletons-after-combat`](../../tasks/phase-2/03-second-faction/04-necromancy-mechanic-raise-skeletons-after-combat.md) | `defined` | Cap = `ruleset.combat.battlefieldMaxStacks` (baseline = 14). |
| Mind-spell immunity (undead) | `phase-2` | [`phase-2.03-second-faction.05-undead-immunity-morale-and-mind-spell-rules`](../../tasks/phase-2/03-second-faction/05-undead-immunity-morale-and-mind-spell-rules.md) | `defined` | Driven by `spell.tags ⊇ ["mind"]`. |
| Melee `double_strike` ability | `mvp` | [`mvp.09-tactical-combat.07-unit-abilities-flying-double-strike-breath-no-retaliation`](../../tasks/mvp/09-tactical-combat/07-unit-abilities-flying-double-strike-breath-no-retaliation.md) | `defined` | Companion to ranged `double_shot`. |
| Baseline spell roster (≥10 combat + 5 adventure) | `phase-2` | [`phase-2.01-spells-artifacts.02-combat-spells`](../../tasks/phase-2/01-spells-artifacts/02-combat-spells.md), [`phase-2.01-spells-artifacts.03-adventure-map-spells`](../../tasks/phase-2/01-spells-artifacts/03-adventure-map-spells.md) | `defined` | Records under `content-schema/examples/records/spells/combat/` and `…/adventure/`. |
| Player-vs-player diplomacy / treaties | `out-of-scope` | (none) | `defined` | Explicitly excluded through Phase 2; revisit in Phase 3. Neutral-stack negotiation only. |
| Custom spell / runtime spell-creation editor | `phase-2` | (deferred) | `unspecified` | Held; pack content can ship arbitrary spells through `spell.schema.json` without an editor. |
| Cross-school meta-magic interaction | `out-of-scope` | (none) | `defined` | Schools are catalog metadata; no combinator rules until a ruleset pack adds capabilities. |
| Faction-defined spell schools | `out-of-scope` | (none) | `defined` | `spell.school` is a closed enum; adding requires a schema-version bump. |
| Mod-system depth (signature, sandboxed scripting, ZIP loader) | `phase-2` | [`phase-2.05-mod-system`](../../tasks/phase-2/05-mod-system.md) | `partial` | Loader and signature tasks live; full sandboxed scripting is reserved. |
| Multiplayer lockstep (M5) | `phase-3` | [`phase-3.01-multiplayer`](../../tasks/phase-3/01-multiplayer.md) | `partial` | Lockstep determinism contract pinned by [`ui-frame-lag-contract.md`](ui-frame-lag-contract.md). |
| AI generation pipeline (faction / unit synthesis) | `phase-3` | [`phase-3.02-ai-generation`](../../tasks/phase-3/02-ai-generation.md) | `partial` | I/O schemas pinned; generation runtime reserved. |
| MCTS strategic AI | `phase-3` | [`phase-3.03-mcts-ai`](../../tasks/phase-3/03-mcts-ai.md) | `partial` | Heuristic AI ships in MVP; MCTS replaces it in Phase 3. |

## Themed-week content

The `WEEK_START` hook fires today; baseline content rides through
[`themed-week.schema.json`](../../content-schema/schemas/themed-week.schema.json)
and is rolled by
[`phase-2.08-meta-systems.08-themed-week-roller`](../../tasks/phase-2/08-meta-systems/08-themed-week-roller.md)
using `rng("themed-week", scenarioId, weekIndex)`.

## Lint contract

The intent: `scripts/generate-mechanics-coverage.ts` walks every
Markdown file under `tasks/` and `docs/architecture/`, collects
`## Not in scope` and `deferred` / `stub` lines, and validates that
each line is matched by one row in the register above. A missing
row fails CI.

This file is the only place where new scope decisions are recorded;
do not duplicate the table elsewhere.

---

## 🔍 Sync Check

- **UI: ✔** — Register rows reference task / schema / arch artifacts only; no UI surface claims to verify.
- **Schema: ✔** — `hero.army.maxItems = 7` ([`hero.schema.json`](../../content-schema/schemas/hero.schema.json) L34), `effect.status.durationUnit ∈ {rounds, turns, days}` ([`effect.schema.json`](../../content-schema/schemas/effect.schema.json) L58), `targeting.allowFriendly` ([`targeting.schema.json`](../../content-schema/schemas/targeting.schema.json) L52/57/68/79), `ruleset.combat.battlefieldMaxStacks` ([`ruleset.schema.json`](../../content-schema/schemas/ruleset.schema.json) L80, baseline value `14` in `content-schema/examples/records/rulesets/baseline.ruleset.json`), `SWAP_TOWN_HEROES` ([`command.schema.json`](../../content-schema/schemas/command.schema.json) L1565), and `themed-week` / `map-trigger` schemas all resolve.
- **Tasks: ✔** — Every owning-task ID in the register resolves to an existing `tasks/**/*.md`; the SSOT callout in [`master-plan.md`](master-plan.md) and the inbound references from [`effect-registry.md`](effect-registry.md) and [`mvp.09-tactical-combat.01`](../../tasks/mvp/09-tactical-combat/01-battlestate-init-army-placement-plus-speed-order.md) match this file's role.

## ⚠ Issues

- **Lint contract names a script that does not exist.** `## Lint contract` references `scripts/generate-mechanics-coverage.ts` as the enforcement gate, but no such file exists in `scripts/` and no `validate:*` entry in `package.json` invokes it. The closest existing script, [`scripts/check-deferred-coverage.mjs`](../../scripts/check-deferred-coverage.mjs) (wired as `npm run validate:deferred`), validates `DEF-NNN` references against [`docs/planning/deferred.md`](../../docs/planning/deferred.md) — a different contract. Per CLAUDE.md ("Trust anchor is the GitHub Actions `Validate Repo Contracts` workflow"), this gate is honor-system today. Required: either author the named script (`.mjs` per repo convention) and wire it into `package.json` + [`.github/workflows/validate.yml`](../../.github/workflows/validate.yml), or rewrite the section to point at the actual coverage check. Skill did not change the script name in this rewrite (Hard Prohibition A — never silently rewrite a structural-invariant claim).
