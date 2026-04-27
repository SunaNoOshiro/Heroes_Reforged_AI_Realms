# Codex Remediation Plan - Autonomous Readiness

- **Date**: 2026-04-30
- **Source audit**: [`AUDIT-2026-04-30-CODEX-TASK-SYSTEM-AUTONOMOUS-READINESS.md`](AUDIT-2026-04-30-CODEX-TASK-SYSTEM-AUTONOMOUS-READINESS.md)
- **Starting score**: 8.1 / 10
- **Target score**: 9.5+ / 10
- **Goal**: remove the semantic gaps that can cause an autonomous agent to implement non-canonical commands, unstable IDs, or behavior not expressible by the current schemas.

This plan is intentionally limited to task-system, schema-contract, and documentation readiness. It does not implement game runtime features.

## Operating Rules

1. Work one phase at a time.
2. After editing any task file, run:

   ```bash
   npm run generate:task-registry
   npm run generate:task-system-report
   ```

3. After each phase, run:

   ```bash
   npm run validate
   npm test
   ```

4. Do not mark gameplay tasks done. These changes improve task readiness only.
5. Keep all command names aligned with `content-schema/schemas/command.schema.json`.
6. Keep all gameplay records ID-based. Do not introduce raw asset paths in gameplay data.

## Phase 0 - Baseline Snapshot

Purpose: confirm the current state before edits.

Commands:

```bash
npm run generate:task-registry
npm run generate:task-system-report
npm run validate
npm test
npm run tasks:next
npm run tasks:next:mvp
```

Expected:

- `tasks/task-registry.json`: 277 tasks, 23 modules.
- `npm run validate`: green.
- `npm test`: 15/15 passing.
- `tasks:next`: one ready task, `mvp.01-engine-core.01-initialize-root-workspace-and-module-layout`.

Stop if this baseline differs.

## Phase 1 - Command Vocabulary Hardening

Addresses audit issues C1, C2, and C4.

### 1.1 Add Task Command Literal Lint

Problem: `validate:commands` checks screen interaction tokens, but not command-like literals inside task Markdown. Task prose currently names command kinds that do not exist in `command.schema.json`.

Add a linter in `scripts/tasks.mjs` or a small helper imported by it:

- Extract ALL_CAPS tokens from `tasks/**/*.md`.
- Classify each token as one of:
  - command kind in `command.schema.json`
  - alias in `docs/architecture/screen-command-coverage.json`
  - local UI token or prefix from the coverage map
  - out-of-scope token from the coverage map
  - event-only token from a new allow-list, e.g. `DAY_START`, `DAY_END`, `WEEK_START`, `MINE_CAPTURED`
  - documented non-command enum, e.g. difficulty labels or message types
- Fail when a command-like token appears in `Outputs`, `Commands to implement`, or command examples and is not classified.

Suggested files:

- `scripts/check-task-command-literals.mjs`
- `scripts/tasks.mjs`
- `package.json` if exposing `npm run validate:task-commands`

Acceptance:

- Current drift is reported before task edits.
- After task rewrites below, `npm run validate:tasks` includes this check and passes.

### 1.2 Normalize Turn Commands

Rewrite these task files so task prose uses canonical schema commands:

- `tasks/mvp/05-adventure-map/02-turn-structure.md`
- `tasks/mvp/07-ui-shell/03-hud-resource-bar-end-turn-button-mini-map-stub.md`
- `tasks/mvp/07-ui-shell/06-command-hook-ui-dispatch-re-render.md`
- `tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md`
- `tasks/phase-3/04-polish/02-sound-system-event-log-driven.md`

Required changes:

- Replace prose-only `END_TURN` with canonical `END_DAY` or a documented UI alias that maps to `END_DAY`.
- Remove `PASS_TURN` unless it is added to `command.schema.json`, `docs/architecture/command-schema.md`, and command coverage.
- Treat `DAY_START`, `DAY_END`, and `WEEK_START` as events, not commands.

Acceptance:

- No task asks an agent to implement `END_TURN` or `PASS_TURN` as schema commands.
- Screen 07's `END_PLAYER_TURN` alias remains mapped in `screen-command-coverage.json`.

### 1.3 Normalize `RECRUIT_UNITS` Payload

Rewrite `tasks/mvp/05-adventure-map/05-town-visit-recruit-build-mage-guild.md`.

Required change:

- Replace `{ heroId, townId, unitId, quantity }` with `{ heroId, townId, dwellingUnitId, quantity }`, matching `command.schema.json`.

Acceptance:

- Task examples and output text match the schema-required field.
- Recruitment UI tasks still dispatch canonical `RECRUIT_UNITS`.

### 1.4 Normalize Battle Initiation Naming

Rewrite `tasks/mvp/09-tactical-combat/09-replace-auto-resolve-with-real-battle.md`.

Required changes:

- Replace `INIT_BATTLE` with `INITIATE_BATTLE`.
- Replace `BATTLE_RESULT` as a command with a canonical battle-completion event or existing schema-backed command shape.
- Add explicit owned paths instead of `Owned Paths: (none)`.
- Depend on `mvp.05-adventure-map.21-map-object-visit-and-battle-initiation-commands`.

Suggested ownership:

```markdown
Owned Paths:
- `src/engine/commands/battle-transition.ts`

Owned Paths (shared):
- `src/engine/commands/map-object-commands.ts`
- `src/engine/adventure-movement.ts`
```

Acceptance:

- No task asks for `INIT_BATTLE`.
- The battle transition task has concrete owned paths.
- Task lint rejects future owned-path opt-outs that still describe code edits.

### 1.5 Normalize Spell Casting Commands

Rewrite `tasks/phase-2/01-spells-artifacts/03-adventure-map-spells.md`.

Required changes:

- Use canonical `SPELL_CAST`.
- Do not add `CAST_TOWN_PORTAL`, `CAST_FLY`, or `CAST_DIMENSION_DOOR` command kinds unless the command schema is deliberately expanded.
- If spell effects require new effect kinds, make those explicit prerequisite tasks.

Acceptance:

- Adventure spells are records plus runtime handlers invoked by `SPELL_CAST`.
- Task acceptance criteria include replay determinism for spell-cast command logs.

## Phase 2 - Secondary Skill Contract Repair

Addresses audit issue C3.

### 2.1 Create A Canonical Secondary Skill Source

Add a real secondary-skill section to `research/deep-research-report.md`, or create a focused architecture file and link it from research.

The section must define:

- the canonical roster
- stable IDs
- mastery levels
- whether each skill is data-only, runtime-handler-backed, or deferred
- which schema/effect kind expresses each behavior

Acceptance:

- `tasks/phase-2/01-spells-artifacts/07-hero-secondary-skills-28-skills-3-levels.md` no longer references a missing research section.
- Skill tasks can point to one canonical source instead of inventing behavior.

### 2.2 Normalize Skill IDs

Pick one stable ID convention and update task examples to match it.

Current drift to remove:

- `shared:skill:leadership_basic`
- `shared:skill:leadership`
- `shared:skill:leadership-basic`
- `shared:skill:wisdom-fire`

Recommended convention:

- Keep existing example-pack IDs for backward compatibility where already present.
- Add aliases or a migration task if renaming is desired.
- Use one convention in all future task examples.

Acceptance:

- Task examples, example packs, and manifest entries use one canonical skill ID style or explicitly document aliases.
- `npm run validate:cross-refs` stays green.

### 2.3 Split The Oversized Runtime Skill Task

Replace `tasks/phase-2/01-spells-artifacts/07-hero-secondary-skills-28-skills-3-levels.md` with smaller tasks.

Suggested split:

- `07a-skill-runtime-contract-and-id-normalization.md`
- `07b-combat-skill-appliers.md`
- `07c-adventure-skill-appliers.md`
- `07d-magic-economy-and-special-skill-appliers.md`

Each task should have:

- one narrow responsibility
- explicit owned paths
- a 2-5 hour estimate
- acceptance criteria with deterministic test vectors
- dependencies on required effect-registry/schema tasks

Acceptance:

- No task asks an agent to implement all secondary skills in one file.
- No task says "(remaining skills...)" without defining behavior.

### 2.4 Decide Effect Registry Expansion

Audit every skill behavior against `content-schema/schemas/effect.schema.json`.

For each unexpressible behavior, choose one:

- add a new effect kind through a dedicated schema + handler task
- mark the behavior as runtime-handler-backed and document that it is not represented as a generic effect
- defer the behavior and keep the first implementation schema-valid

Acceptance:

- The skill backlog no longer requires agents to invent unregistered effect kinds.
- `docs/architecture/effect-registry.md` matches the schema and task backlog.

## Phase 3 - Cross-Layer Traceability Improvements

