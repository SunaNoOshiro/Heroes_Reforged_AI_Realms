# Tasks

This folder is the execution board for the project.

Use this file to:

- see the full task list
- mark major modules as done
- pick the next module to work on

Each linked module file is a small index page. Open it, then open only
the specific task file you want to implement.

For tools or agents that need structured access, use
`tasks/task-registry.json`. It is generated from the Markdown task files
and should be refreshed with `npm run generate:task-registry`.

For a readable AI-navigation and audit snapshot, use
[`docs/planning/task-system-report.md`](../docs/planning/task-system-report.md).
Regenerate it with `npm run generate:task-system-report` after changing
tasks, screen packages, schemas, or task-system scripts.

## Task-System Scripts

| Command | Use |
|---|---|
| `npm run generate:task-registry` | Rebuild `tasks/task-registry.json` from task Markdown. |
| `npm run generate:task-system-report` | Write `docs/planning/task-system-report.md` with inventory, screen ownership, schema ownership, and dependency health. |
| `npm run validate:tasks` | Fail on unresolved dependencies, dependency cycles, missing UI screen-package links, unowned screen packages, and unreferenced schemas. |
| `npm run tasks:pick` | The single recommended next task ID, with the action label (`continue` / `revalidate` / `implement`) on stderr. Canonical entry point for sequential work. |
| `npm run tasks:pick -- --show` | Same, plus the full task spec. |
| `npm run tasks:pick -- --json` | Same, machine-readable. Includes the next command to run. |
| `npm run tasks:next` | List planned tasks whose resolved dependencies are satisfied (`done` **or** `revalidate`), plus in-progress tasks. |
| `npm run tasks:next -- --phase=mvp` | Scope to a phase: `mvp`, `phase-2`, `phase-3`, or `phase-4`. |
| `npm run tasks:next -- --hot` | Order ready tasks by transitive fan-out so the most-unblocking task surfaces first. Useful for parallel agents. |
| `npm run tasks:next -- --json` | Emit machine-readable JSON (id, deps, downstream counts) for tools and parallel orchestrators. |
| `npm run tasks:status` | Per-module progress and the overall split: done / revalidate / in-progress / planned / blocked. |
| `npm run tasks:show -- <id>` | Print one task or module record. |
| `npm run tasks:start -- <id>` | Mark a task in-progress and regenerate the registry. |
| `npm run tasks:done -- <id>` | Run a task's verify commands and mark it done only if they pass. |
| `npm run tasks:revalidate -- <id>` | Promote a `revalidate`-status task (work was completed pre-gate) to a real `done` by running its verifyCommands and anchoring `completedAtSha` at the most recent commit that touched the task path. |
| `npm run tasks:blocked -- <id> "<reason>"` | Mark a task blocked with a reason. |
| `npm run tasks:lint` | Alias of `validate:tasks`. |

Read `task-system-report.md` as a map, not as the execution queue:
`tasks:next` tells an agent what can run now; the report tells an agent
which task owns each screen/schema and whether the backlog is schedulable.

## Ambient Reading

These architecture docs are not pinned by any single task's `Read First`
list — they apply across the whole backlog. Skim them once before
starting a new module:

- [`docs/architecture/master-plan.md`](../docs/architecture/master-plan.md)
  Compact single-file architecture summary.
- [`docs/architecture/glossary.md`](../docs/architecture/glossary.md)
  Stable project terms used across tasks, schemas, and docs.

## Default Operating Mode

Assume a solo developer with AI assistance unless a task says
otherwise.

- For the smallest route to a first playable build, follow
  [`docs/planning/solo-build-lane.md`](../docs/planning/solo-build-lane.md).
- For sequential work, start with `npm run tasks:pick`. It returns the
  single highest-priority next task and tells you (via stderr) whether
  to run `tasks:start`, `tasks:done`, or `tasks:revalidate`.
- For parallel agents, use `npm run tasks:next -- --phase=mvp --hot --json`
  to get the impact-ranked machine-readable queue.
- For strict milestone sequencing, use the module order below plus each
  task file's explicit dependencies.
- When the listed task numbers and the actual dependency chain differ,
  trust the task file's `Dependencies:` section.

## Structure

```text
tasks/
  mvp/
    01-engine-core.md              module checklist
    01-engine-core/                one file per task
  phase-2/
  phase-3/
```

## Task Marker Legend

Task filenames and module indexes carry small markers. They are
advisory — agents should treat each task's own body as the source of
truth for scope and acceptance.

| Marker | Meaning |
|---|---|
| 🤖 | Mostly mechanical / automatable — data entry, scaffolding, straightforward code. |
| 🧠 | Needs judgement — balance, design trade-offs, reference-data interpretation. |
| ⚠️ | Risky / foundational — touching this wrong will break downstream tasks (determinism, schemas, content hash). |

Combinations stack (e.g. 🧠⚠️ = judgement-heavy and risky).

## Recommended Order

Critical chain:

1. engine core
2. content schemas
3. asset pipeline
4. starter faction
5. map system
6. adventure map
7. renderer
8. UI shell
9. persistence
10. tactical combat
11. heuristic AI

After MVP, continue through phase 2 and then phase 3 unless a task file
states otherwise.

## Solo-Build Defers

These are important, but they are not required for the first internal
playable slice:

- all of `phase-2` (includes `06-visual-fidelity`, moved from the
  MVP lane on 2026-04-22 per audit I5)
- all of `phase-3`

Use them only after the playable slice already proves the engine,
content, map, and adventure loop.

## MVP

- [ ] [01-engine-core](mvp/01-engine-core.md)
  Deterministic foundation: RNG, fixed-point math, dispatcher, replay,
  CI.
