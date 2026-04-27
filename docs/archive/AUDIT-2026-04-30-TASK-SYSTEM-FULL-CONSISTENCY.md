# Task System Audit — Full Consistency & AI Execution Readiness

- **Date**: 2026-04-30
- **Auditor role**: Senior engineering manager + AI workflow architect + task-system auditor
- **Scope**: `tasks/`, `tasks/task-registry.json`, `docs/architecture/`, `docs/architecture/wiki/screens/`, `content-schema/`, `scripts/tasks.mjs`, `scripts/generate-*.mjs`, `docs/architecture/screen-command-coverage.json`
- **Methodology**:
  - Re-ran the full validator chain ([package.json](../../package.json) → `npm run validate` = `generate:task-registry` + `validate:links` + `validate:contracts` + `validate:cross-refs` + `validate:commands` + `validate:tasks`).
  - Replayed the harness test suite (`npm test` → green).
  - Parsed [task-registry.json](../../tasks/task-registry.json) for atomicity, completeness, dependency graph, lane layering, schema/screen ownership.
  - Sampled task files end-to-end across MVP, phase-2 wrappers, phase-3, and worked-example-bearing tasks for AI-executability.
  - Cross-checked against [`master-plan.md`](../architecture/master-plan.md), [`screen-curation-plan.md`](../architecture/wiki/screen-curation-plan.md), and [`screen-command-coverage.json`](../architecture/screen-command-coverage.json).

This audit is **independent** of [`docs/planning/task-system-report.md`](../planning/task-system-report.md) (the deterministic snapshot from the generator). The report is corroborating, not ground truth.

---

## 1. Task System Score — **9.3 / 10**

The task system clears every machine-checkable bar (zero lint issues, zero unresolved deps, zero cycles, zero unowned screens, zero unreferenced schemas) and almost every human-judgment bar. The remaining 0.7 reflects three non-blocking but real issues a fresh AI agent will hit during autonomous execution: (a) two MVP tasks transitively require phase-2 work, (b) several screen-backlog wrapper tasks under-scope what they imply (notably the map editor), and (c) `tasks:next` has no signal for which ready task unlocks the most downstream tasks.

