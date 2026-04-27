# Task System Audit — Autonomous AI Execution Readiness

- Date: 2026-04-29
- Auditor role: Senior engineering manager + AI workflow architect + task system auditor
- Scope: `tasks/`, `tasks/task-registry.json`, `docs/architecture/`, `docs/architecture/wiki/screens/`, `content-schema/`
- Methodology: registry parsing, validator runs (`validate:tasks`, `validate:commands`, `validate:cross-refs`, `validate:contracts`, `validate:links`, `npm test`), per-task structural inspection, screen-↔-task and schema-↔-task ownership scans, dependency-graph and atomicity analysis, MVP playable-loop coverage check.

This audit is **independent** of the previously generated [`docs/planning/task-system-report.md`](../planning/task-system-report.md), which is the deterministic snapshot from the registry generator. It uses that report as a corroborating input but does not depend on it.

---

## 1. Task System Score — **8.6 / 10**

| Dimension | Score | Notes |
|---|---:|---|
| Backlog ↔ architecture | 10 | All 10 `src/*` architecture modules covered. Engine 84, UI 91, AI 38, renderer 23, content-schema 29, content-runtime 6, rules 9, editor 7, persistence 6, net 8 owning tasks. |
| Backlog ↔ UI screens | 10 | 65/65 numbered screen packages have at least one owning task; 113 tasks bind to a screen package. |
| Backlog ↔ data contracts | 10 | 33/33 schemas referenced by at least one task; `screen-command-coverage.json` closes the screen-↔-command schema loop. |
| Task atomicity | 10 | 273 / 273 tasks within 2–6 h budget; 0 oversize tasks; mean 3.41 h. |
| Task completeness (formal) | 10 | All tasks have `Description`, `Outputs`, `Dependencies`, `Acceptance Criteria`, `Estimated Time`. 0 schema-lint issues across 273 tasks. |
| Single-task AI-executability | 8 | Most tasks include explicit input/output/owned-paths/screen package references; 3 Necropolis content tasks rely on inline tables only and could use a `Read First` pointer. |
| Registry validity | 10 | 0 unresolved deps, 0 cycles, 0 ID collisions, 23 modules wired to 273 tasks. |
| Dependency graph | 9 | 0 cycles. Max chain depth = 17 (`phase-2.05-mod-system.05d-official-pack-signing-and-bundle-verification`). Long but linear. |
| Baseline-corridor mechanics coverage | 9 | All MVP loop pieces covered. Some named subsystems (necromancy raise-skeletons, native-terrain morale, native-faction morale dynamics) live inside larger tasks rather than dedicated ones. |
| MVP playable-loop completeness | 10 | RNG, fixed-point, dispatcher, hex, pathfinder, fog, hero movement, mine capture, town visit, auto-resolve, victory/defeat, AI worker, save/load, baseline ruleset, smoke test — all present. |
| AI execution flow (`tasks:next` → `done`) | 6 | **Blocker:** the `verifyCommands` chain (`npm run validate && npm test`) is currently red — `validate:links` reports a broken link inside a sibling audit file, and `repo-contracts.test.mjs` asserts on it. As long as it stays red, **no task can be marked done by the harness**, regardless of its own correctness. |
| Cross-layer traceability | 10 | UI tasks point to a `wiki/screens/<nn>/` package; data tasks point to `content-schema/schemas/<x>.schema.json`; engine tasks point to a `docs/architecture/*.md`. |

Headline numbers (registry as of 2026-04-29):

- Tasks: **273**
- Modules: **23**
- Screen packages: **65** (all owned)
- JSON schemas: **33** (all referenced)
- Total estimated effort: **931 h** (MVP 394 h, Phase 2 400 h, Phase 3 137 h)
- Dependency cycles: **0**
- Unresolved dependency entries: **0**
- Tasks with no owned paths: 4 — all explicitly `optOut: true` (cross-cutting integration tests / accessibility / perf passes); intentional, not a defect.

---

## 2. Critical Issues

### C1. `npm run validate` is red — blocks autonomous `tasks:done`

`scripts/check-markdown-links.mjs` reports:

```
docs/planning/audits/task-system-audit-report.md: broken link -> task-system-report.md
```

`scripts/__tests__/repo-contracts.test.mjs` asserts that this list is empty, so `npm test` fails at subtest 1 of 15.

**Why it matters:** every task's `Verify` block is `npm run validate && npm test`. `tasks:done` runs `runVerify(task)` and refuses to mark a task `done` if any verify command exits non-zero (`scripts/tasks.mjs:284`). With the link red, **the autonomous queue cannot drain a single task** — even if its own implementation is perfect. This is a hard stop for AI-driven execution.

**Root cause:** `task-system-audit-report.md` lives in `docs/planning/audits/`, but its line-7 link points at `task-system-report.md`, which resolves relative to the audits folder and would need to be `../task-system-report.md`.

**Fix:** one-character path fix in `docs/planning/audits/task-system-audit-report.md`. After the fix, `npm test` returns 15/15.

### C2. Verify chain bundles two slow checks into every task

Every task uses `npm run validate && npm test` as its only verify line. That chain re-runs *every* validator and *every* test on every task `done` call. For 273 tasks, this is the right safety net (deterministic engine, no skipped checks), but it amplifies any single red item across the whole queue. Pair this with C1 and the system goes from "one broken file" to "no progress possible."

**Recommendation:** keep the chain but add a fast preflight (`npm run validate:tasks`) to `tasks:done` that fails fast on the cheapest checks before the agent burns minutes on the slow ones.

### C3. Necropolis content tasks under-specify reference material

`phase-2.03-second-faction.01–03` describe Necropolis units, building tree, and hero roster in 1–2 sentences plus inline tables. They ship the data, but they do not point an agent at:

- the baseline corridor reference (`research/deep-research-report.md`),
- the existing Emberwild example pack (`content-schema/examples/packs/emberwild-faction/`).

Specifically `…03-necropolis-hero-roster-json` has an empty `Inputs` block in the registry. An AI agent opening that file cold will produce data that *validates* but is not necessarily aligned with the baseline corridor. **Not a blocker, but the first place a non-deterministic AI run will diverge from intent.**

---

## 3. Misalignments

### Tasks ↔ UI

- None critical. 65 / 65 packages owned. 113 tasks bind to a screen package.
- Some packages have multiple owners (intentional layering): adventure map (`07-adventure-map`) is owned by 4 MVP UI shell tasks plus 3 phase-2 visual fidelity tasks plus the renderer; the map editor (`65-map-editor`) is owned by 9 different tasks across editor / screen-backlog / AI-generation. Acceptable — each owns a different layer (shell, store, command hook, visual chrome, generation surface).
- **Watch for**: status bar (`19-status-bar`) is owned by an MVP HUD task and a phase-2 visual fidelity bottom-bar task simultaneously. The boundary between "MVP HUD stub" and "phase-2 final chrome" must be enforced by acceptance criteria so the visual fidelity task does not silently rewrite MVP behavior.

### Tasks ↔ Schema

- 33 / 33 schemas referenced. Multi-owner schemas (e.g. `command.schema.json`, `effect.schema.json`, `formula.schema.json`) are intentional — closed schemas with multiple consumer tasks. No schema is privately owned by an out-of-phase task.

### Tasks ↔ Architecture

- All 10 `src/*` modules covered. `rules` looks light at 9 owning tasks but is correct: it is a small module (formula AST + ruleset evaluator) and adding more tasks would dilute single-responsibility.

---

## 4. Missing or Thin Tasks

These are not blockers for MVP completion, but each is a **named baseline-corridor mechanic that does not have its own task file**. Today they are folded into a parent task body:

| Mechanic | Currently inside | Suggested action |
|---|---|---|
| Necromancy raise-skeletons after battle | `phase-2.03-second-faction.01-necropolis-units-json-7-units-plus-upgrades` | Split into `phase-2.03-second-faction.04-necromancy-raise-skeletons-engine` (engine reducer + ruleset entry). |
| Native-terrain morale / movement bonus | implicit in `mvp.04-faction-emberwild.04-baseline-ruleset` | Add `mvp.04-faction-emberwild.04b-native-terrain-bonuses` (data + rule wiring). |
| Hero diplomacy / surrender of neutral stacks | implicit in `mvp.05-adventure-map.21-map-object-visit-and-battle-initiation-commands` | Add `phase-2.01-spells-artifacts.18-diplomacy-skill` to live next to other secondary skills. |
| Caravan / unit transfer between towns | not present | Add `phase-2.07-ui-screen-backlog.21b-caravan-screen` once a caravan engine command exists; engine task is missing entirely. |
| First-aid tent / battlefield healing tent | not present | Add `phase-2.01-spells-artifacts.11b-first-aid-tent-command`. War machines task covers ballista/catapult/ammo cart; tent is omitted. |
| Necropolis-specific morale rules (no morale for undead, etc.) | implicit in `phase-2.01-spells-artifacts` ruleset | Add a single content task: `phase-2.03-second-faction.05-necropolis-morale-rules`. |
| Combat spell counter (Counterstrike, Magic Mirror) | implicit in `phase-2.01-spells-artifacts.02-combat-spells` | Decide: leave folded (current task only ships 5 named spells) and explicitly enumerate the deferral, or split. |

None of these blocks a playable MVP. They are gaps you will hit between MVP and a full baseline-fidelity build.

---

## 5. Suggested Task Rewrites (AI-executable form)

### Rewrite 5a — `phase-2.03-second-faction.03-necropolis-hero-roster-json`

Current `Inputs:` is empty. Replace with:

```markdown
Read First:
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
- `content-schema/examples/packs/emberwild-faction/heroes/`  ← reference roster shape
- `research/deep-research-report.md` (section "Necropolis hero specialties")

Inputs:
- `content-schema/schemas/hero.schema.json`
- `content-schema/schemas/hero-class.schema.json`
- Necromancy and Sorcery skill IDs from
  `phase-2.01-spells-artifacts.04a-baseline-skill-pack`
- Existing Death Knight / Necromancer class records (referenced by ID;
  do NOT re-define classes here)

Outputs:
- `resources/packs/necropolis-faction/heroes/isra.hero.json`
- `resources/packs/necropolis-faction/heroes/vidomina.hero.json`
- `resources/packs/necropolis-faction/heroes/sandro.hero.json`
```

### Rewrite 5b — `phase-2.03-second-faction.01-necropolis-units-json-7-units-plus-upgrades`

Add an explicit `Read First:` block pointing at the Emberwild reference pack and the corridor table — without that, an AI run will pick numbers from training data, not from the project's declared baseline.

### Rewrite 5c — `phase-2.03-second-faction.02-necropolis-building-tree-json`

Same treatment: point at `resources/packs/emberwild-faction/town/` (once authored) as canonical structural reference and at the building schema example record.

### Rewrite 5d — Splittable: `phase-2.07-ui-screen-backlog.39-battle-results-screen`

Currently 3 h, single owner. Acceptance criteria conflate (a) layout binding, (b) reading from the tactical-combat result event. Split:

- `…39a-battle-results-screen-layout` (UI only, mock data) — 2 h
- `…39b-battle-results-bind-to-event` (after `mvp.09-tactical-combat.10-replay-smoke-test-20-round-battle`) — 1.5 h

This unblocks parallel UI work before the combat event log lands.

---

## 6. Registry Issues

- Generator: `scripts/generate-task-registry.mjs` parses correctly. 273 task records emit cleanly with the canonical key set (`id`, `kind`, `status`, `inputs`, `outputs`, `readFirst`, `ownedPaths`, `dependencies`, `acceptanceCriteria`, `verifyCommands`, `estimatedTime`, `screenPackages`, `schemaPaths`, `taskDependencies`, `moduleDependencies`, `resolvedDependencies`, `unresolvedDependencies`).
- `unresolvedDependencies`: 0 across the entire registry.
- `taskDependencies` cycles: 0.
- ID uniqueness: enforced by `repo-contracts.test.mjs` subtest "task registry has unique ids and key pack-layout outputs" — passing.
- **Minor:** the registry file is 957 KB. It works but is noisy to diff. Consider splitting into `tasks/index.json` (id → path / status / deps only) plus on-demand task records for tooling that only needs the graph.

