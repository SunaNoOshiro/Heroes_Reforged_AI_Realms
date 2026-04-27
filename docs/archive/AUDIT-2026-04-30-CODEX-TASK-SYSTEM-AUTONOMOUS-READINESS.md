# Task System Audit - Autonomous Execution Readiness

- **Date**: 2026-04-30
- **Auditor role**: Senior engineering manager + AI workflow architect + task-system auditor
- **Scope**: `tasks/*.md`, `tasks/task-registry.json`, task scripts, `docs/architecture/`, `docs/architecture/wiki/screens/`, `docs/architecture/screen-command-coverage.json`, and `content-schema/`
- **Goal**: verify whether the task system is complete, consistent, AI-executable, aligned with UI/schema/architecture, and faithful to the baseline turn-based strategy mechanics corridor.

## Verification Run

Commands executed:

- `npm run generate:task-registry`
- `npm run generate:task-system-report`
- `npm run validate:tasks`
- `npm run validate:commands`
- `npm run validate:cross-refs`
- `npm run validate:contracts`
- `npm run validate`
- `npm run tasks:next`
- `npm run tasks:next:mvp`
- `npm run tasks:status`
- `npm test`

Result:

- `npm run validate` passed.
- `npm test` passed: 15/15 tests.
- `tasks/task-registry.json` regenerated cleanly: 277 tasks, 23 modules.
- `docs/planning/task-system-report.md` regenerated cleanly.
- No generated-file diff was produced by regeneration.

## 1. Task System Score - 8.1 / 10

The task system is structurally strong and machine-actionable, but it is not yet fully safe for long autonomous execution. The built-in validators are green, screen/schema ownership is complete, and dependency resolution works. The remaining risk is mostly semantic: task prose sometimes names command kinds or stable IDs that disagree with the canonical schemas, and several later-phase mechanics ask one task to implement more behavior than the current schemas/effect registry can express.

| Dimension | Score | Finding |
|---|---:|---|
| Backlog <-> architecture alignment | 9 | All major architecture modules have task coverage. 40 tasks lack direct architecture/screen/schema anchors, mostly AI, persistence, mod, spell, and visual-fidelity tasks. |
| Backlog <-> UI screens | 10 | 65/65 screen packages exist, have all five canonical files, are indexed exactly once, and have owning UI/editor tasks. |
| Backlog <-> data contracts | 8 | All on-disk schemas are referenced by at least one task. Screen data contracts are too generic: every screen links only `asset-index`, `localization`, and `ruleset`, while domain schemas such as `hero`, `spell`, `artifact`, `building`, and `map-object` are collapsed under "screen-specific registries." |
| Task atomicity | 8 | All estimates are formally in the 2-6 hour range. One major outlier remains: `phase-2.01-spells-artifacts.07-hero-secondary-skills-28-skills-3-levels` is too broad and partly underspecified. |
| Task completeness | 10 | 277/277 tasks include Description, Outputs, Dependencies, Acceptance Criteria, Verify, and Estimated Time. |
| Single-task AI executability | 7 | Most MVP tasks are clear. AI will stumble on command-name drift, missing `Read First` anchors, and the secondary-skill/effect-registry mismatch. |
| Registry validity | 10 | Generated registry matches task files. No stale entries, no unresolved dependencies, no cycles. |
| Dependency graph correctness | 10 | 0 unresolved dependencies, 0 cycles, 0 phase inversions. |
| Baseline mechanics coverage | 8 | Map, combat, hero, economy, spells, artifacts, towns, AI, persistence, and UI are covered. Secondary skills and spell commands need contract cleanup before they can be executed faithfully. |
| MVP validity | 9 | MVP backlog contains the required playable loop: map, hero movement, economy, combat, basic UI, persistence, and smoke tests. It is still all planned: 0/277 tasks are marked done. |
| AI execution flow | 9 | `tasks:next` exposes exactly one ready task and `tasks:done` gates completion through verify commands. The flow works, but status does not reflect already-present planning/schema artifacts. |
| Cross-layer traceability | 8 | UI and schema traceability are enforced. System-task traceability is not enforced for all tasks, and task command literals are not linted against `command.schema.json`. |

