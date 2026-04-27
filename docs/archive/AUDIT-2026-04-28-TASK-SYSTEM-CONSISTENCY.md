# Task System Consistency Audit — 2026-04-28

Auditor: Claude (Opus 4.7)
Scope: Task backlog ↔ architecture ↔ UI screen wiki ↔ content schemas, plus AI-execution readiness of the task registry.
Inputs sampled:
- `tasks/` (235 task files across 22 modules)
- `tasks/task-registry.json` (16 057 lines, regenerated during this audit)
- `docs/architecture/wiki/screens/` (65 screen packages)
- `content-schema/schemas/` (33 JSON schemas)
- `docs/architecture/*.md` and `docs/architecture/diagrams/`
- `npm run validate` (full repo gate) and `npm run tasks:next` (scheduler)

---

## 1. Task System Score

**9.4 / 10** — production-ready for autonomous AI execution.

| Dimension | Score | Notes |
|---|---|---|
| Backlog ↔ architecture alignment | 10 / 10 | Every architecture module has tasks; no orphan tasks. |
| Backlog ↔ UI screens | 10 / 10 | 65 / 65 screen packages owned. |
| Backlog ↔ data contracts | 10 / 10 | 33 / 33 schemas referenced by an owning task. |
| Task atomicity | 10 / 10 | All 235 tasks within 2–6 h; histogram below. |
| Task completeness | 10 / 10 | 0 tasks missing required sections. |
| AI executability | 9 / 10 | One sentinel-style dep ("None") and ~20 module-level deps that are scheduler-actionable but coarser than ideal. |
| Registry validity | 10 / 10 | Regenerates clean, no parse errors, no cycles. |
| Dependency graph | 9 / 10 | 0 cycles, 0 unresolved entries; one cross-phase ordering risk surfaced in the scheduler. |
| classic fantasy strategy mechanics coverage | 9 / 10 | All MVP-critical systems covered; some classic fantasy strategy-specific niches addressed only through screen packages, not engine tasks. |
| MVP playable-loop validity | 10 / 10 | Map → hero movement → resources/towns → auto-resolve and real combat → victory all present. |
| AI execution flow (`tasks:next`) | 9 / 10 | Works, but dispenses a phase-3 task in parallel with the MVP entry task. |
| Cross-layer traceability | 10 / 10 | UI tasks cite screen packages; schema tasks cite schema files; engine tasks cite architecture docs. |

The repo's own validators (`npm run validate`, `npm run validate:tasks`) pass with zero issues.

---

## 2. Critical Issues

**None.** No execution-blocking problems were found.

The repo is in unusually good shape: every UI screen has an owner, every schema has a canonical authoring task, every dependency edge resolves, no cycles exist, every task carries the five required sections (`Description`, `Outputs`, `Dependencies`, `Acceptance Criteria`, `Estimated Time`).

The findings below are quality-of-life polish, not blockers.

---

## 3. Misalignments

### 3.1 Tasks ↔ UI

- All 65 numbered screen packages are owned. Several composite screens correctly carry multiple owners (e.g. `07-adventure-map` is shared by `mvp.07-ui-shell.01/02/03/06` plus three `phase-2.06-visual-fidelity` polish tasks).
- No screen-without-task or task-without-screen-link issues.

### 3.2 Tasks ↔ Schemas

- All 33 schemas have a canonical authoring task (or, for the AI-generation IO schemas, a phase-3 task).
- Effect-related schemas (`effect`, `condition`, `target-scope`, `targeting`, `stat-id`, `status-id`, `ability`) are co-owned by `mvp.02-content-schemas.13-effect-registry`. This is correct given the registry pattern but means a single 6-h task carries seven schemas; if it ever needs to split, the schema-ownership map will need updating in lockstep.

### 3.3 Tasks ↔ Architecture

- All architecture modules listed in `docs/architecture/master-plan.md` (engine, rules, content-schema, content-runtime, renderer, ui, editor, ai, net, persistence) have one or more owning task modules.
- Determinism stack (RNG → fixed-point → dispatcher → serializer + hash → replay → fuzz) maps 1-to-1 onto the ordered tasks in `mvp/01-engine-core/`.

