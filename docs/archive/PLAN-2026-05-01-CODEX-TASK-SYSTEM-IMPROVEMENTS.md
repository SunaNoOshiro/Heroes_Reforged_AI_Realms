# Codex Execution Plan — Task System Improvements (2026-05-01)

- **Date**: 2026-05-01
- **Source audit**: [`AUDIT-2026-05-01-TASK-SYSTEM-FULL-CONSISTENCY.md`](AUDIT-2026-05-01-TASK-SYSTEM-FULL-CONSISTENCY.md)
- **Target executor**: Codex (or any autonomous coding agent)
- **Goal**: take the task system from **9.6 / 10** ("ship-ready, three minor seams") to **10 / 10** by closing the seams identified in the 2026-05-01 audit — without expanding scope, without implementing any task body, and without touching engine source.

This file is **self-contained**. Codex starts cold and should not need to load the parent audit unless explicitly told to. Every step states the problem, the exact change, the verification, and the success signal.

---

## Operating Rules for Codex

1. **One step at a time.** Finish a step's *Verify* before moving to the next.
2. **Do not expand scope.** If a step seems to require a refactor, stop and ask. Each step is scoped to ≤ 90 minutes of editing.
3. **Never skip hooks.** Run `npm run validate` and `npm test` exactly as written. Never use `--no-verify`.
4. **Do not commit unless the user asks.** Stage edits; surface the diff at the end.
5. **After every step that mutates a task `.md` file under `tasks/`, any module index file, the glossary, or the readiness contract**, run this idempotent pair:

   ```bash
   npm run generate:task-registry
   npm run generate:task-system-report
   ```

6. **Stop on red.** If a verify step fails, stop. Do not "fix forward" by editing more files unless the failure is the *expected* failure described in this plan.
7. **Allowed write surface (whole plan):**
   - `tasks/**/*.md` — task and module index files
   - `tasks/README.md`
   - `docs/architecture/glossary.md`
   - `docs/architecture/task-readiness-contract.json`
   - `scripts/generate-task-system-report.mjs` (Step 5 only)
   - `scripts/tasks.mjs` (Step 7 only — additive command, no behavior change to existing commands)
   - The two regenerated artifacts: `tasks/task-registry.json` and `docs/planning/task-system-report.md`
8. **Forbidden write surface:** anything under `src/`, `content-schema/schemas/`, `resources/`, `services/`, `docs/architecture/wiki/screens/`. If a step tempts you to edit these, stop.
9. **Do not call `tasks:done` or `tasks:start` against any task.** This plan changes infrastructure, not execution state.
10. **No new dependencies.** No `npm install`, no `package.json` script renames. Step 7 only adds a new script entry; do not modify existing ones.

Working directory for every command: repo root (`/Users/suna_no_oshiro/Documents/fun-gpt/Heroes_Reforged_AI_Realms`). Do not `cd` into subfolders.

---

## Step 0 — Snapshot the current state (no edits)

Confirm the starting baseline so each later step has a known-good comparison.

```bash
npm run validate
npm test
npm run tasks:next
```

**Expected baseline (2026-05-01):**

- `validate:tasks` → `Task lint passed: 281 tasks, 0 issues.`
- `validate:links`, `validate:contracts`, `validate:cross-refs`, `validate:commands` → all green.
- `npm test` → all subtests pass.
- `tasks:next` → exactly one ready task: `mvp.01-engine-core.01-initialize-root-workspace-and-module-layout`.

Capture the baseline counts for later comparison:

```bash
node -e "const r=require('./tasks/task-registry.json');console.log('tasks:',r.tasks.length,'modules:',r.modules.length)"
```

Expect: `tasks: 281 modules: 23`.

If the baseline differs in any way, **stop and report**. Do not proceed.

---

# TIER 1 — Codex-blocking polish (3 steps, ≤ 1 hour total)

