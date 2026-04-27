# Task System Full-Consistency Audit (AI-Execution Lens) — 2026-05-01

**Auditor role:** Senior engineering manager + AI workflow architect + task-system auditor.

**Scope:** Verify that the `tasks/` execution system is complete, consistent,
machine-actionable, and ready for an autonomous AI agent to execute the backlog
end-to-end without human hand-holding. Cross-check against architecture
modules, UI wiki screen packages, content schemas, and Heroes-III–derived
baseline mechanics.

**Method:**
- Static inspection of every task Markdown file under `tasks/mvp/`,
  `tasks/phase-2/`, `tasks/phase-3/` (281 leaf tasks, 23 module indexes).
- Programmatic load and toposort of `tasks/task-registry.json`.
- Full validator pipeline: `npm run generate:task-registry`, `validate:tasks`,
  `validate:contracts`, `validate:cross-refs`, `validate:commands`,
  `validate:task-commands`, `validate:links`.
- Cross-walk of every screen package in `docs/architecture/wiki/screens/`
  against task `Read First` / `Inputs` / `Acceptance Criteria` references.
- Cross-walk of every schema in `content-schema/schemas/` against task
  references and task-declared output paths.
- Sampled 8 representative task files across engine, schema, UI, combat,
  spells/artifacts, and MCTS for AI-executability inspection.

**Source-of-truth registry snapshot:**

| Metric | Value |
|---|---|
| Tasks total | **281** |
| Modules | **23** |
| Status `planned` / `in_progress` / `done` | 281 / 0 / 0 |
| Required-section completeness (Description, Outputs, Dependencies, AC, Estimate) | **281 / 281** |
| Tasks with at least one screen-package anchor | 118 / 281 |
| Tasks with at least one schema anchor | 153 / 281 |
| Tasks intentionally unanchored (pure engine/system) | 128 / 281 |
| Dependency cycles | **0** |
| Unresolved dependency entries | **0** |
| Topological sort | succeeds for all 281 |
| Task-command literal violations | 0 |
| Unanchored UI/editor tasks | 0 (85 / 85 covered) |
| Unowned screen packages | 0 (65 / 65 owned) |
| Unreferenced schemas | 0 (33 / 33 referenced) |
| Median estimated time | **3 hours** |
| Maximum estimated time | 6 hours |
| Tasks ≤ 6h (atomicity bound) | **281 / 281** |

---

## 1. Task System Score

**9.7 / 10**

Production-grade task system. Backlog is structurally clean, fully cross-linked,
validated by automation already wired into CI, and every leaf task carries the
five required sections plus owned-paths metadata. An AI agent that opens any
single task file has the inputs, outputs, dependencies, owned paths, acceptance
criteria, and verify commands it needs to act without loading sibling files.

The 0.3-point deduction reflects three soft seams worth tightening — none of
them block AI execution today:

1. `phase-3.04-polish.05-performance-profiling-plus-optimization` carries a
   transitive dependency closure of **272 tasks** (essentially all of MVP +
   phase-2). It is correctly modelled as a milestone gate, but a single
   "4-hour" task with that closure invites split-or-rescope before phase-3
   begins so the registry can surface ready siblings without it acting as a
   choke point.
2. `phase-3.04-polish.07-launch-checklist-plus-final-smoke-test` and
   `phase-3.04-polish.06-accessibility-pass` declare 93 and 66 transitive
   dependencies respectively — same milestone-gate pattern, same observation.
3. `phase-2.06-visual-fidelity` tasks 01–05, 12–15 (terrain transitions, depth
   sorting, scatter, road, river, siege backdrop, badges, hex overlay) do not
   reference a screen package because they are renderer primitives, not UI
   surfaces. This is correct, but the module index could benefit from an
   explicit "renderer-only — no screen package required" lint tag analogous to
   `screen-wrapper` so future authors do not accidentally attach a screen
   reference where none belongs.

---

## 2. Critical Issues

**None.** No AI-blocking defects detected.

The validation pipeline is green end-to-end:

```
generate:task-registry  → Wrote 281 tasks and 23 modules
validate:links          → All Markdown links resolve.
validate:contracts      → Repo contract checks passed.
validate:cross-refs     → Cross-reference checks passed.
validate:commands       → Command coverage check passed.
validate:task-commands  → Task command literal check passed.
validate:tasks          → Task lint passed: 281 tasks, 0 issues.
```

No tasks have unresolved dependencies, no missing required sections, no
dependency cycles, no orphan screens, no orphan schemas, no command-literal
drift in screen interactions.

---

## 3. Misalignments