| Dimension | Score | Evidence |
|---|---:|---|
| Backlog ↔ architecture alignment | 10 | All 11 architecture pillars (engine, rules, content-schema, content-runtime, renderer, ui, editor, ai, net, persistence, services) own at least one task module. |
| Backlog ↔ UI screens (**CRITICAL**) | 10 | 65/65 numbered screen packages owned per [task-system-report.md §Screen Ownership](../planning/task-system-report.md). 84/84 UI/editor tasks declare a `screens/<nn>/` package in Read First/Inputs and Acceptance Criteria. |
| Backlog ↔ data contracts | 10 | 33/33 schemas on disk are referenced; 6 schemas are forward-declared and scheduled to be *produced* by their owning task (not orphans). |
| Task atomicity | 10 | 274/274 tasks ≤ 6 h. Distribution: 39 × 2h, 126 × 3h, 77 × 4h, 21 × 5h, 11 × 6h. Mean ≈ 3.4 h. **0 oversized.** |
| Task completeness (formal) | 10 | All 274 tasks include `Description`, `Outputs` (≥ 1), `Dependencies`, `Acceptance Criteria` (≥ 1), `Estimated Time`. `npm run validate:tasks` → 0 issues. |
| Single-task AI-executability (**CRITICAL**) | 8 | The strong tasks are exemplary (e.g. [`mvp.05-adventure-map.01-strategic-game-state-model`](../../tasks/mvp/05-adventure-map/01-strategic-game-state-model.md) ships full TypeScript types and a worked 7-command JSON sequence; [`mvp.09-tactical-combat.03-damage-formula`](../../tasks/mvp/09-tactical-combat/03-damage-formula.md) ships the integer AST formula with numeric acceptance vectors). The phase-2.07-ui-screen-backlog wrapper tasks (51 of them) intentionally delegate to engine commands behind the screen-command coverage map; an AI agent reading one of these wrappers in isolation may not realize the wrapper is *only* allowed to render disabled controls until the owning engine task is `done`. The constraint is documented per-file but the cost is high context per task. |
| Registry validity | 10 | 23 modules + 274 tasks. `npm run generate:task-registry` reproduces deterministically. 0 stale entries. |
| Dependency graph correctness | 9 | 0 cycles. **Two layering inversions** (see §3): two MVP tasks depend on a phase-2 task, and one phase-2 task depends on a phase-3 task. They lint clean because lint does not enforce phase layering. |
| Baseline-corridor mechanics coverage | 9 | All canonical mechanics in scope (map, hero, town, economy, combat, spells, artifacts, skills, AI, persistence, replay, campaign, quest, mod system, multiplayer, rendering, generation). 7 named sub-mechanics in [`tasks/README.md` §Deferred Mechanic Inventory](../../tasks/README.md) are folded into parent tasks by design. |
| MVP playable-loop completeness | 10 | M0–M2 stack (RNG → fixed-point → dispatcher → serializer → hash → replay → fuzz) plus map / hero / mine / town / auto-resolve / victory / AI worker / save-load / baseline ruleset / 7-day smoke test all present. The smoke test ([`mvp.05-adventure-map.08-7-day-playable-smoke-test`](../../tasks/mvp/05-adventure-map/08-7-day-playable-smoke-test.md)) is the explicit gate. |
| Cross-layer traceability (**CRITICAL**) | 10 | UI tasks → `wiki/screens/<nn>/`; data tasks → `content-schema/schemas/<x>.schema.json`; engine tasks → `docs/architecture/*.md`. Enforced by `scripts/tasks.mjs lint`. |
| AI execution flow (`tasks:next` → `done`) | 9 | Loop is functional: `tasks:next` returns 1 ready task; `tasks:start <id>` flips status; `tasks:done <id>` runs `verify` commands and atomically marks done. **Limitation**: ordering is purely topological — no priority signal toward "tasks that unlock the most downstream work" (parallelism hint missing). |

### Headline numbers (registry generated 2026-04-30)

- **Tasks**: 274 (12 + 20 + 10 + 10 + 5 + 21 + 8 + 9 + 5 + 14 + 6 MVP / 20 + 6 + 6 + 7 + 10 + 15 + 51 + 6 phase-2 / 8 + 9 + 7 + 9 phase-3)
- **Modules**: 23
- **Screen packages**: 65 (all owned)
- **JSON schemas**: 33 on disk (all referenced) + 6 forward-declared
- **Dependency cycles**: 0
- **Unresolved dependency entries**: 0
- **Unowned screen packages**: 0
- **Unreferenced schemas**: 0
- **Layering inversions** (lower phase depending on higher phase): **3** (see §3)
- **Total backlog estimate**: ≈ 931 h

---

## 2. Critical Issues

> Critical = blocks autonomous AI execution OR breaks alignment with architecture / UI / schema. Today there are **no fully-blocking** issues; the items below are the highest-impact frictions an AI loop will hit.

### C1. Two MVP-lane tasks depend on a phase-2 task

| MVP task | Phase-2 dependency |
|---|---|
| `mvp.05-adventure-map.16-equip-unequip-artifact-commands` | `phase-2.01-spells-artifacts.05-artifact-paper-doll-system` |
| `mvp.05-adventure-map.19-transfer-hero-artifact-command` | (same) |

`tasks:next:mvp` will quietly skip these forever — they require a phase-2 task to flip to `done` first. The contract of "MVP lane is self-contained" therefore does not hold for these two tasks.

**Fix**: either (a) move both tasks to phase-2.01-spells-artifacts (where the paper doll lives), or (b) split the paper-doll task into a thin "artifact slot model" sub-task in MVP that the equip/transfer commands depend on, leaving paper-doll *UI* and combination-set logic in phase-2.

### C2. Phase-2 hotseat screen depends on phase-3 multiplayer

