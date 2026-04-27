# Task System Audit — Full Consistency & AI Execution Readiness (v2)

- **Date**: 2026-04-30 (second pass; supersedes nothing — independent re-audit)
- **Auditor role**: Senior engineering manager + AI workflow architect + task-system auditor
- **Scope**: `tasks/`, `tasks/task-registry.json`, `docs/architecture/`, `docs/architecture/wiki/screens/`, `content-schema/`, `scripts/tasks.mjs`, `scripts/generate-*.mjs`, `docs/architecture/screen-command-coverage.json`
- **Methodology**:
  - Re-ran the full validator chain (`npm run validate` → `generate:task-registry` + `validate:links` + `validate:contracts` + `validate:cross-refs` + `validate:commands` + `validate:tasks`).
  - Ran the harness test suite (`npm test` → 15/15 pass).
  - Regenerated [`docs/planning/task-system-report.md`](../planning/task-system-report.md).
  - Sampled task files end-to-end across MVP, phase-2 wrappers, phase-3, and the new content-editor commands.
  - Cross-verified the prior-audit Tier 1 / 2 / 3 fixes, computed phase-layering inversions, fan-out, owned-path collisions, schema/screen ownership, and selector traceability against gameplay state.
  - Cross-checked against [`master-plan.md`](../architecture/master-plan.md) and [`screen-command-coverage.json`](../architecture/screen-command-coverage.json).

This audit is **independent** of the deterministic [`task-system-report.md`](../planning/task-system-report.md). The report is corroborating, not ground truth.

---

## 1. Task System Score — **9.4 / 10**

The task system clears every machine-checkable bar (zero lint issues, zero unresolved deps, zero cycles, zero unowned screens, zero unreferenced schemas) and almost every human-judgment bar. Every Tier 1 / 2 / 3 issue from the prior audit is now resolved (C1, C2, C3 all landed; weak wrappers all anchored; phase-layering inversions = 0). The remaining 0.6 reflects three non-blocking issues a fresh AI agent will hit: (a) the **puzzle-map / grail-fragment** gameplay state has no owning engine task — the wrapper compiles but its selectors silently read undefined; (b) `tasks:next` still has no fan-out / hot-path signal for parallel execution (R1 from prior audit); (c) UI-owning tasks gate `done` on headless tests only — visual regressions can ship.