## 2. Critical Issues

### C1. Task prose names command kinds that are not in `command.schema.json`

Canonical command kinds include `END_HERO_TURN`, `END_DAY`, `INITIATE_BATTLE`, and `SPELL_CAST`. Several tasks name other command kinds as if they were schema-backed:

- `tasks/mvp/05-adventure-map/02-turn-structure.md` asks for `END_TURN` and `PASS_TURN`; neither exists in `content-schema/schemas/command.schema.json`.
- `tasks/mvp/07-ui-shell/03-hud-resource-bar-end-turn-button-mini-map-stub.md` and `tasks/mvp/07-ui-shell/06-command-hook-ui-dispatch-re-render.md` dispatch `END_TURN`, while screen 07 uses `END_PLAYER_TURN` as an alias to `END_DAY`.
- `tasks/mvp/09-tactical-combat/09-replace-auto-resolve-with-real-battle.md` asks for `INIT_BATTLE`; the schema and architecture use `INITIATE_BATTLE`.
- `tasks/phase-2/01-spells-artifacts/03-adventure-map-spells.md` asks for `CAST_TOWN_PORTAL`, `CAST_FLY`, and `CAST_DIMENSION_DOOR`; the schema has the generic `SPELL_CAST`.

Why this blocks AI: an agent implementing one task file will create non-schema commands and still pass the current task linter, because `validate:commands` scans screen interactions and command ownership, not arbitrary task command literals.

### C2. `RECRUIT_UNITS` payload shape disagrees across task and schema

`content-schema/schemas/command.schema.json` requires `dwellingUnitId` for `RECRUIT_UNITS`. `tasks/mvp/05-adventure-map/05-town-visit-recruit-build-mage-guild.md` says the command payload is `{ heroId, townId, unitId, quantity }`.

This will produce either a reducer incompatible with the schema or UI code that sends the wrong field.

### C3. Secondary skill backlog is not executable against the current schemas

`tasks/phase-2/01-spells-artifacts/04a-baseline-skill-pack.md`, `01a-hero-skill-assignment.md`, and `07-hero-secondary-skills-28-skills-3-levels.md` disagree with each other and with existing examples.

Observed drift:

- Existing shared skill IDs use underscores, e.g. `shared:skill:leadership_basic`; task examples use `shared:skill:leadership`, `shared:skill:leadership-basic`, and `shared:skill:wisdom-fire`.
- `07-hero-secondary-skills-28-skills-3-levels.md` references `research/deep-research-report.md`, section "Secondary Skills"; that section does not exist.
- `04a-baseline-skill-pack.md` asks for effects such as spell-school mastery, fog reveal, diplomacy joining, conversion, water navigation, enemy-zone stealth, and extra army capacity. The closed `effect.schema.json` supports only 12 effect kinds: `damage`, `heal`, `status`, `modify_stat`, `modify_primary_stat`, `summon`, `dispel`, `resource_bonus`, `grant_spell`, `grant_ability`, `unlock_unit`, `unlock_building`.
- `07-hero-secondary-skills-28-skills-3-levels.md` asks one 6-hour task to implement all 28 skills and says "(remaining 16 skills...)" instead of defining their behavior.

Why this blocks AI: a single-task agent cannot implement all requested skills without inventing effect kinds or hardcoding behavior outside the content model.

### C4. A tactical-combat integration task opts out of owned paths despite requiring code edits

`mvp.09-tactical-combat.09-replace-auto-resolve-with-real-battle` declares no owned paths but its outputs say:

- update the `MOVE_HERO` handler
- add an `INIT_BATTLE` command
- restore adventure state after `BATTLE_RESULT`

This violates the repo's task ownership model. It also uses the wrong command names: `INIT_BATTLE` and `BATTLE_RESULT` are not canonical schema commands.

## 3. Misalignments

### Tasks <-> UI

No screen package is unowned. All 65 screen packages have:

- `mockup.html`
- `spec.md`
- `interactions.md`
- `data-contracts.md`
- `architecture.md`