---

## 7. Execution Risks (where AI will fail / where human is needed)

1. **Verify chain currently red (C1).** Until the broken link in `task-system-audit-report.md` is fixed, an autonomous agent calling `tasks:done` will fail every task. Highest-priority unblock.
2. **Long single-thread chain (depth 17) into mod-system signing.** If anything upstream of `…05d-official-pack-signing-and-bundle-verification` flakes, the agent's queue stalls. Risk is low (path is real and intentional) but worth monitoring.
3. **Task-9 `mvp.09-tactical-combat.09-replace-auto-resolve-with-real-battle`** intentionally has no `ownedPaths`. An AI agent that interprets "no owned paths" as "no work" may skip it. The opt-out flag is set correctly in the registry (`ownedPathsOptOut: true`), but the *task body* should make explicit which existing files this task is replacing wiring on.
4. **Necropolis content tasks (Rewrite 5a–5c).** Cold-run AI risk of producing technically-valid but corridor-misaligned numbers.
5. **Auto-resolve combat correctness vs tactical combat power formula** (`mvp.05-adventure-map.06-auto-resolve-combat` vs `mvp.09-tactical-combat.03-damage-formula`). Both must consume the same baseline ruleset. Acceptance criteria already enforce this — keep the smoke test (`mvp.05-adventure-map.08-7-day-playable-smoke-test`) as the cross-check.
6. **Visual fidelity tasks owning the same screens as MVP HUD tasks** (status bar, town screen, hero panel). Without strict acceptance criteria, the phase-2 task can re-implement instead of decorate. Mitigation: add an `Acceptance Criteria` line to each affected MVP task: "Phase-2 visual fidelity additions MUST replace styling only; selectors and command bindings remain owned by this MVP task."
7. **`tasks:done` writes `docs/planning/implementation-log.md`** — agents marking many tasks done in a session will linearly grow this log. Not a blocker, but a small custodial item.

---

## 8. Fix Plan (concrete, ordered)

| Step | Action | Owner | Effort |
|---:|---|---|---|
| 1 | Fix broken link: in `docs/planning/audits/task-system-audit-report.md` line 7, change `(task-system-report.md)` → `(../task-system-report.md)`. Re-run `npm run validate && npm test`. Expect 15/15. | Any | 5 min |
| 2 | Add a fast preflight to `scripts/tasks.mjs doneCmd` that runs `validate:tasks` before the full `validate && test` chain. Saves agent minutes on common failures. | Tooling | 30 min |
| 3 | Apply Rewrites 5a / 5b / 5c (Necropolis content tasks: add `Read First`, populate `Inputs`). | Content lane | 45 min |
| 4 | Decide on the seven "missing mechanics" (section 4): split into new task files or leave folded. Default recommendation: split necromancy-raise-skeletons and first-aid-tent now (Phase 2 owners need them); defer the rest until Phase 2 actually starts. | Lead | 1 h |
| 5 | Add the "phase-2 visual fidelity may not change selectors/commands" acceptance line to each MVP HUD/town/hero panel task (`mvp.07-ui-shell.03`, `mvp.07-ui-shell.04`, `mvp.07-ui-shell.05`). | UI lane | 20 min |
| 6 | Optionally split task `phase-2.07-ui-screen-backlog.39-battle-results-screen` into 39a/39b to unblock parallel UI work. | UI lane | 15 min |
| 7 | After every step above, regenerate registry + system report: `npm run generate:task-registry && npm run generate:task-system-report`. | Any | < 1 min |
| 8 | Re-run the full validator chain (`npm run validate && npm test`) to confirm the queue is green and `npm run tasks:next:mvp` returns the expected first task. | Any | 2 min |

---

## Appendix A — Quantitative Summary