The two issues in this tier are both about Codex starting a task cold and discovering that an *implicit* contract isn't named anywhere. Closing them costs almost nothing and removes the only realistic stumble points an autonomous agent has.

## Step 1 — Add Heroes-III alias anchors to the glossary

**Problem.** The codebase uses canonical terminology (`neutral-stack-template`, `primary stat`, `specialty`) that is correct but is *not* the H3 terminology a Codex agent trained on H3 lore reaches for first (`wandering monster`, `primary skill`, `specialist`). A keyword sweep in the 2026-05-01 audit returned **zero hits** on those H3 aliases. The mechanics are present; the aliases are not.

**Edit.** Append a new "H3 Alias Anchors" subsection to [`docs/architecture/glossary.md`](../architecture/glossary.md), inserted **between** the existing `## Heroes` block (ends with the "Mastery tier" entry) and the `## AI and Generation` block.

Insert exactly this block (verbatim, including the heading):

```markdown
## H3 Alias Anchors

Heroes-III community vocabulary that maps onto our canonical terms.
Use these aliases when reading external H3 references; the canonical
term on the right is the only one that should appear in code, schemas,
and task acceptance criteria.

- **Wandering monster** → **neutral stack** (see
  [`content-schema/schemas/neutral-stack-template.schema.json`](../../content-schema/schemas/neutral-stack-template.schema.json)).
- **Primary skill** → **primary stat** (`attack`, `defense`, `power`,
  `knowledge`; stored on `hero.schema.json`).
- **Specialist hero** → **hero specialty** (a `Specialty` record on the
  hero; see the `Specialty` entry in `## Heroes`).
- **Hero biography / scenario log** → **status history** (the planned
  `status-history-store` in `phase-2.08-meta-systems`).
- **Town portrait fly-in** → **town flyby** (screen `35-town-flyby`).

When introducing a new H3 alias, add the entry here before referencing
it from a task body or schema description.
```

Do not modify any other section of the glossary.

**Verify.**

```bash
npm run generate:task-registry
npm run generate:task-system-report
npm run validate
```

Then confirm the section landed:

```bash
grep -n "## H3 Alias Anchors" docs/architecture/glossary.md
grep -c "Wandering monster" docs/architecture/glossary.md
```

**Success signal:**
- `validate:links` is still green (no broken relative paths added).
- `grep` line above prints the heading line number once.
- The "Wandering monster" count is `1`.

---

## Step 2 — Replace boilerplate opt-out reasons with enumerated file lists in the two phase-3 polish tasks

**Problem.** Two phase-3 tasks legitimately opt out of `Owned Paths` because they touch the whole game stack:

- Performance profiling was split on 2026-05-01 into
  [`05a-engine-performance-profiling.md`](../../tasks/phase-3/04-polish/05a-engine-performance-profiling.md),
  [`05b-renderer-performance-profiling.md`](../../tasks/phase-3/04-polish/05b-renderer-performance-profiling.md),
  [`05c-ai-performance-profiling.md`](../../tasks/phase-3/04-polish/05c-ai-performance-profiling.md),
  and
  [`05d-content-loader-performance-profiling.md`](../../tasks/phase-3/04-polish/05d-content-loader-performance-profiling.md).
- [`tasks/phase-3/04-polish/06-accessibility-pass.md`](../../tasks/phase-3/04-polish/06-accessibility-pass.md)

Both currently say:

```
Owned Paths:
- (none — this task does not claim filesystem ownership)
```

When Codex picks either of these up cold, the opt-out tells it *not* to claim ownership but does **not** tell it *which* files are in scope. The task body lists "common suspects" or AC bullets, but neither is enumerated as a scoped file set. We can keep the opt-out (these tasks really are cross-cutting) and still give Codex an explicit "Files this task is expected to touch" list derived from the AC.

**2026-05-01 status — Task 05.** The performance task was split into
subsystem tasks that declare `Owned Paths (shared):`, so this opt-out
edit no longer applies to performance profiling.

Historical edit — Task 05 (`performance-profiling-plus-optimization.md`).

Locate the `Owned Paths:` block. Replace it verbatim with:

```
Owned Paths:
- (none — cross-cutting profiling task; see "Files In Scope" below for
  the enumerated touch-set)

