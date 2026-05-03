# Implementation Log

This file tracks what is actually implemented or materially set up in
the repository right now, what is only planned, and what should happen
next.

Use this as the fastest "current state" document.

## Status Summary

Current state:

- architecture-first
- planning-first
- schema-first
- contract-validation tooling now scaffolded at the repo root
- no gameplay runtime implemented yet
- no renderer implemented yet
- no editor implemented yet

What exists today:

- architecture and platform docs
- task breakdowns for MVP and later phases
- canonical JSON schemas
- canonical example content records
- root folder structure for future implementation and resources

## Implemented So Far

The following work is already present in the repo:

### Repository Structure

- Root `content-schema/` folder created for canonical schemas and
  example JSON.
- Root `src/` folder created for future implementation modules.
- Root `src/content-runtime/` placeholder added for future pack loading,
  dependency resolution, and override handling.
- Root `services/` folder added for optional backend adapters such as AI
  gateway and signaling.
- Root `research/` folder added for checked-in reference baselines and
  source notes.
- Root `resources/` folder created for future packs and assets.
- Old `packages/` schema/example layout removed.

### Documentation

- `README.md` updated to reflect the new root structure.
- `AGENTS.md` updated for AI contributors.
- `docs/architecture/` organized as the main design reference.
- `docs/planning/` organized as the execution and milestone reference.
- Added a dedicated `solo-build-lane.md` so a solo developer can find
  the smallest path to a first playable slice without reading every
  module.
- Canonical pack contract doc added for manifest fields, archive rules,
  and folder layout.
- AI integration doc added for provider-neutral generation and
  moderation boundaries.

### Content Schema Foundation

- JSON schema files added under `content-schema/schemas/`.
- Canonical example records added under `content-schema/examples/`.
- Schema docs updated to link directly to JSON schema files and example
  files.
- Directory READMEs now explain the difference between standalone record
  fixtures, end-to-end pack fixtures, and AI-generation fixtures.

### Planning Alignment

- MVP content-schema tasks now point to future runtime code under
  `src/content-schema/`.
- Engine-core tasks now point to future implementation under `src/`
  instead of the removed `packages/` layout.
- Overview and backlog docs now reflect the `content-schema/`,
  `src/`, and `resources/` structure.
- Markdown task files now have a generated machine-readable companion in
  `tasks/task-registry.json`.
- The main planning docs now separate live operator guidance from
  historical audits and reports.

### Tooling

- Root workspace metadata added: `package.json` and
  `tsconfig.base.json`. (Earlier `pnpm-workspace.yaml` was removed
  2026-04-22 — see Audit-2026-04-22 N8; the repo uses npm.)
- Repo validation scripts added for task-registry generation, Markdown
  link checking, and contract checks.
- Contract validation now also checks task-doc hygiene: every task file
  must carry outputs, dependencies, acceptance criteria, and a 2–6 hour
  estimate.
- Initial GitHub Actions workflow added for repo validation and tests.

### Audit-2026-04-20 Implementation Pass

Applied on 2026-04-21, following
[`audit-2026-04-20.md`](../archive/audit-2026-04-20.md):

- Renamed reference faction from "Castle" to **Emberwild** across 44
  task and doc files; all IP-unsafe references (legacy expansion, classic fantasy strategy, "Angels",
  "Pikeman", "Sword of Hellfire") replaced with original material
  (Phoenix Vanguard, Ash Hound, Torch of Cinders, Kaelis, ...).
- Renamed the top town fortification tier from Castle → **Keep**
  (Fort → Citadel → Keep progression), decoupled from faction name.
- Added closed **effect registry** schema
  (`content-schema/schemas/effect.schema.json`) consumed by spells,
  abilities, and artifacts via a single discriminated union.
- Added closed **formula AST** schema
  (`content-schema/schemas/formula.schema.json`) with a 10-op
  vocabulary. All combat math is now expressed as AST nodes — no
  strings, no `eval`, no `new Function`.
- Added provider-neutral **AI generation schemas**
  (`generation-request.schema.json`, `generated-faction.schema.json`)
  as the only surface crossing the model-provider boundary.