| Dimension | Score | Evidence |
|---|---:|---|
| Backlog ↔ architecture alignment | 10 | All 11 architecture pillars (engine, rules, content-schema, content-runtime, renderer, ui, editor, ai, net, persistence, services) own at least one task module. 23 modules / 280 tasks cover them. |
| Backlog ↔ UI screens (**CRITICAL**) | 9 | 65/65 numbered screen packages owned. 117 tasks declare a screen package. **One latent gap**: the `10-puzzle-map` wrapper depends on `09-map-object-dialogs` only — no engine task produces `state.players.active.obelisksVisited` or `selectors.grail.*`. See §2 / C-NEW-1. |
| Backlog ↔ data contracts | 10 | 33 schemas on disk are referenced; 6 are forward-declared and owned by their producing task (campaign, quest, random-map-template, marketplace-rate-table, tavern-offer, university-skill-table). Cross-ref check passes. |
| Task atomicity | 10 | 280/280 tasks ≤ 6 h. Distribution: 38 × 2h, 128 × 3h, 80 × 4h, 24 × 5h, 10 × 6h. Mean ≈ 3.4 h. **Total backlog ≈ 960 h.** |
| Task completeness (formal) | 10 | All 280 tasks include `Description`, `Outputs` (≥ 1), `Dependencies`, `Acceptance Criteria` (≥ 1), `Estimated Time`. Lint = 0 issues. |
| Single-task AI-executability (**CRITICAL**) | 9 | Engine and command tasks are exemplary (e.g. [`mvp.01-engine-core.06-command-dispatcher`](../../tasks/mvp/01-engine-core/06-command-dispatcher.md), [`phase-2.04-content-editor.08-map-editor-commands`](../../tasks/phase-2/04-content-editor/08-map-editor-commands.md), [`phase-2.08-meta-systems.07-hotseat-turn-state-machine`](../../tasks/phase-2/08-meta-systems/07-hotseat-turn-state-machine.md)). All 51 phase-2.07 wrappers now declare ≥ 1 non-shell engine dep (Tier 3 fix landed). The **one remaining single-task ambiguity** is the puzzle-map wrapper — its selectors do not resolve to any task's outputs. |
| Registry validity | 10 | 280 tasks / 23 modules / 65 screens; deterministic regen. `npm run validate` fully green. |
| Dependency graph correctness | 10 | 0 cycles, 0 unresolved entries, **0 phase layering inversions** (prior audit had 3 — all fixed). Out-degree avg 3.1, max 18. Top fan-out: `mvp.07-ui-shell.02-zustand-store` (54), `mvp.07-ui-shell.01-app-shell` (51), `mvp.07-ui-shell.06-command-hook` (49), `mvp.05-adventure-map.01-strategic-game-state-model` (27), `mvp.01-engine-core.06-command-dispatcher` (21). |
| Baseline-corridor mechanics coverage | 9 | Map, hero, town, economy, combat, spells, artifacts, skills, AI, persistence, replay, campaign, quest, mod system, multiplayer, rendering, generation are all owned. The 7 deferred-by-design sub-mechanics in `tasks/README.md` are the known list. **Not on that list and not owned**: obelisk visit + grail fragment reveal (see §4). |
| MVP playable-loop completeness | 10 | M0–M2 stack present and gated behind [`mvp.05-adventure-map.08-7-day-playable-smoke-test`](../../tasks/mvp/05-adventure-map/08-7-day-playable-smoke-test.md). RNG → fixed-point → dispatcher → serializer → hash → replay → fuzz → map → hero → mine → town → auto-resolve → victory → AI worker → save-load all present. |
| Cross-layer traceability (**CRITICAL**) | 10 | UI tasks → `wiki/screens/<nn>/`; data tasks → `content-schema/schemas/<x>.schema.json`; engine tasks → `docs/architecture/*.md`. Enforced by `scripts/tasks.mjs lint`. |
| AI execution flow (`tasks:next` → `done`) | 9 | Loop is functional. `tasks:next:mvp` returns the single root-ready task; chain extends as tasks flip done. **Limitation unchanged**: pure topological order — no `downstreamCount` / `--hot` ordering for parallel agents. |

### Headline numbers (registry generated 2026-04-30, second pass)

- **Tasks**: 280 (was 274 in prior audit; +6 new tasks land in: `phase-2/01-spells-artifacts/05a`, `05b`, `phase-2/04-content-editor/08`, `09`, `phase-2/08-meta-systems/07`, plus net adjustments)
- **Modules**: 23
- **Screen packages**: 65 (all owned; 22 single-owner, 43 multi-owner)
- **JSON schemas on disk**: 33 (all referenced); +6 forward-declared = 39 task-referenced
- **Dependency cycles**: 0
- **Unresolved dependency entries**: 0
- **Phase-layering inversions**: **0** (was 3 in prior audit)
- **Owned-path collisions**: 8, but each is "1 primary + N additive shared" pattern — accepted by lint and architecturally intentional
- **Total backlog estimate**: ≈ 960 h

---

## 2. Critical Issues

> Critical = blocks autonomous AI execution OR breaks alignment with architecture / UI / schema. Today there are **no fully-blocking** issues; the items below are the highest-impact frictions an AI loop will hit.

### C-NEW-1. Puzzle-map / grail-fragment gameplay state is unowned

[`phase-2.07-ui-screen-backlog.10-puzzle-map-screen`](../../tasks/phase-2/07-ui-screen-backlog/10-puzzle-map-screen.md) declares one engine dep (`mvp.05-adventure-map.09-map-object-dialogs`). But [`docs/architecture/wiki/screens/10-puzzle-map/data-contracts.md`](../architecture/wiki/screens/10-puzzle-map/data-contracts.md) requires:

| Selector / state | Producer expected | Actual owner | Status |
|---|---|---|---|
| `state.players.active.obelisksVisited` | engine reducer (visit obelisk → append) | none | **gap** |
| `selectors.grail.revealedPuzzleFragments` | engine selector (from obelisks + scenario grail seed) | none | **gap** |
| `selectors.grail.visibleRegionHint` | engine selector | none | **gap** |
| `selectors.grail.selectedFragmentMapFocus` | engine selector | none | **gap** |

`09-map-object-dialogs` covers screens 09 / 18 / 20 (object dialog, tooltip, mine dialog) and the generic `VISIT_MAP_OBJECT` dispatch — it does **not** track obelisk visits or compute grail-fragment reveal.

The wrapper's acceptance criterion *"Every selector listed in data-contracts.md is read through the store or a boundary adapter, not by reaching into sim internals"* will be technically satisfied by reading `undefined` from a missing selector — i.e. an AI agent will produce an empty puzzle map and report success.

**Fix**: open `tasks/mvp/05-adventure-map/22-obelisk-visits-and-grail-state.md` (3–4 h, baseline-corridor mechanic). Add to the puzzle-map wrapper's `Dependencies:`. Mirror `phase-2.05-mod-system.07-build-grail-structure-command` (the *consumer* of grail state). See §5.1 for the rewrite.

### C-NEW-2. `tasks:next` still lacks parallelism / hot-path ordering (carried from prior audit R1)

The execution queue is purely topological. With 280 tasks, an MVP-only single-thread loop reads 1 ready task at a time and hits the highest-fan-out tasks in arbitrary order. Top fan-out tasks are obvious unblockers (`zustand-store` → 54 downstream, `command-dispatcher` → 21), and an AI agent should prefer them when ties exist.

**Fix**: in `scripts/generate-task-registry.mjs`, add `downstreamCount` per task. In `scripts/tasks.mjs`, accept `--hot` to sort `next` by `downstreamCount desc`. Roughly 1 day of work; not blocking.

### C-NEW-3. UI-owning tasks gate `done` on headless tests only

`Verify:` for every wrapper task is `npm run validate` + `npm test`. Both pass headlessly. None of the 117 UI-owning tasks runs a browser-side smoke test, so a wrapper that compiles but renders blank can flip to `done`.

**Fix**: extend `tasks:done` to detect `src/ui/**` ownership and append a `vitest --browser` or Playwright check to the verify chain. Or add a `verifyExtra` field per task that the runner appends.

---

## 3. Misalignments

### 3.1 Tasks ↔ UI

- **Resolved since prior audit**: every phase-2.07 wrapper now declares ≥ 1 non-shell engine dep. Spot-checked the prior watch list:
  - `10-puzzle-map` → `09-map-object-dialogs` *(but see C-NEW-1; the dep is structurally insufficient)*
  - `12-creature-bank-loot` → `09-map-object-dialogs` (creature-bank reward command is `mvp.05-adventure-map.14`; consider tightening this dep too)
  - `27-thieves-guild` → `mvp.05-adventure-map.05-town-visit-recruit-build-mage-guild`, `mvp.07-ui-shell.04-town-screen-modal`
  - `30-build-tree` → `mvp.05-adventure-map.05-town-visit-recruit-build-mage-guild`
  - `42-victory-defeat-cinematic` → `mvp.09-tactical-combat.11-combat-hud-overlay`
  - `43-siege-combat` → `phase-2.01-spells-artifacts.13-siege-state-machine`, `.14-fire-catapult-command`
  - `45-tactics-phase` → `mvp.09-tactical-combat.12-tactics-phase-engine` (and `PLACE_TACTICS_STACK` is in `command.schema.json`)
  - `52-artifact-combine-dialog` → `phase-2.01-spells-artifacts.15-combine-artifacts-command`
  - `65-map-editor` → `phase-2.04-content-editor.08-map-editor-commands`, `.09-map-editor-object-palette`
