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
- Pinned AI-generated-content lifecycle as **contractual** rather
  than discretionary: sandbox enforcement now lists four named
  consumers (matchmaker, lobby, replay validator, editor) in
  [`pack-contract.md` § Sandbox enforcement`](../architecture/pack-contract.md#sandbox-enforcement),
  hard caps live in
  [`balance-constraints.schema.json`](../../content-schema/schemas/balance-constraints.schema.json)
  (so non-orchestrator producers cannot bypass them), the materialized
  manifest carries a `manifest.generation` version pin, image
  moderation has a typed report shape, the retry policy and
  provider-failure taxonomy are closed schemas, asset normalization
  has a four-rule contract, and post-publication revocation has a
  signed-list / client-check / replay-fallback contract.

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

### Data Contracts & Schema Plan Implementation (2026-05-03)

Closed the seven data-contract gaps from
[`docs/implementation-plans/06-data-contracts-and-schema-plan.md`](../implementation-plans/06-data-contracts-and-schema-plan.md):

- Authored
  [`docs/architecture/version-policy.md`](../architecture/version-policy.md)
  with the consolidated refuse / migrate / degrade decision matrix
  (six mismatch kinds × three contexts) and removed the duplicated
  prose from `state-flow.md`, `pack-contract.md`, `content-platform.md`,
  and the persistence task.
- Authored
  [`docs/architecture/schema-migration-policy.md`](../architecture/schema-migration-policy.md)
  plus the worked example migration under
  [`src/content-schema/migrations/`](../../src/content-schema/migrations/)
  (illustrative `example-v1-to-v2-rename-field` entry, registry
  `README.md`, fixtures, test).
- Authored
  [`docs/architecture/enum-lifecycle-policy.md`](../architecture/enum-lifecycle-policy.md)
  with the additive → deprecated → aliased → removed lifecycle, and
  shipped the CI snapshot gate
  ([`scripts/snapshot-enums.mjs`](../../scripts/snapshot-enums.mjs),
  [`scripts/check-enum-snapshot.mjs`](../../scripts/check-enum-snapshot.mjs),
  baseline [`content-schema/enums.snapshot.json`](../../content-schema/enums.snapshot.json)).
  `npm run validate:enums` is wired into `npm run validate`.
- Authored
  [`docs/architecture/schema-defaults-policy.md`](../architecture/schema-defaults-policy.md)
  pinning `default` keyword authoring rules, the integers-only
  constraint, and the round-trip-of-defaults parity test required by
  Task 10.
- Added the canonical `ValidationError` schema
  [`content-schema/schemas/validation-error.schema.json`](../../content-schema/schemas/validation-error.schema.json)
  with two example records under
  [`content-schema/examples/records/validation-error/`](../../content-schema/examples/records/validation-error/).
  `schemaForFile` in
  [`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs)
  gained the `.error.json` suffix mapping.
- Broadened the float-ban ESLint task scope from `src/engine` only to
  `src/{engine,rules,content-runtime,content-schema}/**/*.ts` so
  formula evaluators, content-runtime helpers, and schema-side
  defaulting cannot reintroduce floats.
- Authored 6 new task records pulling the work into the tasks-next
  queue:
  - [`tasks/mvp/02-content-schemas/22-validation-error-contract.md`](../../tasks/mvp/02-content-schemas/22-validation-error-contract.md)
  - [`tasks/mvp/02-content-schemas/23-schema-migration-policy-and-example.md`](../../tasks/mvp/02-content-schemas/23-schema-migration-policy-and-example.md)
  - [`tasks/mvp/02-content-schemas/24-enum-lifecycle-and-snapshot-gate.md`](../../tasks/mvp/02-content-schemas/24-enum-lifecycle-and-snapshot-gate.md)
  - [`tasks/mvp/02-content-schemas/25-default-declarations-and-zod-parity.md`](../../tasks/mvp/02-content-schemas/25-default-declarations-and-zod-parity.md)
  - [`tasks/mvp/02-content-schemas/26-m2-engine-hash-backfill.md`](../../tasks/mvp/02-content-schemas/26-m2-engine-hash-backfill.md)
    (dormant until engine M2 ship)
  - [`tasks/mvp/07-ui-shell/21-screen-view-model-types-generation.md`](../../tasks/mvp/07-ui-shell/21-screen-view-model-types-generation.md)
- Extended Task 10 (Zod validators), Task 11 (schema-version stub),
  and Task 5 (float-ban ESLint rule) acceptance criteria to require
  the parity test, the discovered-from-registry runner, and the
  broadened scope respectively.

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

### Multiplayer Plan Implementation (2026-05-03)

Closed the operational gaps from
[`docs/implementation-plans/07-multiplayer-plan.md`](../implementation-plans/07-multiplayer-plan.md):

- Extended
  [`docs/architecture/determinism.md`](../architecture/determinism.md)
  with the Multiplayer Determinism Appendix (canonical
  `(playerId, seq)` command key, clock policy, snapshot cadence and
  resync, bot RNG sub-streams).
- Authored
  [`docs/architecture/multiplayer-security.md`](../architecture/multiplayer-security.md)
  consolidating TLS mandate, room-secret + handshake, TURN
  credentials, and the anti-cheat threat model.
- Updated
  [`docs/architecture/diagrams/26-multiplayer-sync.md`](../architecture/diagrams/26-multiplayer-sync.md)
  to drop the misleading "synchronized clocks" line and surface the
  three-step recovery ladder (snapshot-resync → bisect → report).
