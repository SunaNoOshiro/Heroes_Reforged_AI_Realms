# Codex Execution Plan — Task System Improvements (2026-04-30)

- **Date**: 2026-04-30
- **Source audit**: [`AUDIT-2026-04-30-TASK-SYSTEM-FULL-CONSISTENCY.md`](AUDIT-2026-04-30-TASK-SYSTEM-FULL-CONSISTENCY.md)
- **Target executor**: Codex (or any autonomous coding agent)
- **Goal**: take the task system from **9.3/10** ("autonomous-AI-ready with three known frictions") to **10/10** ("autonomous-AI-ready end-to-end with the MVP lane fully self-contained, the map-editor surface fully scoped, and wrapper invariants enforced by the linter") — without expanding scope or implementing any task body.

This file is **self-contained**. Codex starts cold and should not need to load the parent audit unless explicitly told to. Every step states the problem, the exact change, the verification, and the success signal.

---

## Operating Rules for Codex

1. **One step at a time.** Finish a step's *Verify* before moving to the next.
2. **Do not expand scope.** If a step seems to require a refactor, stop and ask. Each step is scoped to ≤ 90 minutes of editing.
3. **Never skip hooks.** Run `npm run validate` and `npm test` exactly as written.
4. **Do not commit unless the user asks.** Stage edits; surface the diff at the end.
5. **After every step that mutates a task `.md` file under `tasks/` or any module index file**, run this idempotent pair:

   ```bash
   npm run generate:task-registry
   npm run generate:task-system-report
   ```

6. **Stop on red.** If a verify step fails, stop. Do not "fix forward" by editing more files unless the failure is the *expected* failure described in this plan.
7. **Do not edit any source code under `src/` or any schema under `content-schema/schemas/`.** This plan only mutates `tasks/` `.md` files, `scripts/tasks.mjs` (lint extension), `tasks/README.md`, and the registry/report regeneration outputs. If a step tempts you to edit anything else, stop.
8. **Do not call `tasks:done` against any task.** This plan changes infrastructure, not execution state.

Working directory for every command: repo root (`/Users/suna_no_oshiro/Documents/fun-gpt/Heroes_Reforged_AI_Realms`). Do not `cd` into subfolders.

---

## Step 0 — Snapshot the current state (no edits)

Confirm the starting baseline so each later step has a known-good comparison.

```bash
npm run validate          # expected: full chain green
npm test                  # expected: all tests pass
npm run tasks:next        # expected: 1 ready task (the engine-core root)
```

**Expected baseline:**
- `validate:tasks` → `Task lint passed: 274 tasks, 0 issues.`
- `validate:links`, `validate:contracts`, `validate:cross-refs`, `validate:commands` → all green.
- `npm test` → all subtests pass.
- Registry: `274 tasks, 23 modules`.

If the baseline differs, **stop** and report. Do not proceed.

Capture the baseline counts for later comparison:

```bash
node -e "const r=require('./tasks/task-registry.json');console.log('tasks:',r.tasks.length,'modules:',r.modules.length)"
```

Expect: `tasks: 274 modules: 23`.

---

# TIER 1 — Fix lane-leak issues (3 steps, ≤ 1 day total)

## Step 1 — Move `equip-unequip-artifact-commands` from MVP to phase-2

**Problem.** `tasks/mvp/05-adventure-map/16-equip-unequip-artifact-commands.md` declares a dependency on `phase-2.01-spells-artifacts.05-artifact-paper-doll-system`. With strict MVP-lane execution (`tasks:next:mvp`), it can never become ready because the paper-doll task is in phase-2. The task belongs in phase-2 next to its only true dependency.

**Edit.**

1. Move the file:

   ```bash
   git mv tasks/mvp/05-adventure-map/16-equip-unequip-artifact-commands.md \
          tasks/phase-2/01-spells-artifacts/05a-equip-unequip-artifact-commands.md
   ```

2. Open the moved file. Replace the `Module:` line:

   - Before: `Module: Adventure Map (M1) -> ../05-adventure-map.md`
   - After: `Module: Spells & Artifacts (P2) -> ../01-spells-artifacts.md`

3. In the same file, in the `Read First:` block, fix the relative-path depths (`../../../` is unchanged because both old and new locations are 3 deep). Verify the schema/screen package paths still resolve from the new location — they do, all reference paths are root-relative. **No further edits needed in `Read First`.**

4. In the `Dependencies:` block, leave both deps as-is. They are already correctly formed:

   ```
   Dependencies:
   - mvp.05-adventure-map.01-strategic-game-state-model
   - phase-2.01-spells-artifacts.05-artifact-paper-doll-system
   ```