- **Soft suggestion**: `12-creature-bank-loot-screen` should additionally depend on [`mvp.05-adventure-map.14-collect-creature-bank-reward-command`](../../tasks/mvp/05-adventure-map/14-collect-creature-bank-reward-command.md), not only on `09-map-object-dialogs`. Currently the wrapper can ship before the reward command is `done`.

### 3.2 Tasks ↔ Schema

- 33 on-disk schemas are referenced; 0 unreferenced. 6 forward-declared schemas are owned by their producing task. **No misalignment.**

### 3.3 Tasks ↔ Architecture

- One subtle drift carried from prior audits: [`docs/architecture/master-plan.md`](../architecture/master-plan.md) lists `editor` as a top-level `src/` module, but the editor tasks own `src/ui/editor/*`. Low severity — either update the master plan or move the path.
- Otherwise: every architecture pillar (`docs/architecture/*.md`) maps to ≥ 1 task module.

---

## 4. Missing Tasks

| Severity | Missing | Rationale |
|---|---|---|
| **High** | Obelisk visits + grail-fragment state | C-NEW-1. Open `tasks/mvp/05-adventure-map/22-obelisk-visits-and-grail-state.md` (~4 h). Adds `obelisksVisited` to player state, `grail.{seed,fragments}` to scenario, and the four `selectors.grail.*` selectors. Gates the puzzle-map wrapper. |
| Medium | Creature-bank wrapper → reward-command dep | §3.1 soft suggestion. Add `mvp.05-adventure-map.14-collect-creature-bank-reward-command` to `phase-2.07-ui-screen-backlog.12-creature-bank-loot-screen` deps. 5-min edit. |
| Medium | UI-side smoke check in `verify` chain | C-NEW-3. Either a global Playwright runner or `vitest --browser` smoke for any task touching `src/ui/**`. |
| Low | `downstreamCount` in registry + `tasks:next --hot` | C-NEW-2. ~1 day, parallelism ergonomics. |
| Low | Hill-fort upgrade-path selector | The wrapper assumes `selectors.creatures.availableHillFortUpgrades` exists. This is screen-specific glue and can be implemented inside the wrapper, but it would be cleaner if the upgrade-path computation owned by `mvp.05-adventure-map.20-upgrade-army-stack-command` exposed a public selector that the screen consumes. Ergonomics, not correctness. |

The 7 deferred-by-design mechanics in [`tasks/README.md` §Deferred Mechanic Inventory](../../tasks/README.md) (necromancy, native-terrain bonuses, diplomacy, caravan, first-aid tent, necropolis morale, counter-spells) remain folded into parent tasks and are not reopened by this audit.

---

## 5. Task Rewrites — AI-executable form

### 5.1 Add `tasks/mvp/05-adventure-map/22-obelisk-visits-and-grail-state.md`

```markdown
# Obelisk Visits And Grail State

Status: planned

Module: [Adventure Map (M1)](../05-adventure-map.md)

Description:
Track per-player obelisk visits and reveal grail puzzle fragments
deterministically from scenario seed. Powers the puzzle-map screen and
the grail-region hint without leaking puzzle data into UI state.

Read First:
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- `docs/architecture/wiki/screens/10-puzzle-map/data-contracts.md`
- `docs/architecture/wiki/screens/10-puzzle-map/spec.md`

Inputs:
- `AdventureState.players[]` from
  `mvp.05-adventure-map.01-strategic-game-state-model`
- `VISIT_MAP_OBJECT` from
  `mvp.05-adventure-map.21-map-object-visit-and-battle-initiation-commands`
- `scenario.schema.json` (extend with `grail` section)
- `map-object.schema.json` (must declare an `obelisk` object kind)

Outputs:
- `src/engine/grail/obelisk-state.ts`
- `selectors.grail.revealedPuzzleFragments`
- `selectors.grail.visibleRegionHint`
- `selectors.grail.selectedFragmentMapFocus`
- `state.players[*].obelisksVisited: ObjectId[]`
- Scenario-time grail seed: `scenario.grail.{coordinate, fragmentCount}`
- Reducer hook: `VISIT_MAP_OBJECT` for obelisk kind appends to
  `obelisksVisited` and never duplicates.

Owned Paths:
- `src/engine/grail/obelisk-state.ts`

Dependencies:
- mvp.05-adventure-map.01-strategic-game-state-model
- mvp.05-adventure-map.21-map-object-visit-and-battle-initiation-commands
- mvp.02-content-schemas.08-adventure-building-plus-map-object-schemas

Acceptance Criteria:
- Visiting an obelisk twice does not duplicate the entry
- `revealedPuzzleFragments` is a deterministic function of
  `(scenario.grail.seed, obelisksVisited.length)`
- `visibleRegionHint` returns increasing precision as fragments
  accumulate; same seed → same hint sequence across replays
- Replay of a 7-day session containing obelisk visits produces an
  identical state hash
- `npm run validate:cross-refs` recognizes the four new selectors

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
```