- Added M7 scope sketches to
  [`docs/architecture/glossary.md`](../architecture/glossary.md)
  for spectators (preliminary read-only-peer contract) and N-peer
  mesh (formal deferral — M5 capped at 2).
- Registered `SEND_GAME_CHAT` in
  [`docs/architecture/screen-command-coverage.json`](../architecture/screen-command-coverage.json).
- Authored
  [`services/multiplayer/turn-config.md`](../../services/multiplayer/turn-config.md)
  pinning Cloudflare Calls TURN with a coturn fallback recipe.
- Added three new task files under
  [`tasks/phase-3/01-multiplayer/`](../../tasks/phase-3/01-multiplayer/):
  - `09-snapshot-resync-fallback.md`
  - `10-turn-fallback-and-credentials.md`
  - `11-network-chaos-test-matrix.md`
- Extended Tasks 1, 2, 3, 4, 6, and 8 with the operational contracts
  (TLS + room secret on signaling, third `chat` DataChannel and
  ICE-gather timeout on peer-connection, idempotency + queue cap +
  input-delay budget + bot broadcaster on lockstep, snapshot-first
  recovery on hash exchange, overlap-dropped note on reconnection,
  stall thresholds on the lobby UI).
- Updated screen packages 62-multiplayer-setup and 64-network-lobby
  with the room-secret invite-URL contract, the 2-peer cap, and the
  status threshold bindings.
- Module README
  [`tasks/phase-3/01-multiplayer.md`](../../tasks/phase-3/01-multiplayer.md)
  now declares the M5 scope caps (2 peers, no spectators in M5,
  in-game chat reserved on a non-deterministic channel) and links
  the new tasks and security doc.

### Performance Plan Implementation (2026-05-03)

Closed the performance gaps from
[`docs/implementation-plans/09-performance-plan.md`](../implementation-plans/09-performance-plan.md):

- Authored
  [`docs/architecture/performance.md`](../architecture/performance.md)
  as the canonical performance doc: hardware tiers (Reference /
  Minimum-spec / Mobile-deferred), per-frame CPU budget, GC
  budget, allocation policy, memory budget with per-category
  split, entity ceilings (incl. adventure-map animation
  ceilings), AI compute budget, in-game profiling overlay
  reference, enforcement-via-bench-harness contract.
- Authored
  [`docs/architecture/atlas-pipeline.md`](../architecture/atlas-pipeline.md)
  pinning `free-tex-packer-cli` as the canonical packer, the
  deterministic input-ordering / `--seed` invocation, the
  per-frame input layout, the per-entity output layout, and the
  publish-step ordering with `contentHash` integration.
- Extended
  [`docs/architecture/determinism.md`](../architecture/determinism.md)
  with the AI Compute Budget section (deterministic
  `searchBudget`, watchdog-only wall clock, ban on
  wall-clock-driven AI truncation) and the Pathfinder Cache
  Invariants section (`mapVersion` / `zocVersion` keys, explicit
  invalidation, End-Day flush).
- Updated
  [`docs/architecture/renderer-technology-choice.md`](../architecture/renderer-technology-choice.md)
  to defer numeric per-tier targets to `performance.md`.
- Updated
  [`docs/architecture/diagrams/17-cache-strategy.md`](../architecture/diagrams/17-cache-strategy.md)
  to anchor the % thresholds to the absolute MB caps in
  `performance.md`.
- Updated
  [`docs/architecture/ai-generation-pipeline.md`](../architecture/ai-generation-pipeline.md)
  to declare AI output is per-frame; atlases are produced at the
  pack-publish step using the same packer as first-party packs.
- Added an "Atlas Generation" section to
  [`docs/architecture/pack-contract.md`](../architecture/pack-contract.md).
- Added the canonical atlas-manifest schema
  [`content-schema/schemas/atlas.schema.json`](../../content-schema/schemas/atlas.schema.json).
- Extended
  [`content-schema/schemas/game-state.schema.json`](../../content-schema/schemas/game-state.schema.json)
  with additive `mapVersion` and `zocVersion` integer fields
  (default 0); updated the canonical example.
- Added the new task module
  [`tasks/mvp/00-perf/`](../../tasks/mvp/00-perf/) with five task
  files: `01-bench-harness.md`,
  `02-bench-baseline-and-ci-gate.md`,
  `03-memory-regression-gate.md`, `04-profiling-overlay.md`, and
  `05-object-pools.md`. Module index at
  [`tasks/mvp/00-perf.md`](../../tasks/mvp/00-perf.md).
- Added new task files
  [`tasks/mvp/03-map-system/11-pathfinder-cache.md`](../../tasks/mvp/03-map-system/11-pathfinder-cache.md)
  and
  [`tasks/mvp/06-renderer/09-atlas-pipeline.md`](../../tasks/mvp/06-renderer/09-atlas-pipeline.md).