[`phase-2.07-ui-screen-backlog.63-hotseat-turn-handoff-screen`](../../tasks/phase-2/07-ui-screen-backlog/63-hotseat-turn-handoff-screen.md) → `phase-3.01-multiplayer.08-multiplayer-ui-lobby-invite-link-in-game-status`.

Hotseat (local pass-the-keyboard) is conceptually independent of WebRTC multiplayer. This dep prevents phase-2 from completing without phase-3 networking work.

**Fix**: drop the phase-3 dependency or replace it with a lightweight `mvp.07-ui-shell.06-command-hook-ui-dispatch-re-render` reference (hotseat needs only a local turn-handoff dialog).

### C3. Map-editor wrapper task is dramatically under-scoped

[`phase-2.07-ui-screen-backlog.65-map-editor-screen`](../../tasks/phase-2/07-ui-screen-backlog/65-map-editor-screen.md) is a 3-hour wrapper with two dependencies (editor shell + editor integration test). Its acceptance criteria is "render the screen package and dispatch the listed commands". But the **engine commands required by a real H3-shaped map editor** — terrain brush, place hero / town / mine / object, switch underground level, edit zones, set victory conditions — do not exist as schema-backed commands in [`content-schema/schemas/command.schema.json`](../../content-schema/schemas/command.schema.json), nor as engine tasks anywhere in the backlog. Per the wrapper's own constraint ("any out-of-scope token must render disabled with a localized not-yet-implemented reason"), an AI agent will produce a **read-only stub editor** and report success.

**Fix**: add an engine module owning map-editor commands (suggest `phase-2.04-content-editor/08-map-editor-commands.md` and possibly `09-map-editor-state-model.md`) before the wrapper task is allowed to flip ready, *or* mark the wrapper explicitly "stub UI only — full editor delivered post-phase-2" so the report does not overstate completeness.

---

## 3. Misalignments

### 3.1 Tasks ↔ UI

- 51/65 screens are owned by phase-2.07-ui-screen-backlog wrapper tasks. Each wrapper is a 3-hour file dispatching whatever the engine has registered. The screen → wrapper → engine dispatch chain is correctly traced (validator enforces it), but a substantial subset of these wrappers (estimated 8–12 screens, including `10-puzzle-map`, `11-quest-log`, `12-creature-bank-loot`, `27-thieves-guild`, `30-build-tree`, `42-victory-defeat-cinematic`, `43-siege-combat`, `45-tactics-phase`, `52-artifact-combine-dialog`, `65-map-editor`) imply meaningful gameplay surface that the wrapper cannot deliver alone.

  Some are correctly anchored elsewhere — e.g. `42-victory-defeat-cinematic` and `05-intro-cinematic` are **co-owned** by [`phase-2.08-meta-systems.03-cinematic-playback-engine`](../../tasks/phase-2/08-meta-systems/03-cinematic-playback-engine.md), and `43-siege-combat`'s engine sits in [`phase-2.01-spells-artifacts.13-siege-state-machine`](../../tasks/phase-2/01-spells-artifacts/13-siege-state-machine.md). Others (`10-puzzle-map`, `12-creature-bank-loot`, `27-thieves-guild`, `30-build-tree`, `45-tactics-phase`) have no co-owning engine task that produces the screen-specific selectors.

  **Action**: walk each phase-2.07 wrapper, confirm a co-owning engine task exists, and add it to the wrapper's `Dependencies:` (or open the missing task) — see §6.

### 3.2 Tasks ↔ Schema

- Six forward-declared schemas (`campaign`, `quest`, `random-map-template`, `tavern-offer`, `marketplace-rate-table`, `university-skill-table`) are referenced by their producing task before they exist on disk. The report flags them with `*(produced by this task — not yet on disk)*`. **No misalignment** — this is correct forward-referencing.
- The cross-reference checker passes. No schemas are silently used without a `schemaPaths` reference in the owning task.

### 3.3 Tasks ↔ Architecture