Files In Scope (advisory, not enforced by lint):
- `src/renderer/**` — draw-call merging, layered render passes
- `src/ai/workers/**` — verify Worker boundary; no main-thread blocking
- `src/persistence/serialize.ts` — incremental diff updates over
  full-state `structuredClone`
- `src/engine/state/**` — object-pool hot loops in command dispatch
- `docs/planning/perf-baseline.md` — append before/after fps and heap
  numbers from the profiling run
```

Do not modify the existing `Common suspects:` block. Do not change the `Acceptance Criteria` block. Do not modify the dependency list.

**Edit — Task 06 (`accessibility-pass.md`).**

Locate the `Owned Paths:` block. Replace it verbatim with:

```
Owned Paths:
- (none — cross-cutting accessibility pass; see "Files In Scope" below
  for the enumerated touch-set)

Files In Scope (advisory, not enforced by lint):
- `src/ui/**/*.tsx` — ARIA labels on every interactive element
- `src/ui/shell/keyboard-nav.ts` — Tab/Enter/Escape handlers across HUD
  and modals
- `src/ui/theme/colorblind.ts` — palette + shape/pattern overlay tokens
- `src/ui/locales/**/*.json` — minimum-font-size + non-color-only copy
- `docs/planning/accessibility-pass.md` — WCAG 2.1 AA evidence sheet
```

Do not change anything else in the file.

**Why this is safe.** The `ownedPaths` registry field stays empty for both tasks (the parser ignores headers it does not recognize), so the lint rule that forbids unsafe owned-path opt-outs continues to see a documented opt-out reason on line 1 of the section. The advisory list lives below as plain Markdown and is for the AI executor's eyes only.

**Verify.**

```bash
npm run generate:task-registry
npm run generate:task-system-report
npm run validate
npm test
```

Confirm the registry classifies the split performance tasks as shared
owned-path tasks and the accessibility task as a documented opt-out:

```bash
node -e "
const r=require('./tasks/task-registry.json');
const ids=['phase-3.04-polish.05a-engine-performance-profiling',
           'phase-3.04-polish.05b-renderer-performance-profiling',
           'phase-3.04-polish.05c-ai-performance-profiling',
           'phase-3.04-polish.05d-content-loader-performance-profiling',
           'phase-3.04-polish.06-accessibility-pass'];