Index coverage is also clean: 65 screen folders, 8 groups, 65 indexed screens, 0 duplicates, 0 omissions.

Remaining UI issue:

- Screen data contracts are mechanically complete but domain-light. For example, `46-hero-screen/data-contracts.md` does not cite `hero.schema.json`, `artifact.schema.json`, or `skill.schema.json`; `47-spell-book/data-contracts.md` does not cite `spell.schema.json`; `25-building-recruitment-dialog/data-contracts.md` does not cite `unit.schema.json` or `building.schema.json`.

### Tasks <-> Schema

Machine status:

- 33/33 schemas on disk are referenced by at least one task.
- 0 unreferenced schemas.
- 0 unresolved schema links.
- Cross-reference checks pass.

Semantic issues:

- Command names in task prose are not linted against `command.schema.json`.
- Some UI tasks consume data indirectly through screen data-contracts, so `tasks/task-registry.json` does not expose direct schema traceability for 84/85 UI tasks.
- Skill tasks require behavior that cannot be expressed by the current effect registry.

### Tasks <-> Architecture

Architecture modules are covered:

- command system: `mvp.01-engine-core.06`, `mvp.01-engine-core.06b`, command-specific adventure/combat tasks
- determinism: `mvp.01-engine-core.03` through `09`
- renderer: `mvp.06-renderer.*`, `phase-2.06-visual-fidelity.*`
- content platform: `mvp.02-content-schemas.*`, `mvp.02b-asset-pipeline.*`, `phase-2.05-mod-system.*`
- persistence: `mvp.08-persistence.*`
- UI shell and screens: `mvp.07-ui-shell.*`, `phase-2.07-ui-screen-backlog.*`
- combat: `mvp.09-tactical-combat.*`
- AI: `mvp.10-heuristic-ai.*`, `phase-2.02-strategic-ai.*`, `phase-3.03-mcts-ai.*`
- editor: `phase-2.04-content-editor.*`
- multiplayer: `phase-3.01-multiplayer.*`
- AI generation: `phase-3.02-ai-generation.*`

Traceability gap:

- 40 tasks have no direct architecture doc, screen package, or schema path reference in the generated registry. This is not a validator failure, but it weakens "open one task and execute" for system tasks.

## 4. Missing Tasks

No critical UI screen task is missing. The missing work is mostly hardening and schema/command cleanup.

### Missing UI Tasks

- None blocking. All screen packages are owned.
- Advisory: add a screen data-contract enrichment pass so each screen cites domain schemas, not only `asset-index`, `localization`, and `ruleset`.

### Missing Data Tasks

- Add or rewrite a task for a canonical secondary-skill source of truth. It should either extend `effect.schema.json` with required skill effect kinds or narrow the 28-skill roster to effects already expressible by the current registry.
- Add a task to normalize stable skill IDs across examples and tasks. Current tasks use three ID styles for the same conceptual skills.
- Add a task-lint rule that extracts ALL_CAPS command-like literals from task files and requires them to be schema commands, aliases, UI-local tokens, out-of-scope tokens, or explicitly event-only.

### Missing Engine Tasks

- Add a command-vocabulary normalization task for `END_TURN`/`END_DAY`, `PASS_TURN`, `INIT_BATTLE`/`INITIATE_BATTLE`, and spell casting.
- Add a small battle-transition integration task with explicit owned paths. It should use `INITIATE_BATTLE`, not `INIT_BATTLE`, and should depend on `mvp.05-adventure-map.21-map-object-visit-and-battle-initiation-commands`.
- Split secondary-skill runtime application into combat, adventure, economy, and interaction handlers.

## 5. Task Rewrites

### Rewrite 1: `mvp.05-adventure-map.02-turn-structure`