- Architecture pillar coverage is complete. One subtle drift: [`docs/architecture/master-plan.md`](../architecture/master-plan.md) lists `editor` as a top-level `src/` module, but the editor tasks own `src/ui/editor/*`, not `src/editor/*`. This is documented in the prior audit ([AUDIT-2026-04-29](AUDIT-2026-04-29-TASK-SYSTEM-FULL-CONSISTENCY.md)) and remains as-is. Either update master-plan or move the path. Low severity.
- `services/signaling/` is owned by [`mvp.01-engine-core.01-initialize-root-workspace-and-module-layout`](../../tasks/mvp/01-engine-core/01-initialize-root-workspace-and-module-layout.md) (scaffolding only) and the actual signaling implementation is in [`phase-3.01-multiplayer.01-signaling-server-+-supabase-realtime-bridge`](../../tasks/phase-3/01-multiplayer/) — correct.

---

## 4. Missing Tasks

| Severity | Missing | Rationale |
|---|---|---|
| **High** | Map-editor command set + state model | See C3. The wrapper at `phase-2.07.65-map-editor-screen` cannot be implemented without engine-side commands (`SET_TILE`, `PLACE_HERO`, `PLACE_TOWN`, `PLACE_MAP_OBJECT`, `SET_VICTORY_CONDITION`, `TOGGLE_UNDERGROUND_LAYER`, `SAVE_MAP_TO_PACK`). Suggested file: `tasks/phase-2/04-content-editor/08-map-editor-commands.md`. |
| **High** | Map-editor object library / asset palette | The H3 editor exposes a categorical object palette (mines, dwellings, banks, artifacts, events, scripted objects). No task owns palette enumeration from the active pack registry. Suggested file: `tasks/phase-2/04-content-editor/09-map-editor-object-palette.md`. |
| Medium | Hotseat turn-handoff state machine | C2. After dropping the phase-3 dep, hotseat needs an explicit local-turn-pass dialog and seat order. Suggested file: `tasks/phase-2/08-meta-systems/07-hotseat-turn-state-machine.md`. |
| Medium | Tactics-phase placement commands | The tactics phase engine ([`mvp.09-tactical-combat.12-tactics-phase-engine`](../../tasks/mvp/09-tactical-combat/12-tactics-phase-engine.md)) exists, but a placement command (`PLACE_TACTICS_STACK`) and its UI binding to the `45-tactics-phase` screen are not explicit. The wrapper depends only on shell + store. Confirm the placement command is in `command.schema.json` and the wrapper depends on the tactics engine task. |
| Medium | Creature-bank reward template (data) | The `14-collect-creature-bank-reward-command` task exists, but the `12-creature-bank-loot` screen wrapper does not declare a dependency on it. Add the dep so the wrapper cannot ship before the reward command is `done`. |
| Low | Estates-equivalent skill (gold-per-day) | The IP-neutral 28-skill list omits the H3 "Estates" skill. Phase-2 economy is light without a per-day-per-level passive gold. Replace one of the duplicate-feeling skills (e.g., merge `Discipline` into `Leadership`) with a dedicated economy skill, or accept the gap. |
| Low | Witch-hut / Pyramid / Stables-style map objects | These are *generically* covered by the `21-map-object-visit-and-battle-initiation-commands` reducer plus `map-object.schema.json`, so they are addressable by content packs without engine work. No new task required if the Emberwild starter pack ships at least one example of each visitable type. |

---

## 5. Task Rewrites — AI-executable form

The following two rewrites resolve C1 and C2 and shrink the AI agent's required context:

### 5.1 Rewrite `mvp.05-adventure-map.16-equip-unequip-artifact-commands`

> **Move to** `phase-2.01-spells-artifacts/05a-equip-unequip-artifact-commands.md`. Replace MVP file with a stub redirecting to the new ID, or delete after registry regeneration.

Rationale: equip/unequip is meaningless without slots, and slots arrive with the paper doll. Moving avoids the silent MVP-lane skip.