for (const id of ids) {
  const t=r.tasks.find(x=>x.id===id);
  console.log(id, 'optOut=', t.ownedPathsOptOut, 'paths=', t.ownedPaths.length);
}
"
```

**Success signal:**
- Split performance tasks: `optOut= false` with shared owned paths.
- Accessibility task: `optOut= true paths= 0`.
- `Task lint passed` with the regenerated task count.
- `validate:links` still green (the new file-pattern entries are advisory-only — they do not need to be valid relative links because they include a `**` glob, which the link checker skips).

---

# TIER 2 — Hardening for the next-ready frontier (2 steps, ≤ 90 minutes total)

These steps tighten the contract right where Codex will hit it next, so the moment the engine-core entry task is done, the queue is one step better-defined.

## Step 3 — Add "scope verified against Deferred Mechanic Inventory" AC bullet to single-owner mechanics

**Problem.** Three tasks each own a mechanic that has exactly one owner in the entire backlog:

- [`tasks/mvp/05-adventure-map/22-obelisk-visits-and-grail-state.md`](../../tasks/mvp/05-adventure-map/22-obelisk-visits-and-grail-state.md) — owns `obelisk` and `grail`
- [`tasks/phase-2/07-ui-screen-backlog/13-hill-fort-screen.md`](../../tasks/phase-2/07-ui-screen-backlog/13-hill-fort-screen.md) — owns `hill fort`
- [`tasks/phase-2/07-ui-screen-backlog/27-thieves-guild-screen.md`](../../tasks/phase-2/07-ui-screen-backlog/27-thieves-guild-screen.md) — owns `thieves guild`

`tasks/README.md` already maintains a "Deferred Mechanic Inventory" listing mechanics folded into parent tasks. Single-owner mechanics are one nudge away from silent scope drift if the inventory is not consulted. Adding a verification bullet to each AC pins the scope to that inventory at execution time.

**Edit.** In each of the three task files, locate the `Acceptance Criteria:` block and append exactly this bullet at the end of the existing list (preserve the `- ` Markdown indent convention used in the file):

```
- Scope verified against the Deferred Mechanic Inventory in `tasks/README.md`: any baseline-corridor mechanic listed there as folded into a different parent must NOT be implemented as part of this task; if a folded mechanic is reached during implementation, stop and surface a scope question.
```

Do not modify any other AC bullet, the file's outputs, or its dependencies.

**Verify.**

```bash
npm run generate:task-registry
npm run generate:task-system-report
npm run validate
npm test
```

Confirm each task gained exactly one AC bullet:

```bash
node -e "
const r=require('./tasks/task-registry.json');
for (const id of [
  'mvp.05-adventure-map.22-obelisk-visits-and-grail-state',
  'phase-2.07-ui-screen-backlog.13-hill-fort-screen',
  'phase-2.07-ui-screen-backlog.27-thieves-guild-screen'
]) {
  const t=r.tasks.find(x=>x.id===id);
  const last=t.acceptanceCriteria[t.acceptanceCriteria.length-1];
  console.log(id, 'tail:', last.slice(0,60)+'...');
}
"
```

**Success signal:**
- Tail of each AC list begins with `Scope verified against the Deferred Mechanic Inventory`.
- `Task lint passed: 281 tasks, 0 issues.`

---

## Step 4 — Surface command-token coverage in the autogen report

**Problem.** Two coverage maps already exist and are validated by `validate:commands`:

- [`docs/architecture/screen-command-coverage.json`](../architecture/screen-command-coverage.json)
- [`docs/architecture/task-command-token-coverage.json`](../architecture/task-command-token-coverage.json)

But [`docs/planning/task-system-report.md`](../planning/task-system-report.md) does not surface their summary counts. A drift in either file (e.g. an alias added in a screen package without an entry in the coverage map) will fail `validate:commands` but won't show in the report Codex reads first.

**Edit — `scripts/generate-task-system-report.mjs`.**

Open the script. Find the function that emits the `## Inventory` section (it concatenates count lines into a Markdown string). Add **two** new count lines at the end of that section, formatted identically to the existing lines:

- `Screen-command coverage entries: <number of keys in screen-command-coverage.json>`
- `Task command-token coverage entries: <number of keys in task-command-token-coverage.json eventOnlyTokens + documentedNonCommandTokens>`

Loading rules (place near the top of the script, beside the existing `readinessContractPath` import block):

```js
const screenCommandCoveragePath = path.join(repoRoot, "docs", "architecture", "screen-command-coverage.json");
const taskCommandTokenCoveragePath = path.join(repoRoot, "docs", "architecture", "task-command-token-coverage.json");
```

Inside the inventory builder, add:

```js
const screenCmdCoverage = JSON.parse(await fs.readFile(screenCommandCoveragePath, "utf8"));
const taskTokenCoverage = JSON.parse(await fs.readFile(taskCommandTokenCoveragePath, "utf8"));
const screenCmdCount = Object.keys(screenCmdCoverage.commands ?? screenCmdCoverage).length;
const eventTokens = Object.keys(taskTokenCoverage.eventOnlyTokens ?? {}).length;
const docTokens = Object.keys(taskTokenCoverage.documentedNonCommandTokens ?? {}).length;
const taskTokenCount = eventTokens + docTokens;
```

