# Codex Execution Plan — Task System Remediation

- Date: 2026-04-29
- Source audit: [`AUDIT-2026-04-29-TASK-SYSTEM-AUTONOMOUS-EXECUTION.md`](AUDIT-2026-04-29-TASK-SYSTEM-AUTONOMOUS-EXECUTION.md)
- Target executor: Codex (or any autonomous coding agent)
- Goal: take the task system from "blocked at the verify gate" to "autonomous-AI-ready end-to-end" without expanding scope.

This file is **self-contained** — Codex starts cold and should not need to load the parent audit unless explicitly told to. Every step states the problem, the exact change, the verification, and the success signal.

---

## Operating Rules for Codex

1. **One step at a time.** Finish a step's *Verify* before moving to the next.
2. **Do not expand scope.** If a step seems to require a refactor, stop and ask. The audit deliberately scoped each step to under 1 hour.
3. **Never skip hooks.** Run `npm run validate` and `npm test` as written.
4. **Do not commit unless the user asks.** Stage edits; surface the diff.
5. **Never edit `task-system-audit-report.md` line content other than the broken link in Step 1.** That file is dated and other tools may key off its body.
6. **After every step that mutates a task `.md` file under `tasks/`,** run `npm run generate:task-registry` to refresh the registry, then `npm run generate:task-system-report` to refresh the report. These two commands are idempotent; rerun them as a pair.
7. **Stop on red.** If a verify step fails, stop. Do not "fix forward" by editing more files unless the failure is the *expected* failure described in this plan.

Working directory for every command: repo root (`/Users/suna_no_oshiro/Documents/fun-gpt/Heroes_Reforged_AI_Realms`). Do not `cd` into subfolders.

---

## Step 0 — Snapshot the current state (no edits)

Confirm the starting baseline so each later step has a known-good comparison.

```bash
npm run validate:tasks
npm run validate:commands
npm run validate:cross-refs
npm run validate:contracts
npm run validate:links     # expected: prints exactly one broken link
npm test                   # expected: 14 / 15 passing, 1 failure on subtest "markdown links resolve"
```

**Expected baseline:**
- `validate:tasks` → "Task lint passed: 273 tasks, 0 issues."
- `validate:commands`, `validate:cross-refs`, `validate:contracts` → all green.
- `validate:links` → reports `docs/planning/audits/task-system-audit-report.md: broken link -> task-system-report.md`.
- `npm test` → 14 pass, 1 fail. The failing test is `markdown links resolve` in `scripts/__tests__/repo-contracts.test.mjs`.

If the baseline differs from the above, **stop** and report. Do not proceed.

---

## Step 1 — Unblock the verify gate (CRITICAL)

**Problem.** `docs/planning/audits/task-system-audit-report.md` line 7 contains a relative link that resolves outside the audits folder:

```
This is a fresh audit, independent of docs/planning/task-system-report.md
linked as task-system-report.md, …
```

The link target `task-system-report.md` is searched for under `docs/planning/audits/`, but the actual file lives at `docs/planning/task-system-report.md`. Result: `validate:links` fails, `repo-contracts.test.mjs` subtest 1 fails, and **every task's verify chain is red** (every task uses `npm run validate && npm test` as `Verify`). Until this is fixed, `tasks:done` cannot mark a single task done.

**Edit.** In `docs/planning/audits/task-system-audit-report.md`, change line 7 only:

- Before: `docs/planning/task-system-report.md` linked as `task-system-report.md`
- After: `[docs/planning/task-system-report.md](../planning/task-system-report.md)`

Lines 74 and 276 reference the same filename **inside backticks** (not as links). Leave them alone.

**Verify.**

```bash
npm run validate:links     # expected: clean exit, no output
npm test                   # expected: 15 / 15 pass
npm run validate           # expected: full chain green
```

**Success signal.** All three commands exit 0. The verify gate is now open.

---

## Step 2 — Add a fast preflight to `tasks:done`

**Problem.** Every task's `Verify` is `npm run validate && npm test`. That bundles five validators and the full test suite into one call, so any single red item blocks all 273 tasks. A cheap preflight catches the common failure modes (broken links, lint regressions) before the agent burns minutes on the slow chain.

**Edit.** In [`scripts/tasks.mjs`](../../scripts/tasks.mjs), in `doneCmd(id)` (currently around line 277), insert a preflight call to `npm run validate:tasks` *before* the per-task `runVerify(task)` loop. Implementation outline:

1. Locate `function doneCmd(id)`.
2. After resolving `task` and *before* the `console.log("Verifying ${id} before marking done…")` line, run:

   ```js
   const preflight = spawnSync("npm", ["run", "validate:tasks"], {
     stdio: "inherit",
     cwd: repoRoot
   });
   if (preflight.status !== 0) {
     console.error("\nPreflight failed: npm run validate:tasks. Refusing to mark done.");
     process.exit(1);
   }
   ```

3. Do **not** change the existing `runVerify(task)` block — the per-task `Verify` commands still run as the authoritative gate. The preflight only adds a fast-fail.

**Verify.**