- Extended existing task files with the new contracts:
  - `mvp.10-heuristic-ai.06-run-ai-in-web-worker` —
    deterministic `searchBudget`, wall clock demoted to
    warn-only watchdog.
  - `mvp.10-heuristic-ai.05-difficulty-levels-pawn-and-knight` —
    per-difficulty `maxNodes` / `maxDepth` constants and
    `searchBudgetFor(...)` API.
  - `mvp.10-heuristic-ai.01-threat-map-bfs-strategic-danger-gradients`
    — consume the shared pathfinder cache and the AI search-node
    pool.
  - `mvp.03-map-system.04-a-pathfinder-with-terrain-cost-plus-zoc`
    — Optional cache section pinning the per-turn cache
    invariants.
  - `mvp.03-map-system.03-layered-tile-storage` — link the
    in-memory map decision.
  - `mvp.01-engine-core.06-command-dispatcher` — declare
    `mapVersion` / `zocVersion` increment invariants.
  - `mvp.01-engine-core.09-fuzz-harness-…` — share fixtures with
    bench Scenario C and add a `searchBudget` determinism case.
  - `mvp.01-engine-core.10-github-actions-ci` — add the
    perf-bench job and the memory-gate job.
  - `mvp.06-renderer.03-map-renderer-…` — adventure-map
    animation ceilings and renderer-side pool acceptance
    criteria.
  - `mvp.06-renderer.05-1115-tactical-battlefield-renderer` —
    30 FPS Minimum-spec criterion and 21-stack budget.
  - `mvp.06-renderer.06-sprite-sheet-loader-plus-frame-animation`
    — link the metadata schema to the atlas-pipeline task.
  - `mvp.06-renderer.08-presentation-loop-decoupled-from-sim` —
    promote the no-handle-leak check to Scenario D and link the
    per-frame budget envelope.
- Added the new dev-only screen package
  [`docs/architecture/wiki/screens/68-dev-profiler/`](../architecture/wiki/screens/68-dev-profiler/)
  (mockup, spec, interactions, data-contracts, architecture) for
  the in-app profiling overlay; registered under the
  `diagnostics` group in `screens/index.json`.

  Note: the implementation plan literally specified
  `57-dev-profiler/`, but `57-high-scores/` already owns that
  number. The next sequential number `68` is used; the screen
  also lives in the existing `diagnostics` group rather than a
  new "Dev tools" group, since `66-debug-overlay` and
  `67-animation-debug-overlay` already group there.
- Updated [`CLAUDE.md`](../../CLAUDE.md) "Read first" list to
  include `performance.md` and `atlas-pipeline.md`.

### Content System Plan Implementation (2026-05-04)

Closed the nine audit gaps from
[`docs/implementation-plans/13-content-system-plan.md`](../implementation-plans/13-content-system-plan.md):

- Authored
  [`docs/architecture/content-system-policy.md`](../architecture/content-system-policy.md)
  as the cross-pack policy anchor (pack identity, dependency
  resolution, override precedence, asset integrity, per-record
  versioning, localization bundling, validation pipeline, error
  codes, canonical-pack registry).
- Authored
  [`docs/architecture/pack-resolver.md`](../architecture/pack-resolver.md)
  pinning the resolver algorithm: Kahn topological sort,
  lexicographic tie-break, semver range matching, override
  evaluation, locale merge, deterministic resolution trace.
- Authored
  [`docs/architecture/pack-error-codes.md`](../architecture/pack-error-codes.md)
  with the initial 15-code catalog and severity table.
- Patched
  [`content-schema/schemas/manifest.schema.json`](../../content-schema/schemas/manifest.schema.json)
  additively: `id` namespace pattern (`^[a-z0-9]+(_[a-z0-9]+)+$`),
  `dependencies[]` accepts both string (deprecated) and
  `{id, version}` object forms, new `overrides[]` block, new
  `changelog[]` block. Migrated the canonical emberwild manifest to
  the object form.
- Patched
  [`content-schema/schemas/asset-index.schema.json`](../../content-schema/schemas/asset-index.schema.json)
  to require `sha256` on every asset entry (with optional `bytes`
  size hint). Populated emberwild and minimal-pack examples.
- Added the canonical-packs registry: schema
  [`content-schema/schemas/canonical-packs.schema.json`](../../content-schema/schemas/canonical-packs.schema.json)
  and pinned file
  [`resources/canonical-packs.json`](../../resources/canonical-packs.json).
- Added the balance corridor spec at
  [`content-schema/balance/corridor.json`](../../content-schema/balance/corridor.json)
  (with [`corridor.schema.json`](../../content-schema/balance/corridor.schema.json))
  encoding the per-tier numeric corridor from
  `research/deep-research-report.md` § 1 plus per-stat tolerance
  factors. Two gates: per-unit (out-of-band stat →
  `pack.error.balance.outOfCorridor`) and per-pack (average unit
  skew exceeds `factionBudget.skewThreshold` →
  `pack.error.balance.factionImbalance`, blocking factions where
  every unit sits at the top of its tier band). The canonical
  emberwild pack passes; HP=50000 / ATK=1 single-unit outliers fail;
  3-unit synthetic all-high-band packs fail the faction gate.
  Sandbox packs warn instead.
- Added new scripts:
  - [`scripts/build-asset-index.mjs`](../../scripts/build-asset-index.mjs)
    — recomputes per-asset SHA-256 and bytes; supports `--check`.
  - [`scripts/validate-balance.mjs`](../../scripts/validate-balance.mjs)
    — corridor gate.
  - [`scripts/check-pack-error-codes.mjs`](../../scripts/check-pack-error-codes.mjs)
    — lint that fails on unknown `pack.error.*` tokens.
  - Wired all three into `npm run validate` plus added
    `npm run build:asset-index`, `npm run validate:balance`,
    `npm run validate:error-codes`.