---

## 4. Missing Tasks

No missing UI, schema, or engine tasks were detected against the current architecture. The following are *latent* gaps the user may want to consider, but each is already covered indirectly:

- **Combat siege mechanics (walls, gates, towers, moat).** Covered by `phase-2.07-ui-screen-backlog.43-siege-combat-screen` (UI) but no engine task explicitly implements wall/gate/tower simulation. If siege is in scope before phase-3 polish, an engine-level task should be added under `phase-2` or `mvp.09-tactical-combat`.
- **Adventure-map spell targeting engine.** UI exists (`17-adventure-spell-targeting`); the engine companion is bundled inside `phase-2.01-spells-artifacts.03-adventure-map-spells` — fine if that task scope explicitly covers targeting validation, otherwise consider splitting.
- **Hero leveling RNG/skill choice generator.** Covered by `phase-2.01-spells-artifacts.00-hero-leveling` and `01-hero-skill-assignment`; check that the task body specifies the deterministic choice algorithm (RNG sub-stream, candidate filter), since the UI level-up dialog assumes it exists.
- **Multiplayer chat / observer mode** is not in the screen wiki and has no task — explicitly out of scope per current planning, but worth confirming.

These are not gaps the validator will catch; they are scope-decision questions for the user.

---

## 5. Task Rewrites

Sampled tasks are already AI-executable:
- [tasks/mvp/01-engine-core/06-command-dispatcher.md](../../tasks/mvp/01-engine-core/06-command-dispatcher.md) — clear inputs, outputs, owned paths, schema ref, acceptance bullets are testable.
- [tasks/mvp/09-tactical-combat/03-damage-formula.md](../../tasks/mvp/09-tactical-combat/03-damage-formula.md) — exact integer formula, reference numbers, and example calculations included; an agent can implement without further questions.
- [tasks/mvp/05-adventure-map/03-hero-movement.md](../../tasks/mvp/05-adventure-map/03-hero-movement.md) — has worked examples, validation steps, determinism contract.
- [tasks/phase-2/07-ui-screen-backlog/26-marketplace-screen.md](../../tasks/phase-2/07-ui-screen-backlog/26-marketplace-screen.md) — anchors implementation to the screen package's five files.

No task rewrites are required. Two minor polish opportunities:

**Polish A — Replace the `None` literal dependency.** `tasks/mvp/01-engine-core/01-initialize-root-workspace-and-module-layout.md` lists `Dependencies: - None`. The lint script accepts this, but it's the only task that uses the `None` sentinel; every other zero-dep task simply has an empty list. Standardising on an empty list (or always using "None") would remove a second code path.

**Polish B — Tighten module-level dependencies.** ~21 task→module edges (e.g. `phase-3.04-polish.05-performance-profiling-plus-optimization` depends on 14 different `module:*` ids) are valid but coarse. They mean "wait for the entire module to finish" — fine for end-of-phase polish, but a few of these could be tightened to specific task IDs (e.g. `phase-2.01-spells-artifacts.04-baseline-skill-pack` depends on `module:mvp.02-content-schemas` plus `mvp.02-content-schemas.13-effect-registry` — the module dep is redundant once the specific task dep is satisfied).

Neither blocks execution; both reduce false-positive blocking when the scheduler runs.

---

## 6. Registry Issues

`tasks/task-registry.json` regenerates cleanly:

- 235 tasks, 22 modules, 0 issues from `validate:tasks`.
- 0 dependency cycles, 0 unresolved entries (after recognising `module:*` and the `None` sentinel).
- Every task carries `inputs`, `outputs`, `readFirst`, `ownedPaths`, `acceptanceCriteria`, `verifyCommands`, `estimatedTime`, `screenPackages`, `schemaPaths`.
- 4 tasks have empty `ownedPaths` (research/validation tasks with `ownedPathsOptOut: true`) — handled correctly by the lint script.

No registry issues require fixing. The `generate:task-registry` script is idempotent; running it during this audit produced no diff.

---

## 7. Execution Risks

These are situations where an autonomous agent could stall or pick the wrong work, despite the validator passing:

1. **Phase-3 multiplayer signaling task surfaces in `tasks:next` alongside the MVP entry task.** With both having no dependencies, the scheduler currently lists:
   - `mvp.01-engine-core.01-initialize-root-workspace-and-module-layout`
   - `phase-3.01-multiplayer.01-signaling-server-node-js-websocket-lobby`

   The README's recommended order says MVP comes first. An agent following the scheduler literally could start the multiplayer signaling server before the engine exists. Recommendation: add a `module:mvp.10-heuristic-ai` (or similar end-of-MVP) dependency to phase-3 entry tasks so MVP completion gates phase-3, OR document explicitly that solo developers should pass `--phase=mvp` to `tasks:next`. Currently the scheduler has no phase filter.

2. **Module-level dependencies expand into many implicit edges.** When a task depends on `module:mvp.02-content-schemas`, the scheduler treats that as "wait for *every* schema task to be done". For a coarse barrier this is intentional; but if any schema task is later deferred, multiple downstream tasks will appear blocked even when the *specific* schemas they need are ready. Watch for this once execution begins.

3. **`mvp.02-content-schemas.13-effect-registry` is a single 6-h task that owns 7 schemas.** That is at the upper edge of atomicity and is on the critical path for skills, spells, abilities, and statuses. If it slips, six-plus downstream tasks are blocked. Consider pre-emptive split into `13a-effect-and-target-scope` + `13b-condition-stat-status-ability`.

4. **Several phase-2 UI screens depend only on `mvp.07-ui-shell.*` plumbing.** That is correct for plumbing but means an agent can implement `marketplace-screen.tsx` before any marketplace gameplay command exists. This is deliberate (mockup-driven) — but the agent must read the screen package's `interactions.md` to know which commands are gameplay-real vs disabled-with-localized-reason. Acceptance criteria already require the latter; verify that during code review.

5. **No human gate is required by the validator after content authoring.** Skills, spells, artifacts, and unit balance are tagged 🧠 in filenames but the lint passes regardless. Determinism and schema validation will not catch a numerically broken ruleset. A human (or balance-AI) review should be added to the workflow before content tasks are marked `done`.

---

## 8. Fix Plan

Concrete, in priority order:

1. **(P1) Gate phase-3 entry tasks behind MVP.** Add `module:mvp.09-tactical-combat` (or whatever the agreed "MVP done" marker is) as a dependency of:
   - `phase-3.01-multiplayer.01-signaling-server-node-js-websocket-lobby`
   - any other phase-3 task that currently has zero dependencies (audit with `tasks:next` after each fix).

   This removes the only realistic execution-flow risk.

2. **(P2) Split `mvp.02-content-schemas.13-effect-registry` into 13a / 13b.** Reduces the at-risk single-point-of-failure on the critical path. Update the schema-ownership table in `docs/planning/task-system-report.md` (regenerated automatically).

3. **(P2) Standardise zero-dependency notation.** Either delete the `Dependencies: - None` line from `mvp.01-engine-core.01` or migrate every other zero-dep task to use the same sentinel. Pick one.

4. **(P3) Add a `--phase` filter to `npm run tasks:next`.** Today it's "any unblocked task anywhere"; a flag (or a `tasks:next:mvp` script) makes the autonomous-agent path explicit and removes risk #1 even without changing dependencies.

5. **(P3) Add a "balance-review-required" tag to 🧠 content tasks.** The lint script can refuse to mark `done` until a reviewer signs off, mirroring how `verifyCommands` already gates code tasks. This addresses risk #5.

6. **(P4) Tighten the ~21 module-level dependencies that are also covered by a specific task dep.** Pure cleanup; reduces scheduler false-blocks.

7. **(P4) Decide whether siege engine mechanics need a phase-2 engine task.** Current backlog covers the UI but not the simulation behind it. Either add the engine task or annotate `43-siege-combat-screen` to call out that combat reuses the standard tactical engine without dedicated wall/gate/tower handling.

---

## 9. classic fantasy strategy Mechanics Coverage

Spot-checked the registry text for classic fantasy strategy systems. Counts (substring matches across all 235 tasks):