| Metric | Value | Source |
|---|---:|---|
| Total tasks | 273 | `tasks/task-registry.json` |
| Modules | 23 | registry |
| Screen packages | 65 | `docs/architecture/wiki/screens/` |
| JSON schemas | 33 | `content-schema/schemas/` |
| Schemas referenced ≥ 1× | 33 / 33 | registry scan |
| Screens owned ≥ 1× | 65 / 65 | registry scan |
| Total estimated hours | 931 h | parsed from `Estimated Time` |
| MVP estimate | 394 h | phase rollup |
| Phase 2 estimate | 400 h | phase rollup |
| Phase 3 estimate | 137 h | phase rollup |
| Avg hours per task | 3.41 h | computed |
| Tasks > 6 h | 0 | atomicity check |
| Tasks with no dependencies (i.e. roots) | 0 (excluding `01-initialize-root-workspace`) | registry |
| Dependency cycles | 0 | DFS |
| Max dependency depth | 17 | DFS, terminates at `…05d-official-pack-signing-and-bundle-verification` |
| Unresolved deps | 0 | registry |
| Tasks with empty `inputs` | 1 | `phase-2.03-second-faction.03-necropolis-hero-roster-json` |
| Tasks with no `Read First` | 45 | content-data tasks where the data lives in the task body |
| Tasks with broken structural sections | 0 | `validate:tasks` |
| Tasks linked to a screen package | 113 | registry |
| Tasks linked to a schema | 35 | registry |
| Validators currently green | 4 / 5 | `validate:tasks`, `validate:commands`, `validate:cross-refs`, `validate:contracts` |
| Validators currently red | 1 / 5 | `validate:links` (one broken link in `task-system-audit-report.md`) |
| `npm test` status | 14 / 15 | red on `repo-contract-checks` subtest 1 |

---

## Appendix B — MVP Playable-Loop Confirmation

Each playable-loop component has a dedicated MVP task:

| Component | Owning MVP task |
|---|---|
| Seeded RNG | `mvp.01-engine-core.03-implement-pcg32-prng-with-named-sub-streams` |
| Fixed-point math | `mvp.01-engine-core.04-implement-fixed-point-math-library` |
| Command dispatcher | `mvp.01-engine-core.06-command-dispatcher` |
| Hex coordinates | `mvp.03-map-system.01-axial-hex-coordinate-utilities` |
| Pathfinder | `mvp.03-map-system.04-a-pathfinder-with-terrain-cost-plus-zoc` |
| Fog of war | `mvp.03-map-system.05-fog-of-war` |
| Hero movement | `mvp.05-adventure-map.03-hero-movement` |
| Mine capture | `mvp.05-adventure-map.04-resource-mine-capture-plus-daily-income` |
| Town visit | `mvp.05-adventure-map.05-town-visit-recruit-build-mage-guild` |
| Auto-resolve | `mvp.05-adventure-map.06-auto-resolve-combat` |
| Victory/defeat | `mvp.05-adventure-map.07-victory-defeat-conditions` |
| Tactical combat damage | `mvp.09-tactical-combat.03-damage-formula` |
| Initiative / morale / luck / retaliation | `mvp.09-tactical-combat.02 / .05 / .06` |
| AI in worker | `mvp.10-heuristic-ai.06-run-ai-in-web-worker` |
| Save / load UI | `mvp.08-persistence.03-save-load-ui` |
| 7-day smoke test | `mvp.05-adventure-map.08-7-day-playable-smoke-test` |

Conclusion: the MVP loop is fully task-backed.

---

## Final-Goal Verdict

| Criterion | Result |
|---|---|
| Every task is executable by AI | **Yes — but blocked at the verify gate (C1)**. After the link fix, yes unconditionally. |
| Tasks align with UI + schema + architecture | Yes (65/65 screens, 33/33 schemas, 10/10 architecture modules). |
| Backlog covers baseline-corridor mechanics | Yes for MVP loop; partial for full baseline fidelity (see section 4). |
| Registry supports automated execution | Yes. |
| Generated report exists | Yes (`docs/planning/task-system-report.md`). |

**Net:** 8.6 / 10. Ship the four-line C1 fix, apply rewrites 5a–5c, and the system is genuinely autonomous-AI-ready end to end.