5. Update the **MVP module index** [`tasks/mvp/05-adventure-map.md`](../../tasks/mvp/05-adventure-map.md). Delete the two lines (43–44) that read:

   ```
   - 16-equip-unequip-artifact-commands.md (05-adventure-map/16-equip-unequip-artifact-commands.md)
     🧠 Task 16: Equip/unequip artifact commands (~4h)
   ```

   Do **not** renumber the remaining tasks (17, 18, 19, 20, 21). Numbers are stable IDs.

6. Update the **phase-2 module index** [`tasks/phase-2/01-spells-artifacts.md`](../../tasks/phase-2/01-spells-artifacts.md). Insert this block immediately after the existing line for `05-artifact-paper-doll-system.md` (currently around line 32–33), preserving the alphabetical grouping under "Spell and artifact systems":

   ```markdown
   - 05a-equip-unequip-artifact-commands.md (01-spells-artifacts/05a-equip-unequip-artifact-commands.md)
     🧠 Equip/unequip artifact commands (~4h)
   ```

7. Update the module's `**Total Estimate**` line at the top: bump from `~74 hours` to `~78 hours` (added 4 h).

8. Update the MVP module's `**Total Estimate**` at the top of [`tasks/mvp/05-adventure-map.md`](../../tasks/mvp/05-adventure-map.md): drop from `~76 hours` to `~72 hours`.

**Verify.**

```bash
npm run generate:task-registry
npm run generate:task-system-report
npm run validate
npm test
```

Then assert the move landed correctly:

```bash
node -e "const r=require('./tasks/task-registry.json');const t=r.tasks.find(x=>x.id==='phase-2.01-spells-artifacts.05a-equip-unequip-artifact-commands');console.log(t?'OK':'MISSING',t?.taskDependencies);"
node -e "const r=require('./tasks/task-registry.json');console.log('mvp leak still present?', r.tasks.some(x=>x.id==='mvp.05-adventure-map.16-equip-unequip-artifact-commands'));"
```

**Success signal.** First command prints `OK [...two deps...]`. Second prints `mvp leak still present? false`. `validate:tasks` reports 274 tasks (unchanged: one was renamed, not added).

---

## Step 2 — Move `transfer-hero-artifact-command` from MVP to phase-2

**Problem.** Same as Step 1 — `tasks/mvp/05-adventure-map/19-transfer-hero-artifact-command.md` depends on the phase-2 paper-doll task and silently never surfaces in `tasks:next:mvp`.

**Edit.**

1. Move the file:

   ```bash
   git mv tasks/mvp/05-adventure-map/19-transfer-hero-artifact-command.md \
          tasks/phase-2/01-spells-artifacts/05b-transfer-hero-artifact-command.md
   ```

2. In the moved file, replace the `Module:` line:

   - Before: `Module: Adventure Map (M1) -> ../05-adventure-map.md`
   - After: `Module: Spells & Artifacts (P2) -> ../01-spells-artifacts.md`

3. In the `Dependencies:` block, leave deps as-is:

   ```
   Dependencies:
   - mvp.05-adventure-map.01-strategic-game-state-model
   - mvp.05-adventure-map.03-hero-movement
   - phase-2.01-spells-artifacts.05-artifact-paper-doll-system
   - mvp.01-engine-core.06-command-dispatcher
   ```

4. Update the **MVP module index** [`tasks/mvp/05-adventure-map.md`](../../tasks/mvp/05-adventure-map.md). Delete the two lines (49–50) that read:

   ```
   - 19-transfer-hero-artifact-command.md (05-adventure-map/19-transfer-hero-artifact-command.md)
     🤖 Task 19: Transfer hero artifact command (~3h)
   ```

5. Update the **phase-2 module index** [`tasks/phase-2/01-spells-artifacts.md`](../../tasks/phase-2/01-spells-artifacts.md). Insert immediately after the new `05a-...` line you added in Step 1:

   ```markdown
   - 05b-transfer-hero-artifact-command.md (01-spells-artifacts/05b-transfer-hero-artifact-command.md)
     🤖 Transfer hero artifact command (~3h)
   ```

6. Update the phase-2 module's `**Total Estimate**`: bump from `~78 hours` (after Step 1) to `~81 hours` (added 3 h).

7. Update the MVP module's `**Total Estimate**`: drop from `~72 hours` to `~69 hours`.

**Verify.**

```bash
npm run generate:task-registry
npm run generate:task-system-report
npm run validate
npm test
```

Then assert no MVP→phase-2 leaks remain:

```bash
node -e "const r=require('./tasks/task-registry.json');const leaks=r.tasks.filter(x=>x.id.startsWith('mvp.')&&x.taskDependencies.some(d=>d.startsWith('phase-')));console.log('mvp leaks:',leaks.map(t=>t.id));"
```

**Success signal.** Output: `mvp leaks: []`. Lint stays green.

---

## Step 3 — Drop the phase-3 dep from the hotseat screen, add a state-machine task

**Problem.** [`tasks/phase-2/07-ui-screen-backlog/63-hotseat-turn-handoff-screen.md`](../../tasks/phase-2/07-ui-screen-backlog/63-hotseat-turn-handoff-screen.md) depends on `phase-3.01-multiplayer.08-multiplayer-ui-lobby-invite-link-in-game-status`. Hotseat is a local pass-the-keyboard surface and has nothing to do with WebRTC multiplayer. The dep is wrong, and it forces phase-2 completion to wait for phase-3.

**Edit.**

1. Create a new state-machine task at `tasks/phase-2/08-meta-systems/07-hotseat-turn-state-machine.md`. Use the canonical task template — copy the structure from [`tasks/phase-2/08-meta-systems/05-status-history-store.md`](../../tasks/phase-2/08-meta-systems/05-status-history-store.md) and adapt:

   ```markdown
   # Hotseat Turn State Machine

   Status: planned

   Module: Meta Systems (P2) -> ../08-meta-systems.md

   Description:
   Local-only state machine that hands off the active player seat between
   human players sitting at the same machine. No network. Lives entirely
   in the deterministic engine — same command log, same hash, same replay.

   Read First:
   - [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
   - [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)
   - `docs/architecture/wiki/screens/63-hotseat-turn-handoff/spec.md`
   - `docs/architecture/wiki/screens/63-hotseat-turn-handoff/interactions.md`
   - `docs/architecture/wiki/screens/63-hotseat-turn-handoff/data-contracts.md`

   Inputs:
   - `AdventureState.players[]` and `activePlayerId` from `mvp.05-adventure-map.01-strategic-game-state-model`
   - `END_DAY` from `mvp.01-engine-core.06-command-dispatcher`
   - Screen package `docs/architecture/wiki/screens/63-hotseat-turn-handoff/`

   Outputs:
   - `src/engine/hotseat/turn-state-machine.ts`
   - `BEGIN_HOTSEAT_HANDOFF` and `CONFIRM_HOTSEAT_HANDOFF` reducers
   - Seat order resolution: round-robin over `players[]` filtered by `controller === "local-human"`

   Owned Paths:
   - `src/engine/hotseat/turn-state-machine.ts`

   Dependencies:
   - mvp.05-adventure-map.01-strategic-game-state-model
   - mvp.05-adventure-map.02-turn-structure
   - mvp.01-engine-core.06-command-dispatcher

   Acceptance Criteria:
   - `BEGIN_HOTSEAT_HANDOFF` validates that `END_DAY` was the last command and
     that the next seat is local-human; otherwise returns `ValidationError`
   - `CONFIRM_HOTSEAT_HANDOFF` advances `activePlayerId` to the next local-human
     seat and unblocks input; replay produces identical hashes
   - State machine has exactly three states: `idle`, `awaiting_confirm`,
     `handed_off` — encoded as a `phase` enum on `AdventureState`, no shadow
     state stored elsewhere
   - Screen `63-hotseat-turn-handoff` dispatches both commands through the
     shared command hook
   - No network, no timers, no `Date.now()`

   Verify:
   - npm run validate
   - npm test

   Estimated Time:
   - 3 hours
   ```

2. Update [`tasks/phase-2/08-meta-systems.md`](../../tasks/phase-2/08-meta-systems.md). Append after the existing line for `06-caravan-transfer-command.md`:

   ```markdown
   - 07-hotseat-turn-state-machine.md (08-meta-systems/07-hotseat-turn-state-machine.md)
     🧠 Task 7: Hotseat turn state machine (~3h)
   ```

   Update the module's `**Total Estimate**`: from `~21 hours` to `~24 hours`.

3. Open the wrapper [`tasks/phase-2/07-ui-screen-backlog/63-hotseat-turn-handoff-screen.md`](../../tasks/phase-2/07-ui-screen-backlog/63-hotseat-turn-handoff-screen.md). Replace the **single** offending dep line:

   - Before: `- phase-3.01-multiplayer.08-multiplayer-ui-lobby-invite-link-in-game-status`
   - After:  `- phase-2.08-meta-systems.07-hotseat-turn-state-machine`

   Leave the other three deps (shell / store / command-hook) unchanged.

**Verify.**