- Added per-pack localization layout: example
  [`content-schema/examples/packs/emberwild-faction/locales/en.localization.json`](../../content-schema/examples/packs/emberwild-faction/locales/en.localization.json)
  and the `.localization.json` suffix mapping in
  `scripts/check-repo-contracts.mjs`.
- Authored 9 new task records:
  - [`tasks/mvp/02b-asset-pipeline/11-content-system-policy-doc.md`](../../tasks/mvp/02b-asset-pipeline/11-content-system-policy-doc.md)
  - [`tasks/mvp/02b-asset-pipeline/12-pack-resolver-algorithm.md`](../../tasks/mvp/02b-asset-pipeline/12-pack-resolver-algorithm.md)
  - [`tasks/mvp/02b-asset-pipeline/13-per-asset-integrity-and-build-script.md`](../../tasks/mvp/02b-asset-pipeline/13-per-asset-integrity-and-build-script.md)
  - [`tasks/mvp/02b-asset-pipeline/14-per-pack-localization-and-merge.md`](../../tasks/mvp/02b-asset-pipeline/14-per-pack-localization-and-merge.md)
  - [`tasks/mvp/02b-asset-pipeline/15-balance-corridor-validator.md`](../../tasks/mvp/02b-asset-pipeline/15-balance-corridor-validator.md)
  - [`tasks/mvp/02b-asset-pipeline/16-pack-error-code-catalog.md`](../../tasks/mvp/02b-asset-pipeline/16-pack-error-code-catalog.md)
  - [`tasks/phase-2/05-mod-system/08-override-precedence-and-patch-merge.md`](../../tasks/phase-2/05-mod-system/08-override-precedence-and-patch-merge.md)
  - [`tasks/phase-2/05-mod-system/09-canonical-packs-registry.md`](../../tasks/phase-2/05-mod-system/09-canonical-packs-registry.md)
  Registry now contains 351 tasks across 26 modules.
- Extended existing tasks (02b-01 manifest+registry, 02b-04 asset
  registry, 02b-06 completeness validator, 02b-08 scaffold script,
  02-14 localization schema, 05-03 sandbox, 05-04 mod manager UI,
  05a baseline ruleset packs, 05d official signing) to point at
  the new policy/spec docs and replace ad-hoc error strings with
  `pack.error.*` codes.
- Cross-linked the new policy from
  [`pack-contract.md`](../architecture/pack-contract.md),
  [`content-platform.md`](../architecture/content-platform.md),
  [`schema-matrix.md`](../architecture/schema-matrix.md), and
  [`AGENTS.md`](../../AGENTS.md) "Read first" list.

### Testability Plan Implementation (2026-05-04)

Closed the ten audit gaps from
[`docs/implementation-plans/15-testability-plan.md`](../implementation-plans/15-testability-plan.md):

- Authored five new architecture-testing docs:
  [`docs/architecture/testing/ui-smoke-contract.md`](../architecture/testing/ui-smoke-contract.md),
  [`docs/architecture/testing/coverage-policy.md`](../architecture/testing/coverage-policy.md),
  [`docs/architecture/testing/unit-test-contract.md`](../architecture/testing/unit-test-contract.md),
  [`docs/architecture/testing/engine-throughput-slo.md`](../architecture/testing/engine-throughput-slo.md),
  [`docs/architecture/testing/ai-tournament-harness.md`](../architecture/testing/ai-tournament-harness.md).
- Authored
  [`docs/architecture/net-transport.md`](../architecture/net-transport.md)
  pinning the `NetTransport` contract that both real WebRTC and the
  deterministic `NetSim` test transport satisfy.
- Added two new schemas + canonical examples:
  [`golden-fixture`](../../content-schema/schemas/golden-fixture.schema.json)
  for the golden-state regression suite and
  [`tournament-result`](../../content-schema/schemas/tournament-result.schema.json)
  for the shared AI tournament harness.
- Added a new module `tasks/mvp/02-tooling/` with five tasks:
  UI smoke harness, coverage gate, unit-test contract, property-
  based testing, edge-case fixtures. Created six placeholder
  edge-case scenario fixtures and an `INDEX.md` under
  `tests/__fixtures__/edge-cases/`.
- Added three new engine-core tasks: `12-golden-state-suite`,
  `13-replay-regression-suite`, `14-engine-throughput-benchmark`.
  Slot 11 was already taken by `11-no-wall-clock-lint`, so the new
  tasks shifted by one.
- Added `tasks/phase-2/10-ai-tournament-harness/` with
  `01-ai-tournament-harness.md`. The plan's path
  `tasks/phase-2/09-ai-tournament-harness.md` would have collided
  with the existing `09-quality` module; the new module preserves
  the plan's intent.
- Added `tasks/phase-3/01-multiplayer/12-network-chaos-harness.md`
  for per-PR module-level NetSim chaos. Distinct from the existing
  `11-network-chaos-test-matrix.md` (nightly stack-level matrix);
  both layers ship.
- Authored `src/ui/__tests__/smoke.template.test.ts` as the
  per-screen smoke template; the future runner skips files matching
  `smoke.template.*`.
- Created `tests/__fixtures__/golden/`, `tests/__fixtures__/edge-cases/`,
  and `tests/replays/` with README + INDEX files documenting naming
  conventions, blessing policy, and the bug-replay rule.