Then update [`phase-2.07-ui-screen-backlog.10-puzzle-map-screen.md`](../../tasks/phase-2/07-ui-screen-backlog/10-puzzle-map-screen.md) `Dependencies:` to add:

```
- mvp.05-adventure-map.22-obelisk-visits-and-grail-state
```

### 5.2 Tighten the creature-bank wrapper dep

Edit [`phase-2.07-ui-screen-backlog.12-creature-bank-loot-screen.md`](../../tasks/phase-2/07-ui-screen-backlog/12-creature-bank-loot-screen.md), `Dependencies:` add:

```
- mvp.05-adventure-map.14-collect-creature-bank-reward-command
```

### 5.3 (Optional) Hill-fort upgrade-path selector

If `mvp.05-adventure-map.20-upgrade-army-stack-command` is rewritten to expose a `selectors.creatures.availableHillFortUpgrades` selector (≤ 30 min addition to its outputs), the hill-fort wrapper's selector contract becomes engine-owned rather than wrapper-internal. Optional polish.

---

## 6. Registry Issues

None at the parser / lint layer. Every validation script is green:

```
generate:task-registry → 280 tasks, 23 modules
validate:links → all resolve
validate:contracts → passed
validate:cross-refs → passed
validate:commands → passed
validate:tasks → 0 issues
```

Two soft observations on the registry as a *machine-actionable* substrate (carried from prior audit):

- **R1** Add `downstreamCount` per task (computed at registry-generation). Expose `npm run tasks:next -- --hot` to surface highest-fan-out ready tasks.
- **R2** `taskDependencies`/`moduleDependencies` (resolved IDs) and `dependencies` (raw text) are dual views of the same data. Automation should prefer the resolved arrays. Consider deprecating the human-readable `dependencies` array in JSON (it stays in the source `.md`).

Owned-path collisions (8) are all "1 primary + N shared" — architecturally correct (initial creator is exclusive owner; later additive tasks declare `Owned Paths (shared):`). Lint correctly accepts these.

---

## 7. Execution Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| AI agent picks `phase-2.07.10-puzzle-map-screen`, finds no engine selectors, reads `undefined`, ships an empty puzzle map | **High** until §5.1 lands | §5.1 |
| AI agent ships UI wrapper that compiles + headless-tests pass but renders blank | Medium | §C-NEW-3 — add browser smoke to `tasks:done` |
| AI agent operating in parallel picks low-fan-out tasks first and serializes downstream work | Medium | §C-NEW-2 — `tasks:next --hot` |
| AI agent completes `mvp.05-adventure-map.21-map-object-visit-and-battle-initiation-commands` without an obelisk reducer branch (since obelisk-as-distinct-kind is not a sub-task) | Medium | §5.1 makes the obelisk reducer explicit |
| Owned-paths collision regression when a new task claims a shared file without declaring `Owned Paths (shared):` | Low | Lint already enforces; covered. |
| Schema forward-references (`campaign`, `quest`, `random-map-template`, `tavern-offer`, `marketplace-rate-table`, `university-skill-table`) become silently stale if the producing task is reassigned | Low | Cross-ref checker enforces; covered. |
| `phase-2.07-ui-screen-backlog.13-hill-fort-screen` ships before `selectors.creatures.availableHillFortUpgrades` exists, hardcoding logic in the wrapper | Low | §5.3 is optional polish |
| Determinism violations sneak into UI/animation timeline | Low | ESLint rule from `mvp.01-engine-core.05` covers `src/engine`; extend to `src/rules` once it exists |