### 3.1 Tasks ↔ UI screens
- **Coverage:** 65 / 65 screen packages have at least one owning task. The
  task-system report's `Screen Ownership` table is fully populated.
- **Multi-owner screens are intentional and modelled correctly** (e.g.
  `07-adventure-map` is split across UI shell + visual-fidelity tasks; the
  visual-fidelity tasks may only restyle and cannot rebind selectors per the
  acceptance-criteria contract written into `mvp.07-ui-shell.04` and similar).
- **No misalignments detected.**

### 3.2 Tasks ↔ schemas
- **Coverage:** 33 / 33 schemas are referenced by at least one task. Six
  schemas referenced by tasks do not yet exist on disk
  (`campaign`, `quest`, `random-map-template`, `tavern-offer`,
  `marketplace-rate-table`, `university-skill-table`) but are explicit
  *outputs* of `mvp.02-content-schemas` tasks 16–20, so referring tasks are
  correctly waiting on schema-creation tasks via `Dependencies:`.
- **No misalignments detected.**

### 3.3 Tasks ↔ architecture
- Every architecture doc under `docs/architecture/*.md` is referenced from
  at least one task `Read First` block (`determinism.md` 43 refs,
  `effect-registry.md` 41 refs, `state-flow.md` 40 refs, etc.).
- The lowest-referenced docs are `glossary.md` (1 ref) and `master-plan.md`
  (2 refs). Both are intentionally listed as **Ambient Reading** in
  `tasks/README.md` rather than pinned per-task. Working as designed.
- **No misalignments detected.**

---

## 4. Missing Tasks

After a full sweep against the Heroes-III baseline mechanic inventory plus the
65 screen packages, **no missing tasks were detected**. Coverage by mechanic:

| Mechanic | Owning tasks |
|---|---|
| **Map system** (hex, tile storage, A*, ZoC, fog, RMG, underground) | `mvp.03-map-system.01–10` |
| **Adventure loop** (turn structure, hero MP, mines, towns, victory, week/month, obelisks, grail) | `mvp.05-adventure-map.01–22` |
| **Town & economy** (build tree, recruit, mage guild, marketplace, trade, tavern, garrisons, prison, dwellings) | `mvp.05-adventure-map.04, 05, 10, 11–13, 18, 20`; `phase-2.01.10–17` |
| **Auto-resolve combat** (MVP fast path) | `mvp.05-adventure-map.06` |
| **Tactical combat** (init, queue, defend, damage, ranged, retaliation, morale/luck, abilities, end, replace AR, replay, HUD, tactics, retreat/surrender) | `mvp.09-tactical-combat.01–13` |
| **Heroic mechanics** (skill tree, leveling, specialty, paper doll, equip, transfer, combine artifacts) | `phase-2.01.00, 01a/b, 04a/b, 05–07, 09, 16` |
| **Spells** (school loader, combat 5, adventure spells, mage guild content, casting UI) | `phase-2.01.01b, 02, 03, 04b, 08` |
| **Artifacts** (paper doll, equip/unequip, transfer, combination, buy, trade) | `phase-2.01.05a/b, 06, 10, 17` |
| **Heuristic AI** (threat map, wants, scorer, tactical eval, difficulty, worker) | `mvp.10-heuristic-ai.01–06` |
| **Strategic AI** (resource deficit, town planner, role assignment, long-horizon, GM, spell sel) | `phase-2.02-strategic-ai.01–06` |
| **Necropolis & necromancy** | `phase-2.03-second-faction.01–06` |
| **Mod system** (zip pack, sigs, sandbox, mod manager, ref packs, signing) | `phase-2.05-mod-system.01–07` |
| **Editor** (routing, unit, faction, validation, preview, export, integration test, map editor + palette) | `phase-2.04-content-editor.01–09` |
| **Visual fidelity** (terrain transitions, depth sort, scatter, road/river, UI chrome, panels, bottom bar, backdrops, badges, hex overlay) | `phase-2.06-visual-fidelity.01–15` |
| **Meta systems** (campaign graph, runner, cinematic, quest log, status history, caravan, hotseat) | `phase-2.08-meta-systems.01–07` |
| **UI screen backlog** (50 of 65 named screens) | `phase-2.07-ui-screen-backlog.03–65` |
| **Multiplayer** (signaling, WebRTC, lockstep, hash exchange, bisect, reconnect, host migration, lobby) | `phase-3.01-multiplayer.01–08` |
| **AI generation** (prompt provider, validation, balancer, optimizer, asset stub, moderation, gen UI, eval) | `phase-3.02-ai-generation.00–08` |
| **MCTS** (tree, UCB1, evaluator, beam, WASM, difficulty, bench) | `phase-3.03-mcts-ai.01a/b–06` |
| **Polish** (renderer cap detect, WebGPU, sound, ranked/tournament, perf, a11y, launch) | `phase-3.04-polish.01a/b/c–07` |