```bash
npm run generate:task-registry
npm run generate:task-system-report
npm run validate
npm test
```

Then assert no phase-2→phase-3 leaks remain:

```bash
node -e "const r=require('./tasks/task-registry.json');const leaks=r.tasks.filter(x=>x.id.startsWith('phase-2.')&&x.taskDependencies.some(d=>d.startsWith('phase-3.')));console.log('phase-2 leaks:',leaks.map(t=>t.id));"
node -e "const r=require('./tasks/task-registry.json');console.log('hotseat sm exists:', !!r.tasks.find(x=>x.id==='phase-2.08-meta-systems.07-hotseat-turn-state-machine'));"
```

**Success signal.** Output: `phase-2 leaks: []` and `hotseat sm exists: true`. Total task count is now **275** (added 1). Lint and tests stay green.

---

# TIER 2 — Close the map-editor scope gap (3 steps, ≤ 1 day total)

## Step 4 — Add map-editor command-set engine task

**Problem.** [`tasks/phase-2/07-ui-screen-backlog/65-map-editor-screen.md`](../../tasks/phase-2/07-ui-screen-backlog/65-map-editor-screen.md) is a 3-hour wrapper that "dispatches the listed commands" — but the commands a real map editor needs (terrain brush, place hero/town/mine/object, victory condition, layer toggle) do not exist in [`content-schema/schemas/command.schema.json`](../../content-schema/schemas/command.schema.json) and no engine task owns them. An autonomous agent will produce a stub editor and report success.

**Edit.**

Create `tasks/phase-2/04-content-editor/08-map-editor-commands.md`:

```markdown
# Map Editor Commands

Status: planned

Module: Content Editor (M4) -> ../04-content-editor.md

Description:
Promote map-editor mutations into deterministic schema-backed commands so
the editor screen can dispatch through the same command log as gameplay.
The editor never mutates map state directly — every brush stroke,
placement, and condition change is a command.

Read First:
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)
- `docs/architecture/wiki/screens/65-map-editor/spec.md`
- `docs/architecture/wiki/screens/65-map-editor/interactions.md`
- `docs/architecture/wiki/screens/65-map-editor/data-contracts.md`

Inputs:
- `MapStorage` from `mvp.03-map-system.03-layered-tile-storage`
- Tile type registry from `mvp.03-map-system.02-tile-type-registry`
- Map object schema (`content-schema/schemas/map-object.schema.json`)
- World schema (`content-schema/schemas/world.schema.json`)
- Underground layer support from `mvp.03-map-system.10-underground-layer-support`

Outputs:
- `src/engine/commands/map-editor-commands.ts`
- New entries added to `content-schema/schemas/command.schema.json`:
  - `EDITOR_SET_TILE` (terrain brush, single hex)
  - `EDITOR_PLACE_HERO`
  - `EDITOR_PLACE_TOWN`
  - `EDITOR_PLACE_MINE`
  - `EDITOR_PLACE_MAP_OBJECT`
  - `EDITOR_REMOVE_OBJECT`
  - `EDITOR_TOGGLE_UNDERGROUND_LAYER`
  - `EDITOR_SET_VICTORY_CONDITION`
  - `EDITOR_SET_DEFEAT_CONDITION`
- Each reducer validates: target hex in bounds, layer legal, content
  references resolve through the active pack registry, and required
  prerequisites are met (e.g. cannot place a town on water)

Owned Paths:
- `src/engine/commands/map-editor-commands.ts`
- `content-schema/schemas/command.schema.json` (shared)

Owned Paths (shared):
- `content-schema/schemas/command.schema.json`

Dependencies:
- mvp.01-engine-core.06-command-dispatcher
- mvp.01-engine-core.06b-extend-command-schema-coverage-checklist
- mvp.03-map-system.03-layered-tile-storage
- mvp.03-map-system.10-underground-layer-support
- mvp.02-content-schemas.08-adventure-building-plus-map-object-schemas
- mvp.02-content-schemas.15-world-schema

Acceptance Criteria:
- All nine commands have entries in `command.schema.json` and pass
  `npm run validate:commands`
- Each reducer is deterministic, integer-only, and replay-safe
- `EDITOR_SET_TILE` rejects out-of-bounds and unknown tile-type IDs
- `EDITOR_PLACE_*` commands reject placements that violate terrain
  prerequisites declared on the placed entity
- Round-trip: a sequence of editor commands → serialized state →
  reload → identical hash
- `screen-command-coverage.json` no longer needs to mark the
  corresponding tokens as out-of-scope (Step 6 removes them)

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
```