- Replaced float-based formulas in the damage-formula and
  auto-resolve tasks with fixed-point integer math at basis 1000.
- Replaced point-estimate balance acceptance with **Wilson 95 %
  confidence interval** gating ([40 %, 60 %] for first-party,
  [35 %, 65 %] for AI-generated).
- Extended `scripts/check-repo-contracts.mjs` to validate every
  example record under `content-schema/examples/` against its
  type-appropriate schema (recursive validator supporting `$ref`,
  `oneOf`, `anyOf`, `allOf`, `const`, `enum`, `pattern`, `minItems`,
  `minLength`, `additionalProperties`).
- Removed `docs/planning/executable-backlog.md` — it had already been
  reduced to a pointer; `tasks/README.md` is the single source of
  truth for execution order.
- Moved generated `tasks/task-registry.json` out of version control.
  CI regenerates it on every run; local agents run
  `npm run generate:task-registry` (or just `npm run validate`).
- Added four new task files: formula DSL, effect registry, canonical
  JSON + content hash, generation-I/O schemas.
- Added baseline stat corridors to `research/deep-research-report.md`
  (tier-by-tier stat bands, weekly growth, building prices, hero
  starting stats, combat math constants).
- Task registry regenerated: **173 tasks across 21 modules**.
  `npm run validate` and `npm test` both pass green.

### Repo Hardening Pass (2026-04-22)

Applied after the 2026-04-21 audit/report cycle:

- Rewrote planning indexes so `roadmap.md`, `solo-build-lane.md`, and
  `tasks/README.md` now give one clear execution path instead of
  spreading the guidance across multiple lightly-overlapping files.
- Rewrote `content-schema/` README surfaces so schemas, standalone
  record fixtures, pack fixtures, and AI-generation fixtures are easy to
  distinguish in isolation.
- Fixed stale schema/example references in the schema matrix and removed
  a lingering broken reference to `docs/architecture/baseline-corridor.md`.
- Hardened task docs by filling in missing sections, correcting stale
  dependency references, and splitting oversized 8–16 hour tasks into
  smaller `05a` / `01a` style task families.

### Implementation-Readiness Pass (2026-04-24)

Applied to resolve the critical blockers flagged in the 2026-04-22
full-repo audit so the MVP backlog can start executing without
contradicting itself:

- **Combat-math drift resolved.** `docs/architecture/determinism.md`
  no longer advertises the obsolete `atkBonusMax=140/100` percent cap.
  The baseline ruleset JSON, the ruleset-sanity test, the corridor in
  `research/deep-research-report.md`, and every live task now use the
  same point-based semantics (`atkBonusPerPoint = 1/20`,
  `defReductionPerPoint = 1/20`, caps 60/60,
  `moralePenaltyMissProb = 1/24`). The JSON is the single source of
  truth; every prose mention is gated by a CI drift test.
- **Constant-drift CI guard added.**
  `scripts/__tests__/constant-drift.test.mjs` scans every Markdown
  file under `docs/`, `research/`, and `tasks/` for integer and ratio
  mentions of ruleset constants and fails the build if any disagrees
  with `baseline.ruleset.json`. Historical audit logs under
  `docs/planning/audits/` are excluded by design (they record past
  drift).
- **Hero specialty is now a closed discriminated union.**
  `content-schema/schemas/hero.schema.json` replaces the open-bag
  `specialty` object with a `oneOf` over five kind-specific shapes
  (`unit_bonus`, `creature_specialty`, `spell_bonus`, `skill_bonus`,
  `resource_bonus`). Cross-kind fields now fail validation; AI
  generation has a rigid template instead of a freeform object.
- **Shared packs populated.** `shared-abilities/` now provides
  `hardy`, `flying`, `regeneration`, `large_creature`, `undead`.
  `shared-skills/` now provides `pathfinding_basic`,
  `leadership_basic`, `defense_basic`, `wisdom_basic`. The packs
  README documents the dependency-resolution model so AI-generated
  factions can reach for a shared vocabulary instead of inventing
  pack-local IDs.