| System | Refs | Status |
|---|---|---|
| Spells / Mage Guild | 406 / 34 | Covered (P2 module + UI + engine binding) |
| Artifacts (incl. paper doll, combination) | 273 + 10 | Covered (P2 module) |
| Secondary skills (28-skill canonical pack) | 220 | Covered |
| Combat (damage, retaliation, morale, luck, flying, ranged) | 414 / 132 / 46 / 117 / 50 / 18 / 40 | Covered (M2 module) |
| Towns / buildings / mage guild / recruit / grail | 260 / 249 / 34 / 63 / 19 | Covered |
| Adventure map (resource, mine, fog, pathfind, hero movement) | 164 / 86 / 31 / 30 / 50 | Covered |
| Heroes (level up, experience, hero meeting, prison) | 575 / 30 / 17 | Covered |
| Persistence (save, replay, RNG, determinism) | 96 / 53 / 66 / 102 | Covered |
| Multiplayer (lobby, hotseat, sync) | 134 | Covered (phase-3) |
| Mods / packs (extension boundary) | 1228 / 917 | Covered (phase-2.05 + asset pipeline) |
| Niche classic fantasy strategy surfaces (puzzle map, shipyard, tavern, marketplace, thieves guild, siege, tactics) | 14 / 18 / 18 / 38 / 14 / 29 / 18 | Covered as screens; engine support varies (see fix #7). |

classic fantasy strategy "playable-loop" baseline (map → hero → resources → towns → combat → victory) is fully tasked in MVP. Faction count is 1 in MVP (Emberwild) plus 1 in phase-2 (Necropolis); the 6+ town count from classic fantasy strategy is explicitly out of MVP scope and should be added through the pack system once the loader is in place.

---

## 10. Atomicity Histogram

| Estimated time | Tasks |
|---|---|
| 2 h | 37 |
| 3 h | 107 |
| 4 h | 61 |
| 5 h | 19 |
| 6 h | 11 |

**0 tasks exceed the 6-hour cap.** The 11 six-hour tasks are concentrated in the engine/AI layer (command dispatcher, A* pathfinder, tactical evaluator, baseline-skill-pack, baseline-ruleset) — exactly where you'd expect the heaviest single units of work to be.

---

## 11. AI-Execution Flow Verification

`npm run tasks:next` returns ready work in well-formed shape:

```
mvp.01-engine-core.01-initialize-root-workspace-and-module-layout
  Initialize root workspace and module layout (- 2 hours)
  module: mvp.01-engine-core
  deps:   None

phase-3.01-multiplayer.01-signaling-server-node-js-websocket-lobby
  Signaling Server — Node.js WebSocket Lobby (- 4 hours)
  module: phase-3.01-multiplayer
  deps:   None
```

A single-track autonomous agent could:

1. `npm run tasks:next` → see the engine-core entry task.
2. `npm run tasks:start -- mvp.01-engine-core.01-initialize-root-workspace-and-module-layout` (registry regenerates, status flips).
3. Read `Description`, `Inputs`, `Outputs`, `Owned Paths`, `Acceptance Criteria`, `Verify`.
4. Implement under `Owned Paths`; run `npm run validate` + `npm test`.
5. `npm run tasks:done -- <id>` (gate enforced by `verifyCommands`).
6. Loop.

The loop has no dead ends. The only real execution risk is fix #1: the scheduler will hand a phase-3 task to an unattended agent if it picks the wrong row.

---

## 12. Verdict

**The task system is autonomous-AI-executable in its current state.** All eleven audit dimensions land at 9 or 10. No tasks need to be rewritten, no schemas or screens are unowned, no dependency cycles exist, and the validator gate runs clean.

The fix plan is polish (`P1` is one new dependency edge, the rest are P2–P4 cleanups). After fix #1, an autonomous agent can be pointed at the repo and run end-to-end through MVP without human routing.

Final-goal status:

| Criterion | Status |
|---|---|
| Every task is executable by AI | ✅ |
| Tasks align with UI + schema + architecture | ✅ |
| Backlog covers classic fantasy strategy mechanics (MVP scope) | ✅ |
| Registry supports automated execution | ✅ |
| Report saved to file | ✅ (this file) |