```bash
npm test
node scripts/tasks.mjs done mvp.01-engine-core.01-initialize-root-workspace-and-module-layout
# expected: preflight runs first (validate:tasks output), then the task's own
# verify chain. Because no implementation has been done, runVerify will fail
# on test assertions about repo state — that is the correct outcome. The
# script must exit 1 and NOT change the task's status to "done".
git diff tasks/                # expected: no changes — task still planned
```

**Success signal.** Preflight runs, full verify still gates the actual mark-as-done, and no task file was mutated.

---

## Step 3 — Backfill `Read First` and `Inputs` on three Necropolis content tasks

**Problem.** Three tasks under `tasks/phase-2/03-second-faction/` describe Necropolis content in 1–2 sentences plus inline tables, with no explicit `Read First` block and (in one case) an empty `Inputs` block. An autonomous AI run will produce schema-valid output that drifts from the project's declared baseline corridor.

**Files to edit:**

- `tasks/phase-2/03-second-faction/01-necropolis-units-json-7-units-plus-upgrades.md`
- `tasks/phase-2/03-second-faction/02-necropolis-building-tree-json.md`
- `tasks/phase-2/03-second-faction/03-necropolis-hero-roster-json.md`

For each file, **insert a `Read First:` section** immediately after the `Description:` block. Pattern to follow (matches the rest of the repo):

```markdown
Read First:
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
- `content-schema/examples/packs/emberwild-faction/`  (canonical reference pack)
- `research/deep-research-report.md`  (baseline corridor reference)
```

Customize the third bullet per file:

- For `01-necropolis-units-json…`: also add ``- `content-schema/schemas/unit.schema.json` `` (already in `Inputs`; that is fine).
- For `02-necropolis-building-tree-json`: add ``- `content-schema/schemas/building.schema.json` ``.
- For `03-necropolis-hero-roster-json`: add ``- `content-schema/schemas/hero.schema.json` `` and ``- `content-schema/schemas/hero-class.schema.json` ``.

For `03-necropolis-hero-roster-json.md` only — its `Inputs:` section currently has no items beyond text. Replace the block with:

```markdown
Inputs:
- `content-schema/schemas/hero.schema.json`
- `content-schema/schemas/hero-class.schema.json`
- Necromancy / Sorcery skill IDs from
  `phase-2.01-spells-artifacts.04a-baseline-skill-pack`
- Existing Death Knight / Necromancer hero-class records (referenced by ID;
  do NOT redefine classes here)
```

Do not change `Outputs`, `Owned Paths`, `Dependencies`, `Acceptance Criteria`, `Verify`, or `Estimated Time` on any of these three files.

**Verify.**

```bash
npm run generate:task-registry
npm run generate:task-system-report
npm run validate:tasks
npm test
```

**Success signal.** All four commands exit 0. The registry now lists non-empty `inputs` and non-empty `readFirst` arrays for all three tasks.

```bash
node -e "const r=require('./tasks/task-registry.json');const ids=['phase-2.03-second-faction.01-necropolis-units-json-7-units-plus-upgrades','phase-2.03-second-faction.02-necropolis-building-tree-json','phase-2.03-second-faction.03-necropolis-hero-roster-json'];for(const id of ids){const t=r.tasks.find(x=>x.id===id);console.log(id,'inputs:',t.inputs.length,'readFirst:',t.readFirst.length);}"
```

Expect each row to print `inputs: ≥3 readFirst: ≥3`.

---

## Step 4 — Strengthen multi-owner-screen acceptance lines

**Problem.** Three MVP UI tasks own a screen package that a phase-2 visual-fidelity task also owns. Without an explicit boundary, the phase-2 task can silently rewrite selectors or command bindings that MVP already established.

Affected MVP tasks (each owns a screen also owned by a phase-2 visual-fidelity task):

| MVP task | Co-owning phase-2 task | Shared screen |
|---|---|---|
| `tasks/mvp/07-ui-shell/03-hud-resource-bar-end-turn-button-mini-map-stub.md` | `phase-2.06-visual-fidelity.11-bottom-bar-7-resources-plus-info-text-strip-plus-date-counter` | `19-status-bar` |
| `tasks/mvp/07-ui-shell/04-town-screen-modal.md` | `phase-2.06-visual-fidelity.08-right-panel-town-building-icon-grid` | `24-town-screen` |
| `tasks/mvp/07-ui-shell/05-hero-info-panel.md` | `phase-2.06-visual-fidelity.09-right-panel-hero-portrait-plus-primary-stats`, `…10-…secondary-skills-row…` | `46-hero-screen` |

For each of the three MVP files, append one bullet to the existing `Acceptance Criteria:` block:

```markdown
- Phase-2 visual-fidelity tasks may only restyle this surface. Selectors,
  store reads, and command bindings remain owned by this task and must not
  be changed by `phase-2.06-visual-fidelity.*` work.
```

Do not modify the phase-2 files; the boundary is asserted on the MVP side because MVP runs first and is the source of truth for behavior.

**Verify.**

```bash
npm run generate:task-registry
npm run generate:task-system-report
npm run validate
npm test
```