- Patched
  [`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs)
  with the `.golden-fixture.json` and `.tournament-result.json`
  suffix mappings.
- Updated `package.json` with six new scripts (`test:ui-smoke`,
  `test:golden`, `test:replays`, `test:coverage`, `bench:engine`,
  `golden:bless`); none are invoked by `npm run all`.
- Edited
  [`docs/architecture/determinism.md`](../architecture/determinism.md),
  [`docs/architecture/master-plan.md`](../architecture/master-plan.md),
  [`docs/architecture/overview.md`](../architecture/overview.md),
  [`docs/architecture/schema-matrix.md`](../architecture/schema-matrix.md),
  and
  [`docs/architecture/wiki/README.md`](../architecture/wiki/README.md)
  to cite the new contracts and schemas.
- Edited eleven existing task files (additive only): vite-config
  task (coverage threshold block), canonical-json task (downstream
  property-test consumer), replay-api task (additive
  `expectedFinalStateHash` field), CI task (five new verify steps),
  the four multiplayer chaos consumers (Tasks 3, 5, 6, 7), and the
  three AI eval consumers (`phase-2/02-strategic-ai/05`,
  `phase-2/03-second-faction/06`, `phase-3/03-mcts-ai/06` —
  switched from self-authored bracket loops to the shared harness).
- Registry now contains 370 tasks across 28 modules.

Implementation report:
[`docs/implementation-plans/15-testability-report.md`](../implementation-plans/15-testability-report.md).

### Implementation-Readiness Plan Implementation (2026-05-04)

Closed the 11 ❌/⚠ findings from
[`docs/implementation-plans/16-implementation-readiness-plan.md`](../implementation-plans/16-implementation-readiness-plan.md):

- **T1** — Ratified DEFEND damage-reduction at `250 permille`
  (25 % reduction) in
  [`docs/architecture/command-schema.md`](../architecture/command-schema.md)
  and
  [`tasks/mvp/09-tactical-combat/02a-defend-damage-reduction.md`](../../tasks/mvp/09-tactical-combat/02a-defend-damage-reduction.md);
  removed the dead `defendCapDEF` alternative; added a worked
  example. Cleared remaining `TBD` markers from `mechanics-coverage.md`
  and `26-m2-engine-hash-backfill.md`. Extended
  [`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs)
  with a placeholder-marker gate: any bare `TBD`, `TODO`, `FIXME`,
  or `???` in `docs/architecture/` or `tasks/mvp/` (outside backtick
  code spans, quoted refs, and the wiki `_templates/` instructional
  folder) fails CI. Regenerated `tasks/task-registry.json`.
- **T2** — Added [`LICENSE`](../../LICENSE) (MIT placeholder) and
  `package.json#license` SPDX identifier.
- **T3** — Authored
  [`docs/architecture/dependency-policy.md`](../architecture/dependency-policy.md)
  (allowed/denied SPDX list, dependency-add rubric, CVE-response
  windows, lockfile policy, audit cadence). Added
  [`.github/dependabot.yml`](../../.github/dependabot.yml) with
  weekly `npm` + `github-actions` grouped updates. Added an
  `npm audit --omit=dev --audit-level=high` step to
  [`.github/workflows/validate.yml`](../../.github/workflows/validate.yml)
  so the gate exists before the first runtime dep lands.
- **T4** — Added a screen-data-contract presence gate to
  `check-repo-contracts.mjs`: every
  `docs/architecture/wiki/screens/<n>-<id>/` package must ship a
  `data-contracts.md` file. Schema-landing per screen remains owned
  by [`06-data-contracts-and-schema-plan.md`](../implementation-plans/06-data-contracts-and-schema-plan.md).
- **T5** — Authored
  [`content-schema/schemas/renderer-event.schema.json`](../../content-schema/schemas/renderer-event.schema.json)
  (closed discriminated union: `SELECTION_CHANGED`, `CAMERA_FOCUSED`,
  `ANIMATION_STARTED`, `ANIMATION_FINISHED`, `DAMAGE_NUMBER`,
  `TILE_REVEALED`, `EFFECT_TRIGGERED`, `CONTEXT_LOST`,
  `CONTEXT_RESTORED`). Three canonical examples under
  [`content-schema/examples/renderer-events/`](../../content-schema/examples/renderer-events/);
  suffix-mapping wired in `check-repo-contracts.mjs`; new row in
  [`schema-matrix.md`](../architecture/schema-matrix.md);
  cross-link from
  [`renderer-technology-choice.md`](../architecture/renderer-technology-choice.md);
  06-renderer task 07 updated to cite the new schema.
- **T6** — Authored
  [`content-schema/schemas/report-base.schema.json`](../../content-schema/schemas/report-base.schema.json)
  (shared findings/severity shape) +
  [`validation-report.schema.json`](../../content-schema/schemas/validation-report.schema.json),
  [`coherence-report.schema.json`](../../content-schema/schemas/coherence-report.schema.json),
  and
  [`balance-report.schema.json`](../../content-schema/schemas/balance-report.schema.json)
  (Wilson 95 % CI metrics block). Four canonical examples under
  [`content-schema/examples/reports/`](../../content-schema/examples/reports/).
  Suffix mappings wired; three rows added to `schema-matrix.md`.
  Cross-link from
  [`ai-generation-pipeline.md`](../architecture/ai-generation-pipeline.md);
  phase-3 generation tasks 02 and 03 updated to cite the schemas.