```md
# Turn Structure

Status: planned

Description:
Implement the strategic turn lifecycle using the canonical command
schema. The UI may expose an "End Turn" control, but reducer inputs use
schema-backed command kinds only.

Read First:
- `docs/architecture/state-flow.md`
- `docs/architecture/command-schema.md`
- `content-schema/schemas/command.schema.json`

Inputs:
- `AdventureState` from `mvp.05-adventure-map.01-strategic-game-state-model`
- Command dispatcher from `mvp.01-engine-core.06-command-dispatcher`
- Canonical `END_HERO_TURN` and `END_DAY` payloads from `command.schema.json`

Outputs:
- `src/engine/adventure-turn.ts`
- `applyEndHeroTurn(state, command: EndHeroTurnCommand)`
- `applyEndDay(state, command: EndDayCommand)`
- Events: `DAY_START`, `DAY_END`, `WEEK_START` as event-log entries, not command kinds

Owned Paths:
- `src/engine/adventure-turn.ts`

Dependencies:
- `mvp.05-adventure-map.01-strategic-game-state-model`
- `mvp.01-engine-core.06-command-dispatcher`

Acceptance Criteria:
- The implementation does not introduce `END_TURN` or `PASS_TURN` command kinds.
- UI aliases such as `END_PLAYER_TURN` map through `screen-command-coverage.json` to `END_DAY` or dispatch a sequence of `END_HERO_TURN` commands followed by `END_DAY`.
- After all active heroes end, `END_DAY` advances the calendar deterministically.
- Day 7 emits `WEEK_START` exactly once and applies weekly growth.
- Same seed and command log produce the same final state hash across 3 runs.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
```

### Rewrite 2: `phase-2.01-spells-artifacts.03-adventure-map-spells`

```md
# Adventure Map Spell Effects

Status: planned

Description:
Implement Town Portal, Fly, and Dimension Door as spell records and
runtime handlers executed through the canonical `SPELL_CAST` command.
Do not add spell-specific command kinds.

Read First:
- `docs/architecture/spells-and-mage-guild.md`
- `docs/architecture/effect-registry.md`
- `docs/architecture/command-schema.md`
- `content-schema/schemas/spell.schema.json`
- `content-schema/schemas/effect.schema.json`
- `content-schema/schemas/command.schema.json`

Inputs:
- `AdventureState`
- Spell records from the active content registry
- `SPELL_CAST` command payload from `command.schema.json`

Outputs:
- `src/engine/spells/adventure-spells.ts`
- `applyAdventureSpellCast(state, command: SpellCastCommand)`
- Content examples for the three spells, using stable spell IDs
- Any required new effect kind must be added through `effect.schema.json`, `docs/architecture/effect-registry.md`, and a runtime handler in the same task or a prerequisite task.

Owned Paths:
- `src/engine/spells/adventure-spells.ts`
- `content-schema/examples/records/spells/`
- `content-schema/schemas/effect.schema.json` (shared, only if a new effect kind is required)
- `docs/architecture/effect-registry.md` (shared, only if a new effect kind is required)

Dependencies:
- `phase-2.01-spells-artifacts.01b-spell-school-loader-plus-mastery-scaling`
- `mvp.05-adventure-map.01-strategic-game-state-model`
- `mvp.01-engine-core.06-command-dispatcher`

Acceptance Criteria:
- No `CAST_TOWN_PORTAL`, `CAST_FLY`, or `CAST_DIMENSION_DOOR` command kind is introduced.
- `SPELL_CAST` validates hero, spell ID, mana cost, scope, visibility, and target.
- Town Portal can target only owned towns allowed by mastery.
- Fly changes movement rules through a deterministic status/effect handler.
- Dimension Door rejects fogged or illegal target tiles.
- Replays of identical spell-cast command logs are byte-identical.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
```

### Rewrite 3: split `phase-2.01-spells-artifacts.07-hero-secondary-skills-28-skills-3-levels`

Replace the single broad task with four tasks:

```md
# 07a Skill Runtime Contract And ID Normalization

Outputs:
- Canonical skill ID table using one style, matching existing pack IDs or migrating them with aliases.
- Documented secondary-skill source of truth in `research/deep-research-report.md`.
- Gap list mapping each skill behavior to an existing effect kind or a required new effect kind.

Acceptance Criteria:
- No task uses both `leadership_basic`, `leadership-basic`, and `leadership` for the same skill.
- The research file has a real "Secondary Skills" section.
- `npm run validate` and `npm test` pass.

Estimated Time:
- 3 hours
```

