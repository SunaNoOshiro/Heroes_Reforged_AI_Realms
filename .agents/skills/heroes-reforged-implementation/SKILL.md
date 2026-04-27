---
name: heroes-reforged-implementation
description: Use this skill when implementing, refactoring, or validating work in the Heroes Reforged repo. It guides task selection, deterministic-engine boundaries, pack-driven architecture, and extension-safe coding patterns.
---

# Heroes Reforged Implementation

Use this skill for implementation work inside this repository:

- building features from `tasks/`
- adding runtime code in `src/`
- adding schemas or validators
- wiring pack loading, assets, or content registries
- refactoring code to keep deterministic or extension-safe boundaries

Do not use this skill for unrelated generic coding tasks.

## Start Here

Read only the minimum needed:

1. `README.md`
2. `AGENTS.md`
3. `docs/planning/implementation-log.md`
4. `tasks/README.md`
5. one module index in `tasks/`
6. one task file inside that module folder

Prefer one task file at a time. Do not load whole task trees unless the
current task requires it.

## Repository Boundaries

- `content-schema/`
  Canonical JSON schemas and examples only.
- `src/engine/`
  Deterministic gameplay state, commands, reducers, replay.
- `src/rules/`
  Formula and ruleset evaluation.
- `src/content-schema/`
  Runtime validation, migrations, compatibility checks.
- `src/content-runtime/`
  Manifest loading, dependencies, overrides, asset indirection,
  registry assembly.
- `src/renderer/`
  Rendering, animation playback, asset consumption.
- `src/ui/`
  App shell and gameplay UI.
- `src/editor/`
  Creator tooling.
- `src/ai/`
  Bots, balancing, AI generation flows.
- `src/net/`
  Multiplayer and sync.
- `src/persistence/`
  Saves, replays, scenarios.
- `resources/`
  Authored packs and assets.

If a change crosses these boundaries, stop and make the dependency
explicit.

## Non-Negotiables

- engine is pure; rules are data
- deterministic paths must not use `Math.random()`, wall-clock time, or
  uncontrolled floating-point behavior
- gameplay records must use IDs, not raw asset paths
- packs are the extension boundary
- stable IDs are public API
- missing visuals may fall back; missing gameplay requirements must fail
  loudly

## Patterns To Prefer

- composition over inheritance
- discriminated unions using `type` or `kind`
- arrays of declarative effects
- shallow named objects such as `presentation`, `economy`, `targeting`
- registries and lookup tables instead of hardcoded branches
- pure functions in deterministic code
- additive-first schema evolution
- aliases or migrations for renamed IDs

## Patterns To Avoid

- hardcoded first-party factions, creatures, or assets in engine code
- raw file paths in gameplay records
- deep inheritance trees
- hidden fallback behavior
- broad god-objects mixing sim, UI, content loading, and rendering
- changing old field meaning when a new field or effect kind would work

## Task Selection (use the scripts, not guesswork)

The repo has a task navigator. Prefer it over scanning `tasks/` by hand.

- `npm run generate:task-system-report` — writes
  `docs/planning/task-system-report.md`, a human-readable traceability
  report for task counts, screen-package ownership, schema ownership,
  and dependency health. Use it before/after task-system audits or when
  you need to know which task owns a screen or schema.
- `npm run generate:task-registry` — rebuilds
  `tasks/task-registry.json` from task Markdown. Most task scripts run
  from this generated registry.
- `npm run tasks:next` — prints tasks whose dependencies are all `done`
  plus anything currently `in-progress`. This is the correct entry point
  for picking work.
- `npm run tasks:status` — overall and per-module progress.
- `npm run tasks:show -- <task-id>` — full record for one task
  (description, inputs, outputs, ownedPaths, acceptanceCriteria,
  verifyCommands, estimatedTime).
- `npm run tasks:start -- <task-id>` — marks the task `in-progress` in
  its markdown file and regenerates `tasks/task-registry.json`.
- `npm run tasks:done -- <task-id>` — runs the task's `verifyCommands`
  and only marks `done` if all pass. Do not hand-edit `Status:` to skip
  this gate.
- `npm run validate:tasks` — enforces task-system invariants: every
  dependency entry resolves to a task or module, cycles are rejected,
  UI/editor tasks cite screen packages, every screen package has an
  owning UI task, and every schema has a canonical task reference.
- `npm run validate` — full repo validation. It regenerates the
  registry and runs link, contract, cross-reference, and task checks.

Task IDs look like `mvp.01-engine-core.03-implement-pcg32-prng-...`.
The `--` before the id is required so npm forwards it to the script.

## Implementation Workflow

1. `npm run tasks:next` — pick one task id from the ready list.
2. `npm run tasks:start -- <id>` to mark it in-progress.
3. `npm run tasks:show -- <id>` (or open the `path` it prints) for the
   full spec.
4. Implement the smallest coherent unit that satisfies that task.
5. Keep changes inside the task's `ownedPaths` and the correct repo
   boundary (see Repository Boundaries above).
   Treat task fields as distinct contracts:
   - `Owned Paths` are primary write responsibility; only one task
     should primarily own a path.
   - `Owned Paths (shared)` are additive extension points where another
     task is primary owner. Extend without rewriting earlier behavior.
   - `Dependencies` are scheduling/order constraints only; they do not
     grant permission to edit the dependency task's files.
6. Update docs only if the source of truth changed.
7. `npm run tasks:done -- <id>` — this runs `verifyCommands`. If it
   fails, fix the cause and retry; do not bypass.

For task-system edits, also run:

1. `npm run generate:task-registry`
2. `npm run validate:tasks`
3. `npm run generate:task-system-report`

Read the report top first. Healthy task metadata should show zero
dependency cycles, unresolved dependency entries, unowned screen
packages, and unreferenced schemas.

## Decision Rules

When unsure:

- prefer extensibility over shortcut logic
- prefer content-driven solutions over engine special-casing
- prefer adding a new handler, effect kind, or record over branching on
  named factions
- prefer small explicit interfaces over broad shared utilities

## Done Check

Before finishing:

- the change matches one task file
- code or docs live in the correct folder
- no deterministic rule was broken
- no gameplay record gained raw asset paths
- links or references changed by the edit are still correct