**Success signal.** Validators stay green; the three MVP tasks' `acceptanceCriteria` arrays each grow by one entry in the registry.

---

## Step 5 — Decide on the seven "missing mechanics"

**Context.** The audit lists seven Heroes-III mechanics currently folded into parent tasks rather than dedicated task files (necromancy raise-skeletons, native-terrain bonuses, diplomacy, caravan, first-aid tent, Necropolis morale rules, counter-spells). They are not MVP blockers.

**Codex action.** Do **not** create new task files for these in this plan run. Instead:

1. Append a short inventory block to `tasks/README.md`, immediately above the `## Working Rule` section, titled `## Deferred Mechanic Inventory`. Body:

   ```markdown
   ## Deferred Mechanic Inventory

   These named Heroes-III mechanics are currently folded into parent tasks
   rather than owning their own files. None block MVP. Split them into
   dedicated task files only when their parent task is about to start.

   - Necromancy raise-skeletons after battle (parent: `phase-2.03-second-faction.01-necropolis-units-json-7-units-plus-upgrades`)
   - Native-terrain bonuses (parent: `mvp.04-faction-emberwild.04-baseline-ruleset`)
   - Diplomacy / surrender of neutral stacks (parent: `mvp.05-adventure-map.21-map-object-visit-and-battle-initiation-commands`)
   - Caravan / unit transfer between towns (no parent — backlog item)
   - First-aid tent battlefield healing (parent: `phase-2.01-spells-artifacts.11-buy-war-machine-command`)
   - Necropolis-specific morale rules (parent: `phase-2.01-spells-artifacts.04a-baseline-skill-pack`)
   - Counter-spells (Counterstrike, Magic Mirror) (parent: `phase-2.01-spells-artifacts.02-combat-spells`)
   ```

2. Do not create any new `.md` task files. Do not change any existing module index file.

**Verify.**

```bash
npm run validate:links
npm run validate:tasks
npm test
```

**Success signal.** All green; `tasks/README.md` now has a `Deferred Mechanic Inventory` section that future runs can convert to real task files when the parent module starts.

---

## Step 6 — Optional: split `phase-2.07-ui-screen-backlog.39-battle-results-screen`

**Skip this step unless the user explicitly approves.** It introduces a new task file, which is the kind of scope change that should not happen silently.

If approved, the split is:

- Rename `tasks/phase-2/07-ui-screen-backlog/39-battle-results-screen.md` → `…39a-battle-results-screen-layout.md`. Reduce its scope to layout + mock data only. Estimated time: `2 hours`.
- Create `tasks/phase-2/07-ui-screen-backlog/39b-battle-results-bind-to-event.md`. Scope: bind the layout to the tactical-combat result event log. Depend on `mvp.09-tactical-combat.10-replay-smoke-test-20-round-battle`. Estimated time: `1.5 hours`.
- Update the index `tasks/phase-2/07-ui-screen-backlog.md` to list both files.

After any split: regenerate the registry and run the full validator chain.

---

## Step 7 — Final regeneration and confirmation

After Steps 1–5 (and optionally 6) are complete:

```bash
npm run generate:task-registry
npm run generate:task-system-report
npm run validate            # full chain
npm test                    # 15 / 15
npm run tasks:next:mvp      # expected: at least 1 ready task
```

Read the regenerated [`docs/planning/task-system-report.md`](../planning/task-system-report.md). Compare to the pre-fix baseline:

- Inventory totals (273 tasks, 23 modules, 65 screens, 33 schemas) should be unchanged unless Step 6 ran.
- "Final Goal Status" table should still report `Yes` across all rows.
- "Dependency Health" should still report `No dependency cycles or unresolved dependency entries detected.`

---

## Definition of Done

The plan is complete when **all** of the following hold:

- [ ] `npm run validate` exits 0.
- [ ] `npm test` reports 15 / 15 passing.
- [ ] `npm run tasks:next:mvp` returns at least one ready task and no errors.
- [ ] The three Necropolis content tasks each have non-empty `inputs` and `readFirst` arrays in the registry.
- [ ] The three MVP UI tasks (HUD, town modal, hero panel) each have the new "phase-2 visual-fidelity may only restyle" acceptance criterion.
- [ ] `tasks/README.md` contains a `Deferred Mechanic Inventory` section.
- [ ] No new task `.md` files were created (unless Step 6 was explicitly approved).
- [ ] No `tasks:done` was called against any task during this plan — the plan changes infrastructure only, not execution state.

When all boxes are checked, surface a one-line summary diff (paths only) for review and stop. Do not commit.

---

## Out of Scope (do not do these)

- Implementing any task. This plan only fixes the task *system*; tasks themselves are still planned.
- Modifying engine, renderer, UI, or schema source code under `src/` or `content-schema/`.
- Editing the audit report file (`AUDIT-2026-04-29-TASK-SYSTEM-AUTONOMOUS-EXECUTION.md`).
- Renaming files outside Step 6 (which is itself optional and gated on user approval).
- Adding new validators or CI scripts.
- Bumping any task's `Estimated Time` or status.

If a step seems to require any of the above, **stop and ask**.