- **T7** — Stood up the
  [`src/contracts/`](../../src/contracts/) workspace package
  (`@hr/contracts`, zero-runtime, `sideEffects: false`). Hand-
  authored contracts for `Rng`, `Clock`, `IdAllocator`,
  `PackRegistry`, `AssetLoader`, `CommandBus`, `NetTransport`;
  schema-derived TS for `RendererEvent` and the three reports.
  Added [`src/contracts/index.ts`](../../src/contracts/index.ts)
  re-export surface,
  [`src/contracts/fakes/`](../../src/contracts/fakes/) placeholder
  (catalogue landed by 15-testability-plan), and
  [`scripts/generate-contracts-from-schemas.mjs`](../../scripts/generate-contracts-from-schemas.mjs)
  (alignment-check stub until M0 ships
  `json-schema-to-typescript`). Wired `validate:contracts-ts` into
  `npm run validate`. Added the workspace to the root
  `package.json#workspaces` array. Updated
  [`module-graph.md`](../architecture/module-graph.md) to declare
  `src/contracts/` a leaf every module may `import type` from. The
  follow-up sweep that walks each `tasks/mvp/` task body and
  replaces inline interface blocks with `import type` references is
  not done in this commit — it is a planning-first repo and the
  inline blocks are the only place those interfaces currently live.
- **T8** — Authored
  [`docs/architecture/side-effect-matrix.md`](../architecture/side-effect-matrix.md)
  (one row per `src/<module>` with purity / permitted /
  forbidden / enforced-by columns). Cross-linked from
  [`determinism.md`](../architecture/determinism.md) and
  [`state-flow.md`](../architecture/state-flow.md).
- **T9** — Authored
  [`docs/architecture/non-functional-requirements.md`](../architecture/non-functional-requirements.md)
  (29 NFR rows across performance, memory, latency, capacity,
  startup, AI compute, CI). Each row carries metric, target,
  tolerance, owning module, and verification harness. Numbers
  pinned against [`performance.md`](../architecture/performance.md).
- **T10** — Authored
  [`docs/architecture/testing-conventions.md`](../architecture/testing-conventions.md)
  (DI convention, shared-fake catalogue location, mocking policy
  matrix, per-module test rubric, fuzz/property targets). Concrete
  fake bodies are landed by
  [`15-testability-plan.md`](../implementation-plans/15-testability-plan.md).
- **T11** — Added a `## Self-Contained Brief` section to every
  `tasks/mvp/<n>-<module>.md` index (Purpose / Public surface /
  Side effects / NFR / Exit criteria). Extended
  [`scripts/tasks.mjs`](../../scripts/tasks.mjs) `lintRegistry` so
  any MVP module index missing the section fails
  `npm run validate:tasks`.
- **T12** — Added staged-activation runtime CI in
  [`.github/workflows/runtime.yml`](../../.github/workflows/runtime.yml).
  A probe step gates lint / typecheck / unit / fuzz on file
  existence so the workflow is a no-op while the repo is
  planning-first and activates automatically once the first
  `src/<module>/*.ts` runtime file lands.
- **T13** — Authored three cross-cutting docs:
  [`error-taxonomy.md`](../architecture/error-taxonomy.md)
  (severities, code prefixes, error-record shape, user-facing vs
  internal split),
  [`hot-reload-flow.md`](../architecture/hot-reload-flow.md)
  (manifest → asset-index → schema-validate → registry-rebuild →
  engine-reload order with NFR-START-04 tie-in),
  [`asset-path-resolution.md`](../architecture/asset-path-resolution.md)
  (editor-time string lookups vs runtime registry resolution).
  Cross-linked from `AGENTS.md` (read-first list, items 29–34).

Implementation report:
[`docs/implementation-plans/16-implementation-readiness-report.md`](../implementation-plans/16-implementation-readiness-report.md).

### Final-Critical-Questions Plan Implementation (2026-05-04)

Closed the synthesis-layer findings from
[`docs/implementation-plans/17-final-critical-questions-plan.md`](../implementation-plans/17-final-critical-questions-plan.md):

- **Decision-log + provenance gate** — created
  [`docs/planning/decision-log.md`](./decision-log.md) (DEC-001
  ratifies the DEFEND `250 permille` lock; DEC-002 captures the
  IP-neutralization rules) and
  [`scripts/check-decision-provenance.mjs`](../../scripts/check-decision-provenance.mjs).
  The gate fails when an archive `Locked` claim is absent from both
  canonical sources and the decision log.
- **Runtime requirements** — authored
  [`docs/architecture/runtime-requirements.md`](../architecture/runtime-requirements.md)
  with RR-01…RR-09 (UI shell DOM, WebGL2 floor + Canvas-2D fallback,
  Web Workers, Web Crypto + Node parity, IndexedDB ≥ 50 MB, time
  source, gzip pin at level 6, browser engine floor, cross-env
  serializer parity). Backed by
  [`scripts/check-runtime-requirements.mjs`](../../scripts/check-runtime-requirements.mjs).
- **Deferred register** — authored
  [`docs/planning/deferred.md`](./deferred.md) with DEF-001…DEF-016
  + advisory gate
  [`scripts/check-deferred-coverage.mjs`](../../scripts/check-deferred-coverage.mjs).