Addresses data-contract and system-anchor weaknesses.

### 3.1 Enrich Screen Data Contracts

Update screen data contracts so domain screens cite domain schemas directly.

Examples:

- Hero screens: `hero.schema.json`, `artifact.schema.json`, `skill.schema.json`
- Spell screens: `spell.schema.json`, `effect.schema.json`, `targeting.schema.json`
- Recruitment/town screens: `unit.schema.json`, `building.schema.json`, `resource-id.schema.json`
- Map-object screens: `map-object.schema.json`, `adventure-building.schema.json`, `neutral-stack-template.schema.json`
- Editor screens: `scenario.schema.json`, `world.schema.json`, `map-object.schema.json`, `adventure-building.schema.json`

Acceptance:

- Screen data contracts do not rely only on the generic "screen-specific registries" row.
- `npm run generate:wiki` runs cleanly after changes.

### 3.2 Expose UI Schema Traceability In Task Registry

Decide whether UI task schema traceability should be direct or indirect.

Option A:

- Add canonical schema paths to UI task `Inputs:` where the task directly consumes domain data.

Option B:

- Extend `generate-task-registry.mjs` to include schema paths discovered from referenced screen `data-contracts.md`.

Recommended: Option B. It avoids repeating schema lists across 85 UI tasks.

Acceptance:

- UI tasks in `tasks/task-registry.json` expose relevant schema paths through direct or derived traceability.
- `docs/planning/task-system-report.md` can show UI schema coverage more accurately.

### 3.3 Anchor System Tasks

The audit found 40 tasks with no architecture doc, screen package, or schema path reference in the generated registry.

Add `Read First:` references to system tasks in these groups:

- persistence
- heuristic AI
- strategic AI
- mod system
- visual fidelity
- spell/artifact runtime tasks

Acceptance:

- A single-task agent sees at least one architecture or schema anchor for every non-trivial system task.
- Add a lint warning or report section for unanchored tasks.

## Phase 4 - Ownership And Lint Tightening

### 4.1 Reject Unsafe Owned-Path Opt-Outs

Extend task lint:

- If `Owned Paths: (none)` is present and `Outputs:` mentions `src/`, `content-schema/`, `resources/`, or phrases like "Update handler", fail lint.
- Require a reason for any owned-path opt-out.

Acceptance:

- `mvp.09-tactical-combat.09` is fixed.
- Future integration tasks cannot describe code edits without ownership.

### 4.2 Strengthen Shared Ownership Rules

For tasks with `Owned Paths (shared):`, require acceptance criteria that state:

- what is additive
- what must not be rewritten
- which task owns the primary contract

Acceptance:

- Shared paths remain extension points, not accidental overwrite zones.

### 4.3 Add Readiness Metrics To The Report

Extend `scripts/generate-task-system-report.mjs` with:

- task command literal violations
- unanchored system-task count
- unsafe owned-path opt-out count
- UI task derived schema coverage
- secondary skill contract status, if tracked as a checklist

Acceptance:

- The generated report reflects semantic readiness, not only structural readiness.

## Phase 5 - Final Readiness Gate

After phases 1-4:

```bash
npm run generate:task-registry
npm run generate:task-system-report
npm run generate:wiki
npm run validate
npm test
npm run tasks:next
npm run tasks:next:mvp
```

Expected final state:

- validation green
- tests green
- no command-name drift in task prose
- no unsafe owned-path opt-outs
- no missing secondary-skill source of truth
- UI data contracts expose domain schemas
- task-system report includes semantic readiness counters
- `tasks:next` still exposes the correct MVP starter task

## Recommended Execution Order

1. Phase 1.1 task command literal lint.
2. Phase 1.2-1.5 command vocabulary rewrites.
3. Phase 4.1 owned-path opt-out lint and tactical-combat ownership fix.
4. Phase 2.1-2.4 secondary skill repair.
5. Phase 3.1-3.2 UI data-contract traceability.
6. Phase 3.3 system anchors.
7. Phase 4.2-4.3 report improvements.
8. Phase 5 final gate.

## Success Criteria

The readiness score can be raised to 9.5+ when:

- task prose cannot introduce non-canonical commands without lint failure
- schema-backed command payloads match task examples
- secondary skills are split into executable tasks with schema-compatible behavior
- every significant system task has an architecture or schema anchor
- screen data contracts cite domain schemas
- integration tasks have explicit owned paths
- all validators and tests pass