Update [`tasks/phase-2/04-content-editor.md`](../../tasks/phase-2/04-content-editor.md):

- Append after `07-editor-integration-test.md`:

  ```markdown
  - 08-map-editor-commands.md (04-content-editor/08-map-editor-commands.md)
    🧠⚠️ Task 8: Map editor commands (~5h)
  ```

- Update `**Total Estimate**`: `~24 hours` → `~29 hours`.

**Verify.**

```bash
npm run generate:task-registry
npm run generate:task-system-report
npm run validate
npm test
node -e "const r=require('./tasks/task-registry.json');console.log('map-editor cmds:', !!r.tasks.find(x=>x.id==='phase-2.04-content-editor.08-map-editor-commands'));"
```

**Success signal.** New task in registry; lint passes. Total task count is now **276**.

---

## Step 5 — Add map-editor object-palette task

**Problem.** The H3 editor exposes a categorical object palette (mines, dwellings, banks, artifacts, events). The palette must enumerate from the active pack registry — there is no task that owns this enumeration.

**Edit.**

Create `tasks/phase-2/04-content-editor/09-map-editor-object-palette.md`:

```markdown
# Map Editor Object Palette

Status: planned

Module: Content Editor (M4) -> ../04-content-editor.md

Description:
Read-only enumeration adapter that walks the active content registries
and groups placeable map objects, adventure buildings, neutral stack
templates, and resource mines into the categorical buckets the editor
palette renders. The palette never resolves assets directly — it emits
stable IDs and lets the renderer's resolver fall back per asset-index
rules.

Read First:
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)
- `docs/architecture/wiki/screens/65-map-editor/spec.md`
- `docs/architecture/wiki/screens/65-map-editor/data-contracts.md`

Inputs:
- Pack registry from `mvp.02b-asset-pipeline.01-manifest-format-plus-pack-registry`
- Map object schema (`content-schema/schemas/map-object.schema.json`)
- Adventure building schema (`content-schema/schemas/adventure-building.schema.json`)
- Neutral stack template schema (`content-schema/schemas/neutral-stack-template.schema.json`)

Outputs:
- `src/editor/map-editor/object-palette.ts`
- `enumerateMapObjectPalette(registry: PackRegistry): PaletteCategory[]`
- `PaletteCategory`: `{ id: "mines" | "dwellings" | "banks" | "artifacts" | "events" | "scripted" | "decorative", label: string, items: PaletteItem[] }`
- `PaletteItem`: `{ stableId: string, label: string, iconAssetId: string, terrainPrerequisites: string[] }`

Owned Paths:
- `src/editor/map-editor/object-palette.ts`

Dependencies:
- mvp.02b-asset-pipeline.01-manifest-format-plus-pack-registry
- mvp.02-content-schemas.08-adventure-building-plus-map-object-schemas
- phase-2.04-content-editor.01-editor-routing-plus-shell

Acceptance Criteria:
- All categories enumerated from the active registry; no hardcoded IDs
- Items are sorted by `label` within a category (stable, deterministic)
- Terrain prerequisites surface as a string array; the editor can use
  them to grey out placements at brush time
- Switching the active pack (Emberwild → Necropolis) re-enumerates with
  no engine restart
- Function is pure: same registry input → same output

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
```

Update [`tasks/phase-2/04-content-editor.md`](../../tasks/phase-2/04-content-editor.md):

- Append after the new `08-map-editor-commands.md` line:

  ```markdown
  - 09-map-editor-object-palette.md (04-content-editor/09-map-editor-object-palette.md)
    🤖 Task 9: Map editor object palette (~3h)
  ```

- Update `**Total Estimate**`: `~29 hours` → `~32 hours`.

**Verify.**

```bash
npm run generate:task-registry
npm run generate:task-system-report
npm run validate
npm test
```

**Success signal.** Lint passes; total task count is now **277**.

---

## Step 6 — Wire the wrapper to its new dependencies

**Problem.** Even with Steps 4 and 5, the [`65-map-editor-screen`](../../tasks/phase-2/07-ui-screen-backlog/65-map-editor-screen.md) wrapper still has the old shallow dep list and a 3-hour estimate. Make the wrapper's dependency graph match the new reality.

**Edit.**

Open [`tasks/phase-2/07-ui-screen-backlog/65-map-editor-screen.md`](../../tasks/phase-2/07-ui-screen-backlog/65-map-editor-screen.md). In the `Dependencies:` block, *append* (do not replace) two lines:

```
- phase-2.04-content-editor.08-map-editor-commands
- phase-2.04-content-editor.09-map-editor-object-palette
```

In the `Acceptance Criteria:` block, append one line:

```
- All map-editing tokens listed in `docs/architecture/wiki/screens/65-map-editor/interactions.md`
  dispatch live commands registered in `command.schema.json` (no STUB
  fallbacks for terrain-brush, object-place, victory-condition, or
  layer-toggle tokens)
```

Bump `Estimated Time:` from `- 3 hours` to `- 5 hours`.

**Verify.**

```bash
npm run generate:task-registry
npm run generate:task-system-report
npm run validate
npm test
node -e "const r=require('./tasks/task-registry.json');const t=r.tasks.find(x=>x.id==='phase-2.07-ui-screen-backlog.65-map-editor-screen');console.log('deps:',t.taskDependencies.length,'est:',t.estimatedTime);"
```

**Success signal.** `deps: 4` (was 2), `est: - 5 hours`. Lint stays green.

---

# TIER 3 — Strengthen wrapper invariants (1 step, ≤ 60 min)

## Step 7 — Add a `validate:tasks` rule that wrappers depend on a non-shell task

**Problem.** All 51 entries in [`tasks/phase-2/07-ui-screen-backlog/`](../../tasks/phase-2/07-ui-screen-backlog/) are 3-hour wrappers. Many depend only on UI shell tasks, meaning they can pass acceptance without any underlying engine functionality. The audit's recommendation: the linter should require every screen-backlog wrapper to declare ≥ 1 dep that is **not** a UI shell task and **not** another wrapper.

**Edit.**

1. Add module metadata:

   - In `tasks/mvp/07-ui-shell.md`, add `**Lint Tags**: ui-shell`.
   - In `tasks/phase-2/07-ui-screen-backlog.md`, add
     `**Lint Tags**: screen-wrapper`.

2. Extend [`scripts/generate-task-registry.mjs`](../../scripts/generate-task-registry.mjs)
   so module records include a `lintTags: string[]` field parsed from
   `**Lint Tags**:`.

3. Open [`scripts/tasks.mjs`](../../scripts/tasks.mjs). Find the
   `lintRegistry` loop. After the existing `unresolved dependency`
   block but before the `screenPackages` loop, insert a metadata-driven
   wrapper rule:

```js
// Wrapper-rule: modules tagged "screen-wrapper" must declare at least
// one dependency outside modules tagged "ui-shell" or "screen-wrapper".
// Without such a dependency, a wrapper can ship before any engine reducer,
// schema, or content task provides the behavior it renders.
if (moduleHasTag(t.moduleId, "screen-wrapper")) {
  const nonShellNonWrapper = (t.taskDependencies || []).filter((dep) =>
    !moduleHasTag(tasksById.get(dep)?.moduleId, "ui-shell") &&
    !moduleHasTag(tasksById.get(dep)?.moduleId, "screen-wrapper")
  );
  if (nonShellNonWrapper.length === 0) {
    problems.push(
      `${t.path}: screen-wrapper task must depend on at least one non-shell, non-wrapper task ` +
      `(engine reducer, schema, or content task) so it cannot ship without underlying functionality`
    );
  }
}
```

**Verify.**

```bash
npm run validate:tasks
```

This will likely **fail with N new violations**. That is the expected outcome — record the list:

```bash
npm run validate:tasks 2>&1 | tee /tmp/wrapper-lint-violations.txt
```

**Do not fix the violations in this step.** Each violation is a real underlying issue that needs a per-screen audit (Step 8). Confirm only that:

- The rule fires on **at least one** task in a `screen-wrapper` module.
- The rule does **not** fire on `phase-2.07-ui-screen-backlog.65-map-editor-screen` (which Step 6 made compliant).

If the rule fires on the map-editor screen, Step 6 was applied incorrectly — go back.

**Success signal.** `validate:tasks` exits non-zero. The output lists wrapper violations but does **not** include the map-editor screen.

> **Important**: this is the *only* step in this plan that intentionally leaves the validator red. Every subsequent step must run with the rule in effect, and Step 8 brings it back to green.

---

## Step 8 — Resolve the wrapper violations

**Problem.** Step 7 surfaced N wrappers that need a non-shell, non-wrapper dependency. The audit names a suspected subset (`10-puzzle-map`, `12-creature-bank-loot`, `27-thieves-guild`, `30-build-tree`, `45-tactics-phase`). The full list is in `/tmp/wrapper-lint-violations.txt` from Step 7.

**Edit.**

For each violating wrapper:

1. Open the wrapper file.
2. Look up the screen package's `interactions.md` to find the schema-backed commands or selectors it needs (e.g. for `45-tactics-phase`, the engine task is [`mvp.09-tactical-combat.12-tactics-phase-engine`](../../tasks/mvp/09-tactical-combat/12-tactics-phase-engine.md)).
3. Add the matching engine task to `Dependencies:`.