- **Rollback playbook** — authored
  [`docs/operations/rollback-playbook.md`](../operations/rollback-playbook.md)
  (pack revocation, engine retention window, save quarantine,
  kill-switch policy with conservative default, hot-fix migration,
  RACI table).
- **Observability** — authored
  [`docs/architecture/observability.md`](../architecture/observability.md)
  (Logger / MetricsSink interfaces, required-emissions catalogue,
  privacy redaction rules) with
  [`content-schema/schemas/telemetry-event.schema.json`](../../content-schema/schemas/telemetry-event.schema.json)
  + two canonical examples under
  [`content-schema/examples/telemetry/`](../../content-schema/examples/telemetry/).
  Tasks landed at
  [`tasks/phase-2/11-observability/`](../../tasks/phase-2/11-observability/).
- **Diagram-task parity** — added the "Normative Status" section to
  [`docs/architecture/diagrams/README.md`](../architecture/diagrams/README.md)
  + gate
  [`scripts/check-diagram-task-parity.mjs`](../../scripts/check-diagram-task-parity.mjs)
  (catches state-blob in save-flow, "resync from last good state"
  in multiplayer-sync without bisect ladder, and renderer→engine
  callbacks at DAMAGE_FRAME).
- **Error UX** — authored
  [`docs/architecture/error-ux.md`](../architecture/error-ux.md)
  (surface decision matrix, code → surface mapping, localization-
  key convention, `error.shown` telemetry rule). Gate
  [`scripts/check-error-ux-coverage.mjs`](../../scripts/check-error-ux-coverage.mjs)
  runs strict and fires when a screen names a specific error code
  without an accompanying `## Error surfaces` block. Per-screen
  blocks were generated from each screen's Actions table using the
  row's `Type` column as the authority — `Type: command` rows get
  a domain-aware default (`STORAGE_REJECTED → modal` for save-load
  actions, `NET_REJECTED → modal` for multiplayer actions,
  `VALIDATION_REJECTED → inline` for editor actions,
  `DISPATCHER_REJECTED → inline` otherwise); `Type: navigation` /
  `Type: local-ui` rows are skipped because the dispatcher never
  sees them. Result: 41 screens carry the table; 28 are correctly
  navigation/local-UI only (no block needed). The wiki generator's
  link rewriter was patched to handle `.md#anchor` fragment links
  too, fixing broken in-wiki cross-references. New error-code
  tokens (`DISPATCHER_REJECTED`, `STORAGE_REJECTED`, `NET_REJECTED`,
  `VALIDATION_REJECTED`, `AI_PROVIDER_TIMEOUT`, `AI_WORKER_BUSY`,
  `UI_TRACE_DIVERGENCE`) registered in
  [`docs/architecture/screen-command-coverage.json`](../architecture/screen-command-coverage.json)
  `outOfScope` so the command-coverage gate skips them with a
  recorded reason.
- **Cross-environment parity** — task
  [`tasks/mvp/01-engine-core/09b-cross-environment-canonical-bytes-test.md`](../../tasks/mvp/01-engine-core/09b-cross-environment-canonical-bytes-test.md)
  pins the Playwright-driven Node↔browser byte-equality proof; the
  parent serializer task and fuzz harness task were extended to
  expose / consume the transcript.