- [ ] [02-content-schemas](mvp/02-content-schemas.md)
  Runtime content contracts for units, heroes, spells, artifacts,
  buildings, and related records.
- [ ] [02b-asset-pipeline](mvp/02b-asset-pipeline.md)
  Pack manifests, asset registry, loader, validation, and faction
  scaffold flow.
- [ ] [03-map-system](mvp/03-map-system.md)
  Hex coordinates, tile storage, pathfinding, fog, serialization.
- [ ] [04-faction-emberwild](mvp/04-faction-emberwild.md)
  First starter faction (reference pack), baseline ruleset, and content
  loader.
- [ ] [05-adventure-map](mvp/05-adventure-map.md)
  Strategic loop, hero movement, mines, towns, auto-resolve, victory.
- [ ] [06-renderer](mvp/06-renderer.md)
  WebGL2 rendering, camera, tactical field, animation timeline.
- [ ] [07-ui-shell](mvp/07-ui-shell.md)
  App shell, store, HUD, town modal, hero panel, command hook.
- [ ] [08-persistence](mvp/08-persistence.md)
  IndexedDB saves, scenarios, export/import.
- [ ] [09-tactical-combat](mvp/09-tactical-combat.md)
  Real tactical battle system with deterministic integer-formula rules.
- [ ] [10-heuristic-ai](mvp/10-heuristic-ai.md)
  Strategic and tactical AI, difficulty levels, worker execution.

## Phase 2

- [ ] [01-spells-artifacts](phase-2/01-spells-artifacts.md)
  Spells, artifacts, paper doll, skills, leveling.
- [ ] [02-strategic-ai](phase-2/02-strategic-ai.md)
  Better strategic planning, role assignment, long-horizon AI.
- [ ] [03-second-faction](phase-2/03-second-faction.md)
  Second playable faction plus faction-specific mechanics and balance.
- [ ] [04-content-editor](phase-2/04-content-editor.md)
  In-browser authoring tools with validation and preview.
- [ ] [05-mod-system](phase-2/05-mod-system.md)
  Zip pack loading, signatures, sandboxing, mod manager, starter packs.
- [ ] [06-visual-fidelity](phase-2/06-visual-fidelity.md)
  Overland-strategy presentation polish: terrain blending, UI chrome,
  siege and battle visuals. (Moved from MVP 2026-04-22.)
- [ ] [07-ui-screen-backlog](phase-2/07-ui-screen-backlog.md)
  One owning implementation task for each remaining numbered UI screen
  package not already covered by MVP, editor, multiplayer, or polish
  tasks.
- [ ] [08-meta-systems](phase-2/08-meta-systems.md)
  Campaign graph/runner, cinematic playback, quest log, and status
  history systems that anchor phase-2 screens to explicit runtime work.

## Phase 3

- [ ] [01-multiplayer](phase-3/01-multiplayer.md)
  Signaling, WebRTC, lockstep sync, desync tools, reconnection.
- [ ] [02-ai-generation](phase-3/02-ai-generation.md)
  Prompt-to-content pipeline, validation, balancing, generation UI.
- [ ] [03-mcts-ai](phase-3/03-mcts-ai.md)
  Advanced AI search and performance work.
- [ ] [04-polish](phase-3/04-polish.md)
  WebGPU option, sound system, ranked, tournament flow, launch pass.

## Deferred Mechanic Inventory

These named baseline-corridor mechanics are currently folded into parent
tasks rather than owning their own files. None block MVP. Split them
into dedicated task files only when their parent task is about to start.

- Necromancy raise-skeletons after battle (parent: `phase-2.03-second-faction.01-necropolis-units-json-7-units-plus-upgrades`)
- Native-terrain bonuses (parent: `mvp.04-faction-emberwild.04-baseline-ruleset`)
- Diplomacy / surrender of neutral stacks (parent: `mvp.05-adventure-map.21-map-object-visit-and-battle-initiation-commands`)
- Caravan / unit transfer between towns (parent: `phase-2.08-meta-systems.06-caravan-transfer-command`)
- First-aid tent battlefield healing (parent: `phase-2.01-spells-artifacts.11-buy-war-machine-command`)
- Necropolis-specific morale rules (parent: `phase-2.01-spells-artifacts.04a-baseline-skill-pack`)
- Counter-spells (Counterstrike, Magic Mirror) (parent: `phase-2.01-spells-artifacts.02-combat-spells`)

## Working Rule

When starting a module:

1. check this file for the next item
2. open the linked module index
3. pick one task file inside that module folder
4. implement that task without loading unrelated task files

## Task Authoring Rule

When adding or updating task files, keep section headers stable so the
task registry can parse them. Prefer including explicit output paths and
verification commands when the task has a runnable check.

Module indexes may include `**Lint Tags**:` as comma-separated metadata
for task tooling. Current tags:

- `ui-shell`: module provides reusable UI shell infrastructure.
- `screen-wrapper`: module tasks wrap screen packages and must depend on
  at least one task outside modules tagged `ui-shell` or
  `screen-wrapper`.
- `renderer-primitive`: module contains renderer-only primitive tasks.
  Tasks in that module that do not own `src/ui/` or `src/editor/`
  paths must stay free of screen-package anchors; use renderer/content
  architecture docs for those tasks instead.

For UI implementation tasks, include the relevant
`docs/architecture/wiki/screens/<nn-screen-name>/` package in Inputs and
acceptance criteria. That package contains the screen's visual mockup,
behavior spec, and architecture diagram together.

Every task file must include:

- `Description`
- `Outputs`
- `Dependencies`
- `Acceptance Criteria`
- `Estimated Time`

Keep task scope inside 2–6 hours. If a task family grows larger, split
it with an alphabetical suffix such as `05a`, `05b`, `05c` rather than
creating another oversized task.