A non-exhaustive mapping (verify each by reading the screen package; do not blindly trust this table):

| Wrapper | Likely engine dep |
|---|---|
| `10-puzzle-map-screen` | `mvp.05-adventure-map.21-map-object-visit-and-battle-initiation-commands` (obelisk-visit reveal flow) |
| `12-creature-bank-loot-screen` | `mvp.05-adventure-map.14-collect-creature-bank-reward-command` |
| `27-thieves-guild-screen` | `mvp.05-adventure-map.21-map-object-visit-and-battle-initiation-commands` |
| `30-build-tree-screen` | `mvp.05-adventure-map.05-town-visit-recruit-build-mage-guild` |
| `45-tactics-phase-screen` | `mvp.09-tactical-combat.12-tactics-phase-engine` |
| `48-level-up-dialog-screen` | `phase-2.01-spells-artifacts.00-hero-leveling` |
| `52-artifact-combine-dialog-screen` | `phase-2.01-spells-artifacts.06-combination-artifacts-detect-set-apply-bonus` |

If a violating wrapper has **no plausible existing engine task**, do **not** invent one — instead, append the wrapper to a new file `docs/planning/audits/PLAN-2026-04-30-CODEX-FOLLOWUP.md` (create it on the first such case) under a `## Wrappers needing new engine tasks` heading, and remove it from this step. **Stop and ask the user** before creating the follow-up file.

**Verify.**

After every wrapper edit, run:

```bash
npm run generate:task-registry
npm run validate:tasks
```

When all violations are addressed:

```bash
npm run validate
npm test
```

**Success signal.** `validate:tasks` is green. The new wrapper-rule from Step 7 is now actively enforcing on every future regeneration.

---

# TIER 4 — Registry ergonomics for parallel AI execution (optional, 2 steps)

> **Skip this tier unless the user explicitly approves.** Steps 9–10 add a new field and a new flag. The system works without them; they reduce wall-clock time when an AI agent runs multiple tasks in parallel.

## Step 9 — Add `downstreamCount` to the registry generator

**Edit.**

Open [`scripts/generate-task-registry.mjs`](../../scripts/generate-task-registry.mjs). After the registry's `tasks` array is fully populated and resolved dependencies are computed, add a post-processing pass:

```js
// downstreamCount: how many tasks transitively depend on this one.
// Useful as a priority signal: ready tasks with high downstreamCount unlock
// the most parallel work next.
{
  const reverse = new Map();
  for (const t of registry.tasks) {
    for (const dep of t.taskDependencies || []) {
      if (!reverse.has(dep)) reverse.set(dep, []);
      reverse.get(dep).push(t.id);
    }
  }
  const memo = new Map();
  function count(id) {
    if (memo.has(id)) return memo.get(id);
    memo.set(id, 0); // cycle guard (should never fire — lint enforces no cycles)
    let total = 0;
    for (const child of reverse.get(id) || []) {
      total += 1 + count(child);
    }
    memo.set(id, total);
    return total;
  }
  for (const t of registry.tasks) {
    t.downstreamCount = count(t.id);
  }
}
```

**Verify.**

```bash
npm run generate:task-registry
node -e "const r=require('./tasks/task-registry.json');const t=r.tasks.find(x=>x.id==='mvp.01-engine-core.01-initialize-root-workspace-and-module-layout');console.log('root downstream:',t.downstreamCount);"
```

**Success signal.** Output is a positive integer ≈ 270 (the root task transitively unlocks nearly the whole backlog).

---

## Step 10 — Add `tasks:next --hot` to surface highest-fan-out ready tasks

**Edit.**

In [`scripts/tasks.mjs`](../../scripts/tasks.mjs), find `parseNextOptions` and `printNext`. Extend `parseNextOptions` to accept a `--hot` flag (boolean), and in `printNext`, when `options.hot` is true, sort the ready list by `downstreamCount` descending before printing.

Add a script alias to [`package.json`](../../package.json):

```json
"tasks:next:hot": "node scripts/tasks.mjs next --hot"
```

**Verify.**

```bash
npm run tasks:next:hot
```

**Success signal.** Command prints the same set of ready tasks but ordered by `downstreamCount` desc. Without `--hot`, ordering remains topological as before.

---

# Step 11 — Final regeneration and confirmation

After all approved tiers complete:

```bash
npm run generate:task-registry
npm run generate:task-system-report
npm run validate            # full chain
npm test                    # all green
npm run tasks:next:mvp      # expected: ≥ 1 ready task
```