- **Runtime validator decision locked in.**
  `src/content-schema/README.md` now declares **Zod** as the runtime
  validator with a three-reason ADR (TS inference, discriminated
  unions, no `eval`). Task 02-content-schemas/10 adds acceptance
  criteria for `z.discriminatedUnion` over effect kinds and hero
  specialty plus a JSON-Schema↔Zod round-trip test so the two
  contracts cannot drift apart.

### Task-System Consistency Pass (2026-04-29)

Applied to resolve the 2026-04-28 full task-system consistency audit:

- Hardened `scripts/generate-task-registry.mjs` so section parsing stops
  at markdown rules and headings; worked examples no longer bleed into
  `estimatedTime`.
- Added command-coverage validation:
  `scripts/check-command-coverage.mjs`,
  `docs/architecture/screen-command-coverage.json`, and
  `npm run validate:commands`. Screen interaction tokens now have to be
  schema-backed, aliased, UI-local, or explicitly out of scope with an
  owning task.
- Extended `command.schema.json` with the missing planned gameplay
  command vocabulary for marketplace, tavern, prison, external
  dwellings, creature banks, artifacts, battle exits, RMG, shipyards,
  grail structures, stack transfer, and related flows.
- Added the missing schema, command, RMG/underground, campaign, quest,
  cinematic, and status-history task anchors. Registry size is now
  **262 tasks across 23 modules**.
- Renamed the colliding phase-2 spells/artifacts task files to
  `01a`/`01b` and `04a`/`04b`.
- Rewrote the phase-2 UI screen backlog acceptance criteria so UI tasks
  consume the command-coverage map instead of inventing missing engine
  reducers.
- Added task-lint enforcement for path ownership: duplicate primary
  ownership now fails unless additive work is marked with
  `Owned Paths (shared):`.

### Task-System AI-Execution Polish Pass (2026-05-01)

Applied after
[`AUDIT-2026-05-01-TASK-SYSTEM-AI-EXECUTION-AUDIT.md`](../archive/AUDIT-2026-05-01-TASK-SYSTEM-AI-EXECUTION-AUDIT.md):

- Added the `renderer-primitive` module lint tag and a task-lint guard
  so renderer-only visual-fidelity tasks stay anchored to
  renderer/content architecture docs instead of UI screen packages.
- Expanded the glossary's H3 alias anchors so agents searching by
  legacy genre terms land on canonical schema/task vocabulary.
- Split the broad phase-3 polish performance gate into focused engine,
  renderer, AI, and content-loader profiling tasks with shared owned
  paths and narrower subsystem dependencies.
- Re-scoped the accessibility and launch polish tasks away from broad
  module-level dependency gates toward direct UI/polish dependencies.

## Not Implemented Yet

These areas are still planned only:

- deterministic engine runtime in `src/engine/`
- rules interpreter in `src/rules/`
- runtime schema validators and migration code in `src/content-schema/`
- pack loading, dependency resolution, and override handling in
  `src/content-runtime/`
- rendering in `src/renderer/`
- UI shell and editor screens in `src/ui/` or `src/editor/`
- AI systems in `src/ai/`
- networking in `src/net/`
- persistence in `src/persistence/`
- authored official packs in `resources/packs/`
- imported or processed production assets in `resources/assets/`

## What The Repo Proves Right Now

Right now the repository proves:

- the content architecture is separated from runtime code
- schemas and examples have a canonical home
- future implementation has a dedicated root layout
- future assets and packs have a dedicated root layout
- pack-manifest and pack-folder rules are aligned across docs, schema,
  and example content
- task metadata can be consumed through a generated machine-readable
  registry
- contributor docs, links, and contract checks can be validated in CI
- docs and tasks are aligned with the intended extensible platform

Right now the repository does not yet prove:

- that packs can be loaded at runtime
- that schema validation runs in code
- that assets resolve through an actual registry
- that gameplay is deterministic in implementation
- that factions, worlds, animations, artifacts, heroes, towns, and
  map objects can be played in-engine

### UI State & Interactions Plan Implementation (2026-05-03)

Closed the thirteen audit gaps from
[`docs/implementation-plans/03-ui-state-and-interactions-plan.md`](../implementation-plans/03-ui-state-and-interactions-plan.md):