```md
# 07b Combat Skill Appliers

Scope:
- Leadership, Luck, Archery, Offense, Armorer, Defense.

Outputs:
- `src/engine/skills/combat-skill-appliers.ts`

Acceptance Criteria:
- Each skill has deterministic test vectors.
- No behavior requires an unregistered effect kind.

Estimated Time:
- 4 hours
```

```md
# 07c Adventure Skill Appliers

Scope:
- Pathfinding, Logistics, Scouting, Navigation, Diplomacy.

Outputs:
- `src/engine/skills/adventure-skill-appliers.ts`

Acceptance Criteria:
- Movement, visibility, and neutral-stack interaction hooks are explicit.
- Effects are replay-safe and use stable IDs.

Estimated Time:
- 4 hours
```

```md
# 07d Magic, Economy, And Special Skill Appliers

Scope:
- Wisdom/school mastery, Mysticism, Sorcery, Interference, Necromancy,
  Trading, Learning, and remaining special skills.

Outputs:
- `src/engine/skills/magic-economy-skill-appliers.ts`

Acceptance Criteria:
- Spell learning/casting gates match `spells-and-mage-guild.md`.
- Necromancy delegates post-battle raise behavior to the faction-specific
  mechanic task or a shared post-battle hook.
- Any unrepresentable skill behavior is preceded by an effect-registry/schema task.

Estimated Time:
- 5 hours
```

### Rewrite 4: `mvp.09-tactical-combat.09-replace-auto-resolve-with-real-battle`

```md
# Replace Auto-Resolve With Real Battle

Status: planned

Description:
Wire tactical battle initiation into the adventure-map encounter flow
using existing schema-backed commands. This task must not introduce
non-canonical command kinds.

Read First:
- `docs/architecture/state-flow.md`
- `docs/architecture/command-schema.md`
- `docs/architecture/wiki/screens/38-combat-screen/data-contracts.md`

Inputs:
- `INITIATE_BATTLE` reducer from `mvp.05-adventure-map.21-map-object-visit-and-battle-initiation-commands`
- Battle state initialization from tactical-combat tasks 1-8
- Combat screen/HUD bindings from `mvp.09-tactical-combat.11-combat-hud-overlay`

Outputs:
- `src/engine/commands/battle-transition.ts`
- Shared update to the adventure movement collision path so enemy encounters dispatch `INITIATE_BATTLE`
- Battle completion handler consuming canonical battle-resolution output

Owned Paths:
- `src/engine/commands/battle-transition.ts`

Owned Paths (shared):
- `src/engine/commands/map-object-commands.ts`
- `src/engine/adventure-movement.ts`

Dependencies:
- `mvp.05-adventure-map.21-map-object-visit-and-battle-initiation-commands`
- `mvp.09-tactical-combat.01-battlestate-init-army-placement-plus-speed-order`
- `mvp.09-tactical-combat.02-initiative-queue-speed-order-wait-defend-morale`
- `mvp.09-tactical-combat.03-damage-formula`
- `mvp.09-tactical-combat.04-ranged-attack-obstacle-check-range-limit`
- `mvp.09-tactical-combat.05-retaliation-once-per-round-nullification`
- `mvp.09-tactical-combat.06-morale-and-luck-rolls`
- `mvp.09-tactical-combat.07-unit-abilities-flying-double-strike-breath-no-retaliation`
- `mvp.09-tactical-combat.08-battle-end-condition`

Acceptance Criteria:
- No `INIT_BATTLE` or `BATTLE_RESULT` command kind is introduced.
- Enemy encounter uses `INITIATE_BATTLE`.
- Battle completion mutates adventure state only through deterministic reducer code.
- Returning from battle restores adventure phase and updates armies using stable IDs.
- Replay of movement -> battle -> resolution is byte-identical.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
```

## 6. Registry Issues

No hard registry failures:

- missing entries: 0
- stale generated registry: 0
- unresolved dependencies: 0
- dependency cycles: 0
- duplicate primary path ownership: 0
- unowned screen packages: 0
- unreferenced schemas: 0