---

## 8. Fix Plan

Concrete, ordered, each piece independently mergeable.

### Tier 1 — Close the puzzle-map / grail gap (≤ 1 day)

1. Create `tasks/mvp/05-adventure-map/22-obelisk-visits-and-grail-state.md` per §5.1.
2. Update `phase-2.07-ui-screen-backlog.10-puzzle-map-screen.md` `Dependencies:` to include the new task.
3. Confirm `map-object.schema.json` declares an `obelisk` object kind (open a sub-task in `mvp.02-content-schemas` if missing).
4. Run `npm run generate:task-registry && npm run validate`.

### Tier 2 — Tighten wrapper deps where engine task already exists (≤ ½ day)

5. `phase-2.07-ui-screen-backlog.12-creature-bank-loot-screen` → add `mvp.05-adventure-map.14-collect-creature-bank-reward-command` to deps.
6. Sweep remaining 50 wrappers and confirm each non-cosmetic engine action they imply has a matching dep. Most will already be correct.

### Tier 3 — UI-side smoke check in `verify` (≤ 1 day)

7. Add `vitest --browser` (or Playwright) smoke runner to `scripts/tasks.mjs done`. Detect tasks where `ownedPaths` includes any `src/ui/**` path and append the smoke run to `verifyCommands` at runtime.
8. Document the new gate in `tasks/README.md` and `AGENTS.md`.

### Tier 4 — Registry ergonomics for parallel AI execution (≤ 1 day)

9. Add `downstreamCount` to each task in the registry generator.
10. Add `tasks:next --hot` flag that orders ready tasks by `downstreamCount` desc.
11. Add `tasks:next --json` for machine consumption (convenience).

### Tier 5 — Optional polish (≤ ½ day)

12. Hill-fort upgrade-path selector in `mvp.05-adventure-map.20`. Ergonomics only.
13. Reconcile `master-plan.md`'s `src/editor/*` claim with the actual `src/ui/editor/*` ownership (or rename).

### Verification of every fix

14. `npm run validate` → expect green.
15. `npm run tasks:next:mvp` → expect ≥ 1 ready task. Walk one full chain (start → done → next).
16. Regenerate `docs/planning/task-system-report.md` and confirm no rows shift unexpectedly.

---

## Final Goal Status

| Criterion | Status |
|---|---|
| Every task is executable by AI | **Yes**, with one caveat (puzzle-map wrapper) closed by Tier 1. |
| Tasks align with UI + schema + architecture | **Yes** — alignment is structural and validator-enforced. |
| Backlog covers Heroes-III-shaped mechanics (IP-neutral baseline) | **Yes**, with 7 named sub-mechanics deferred-by-design and one **new** gap (obelisk/grail) closed by Tier 1. |
| Registry supports automated execution | **Yes**; Tier 4 adds parallelism ergonomics. |
| Saved report exists | **Yes** — this file. |

The system is **ready for autonomous AI execution against the MVP lane today**. Tier 1 (≤ 1 day) closes the only remaining structural gap (puzzle-map / grail). Tier 2–3 are quality-of-life improvements that prevent silent partial-success failures in UI work. Tier 4–5 are pure ergonomics.

The four prior critical issues (C1, C2, C3 and the wrapper-weak-deps sweep) are all resolved and should not be reopened. The two scoring deductions remaining (single-task AI-executability and `tasks:next` ergonomics) are both in the fix plan and tractable in ≤ 2 days of focused work.