- Authored the cross-screen UI contract docs:
  [`docs/architecture/ui-state-contract.md`](../architecture/ui-state-contract.md)
  (component-state matrix, selector purity, tooltip lifecycle,
  command lifecycle, error state, undo/redo),
  [`docs/architecture/ui-routing.md`](../architecture/ui-routing.md)
  (screen-router FSM, transition graph, modal stack, dismissal policy),
  [`docs/architecture/ui-input-arbitration.md`](../architecture/ui-input-arbitration.md)
  (single-emit, Esc precedence ladder, animation gates),
  [`docs/architecture/ui-gestures.md`](../architecture/ui-gestures.md)
  (gesture taxonomy and drag contract),
  [`docs/architecture/ui-hotkeys.md`](../architecture/ui-hotkeys.md)
  (hotkey registry, focus order, tab-trap, focus restoration), and
  [`docs/architecture/ui-input-modalities.md`](../architecture/ui-input-modalities.md)
  (mouse / touch / keyboard / gamepad bridging).
- Added the canonical `ErrorState`, `ModalEntry`, and `HotkeyRegistry`
  schemas under
  [`content-schema/schemas/`](../../content-schema/schemas/) plus
  example records under
  [`content-schema/examples/records/`](../../content-schema/examples/records/).
  `schemaForFile` in
  [`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs)
  gained `.error-state.json`, `.modal-entry.json`, and `.hotkey.json`
  suffix mappings.
- Extended
  [`content-schema/schemas/ruleset.schema.json`](../../content-schema/schemas/ruleset.schema.json)
  additively with the optional `ui.timing` and `ui.editor` blocks
  (tooltip hold-delay, gesture thresholds, debounce, animation cap,
  editor history bound). The canonical example
  [`baseline.ruleset.json`](../../content-schema/examples/records/rulesets/baseline.ruleset.json)
  carries the new block.
- Added the Mermaid sequence diagram
  [`docs/architecture/diagrams/29-input-arbitration.md`](../architecture/diagrams/29-input-arbitration.md)
  showing the click + hotkey race through the per-control debounce
  token and the animation gate.
- Added the per-screen sweep templates
  [`docs/architecture/wiki/_templates/animation-states.md`](../architecture/wiki/_templates/animation-states.md)
  and
  [`docs/architecture/wiki/_templates/contract-sweep.md`](../architecture/wiki/_templates/contract-sweep.md).
- Cross-linked the new docs from
  [`docs/architecture/overview.md`](../architecture/overview.md),
  [`docs/architecture/schema-matrix.md`](../architecture/schema-matrix.md),
  [`docs/architecture/determinism.md`](../architecture/determinism.md),
  [`docs/architecture/state-flow.md`](../architecture/state-flow.md),
  [`docs/architecture/renderer-technology-choice.md`](../architecture/renderer-technology-choice.md),
  [`docs/architecture/wiki/README.md`](../architecture/wiki/README.md),
  [`docs/architecture/wiki/missing-states.md`](../architecture/wiki/missing-states.md),
  [`content-schema/schemas/README.md`](../../content-schema/schemas/README.md),
  and [`CLAUDE.md`](../../CLAUDE.md).
- Authored 13 task records pulling the work into the tasks-next queue:
  - [`tasks/mvp/02-content-schemas/21-error-state-schema.md`](../../tasks/mvp/02-content-schemas/21-error-state-schema.md)
  - [`tasks/mvp/07-ui-shell/10-selector-purity-lint.md`](../../tasks/mvp/07-ui-shell/10-selector-purity-lint.md)
  - [`tasks/mvp/07-ui-shell/11-screen-router-fsm.md`](../../tasks/mvp/07-ui-shell/11-screen-router-fsm.md)
  - [`tasks/mvp/07-ui-shell/12-component-state-matrix.md`](../../tasks/mvp/07-ui-shell/12-component-state-matrix.md)
  - [`tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md`](../../tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md)
  - [`tasks/mvp/07-ui-shell/14-modal-stack.md`](../../tasks/mvp/07-ui-shell/14-modal-stack.md)
  - [`tasks/mvp/07-ui-shell/15-input-arbitration.md`](../../tasks/mvp/07-ui-shell/15-input-arbitration.md)
  - [`tasks/mvp/07-ui-shell/16-gesture-taxonomy.md`](../../tasks/mvp/07-ui-shell/16-gesture-taxonomy.md)
  - [`tasks/mvp/07-ui-shell/17-tooltip-lifecycle.md`](../../tasks/mvp/07-ui-shell/17-tooltip-lifecycle.md)
  - [`tasks/mvp/07-ui-shell/18-hotkey-registry.md`](../../tasks/mvp/07-ui-shell/18-hotkey-registry.md)
  - [`tasks/mvp/07-ui-shell/19-input-modalities.md`](../../tasks/mvp/07-ui-shell/19-input-modalities.md)
  - [`tasks/mvp/07-ui-shell/20-command-lifecycle.md`](../../tasks/mvp/07-ui-shell/20-command-lifecycle.md)
  - [`tasks/phase-2/08-meta-systems/09-map-editor-undo-redo.md`](../../tasks/phase-2/08-meta-systems/09-map-editor-undo-redo.md)

### Core-Architecture Plan Implementation (2026-05-02)

Closed the ten audit gaps from
[`docs/implementation-plans/01-core-architecture-plan.md`](../implementation-plans/01-core-architecture-plan.md):

- Authored
  [`docs/architecture/state-shape.md`](../architecture/state-shape.md),
  [`docs/architecture/rng-streams.md`](../architecture/rng-streams.md),
  [`docs/architecture/id-allocator.md`](../architecture/id-allocator.md),
  [`docs/architecture/multi-engine-harness.md`](../architecture/multi-engine-harness.md),
  and
  [`docs/architecture/module-graph.md`](../architecture/module-graph.md).
- Added the closed top-level state schema
  [`content-schema/schemas/game-state.schema.json`](../../content-schema/schemas/game-state.schema.json)
  with a canonical example.
- Extended `command.schema.json` so every command requires a `metadata`
  block with a pattern-checked `nonce`; `command-schema.md` gained
  Deduplication, Dispatcher Queue, Cross-Actor Ordering, and Seed
  Source Precedence sections.
- Pinned the renderer's frame-time budget &amp; degradation tier table in
  [`renderer-technology-choice.md`](../architecture/renderer-technology-choice.md#frame-time-budget--degradation)
  and updated audits Q4 in `01-core-architecture.md` plus the
  performance audit anchor in `09-performance.md`.
- Authored
  [`scripts/check-module-graph.mjs`](../../scripts/check-module-graph.mjs)
  (zero-deps Node, ~200 lines) instead of the source plan's
  `dependency-cruiser` to keep `node_modules` empty. Added
  `npm run validate:arch` to the `validate` aggregate. The empty
  `src/` tree is clean; the rules go live the moment any source file
  is added. Switching to `dependency-cruiser` later is a one-line
  change in `package.json`.
- Authored 10 owning tasks plus a module file under
  [`tasks/mvp/00-core-architecture/`](../../tasks/mvp/00-core-architecture/);
  registry now contains 294 tasks across 24 modules.

## Recommended Next Steps

Suggested order:

1. Follow `docs/planning/solo-build-lane.md` rather than branching
   across modules opportunistically.
2. Scaffold the actual TypeScript workspace and root toolchain.
3. Implement the deterministic foundation in `src/engine/`:
   RNG, fixed-point math, dispatcher, serializer, replay.
4. Add `src/content-schema/` runtime validators that mirror the JSON
   schemas.
5. Add `src/content-runtime/` for manifests, dependency resolution,
   override precedence, and asset indirection.
6. Add the first content-loading path:
   manifest loader, schema validation, reference resolution.
7. Add one thin playable slice:
   one faction, one hero, one town flow, one battle flow.
8. Start wiring `resources/packs/` and `resources/assets/` into a real
   asset and pack pipeline.

## Update Rule

When meaningful implementation work lands, update this file in three
places:

1. `Implemented So Far`
2. `Not Implemented Yet`
3. `Recommended Next Steps`

If a feature is only designed in docs, do not list it as implemented.