- **Balance judgement rules** — task stub
  [`tasks/phase-2/12-balance-judgement/01-judgement-rules-doc.md`](../../tasks/phase-2/12-balance-judgement/01-judgement-rules-doc.md)
  schedules the methodology extraction (Q294 #2).
- **Lobby placeholder** — task stub
  [`tasks/phase-3/05-lobby/00-plan-stub.md`](../../tasks/phase-3/05-lobby/00-plan-stub.md)
  marks the gap until plan 18 lands (DEF-016).
- **Wiring** — `package.json` wires `validate:provenance`,
  `validate:runtime-requirements`, `validate:deferred`,
  `validate:diagram-task-parity`, `validate:error-ux` into
  `npm run validate`. AGENTS.md, overview.md, and the architecture
  README index point at the new docs.

Implementation report:
[`docs/implementation-plans/17-final-critical-questions-report.md`](../implementation-plans/17-final-critical-questions-report.md).

### TURN Credentials & Signaling-Server Abuse Plan Implementation (2026-05-05)

Closed the doctrine and contract gaps from
[`docs/implementation-plans/25-turn-credentials-and-signaling-server-abuse-plan.md`](../implementation-plans/25-turn-credentials-and-signaling-server-abuse-plan.md):

- **Doctrine docs (six new)** — authored
  [`docs/architecture/signaling-message-schema.md`](../architecture/signaling-message-schema.md),
  [`docs/architecture/turn-credentials.md`](../architecture/turn-credentials.md),
  [`docs/architecture/signaling-edge-defense.md`](../architecture/signaling-edge-defense.md),
  [`docs/architecture/signaling-health-endpoints.md`](../architecture/signaling-health-endpoints.md),
  [`docs/architecture/turn-fallback-policy.md`](../architecture/turn-fallback-policy.md), and
  [`docs/architecture/signaling-stateless-invariant.md`](../architecture/signaling-stateless-invariant.md).
- **Schemas (two new)** —
  [`signaling-message.schema.json`](../../content-schema/schemas/signaling-message.schema.json)
  (closed discriminated union, `additionalProperties: false`, length
  caps, 27 message variants) with 11 canonical fixtures under
  [`content-schema/examples/signaling-message/`](../../content-schema/examples/signaling-message/);
  [`turn-credential.schema.json`](../../content-schema/schemas/turn-credential.schema.json)
  with two fixtures under
  [`content-schema/examples/turn-credential/`](../../content-schema/examples/turn-credential/).
  Both registered in
  [`schema-matrix.md`](../architecture/schema-matrix.md); suffix-mapped
  in `scripts/check-repo-contracts.mjs`.
- **TURN-server scaffolding** —
  [`services/turn/README.md`](../../services/turn/README.md),
  [`services/turn/config/turnserver.example.conf`](../../services/turn/config/turnserver.example.conf)
  (pinned coturn config: `lt-cred-mech`, `no-tcp-relay`,
  `no-loopback-peers`, full IPv4 / IPv6 `denied-peer-ip` allowlist,
  `min-port=49160`, `max-port=49200`, `total-quota=200`,
  `user-quota=4`, `max-bps=1500000`, `bps-capacity=300000000`),
  [`services/turn/scripts/sync-deny-list.ts`](../../services/turn/scripts/sync-deny-list.ts)
  (deny-list contract surface), and
  [`services/turn/log/schema.json`](../../services/turn/log/schema.json)
  (PII-scrubbed attribution log shape).
- **Edge config augments** —
  [`services/signaling/config/edge.example.toml`](../../services/signaling/config/edge.example.toml)
  extended with `[edge_defense.per_prefix_socket_cap]`,
  `[edge_defense.upgrade_flood]`,
  `[edge_defense.captcha_escalation]`,
  `[edge_defense.blocklist]`, `[health.public]`, `[health.admin]`
  (additive; no existing block rewritten).
- **Owning tasks (five new)** at
  [`tasks/phase-3/01-multiplayer/`](../../tasks/phase-3/01-multiplayer/):
  - `31-signaling-message-schema-and-validation.md` — AJV gate +
    `ws` hardening defaults + `validate:signaling`.
  - `32-signaling-rate-limit-augmentations.md` — per-prefix
    concurrent-socket cap, per-connection message rate,
    `REQUEST_TURN_REFRESH` throttle, `ROOM_FULL` reply.
  - `33-turn-credentials-doctrine-issuance.md` — HMAC-SHA1
    issuer, dual-secret rotation, `TURN_CREDENTIALS` envelope,
    deny-list emitter, `validate:turn`.
  - `34-turn-server-hardening.md` — coturn config + deny-list
    consumers + log-rewriter sidecar + `validate:turn-config`.
  - `35-edge-defense-and-health-segregation.md` — blocklist
    store, admin server on `127.0.0.1:9091`, CAPTCHA escalation,
    TURN-down state machine, lobby failure-state handlers,
    `validate:edge` and `validate:signaling-stateless`.
- **Existing tasks extended (additive)** —
  [Task 01](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
  message list extended with
  `ROOM_FULL` / `TURN_CREDENTIALS` / `REQUEST_TURN_REFRESH` /
  `ERROR`; new sections (Message Validation, Edge-Tier Defenses,
  TURN Credentials, Stateless Invariant); shared-ownership rows
  for Tasks 31 / 32 / 33 / 35.
  [Task 02](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md)
  acceptance criteria extended with TURN-provisioning + TURN-down
  fallback clauses.
  [Task 10](../../tasks/phase-3/01-multiplayer/10-turn-fallback-and-credentials.md)
  Read First and Outputs extended; `GET /turn-credential` is
  superseded by the `TURN_CREDENTIALS` envelope (Task 33).
- **Lobby + setup screens** —
  [`64-network-lobby/spec.md`](../architecture/wiki/screens/64-network-lobby/spec.md)
  added § Connection-Failure States with the four named failure
  states (`relayUnavailable`, `rateLimited`, `roomFull`,
  `codeLocked`) plus the transient `captchaRequired`;
  [`64-network-lobby/interactions.md`](../architecture/wiki/screens/64-network-lobby/interactions.md)
  added the matching handler block; data-contracts now list
  `errorState`. [`62-multiplayer-setup/architecture.md`](../architecture/wiki/screens/62-multiplayer-setup/architecture.md)
  carries a TURN Provisioning subsection pointing at
  `turn-credentials.md`.
- **Command + screen-coverage maps** —
  [`command-schema.md`](../architecture/command-schema.md) gained
  a "Signaling Abuse-Defense, TURN, and Connection-Failure
  Commands" subsection registering
  `RECEIVE_TURN_CREDENTIALS`, `REQUEST_TURN_REFRESH`,
  `TURN_CREDENTIALS_EXPIRED`, `CONNECTION_FAILED_RELAY_UNAVAILABLE`,
  `SIGNALING_RATE_LIMITED`, `SIGNALING_ROOM_FULL`,
  `SIGNALING_VALIDATION_FAILED`, `SIGNALING_PAYLOAD_REJECTED`,
  `CAPTCHA_REQUIRED`, `CAPTCHA_VERIFIED`, `IP_BLOCKLISTED`. Same
  tokens added to
  [`screen-command-coverage.json`](../architecture/screen-command-coverage.json)
  `outOfScope` and to
  [`task-command-token-coverage.json`](../architecture/task-command-token-coverage.json).

Implementation report:
[`docs/implementation-plans/25-turn-credentials-and-signaling-server-abuse-report.md`](../implementation-plans/25-turn-credentials-and-signaling-server-abuse-report.md).

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