### 5.2 Rewrite [`phase-2.07-ui-screen-backlog.63-hotseat-turn-handoff-screen`](../../tasks/phase-2/07-ui-screen-backlog/63-hotseat-turn-handoff-screen.md)

Replace `Dependencies:` with:

```
Dependencies:
- mvp.07-ui-shell.01-react-18-app-shell-with-canvas-overlay
- mvp.07-ui-shell.02-zustand-store
- mvp.07-ui-shell.06-command-hook-ui-dispatch-re-render
- phase-2.08-meta-systems.07-hotseat-turn-state-machine
```

(after creating the new state-machine task — see §4).

### 5.3 Rewrite [`phase-2.07-ui-screen-backlog.65-map-editor-screen`](../../tasks/phase-2/07-ui-screen-backlog/65-map-editor-screen.md)

Add to `Dependencies:`:

```
- phase-2.04-content-editor.08-map-editor-commands
- phase-2.04-content-editor.09-map-editor-object-palette
```

Add to `Acceptance Criteria`:

```
- All map-editing tokens listed in interactions.md dispatch live commands
  registered in command.schema.json (no STUB fallbacks for the
  terrain-brush, object-place, and victory-condition tokens).
```

Bump `Estimated Time` to `5 hours` (still atomic).

---

## 6. Registry Issues

None at the parser / lint layer. `npm run validate` is fully green:

```
generate:task-registry → 274 tasks, 23 modules
validate:links → all resolve
validate:contracts → passed
validate:cross-refs → passed
validate:commands → passed
validate:tasks → 0 issues
```

Two soft observations on the registry as a *machine-actionable* substrate:

- **R1** `tasks:next` orders by topological readiness only. With 274 tasks and at most one root-ready, an AI agent operating in parallel has no signal for which ready task unlocks the most downstream work. Consider adding a `downstreamCount` field (computed at registry-generation time) and exposing `tasks:next --hot` to surface the highest-fan-out ready tasks.
- **R2** `taskDependencies` and `dependencies` are duplicate views of the same data (raw vs resolved). For automation, prefer `taskDependencies` + `moduleDependencies`. Consider deprecating the human-readable `dependencies` array in JSON (it stays in the source `.md`).

---

## 7. Execution Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| AI agent picks wrapper task and produces a stub-only screen, then marks it `done` | High for `phase-2.07.*` wrappers without co-owning engine tasks | Tighten wrapper acceptance criteria to require ≥ 1 schema-backed command actually wired (currently only a *count* is enforced). Add a registry field `wrapperRequiresEngineTask: <id>`. |
| AI agent attempts the two MVP→phase-2 dep tasks via `tasks:next` (non-mvp lane) and gets blocked silently | Medium | Apply C1 fix — move tasks to their proper phase. |
| Determinism violations sneak in via UI/animation timeline | Low (ESLint rule `05-eslint-rule-ban-math-random-and-floats-in-src-engine` is M0 task) | Make sure CI in `mvp.01-engine-core.10` runs the rule across all `src/engine` and `src/rules` paths, not only `src/engine`. |
| Owned-paths collisions when multiple wrappers + engine tasks claim the same screen surface (e.g. `07-adventure-map` has 7 owners) | Medium | Validator already detects collisions via `ownedPaths`. The convention "engine tasks own selectors/commands; visual-fidelity tasks may only restyle" is documented per-task — but is *enforced only by review*. Add a registry post-check: if two non-visual-fidelity tasks claim overlapping `ownedPaths`, fail the lint. |
| Forward-referenced schemas (`*.schema.json` declared but not on disk) cause silent test failures when a non-producing task tries to validate against them | Low | Validator already flags missing files in cross-refs. Keep the producing-task convention strict and assert the producing task's `outputs` includes the schema path. |
| 51-task `phase-2.07-ui-screen-backlog` becomes a "wrapper sweat-shop" that ships without any engine functionality | Medium | Pair every wrapper with a co-owning engine/data task in `Dependencies:`. The validator already requires screen package linkage; extend it to require ≥ 1 dep that is **not** a UI shell task. |
| `tasks:done` runs `npm run validate && npm test` for tasks that change UI; UI changes can pass headless tests but break interactively | High | Add a Playwright/`vitest browser` smoke check to the `verify` chain for tasks owning `src/ui/**`. |