Read the regenerated [`docs/planning/task-system-report.md`](../planning/task-system-report.md). Compare to the pre-fix baseline:

- Inventory totals should be: **277 tasks** (after Tier 1 + Tier 2: −2 mvp +2 phase-2 +1 hotseat-sm +2 map-editor = +3 net), **23 modules** (unchanged), **65 screens** (unchanged), **33 schemas** (unchanged).
- "Final Goal Status" table should still report `Yes` across all rows.
- "Dependency Health" should still report `No dependency cycles or unresolved dependency entries detected.`
- The Execution Queue ready-list should remain as before (only the root task ready until M0 work begins).

Re-run the leak guards:

```bash
node -e "const r=require('./tasks/task-registry.json');const mvp=r.tasks.filter(x=>x.id.startsWith('mvp.')&&x.taskDependencies.some(d=>d.startsWith('phase-')));const p2=r.tasks.filter(x=>x.id.startsWith('phase-2.')&&x.taskDependencies.some(d=>d.startsWith('phase-3.')));console.log('mvp leaks:',mvp.length,'phase-2 leaks:',p2.length);"
```

**Expected**: `mvp leaks: 0 phase-2 leaks: 0`.

---

## Definition of Done

The plan is complete when **all** of the following hold (Tier 4 boxes optional):

- [ ] `npm run validate` exits 0.
- [ ] `npm test` passes.
- [ ] `npm run tasks:next:mvp` returns at least one ready task.
- [ ] No MVP task depends on a phase-2 or phase-3 task.
- [ ] No phase-2 task depends on a phase-3 task.
- [ ] `tasks/phase-2/01-spells-artifacts/05a-equip-unequip-artifact-commands.md` exists; old MVP file is gone.
- [ ] `tasks/phase-2/01-spells-artifacts/05b-transfer-hero-artifact-command.md` exists; old MVP file is gone.
- [ ] `tasks/phase-2/08-meta-systems/07-hotseat-turn-state-machine.md` exists.
- [ ] `tasks/phase-2/04-content-editor/08-map-editor-commands.md` exists.
- [ ] `tasks/phase-2/04-content-editor/09-map-editor-object-palette.md` exists.
- [ ] `phase-2.07-ui-screen-backlog.65-map-editor-screen` lists both new content-editor tasks in `Dependencies:` and is bumped to 5 h.
- [ ] `scripts/tasks.mjs lint` enforces the wrapper-rule from Step 7 (`screen-wrapper` module tasks must declare ≥ 1 non-shell, non-wrapper dep) and is green.
- [ ] No `tasks:done` was called against any task during this plan.
- [ ] *(Tier 4 only, optional)* Every task in the registry has a `downstreamCount` field and `npm run tasks:next:hot` works.

When all required boxes are checked, surface a one-line summary diff (paths only) for review and stop. Do not commit.

---

## Out of Scope (do not do these)

- Implementing any task body (no `src/` edits, no schema content edits beyond Step 4's `command.schema.json` entry-list **declaration** in the task file's Outputs — the actual schema edits happen when the task itself is implemented later).
- Modifying engine, renderer, UI, or content under `src/` or `content-schema/`.
- Renaming, deleting, or splitting any task **not** named in Steps 1–10.
- Marking any task `done` or `in-progress`.
- Editing the audit report file ([`AUDIT-2026-04-30-TASK-SYSTEM-FULL-CONSISTENCY.md`](AUDIT-2026-04-30-TASK-SYSTEM-FULL-CONSISTENCY.md)).
- Editing any other audit / plan file under `docs/planning/audits/`.
- Adding new validators or CI scripts (Step 7 extends an existing rule; Step 9–10 are optional and gated on user approval).

If a step seems to require any of the above, **stop and ask**.

---

## Cross-Reference

This plan addresses the following items from the source audit:

| Plan section | Audit item |
|---|---|
| Steps 1, 2 | Tier 1, item 1 (C1 — MVP→phase-2 lane leak) |
| Step 3 | Tier 1, items 2–3 (C2 — phase-2 hotseat → phase-3 dep + new state-machine task) |
| Steps 4, 5, 6 | Tier 2 (C3 — map-editor wrapper under-scoped + missing engine tasks) |
| Steps 7, 8 | Tier 3 (wrapper invariants — extend `validate:tasks` lint and resolve violations) |
| Steps 9, 10 | Tier 4 (registry ergonomics — `downstreamCount` + `--hot`) |

The audit's Tier 5 ("verification of every fix") is folded into each step's `Verify` block plus Step 11.