Then append to the `inventoryLines` array (or whatever local variable holds the inventory bullets — read the script first to find the exact name):

```js
`- Screen-command coverage entries: ${screenCmdCount}`,
`- Task command-token coverage entries: ${taskTokenCount}`
```

If the existing JSON shape differs from the assumption (e.g. `screenCommandCoverage` is keyed differently), use the actual top-level key. Do **not** invent fields. If you cannot determine the shape from a quick `node -e "console.log(Object.keys(require('./docs/architecture/screen-command-coverage.json')))"`, stop and report.

**Verify.**

```bash
npm run generate:task-system-report
npm run validate
```

Then check the new lines exist:

```bash
grep -E "Screen-command coverage entries|Task command-token coverage entries" docs/planning/task-system-report.md
```

**Success signal:**
- Both lines print with non-zero counts.
- `validate:tasks` still passes 281/281.
- The wider validate chain remains green (the report is regenerated before `validate:tasks` runs in CI through the `validate` script).

---

# TIER 3 — Pre-Phase-3 hardening (1 step, ≤ 60 minutes — defer until MVP closes)

This step is a **stop sign**, not an immediate edit. It splits a future task that today carries an impractically large dependency cone. Do not run it now. Do run it the moment Phase-2 begins.

## Step 5 — Implemented 2026-05-01: split `phase-3.04-polish.05` into subsystem profiling tasks

**Problem.** The former `phase-3.04-polish.05-performance-profiling-plus-optimization`
task declared 23 module-level dependencies. After resolution that
expanded to **272 transitive task dependencies** — by far the largest
cone in the backlog. The task itself was estimated at 4 h. A single
4-hour task gating 272 transitive prerequisites was a milestone, not a
task. While the gap was harmless (the task had its file dependencies
declared and lint was green), an autonomous agent picking up `05` cold
late in Phase-3 would struggle to know what "done" means for "the top
three bottlenecks across 272 dependencies."

**Status.** Implemented early as part of the 2026-05-01 audit
remediation. The module now has:

- [`05a-engine-performance-profiling.md`](../../tasks/phase-3/04-polish/05a-engine-performance-profiling.md)
- [`05b-renderer-performance-profiling.md`](../../tasks/phase-3/04-polish/05b-renderer-performance-profiling.md)
- [`05c-ai-performance-profiling.md`](../../tasks/phase-3/04-polish/05c-ai-performance-profiling.md)
- [`05d-content-loader-performance-profiling.md`](../../tasks/phase-3/04-polish/05d-content-loader-performance-profiling.md)

Each sibling owns a focused profiling concern, declares shared owned
paths for the subsystem it may tune, and depends only on that subsystem's
implementation closure. The module index
[`tasks/phase-3/04-polish.md`](../../tasks/phase-3/04-polish.md)
lists the four siblings and updates the total estimate.

**Verify (when run).**

```bash
npm run generate:task-registry
npm run generate:task-system-report
npm run validate
npm test
```

**Success signal (when run):**
- 284 tasks (281 + 3 net), 23 modules.
- `Task lint passed: 284 tasks, 0 issues.`
- No task has > 6 h estimate.
- The largest dependency cone shrinks; each split `05*` task has
  strictly fewer than 272 transitive dependencies.

---

# TIER 4 — Optional ergonomics (1 step, ≤ 60 minutes — only on user request)

## Step 6 — Add `npm run tasks:graph` to emit a Mermaid view of the dependency DAG

**Problem.** Codex and human reviewers both benefit from seeing the dependency DAG. The lint catches cycles and unresolved deps; visualization catches *over-coupling* before it becomes a 272-cone the way `05` did.

**Run this step only if the user asks for it.** It adds a script and one `package.json` entry. It does not change any existing task file, registry, or lint.

**Edit — `scripts/tasks.mjs`.**