**Deferred mechanics intentionally folded into parent tasks** (documented in
`tasks/README.md` "Deferred Mechanic Inventory"):

- Necromancy (raise skeletons after battle) → split out only when its parent task starts
- Native-terrain bonuses
- Diplomacy / surrender of neutral stacks
- Caravan transfer (now own task: `phase-2.08-meta-systems.06`)
- First-aid tent battlefield healing
- Necropolis-specific morale rules
- Counter-spells (Counterstrike, Magic Mirror)

This is an explicit, documented design choice — not a coverage gap.

---

## 5. Task Rewrites

**No rewrites required.** Spot-checked tasks are at or above the bar:

- `mvp.01-engine-core.06-command-dispatcher` — typed contract, owned paths,
  dependency chain, Result-style return, deterministic guarantees, AC linked
  to schema discriminants.
- `mvp.05-adventure-map.03-hero-movement` — full worked example with sample
  command JSON, validation steps, before/after state, terrain cost table,
  determinism contract, plus an invalid-input example. Exemplary.
- `mvp.09-tactical-combat.03-damage-formula` — formula expressed as integer
  AST with named ruleset constants, four numeric AC test cases, and an
  explicit "no `Math.*`, no floats" determinism clause.
- `mvp.07-ui-shell.04-town-screen-modal` — all five files of the screen
  package referenced; explicit live-vs-stub dispatch contract; explicit
  separation-of-concerns clause vs phase-2 visual-fidelity work.
- `phase-2.07-ui-screen-backlog.28-tavern-screen` — uses the canonical
  screen-wrapper acceptance template (selectors via store/boundary, alias
  resolution via `screen-command-coverage.json`, planned-task disabled
  fallback, no engine reducer leakage).
- `phase-3.03-mcts-ai.01b-ucb1-search-loop-and-budgeted-runner` — pluggable
  evaluator, deterministic AC, budget presets, perf bound.

The repository's task-authoring template (worked examples + numeric AC +
owned-paths + verify commands) is one of the strongest seen in any project of
this size. Future authors can use the above as canonical references.

---

## 6. Registry Issues

**None.**

- `tasks/task-registry.json` regenerates cleanly from Markdown via
  `npm run generate:task-registry` (281 tasks / 23 modules written).
- Every task's `resolvedDependencies` resolves to existing IDs.
- `taskDependencies` and `moduleDependencies` are split correctly so
  module-level deps do not register as unresolved.
- `downstreamTransitiveCount` and `screenSchemaPaths` derived fields agree
  with filesystem reality.
- Per-task `unresolvedDependencies[]` is empty for all 281 tasks.

---

## 7. Execution Risks

| Risk | Where it bites | Mitigation status |
|---|---|---|
| Milestone-gate tasks (`phase-3.04-polish.05/06/07`) carry massive transitive closures and could block ready-task surfacing late in phase-3. | Phase-3 tail. | **Watch.** Suggest splitting `polish.05` into per-subsystem perf passes once MVP completes. |
| The single initially-ready task is `mvp.01-engine-core.01-initialize-root-workspace-and-module-layout`. If an AI agent cannot complete it (e.g. missing global tooling), the entire 281-task DAG is blocked. | First boot of the autonomous loop. | **Acceptable.** This is correct critical-path design; the task is small (≈2h) and includes its own verify command. |
| Visual-fidelity tasks are renderer primitives without screen-package anchors. An AI agent using "screen package as ground truth" heuristic may hesitate. | Phase-2 mid-stream. | **Watch.** Recommend a `renderer-primitive` lint tag on the module index analogous to `ui-shell` / `screen-wrapper`. |
| Six schemas (`campaign`, `quest`, `random-map-template`, `tavern-offer`, `marketplace-rate-table`, `university-skill-table`) are referenced before they exist on disk, but consumer tasks correctly depend on the schema-creation tasks. | First pass of phase-2 schema-consuming tasks. | **Acceptable.** The DAG ordering forces the schema-creation tasks first. |
| Heroes-III lore terms (e.g. "wandering monsters") use renamed schema names (`neutral-stack-template`). An AI agent trained on H3 docs may search for the legacy term. | Mid-MVP through phase-2. | **Watch.** A glossary anchor (`docs/architecture/glossary.md`) entry for each renamed term would shorten the search. |