---

## 8. Fix Plan

Concrete, ordered, each piece independently mergeable.

### Tier 1 — unblock MVP-lane autonomous execution (≤ 1 day)

1. **Move** `mvp.05-adventure-map.16-equip-unequip-artifact-commands` → `phase-2.01-spells-artifacts.05a-equip-unequip-artifact-commands` and **move** `mvp.05-adventure-map.19-transfer-hero-artifact-command` → `phase-2.01-spells-artifacts.05b-transfer-hero-artifact-command`. Update Acceptance Criteria of `mvp.05-adventure-map.16` and `.19`'s former dependents (none today). Regenerate registry. (C1)
2. **Drop** `phase-3.01-multiplayer.08-...` from `phase-2.07-ui-screen-backlog.63-hotseat-turn-handoff-screen` deps. (C2)
3. Add `tasks/phase-2/08-meta-systems/07-hotseat-turn-state-machine.md` (state model + END_PLAYER_TURN handoff dialog command, ~3 h).

### Tier 2 — close map-editor gap (≤ 2 days)

4. Add `tasks/phase-2/04-content-editor/08-map-editor-commands.md` (terrain set, place hero/town/mine/object, victory condition, layer toggle — ~4 h).
5. Add `tasks/phase-2/04-content-editor/09-map-editor-object-palette.md` (palette enumeration from content registries — ~3 h).
6. Update `phase-2.07-ui-screen-backlog.65-map-editor-screen` per §5.3.
7. Re-run `npm run generate:task-registry && npm run validate:tasks`.

### Tier 3 — strengthen wrapper invariants (≤ 1 day)

8. Walk all 51 entries in `phase-2.07-ui-screen-backlog/`. For each, confirm a non-UI-shell co-owning task is in `Dependencies:`. Where missing, either (a) add the engine task as a dependency or (b) open a new engine task. Suspected gaps: `10-puzzle-map`, `12-creature-bank-loot`, `27-thieves-guild`, `30-build-tree`, `45-tactics-phase`.
9. Extend `scripts/tasks.mjs lint` to require every module tagged `screen-wrapper` to declare ≥ 1 dependency outside modules tagged `ui-shell` or `screen-wrapper`.

### Tier 4 — registry ergonomics for AI execution (≤ 1 day)

10. Add `downstreamCount` to each task in the registry generator.
11. Add `tasks:next --hot` flag that orders ready tasks by `downstreamCount` desc.
12. Add an `ownedPaths` overlap pre-check in `tasks/lint`.

### Tier 5 — verification of every fix

13. `npm run validate` → expect green.
14. `npm run tasks:next:mvp` → expect ≥ 1 ready task, descending into the dependency chain after each `tasks:done`.
15. Regenerate `docs/planning/task-system-report.md` and confirm no rows shift unexpectedly.

---

## Final Goal Status

| Criterion | Status |
|---|---|
| Every task is executable by AI | **Yes**, with 3 caveats fixed in Tier 1–3. |
| Tasks align with UI + schema + architecture | **Yes** — alignment is structural and validator-enforced. |
| Backlog covers Heroes-III-shaped mechanics (IP-neutral baseline) | **Yes**, with 7 named sub-mechanics deferred-by-design and tracked in `tasks/README.md`. |
| Registry supports automated execution | **Yes**; ergonomics improvements in Tier 4 are nice-to-have. |
| Saved report exists | **Yes** — this file. |

The system is **ready for autonomous AI execution against the MVP lane today**, conditional on Tier 1 fixes (≤ 1 day of work) to remove the two silent MVP→phase-2 lane skips. Tier 2–3 are required before phase-2 finishes; Tier 4 is optional polish.