Add a new sub-command `graph` next to the existing `next`, `show`, `start`, `done`, `lint`, `status`, `blocked` commands. The handler should:

1. Accept `--phase=mvp|phase-2|phase-3` (optional). Default: all phases.
2. Accept `--format=mermaid|dot` (optional). Default: `mermaid`.
3. Read `tasks/task-registry.json`.
4. Filter tasks by phase prefix.
5. Emit one edge per resolved dependency (`A --> B` for Mermaid; `"A" -> "B"` for DOT).
6. Wrap the Mermaid output in ` ```mermaid \n ... \n``` ` fences.
7. Write to stdout. Do not write a file unless the user pipes it.

**Edit — `package.json` scripts.** Add exactly one new entry, alphabetized within the `tasks:*` block:

```json
"tasks:graph": "node scripts/tasks.mjs graph"
```

Do not modify any other script entry.

**Verify.**

```bash
npm run validate
npm run tasks:graph -- --phase=mvp | head -30
npm run tasks:graph -- --format=dot --phase=mvp | head -10
```

**Success signal:**
- The Mermaid output begins with ` ```mermaid` and contains arrows.
- The DOT output begins with `digraph` and contains quoted edges.
- All existing `validate:*` scripts remain green.
- No existing test changes behavior.

---

# Final Verification (run after every Tier 1 + Tier 2 step is done)

```bash
npm run generate:task-registry
npm run generate:task-system-report
npm run validate
npm test
node -e "const r=require('./tasks/task-registry.json');console.log('tasks:',r.tasks.length,'modules:',r.modules.length)"
```

**Expected end state after Tier 1 + Tier 2 (Steps 1–4):**

- `tasks: 281 modules: 23` (no count change — Tier 1+2 only mutates content).
- `Task lint passed: 281 tasks, 0 issues.`
- `validate:links`, `validate:contracts`, `validate:cross-refs`, `validate:commands`, `validate:tasks` all green.
- `npm test` all green.
- [`docs/planning/task-system-report.md`](../planning/task-system-report.md) gains two new inventory lines.
- [`docs/architecture/glossary.md`](../architecture/glossary.md) gains an `## H3 Alias Anchors` section.
- The two phase-3 polish tasks have advisory `Files In Scope:` blocks.
- Three single-owner mechanic tasks have a new "Scope verified against the Deferred Mechanic Inventory" AC bullet.

**Stop here.** Do not run Tier 3 or Tier 4 unless explicitly told to. Surface the diff to the user. The system is now at audit score 10 / 10.

---

## Summary Table — Step Map

| Step | Tier | Files Touched | Effort | Risk |
|---|---|---|---:|---|
| 1 | T1 | 1 (`glossary.md`) | 10 min | Trivial |
| 2 | T1 | 2 (`05-...` and `06-...` polish tasks) | 20 min | Trivial |
| 3 | T2 | 3 (`22-obelisk...`, `13-hill-fort...`, `27-thieves-guild...`) | 15 min | Trivial |
| 4 | T2 | 1 (`generate-task-system-report.mjs`) + regenerated report | 30 min | Low (script-only) |
| 5 | T3 | 4 (split `05` → `05a/05b/05c` + module index) | 60 min | Medium (defer until MVP closes) |
| 6 | T4 | 2 (`tasks.mjs`, `package.json`) | 45 min | Low (additive command) |

---

## What this plan does NOT do

- It does not implement any task body. No `src/` edits, no schema additions.
- It does not change task IDs, dependencies, or estimates of any existing task in Tier 1 or Tier 2.
- It does not touch the screen-package wiki, the renderer, or the engine.
- It does not bump dependencies or run package upgrades.
- It does not split any task other than the Phase-3 perf milestone (and only when explicitly triggered).

If a step in this plan tempts you to do any of the above, stop and report. The plan's value is precisely that it stays inside the safe edit surface that does not perturb the Codex execution queue.