Registry/lint blind spots:

- Task command literals are not checked against `command.schema.json`.
- System tasks are not required to include an architecture `Read First` reference.
- UI tasks can satisfy screen linkage without exposing schema links in `task-registry.json`.
- `Owned Paths: (none)` is allowed even when Outputs describe concrete code edits.

## 7. Execution Risks

- An AI agent implementing `mvp.05-adventure-map.02-turn-structure` may create `END_TURN` and `PASS_TURN` commands that are outside the canonical schema.
- An AI agent implementing `phase-2.01-spells-artifacts.03-adventure-map-spells` may add three spell-specific command kinds instead of using `SPELL_CAST`.
- An AI agent implementing the skill backlog will either invent effect kinds, hardcode skill behavior outside content records, or fail because the referenced research section does not exist.
- An AI agent implementing `mvp.09-tactical-combat.09` has no owned paths to guide cross-module integration.
- UI tasks can be marked successful while only rendering disabled controls for planned engine behavior. This is acceptable when intentional, but the report should not call such screens "fully implemented gameplay."
- Several task and mockup files still contain legacy non-original placeholder unit, faction, town, and artifact labels. This is not a scheduler blocker, but it conflicts with the repo's original-content positioning and can mislead future content authors.

## 8. Fix Plan

1. Add a task-command-literal lint pass.
   - Extract ALL_CAPS tokens from task Markdown.
   - Classify as schema command, alias, local UI token, out-of-scope token, event-only token, or documented non-command enum.
   - Fail on unknown command-like tokens in "Commands to implement" or "Outputs."

2. Normalize turn commands.
   - Decide whether the canonical reducer command is `END_DAY` or a new `END_PLAYER_TURN`.
   - Update `mvp.05-adventure-map.02`, `mvp.07-ui-shell.03`, `mvp.07-ui-shell.06`, multiplayer lockstep, and sound-system tasks.
   - Do not leave `END_TURN` as a prose-only command.

3. Normalize battle initiation naming.
   - Replace `INIT_BATTLE` with `INITIATE_BATTLE`.
   - Replace `BATTLE_RESULT` prose with the canonical battle completion command/event shape.
   - Give `mvp.09-tactical-combat.09` explicit primary/shared owned paths.

4. Normalize spell casting.
   - Rewrite adventure-spell tasks around `SPELL_CAST`.
   - Only add new command kinds if they are first added to `command.schema.json`, `command-schema.md`, and command coverage.

5. Repair secondary skills.
   - Add the missing "Secondary Skills" research section.
   - Pick one stable ID convention and migrate examples/tasks to it.
   - Split runtime skill implementation by combat/adventure/magic/economy.
   - Extend `effect.schema.json` only through explicit effect-registry tasks, not inside broad skill tasks.

6. Enrich UI data contracts.
   - For each screen, add domain schema rows where applicable:
     - hero screens -> `hero`, `artifact`, `skill`
     - spell screens -> `spell`, `effect`, `targeting`
     - recruitment/town screens -> `unit`, `building`, `resource-id`
     - map-object screens -> `map-object`, `adventure-building`, `neutral-stack-template`
     - editor -> `scenario`, `world`, `map-object`, `adventure-building`

7. Tighten cross-layer task lint.
   - Require non-UI system tasks to reference at least one architecture doc or schema path unless they explicitly opt out with a reason.
   - Warn on `Owned Paths: (none)` when Outputs contain `src/`, `content-schema/`, `resources/`, or "Update" wording.

## Final Readiness Judgment

The task system is ready for guided autonomous execution through the early MVP chain, especially with `npm run tasks:next:mvp`. It is not yet fully ready for unattended multi-phase execution. The main blockers are semantic consistency problems that current validators do not catch: command-name drift, secondary-skill schema gaps, and a few ownership/traceability blind spots.

Once the fix plan above is applied, the task system should be strong enough for agents to open one task file, implement within owned paths, dispatch only schema-backed commands, and preserve the architecture contracts without needing human interpretation.