**No human-input-required tasks identified.** Tasks marked 🧠 (judgement-heavy)
in the marker legend still embed enough numeric/structural AC to be
machine-checkable.

---

## 8. Fix Plan

All items below are **non-blocking polish**. The system is shippable to an AI
execution loop today.

### Immediate (before kicking off the autonomous loop) — none.

### Short-term (during MVP phase, P1)
1. Add a `renderer-primitive` lint tag to `tasks/phase-2/06-visual-fidelity.md`
   so the linter does not surface the 9 renderer-only tasks as missing screen
   anchors. Mirror the existing `screen-wrapper` machinery.
2. Add glossary entries for renamed Heroes-III terms (`neutral-stack-template`
   = "wandering monsters", etc.) in `docs/architecture/glossary.md` so AI
   agents searching by H3 lore terms land on the right schema.

### Medium-term (during phase-2, P2)
3. Split `phase-3.04-polish.05-performance-profiling-plus-optimization` into
   per-subsystem perf tasks (`05a-engine-perf`, `05b-renderer-perf`,
   `05c-ai-perf`, `05d-content-loader-perf`). Each should depend only on its
   own subsystem's MVP closure.
4. Re-scope `phase-3.04-polish.06-accessibility-pass` and
   `phase-3.04-polish.07-launch-checklist-plus-final-smoke-test` to declare
   only their direct subsystem deps; today they collect transitively because
   they declare module-level deps that fan out widely.

### Tasks to add — none required for AI execution.

The deferred-mechanic inventory at the bottom of `tasks/README.md` is the
correct mechanism for tracking the ~7 items folded into parent tasks. Split
those into dedicated files only when each parent task is about to start, per
the project's stated policy.

### Tasks to reorder — none required.

The MVP critical chain documented in `tasks/README.md`
(engine → schemas → assets → faction → map → adventure → renderer → UI shell →
persistence → tactical combat → heuristic AI) matches the dependency DAG
exactly.

---

## Final Goal Status

| Final-goal criterion | Result |
|---|---|
| Every task is executable by AI | **Yes** |
| Tasks align with UI + schema + architecture | **Yes** |
| Backlog fully covers Heroes-III baseline mechanics | **Yes** |
| Registry supports automated execution | **Yes** |
| Semantic readiness gates clean | **Yes** |
| Dependency DAG acyclic and toposortable | **Yes** |
| Atomicity (all tasks 2–6h) | **Yes** |
| Required sections present on every leaf | **Yes (281/281)** |

**Bottom line:** The task system is ready for autonomous AI execution. Start
the loop with `npm run tasks:next:mvp`; the first ready task is
`mvp.01-engine-core.01-initialize-root-workspace-and-module-layout`.

---

## Appendix A — Sampled Tasks (AI-executability inspection)

| Task | Atomicity | Inputs explicit | Outputs explicit | AC numeric/checkable | Owned paths | Verify cmd |
|---|---|---|---|---|---|---|
| `mvp.01-engine-core.06-command-dispatcher` | 6h ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `mvp.02-content-schemas.01-unit-schema` | 3h ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `mvp.05-adventure-map.03-hero-movement` | 4h ✓ | ✓ (worked example) | ✓ | ✓ | ✓ | ✓ |
| `mvp.05-adventure-map.08-7-day-playable-smoke-test` | 2h ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `mvp.07-ui-shell.04-town-screen-modal` | 4h ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `mvp.09-tactical-combat.03-damage-formula` | 4h ✓ | ✓ | ✓ | ✓ (4 numeric cases) | ✓ | ✓ |
| `phase-2.01-spells-artifacts.02-combat-spells` | 5h ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `phase-2.07-ui-screen-backlog.28-tavern-screen` | 3h ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `phase-3.03-mcts-ai.01b-ucb1-search-loop-and-budgeted-runner` | 4h ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

All sampled tasks pass the "AI agent opens this file cold and can implement
it" test.

## Appendix B — Validator Outputs (replay)

```
$ npm run generate:task-registry
Wrote 281 tasks and 23 modules to tasks/task-registry.json

$ npm run validate:tasks
Task lint passed: 281 tasks, 0 issues.

$ npm run validate:links
All Markdown links resolve.

$ npm run validate:contracts
Repo contract checks passed.

$ npm run validate:cross-refs
Cross-reference checks passed.

$ npm run validate:commands
Command coverage check passed.

$ npm run validate:task-commands
Task command literal check passed.
```

Topological sort over `resolvedDependencies` succeeds for all 281 tasks; zero
cycles, zero unresolved refs.
