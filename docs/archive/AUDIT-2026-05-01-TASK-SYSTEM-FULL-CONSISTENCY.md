# Task System Full-Consistency Audit — 2026-05-01

**Scope:** End-to-end audit of the `tasks/` execution system against architecture
modules, UI wiki screen packages, content schemas, and Heroes-III baseline
mechanics. Verifies the registry's machine-actionability and an AI agent's
ability to execute tasks autonomously without operator hand-holding.

**Method:** Static inspection of `tasks/*.md`, `tasks/task-registry.json`,
`docs/architecture/wiki/screens/*`, `content-schema/schemas/*`,
`docs/planning/task-system-report.md`, plus full `npm run validate` and
`npm run validate:tasks` runs and direct cross-walks of registry derived
fields against filesystem ground truth.

---

## 1. Task System Score

**9.6 / 10**

Best-in-class task execution system. The backlog is structurally clean,
fully cross-linked, and validated by automation that already runs in CI.
The 0.4-point deduction is for surface-level seams worth tightening, not
defects that block AI execution:

- Three Phase-3 polish tasks legitimately opt out of `ownedPaths` —
  reasons are recorded but the opt-out machinery is the only place where
  filesystem ownership is implicit. Acceptable, not optimal.
- Heroes-III "wandering monsters" terminology is folded into the
  `neutral-stack-template` schema — correct technically, but a one-line
  glossary anchor would make AI agents trained on H3 lore align faster.
- `phase-3.04-polish.05-performance-profiling-plus-optimization` carries
  272 dependencies. Functionally a milestone gate, but a single 4-hour
  task with that dependency closure is worth re-scoping or splitting
  before phase-3 begins.

---

## 2. Critical Issues

**None.** No AI-blocking defects detected.

The validation pipeline is green end-to-end:

```
validate:links     → All Markdown links resolve.
validate:contracts → Repo contract checks passed.
validate:cross-refs → Cross-reference checks passed.
validate:commands  → Command coverage check passed.
validate:tasks     → Task lint passed: 281 tasks, 0 issues.
```

Registry state:

| Check | Result |
|---|---|
| Tasks total | 281 |
| Modules total | 23 |
| Status `planned` | 281 / 281 |
| Tasks with all required sections (Description / Outputs / Dependencies / AC / Estimate) | 281 / 281 |
| Tasks with unresolved dependencies | 0 |
| Dependency cycles | 0 |
| Tasks with parsable estimate in 2–6 h band | 281 / 281 |
| Tasks > 6 h | 0 |
| Tasks < 2 h | 0 |
| Total backlog | ~964 h, mean 3.43 h/task |
| Screen packages owned | 65 / 65 (only `index.json` excluded — meta) |
| Schemas referenced by ≥1 task | 39 (33 existing + 6 planned) |
| Task command literal violations | 0 |
| Unanchored tasks | 0 |
| Unsafe owned-path opt-outs | 0 |

---

## 3. Misalignments

### 3.1 Tasks ↔ Architecture

All 23 architecture modules (11 MVP + 8 Phase-2 + 4 Phase-3) have
matching task directories. Module → task counts:

| Module | Tasks |
|---|---:|
| phase-2.07-ui-screen-backlog | 51 |
| phase-2.01-spells-artifacts | 25 |
| mvp.02-content-schemas | 20 |
| mvp.05-adventure-map | 20 |
| phase-2.06-visual-fidelity | 15 |
| mvp.09-tactical-combat | 14 |
| mvp.01-engine-core | 12 |
| mvp.02b-asset-pipeline | 10 |
| mvp.03-map-system | 10 |
| phase-2.05-mod-system | 10 |
| mvp.07-ui-shell | 9 |
| phase-2.04-content-editor | 9 |
| phase-3.02-ai-generation | 9 |
| phase-3.04-polish | 9 |
| mvp.06-renderer | 8 |
| phase-3.01-multiplayer | 8 |
| phase-2.08-meta-systems | 7 |
| phase-3.03-mcts-ai | 7 |
| mvp.10-heuristic-ai | 6 |
| phase-2.02-strategic-ai | 6 |
| phase-2.03-second-faction | 6 |
| mvp.04-faction-emberwild | 5 |
| mvp.08-persistence | 5 |

No orphan modules. No orphan tasks (every task is rooted under a
declared module).

### 3.2 Tasks ↔ UI Screens

`docs/architecture/wiki/screens/` contains **65 screen packages** plus a
single `index.json` meta file. Cross-walked against
`screenPackages` arrays in the registry:

- **Owned screens:** 65 / 65
- **Unowned screens:** 0
- **Tasks pointing at non-existent screens:** 0

Several high-traffic screens have multiple co-owners (HUD, Hero Screen,
Town Screen, Status Bar, Battle UI). Co-ownership is layered (shell
contract + visual-fidelity overlay + meta-systems wiring) and is
documented in `screen-command-coverage.json` rather than ambiguous.

### 3.3 Tasks ↔ Schemas

39 schema paths are referenced from tasks; 33 schemas exist on disk.
The 6 schema files referenced but not yet present each have an explicit
creator task in `mvp.02-content-schemas/`:

| Planned schema | Owning creator task |
|---|---|
| `campaign.schema.json` | `mvp.02-content-schemas.17-campaign-schema` |
| `quest.schema.json` | `mvp.02-content-schemas.16-quest-schema` |
| `random-map-template.schema.json` | `mvp.02-content-schemas.18-random-map-template-schema` |
| `marketplace-rate-table.schema.json` | `mvp.02-content-schemas.19-tavern-and-marketplace-tables` |
| `tavern-offer.schema.json` | `mvp.02-content-schemas.19-tavern-and-marketplace-tables` |
| `university-skill-table.schema.json` | `mvp.02-content-schemas.20-university-skill-table` |

So the apparent "missing schemas" are not bugs — they are **forward
references** consumed by Phase-2 screen tasks before the MVP creator
tasks run, and the dependency graph already encodes that order.

---

## 4. Missing Tasks

**None blocking.**

Heuristic mechanic-keyword sweep across task titles + descriptions:

| Mechanic | Hits |
|---|---:|
| hero | 54 | town | 27 | combat | 20 | spell | 20 | resource | 18 |
| artifact | 17 | damage | 11 | mine | 10 | movement | 9 |
| campaign | 8 | quest | 8 | secondary skill | 7 |
| recruit | 7 | victory | 6 | marketplace | 6 |
| primary stat | 6 | mage guild | 5 | scout | 5 | specialty | 5 |
| siege | 4 | random map | 4 | blind | 4 |
| morale | 3 | retaliation | 3 | university | 3 |
| auto-resolve | 3 | tavern | 3 | garrison | 3 | grail | 3 |
| underground | 2 | hill fort | 1 | obelisk | 1 | luck | 1 |
| war machine | 2 | level up | 1 | thieves guild | 1 |
| zone of control | 1 | shipyard | 2 | external dwelling | 2 |
| neutral stack | 2 | combine artifact | 1 | dimension door | 1 |

Three keywords scored zero on a literal match but **are present
under canonical project terminology**:

- `wandering` → covered as `neutral-stack-template` (the canonical
  H3-fidelity term in this codebase).
- `primary skill` → covered as `primary stats` and stored on
  `hero.schema.json` (`attack`, `defense`, `power`, `knowledge`).
- `specialist` → covered as `specialty` (5 tasks) on `hero.schema.json`.

Recommend adding a single anchor entry to
`docs/architecture/glossary.md`:

```
wandering monster → neutral-stack-template
primary skill     → hero primary stat (attack/defense/power/knowledge)
specialist        → hero specialty
```

This is a 5-minute polish, not a missing task.

### Coverage gaps worth a sanity-check before starting Phase-2

Single-hit mechanics (one task each) — these are NOT missing, but flag
them for a peer-read before kicking off the owning task to confirm
scope is complete:

- `mvp.05-adventure-map.22-obelisk-visits-and-grail-state` (obelisk + grail)
- `phase-2.07-ui-screen-backlog.13-hill-fort-screen` (hill fort)
- `phase-2.07-ui-screen-backlog.27-thieves-guild-screen` (thieves guild)
- Counter-spells (Counterstrike, Magic Mirror) folded into
  `phase-2.01-spells-artifacts.02-combat-spells` (declared as a Deferred
  Mechanic in `tasks/README.md`)
- First-aid tent battlefield healing folded into
  `phase-2.01-spells-artifacts.11-buy-war-machine-command`
- Native-terrain bonuses folded into
  `mvp.04-faction-emberwild.04-baseline-ruleset`

The "Deferred Mechanic Inventory" in `tasks/README.md` already
explicitly records each fold-in with parent-task pointers. This is
correct documentation hygiene; no new tasks needed.

---

## 5. Task Rewrites

No rewrites required. Sample tasks reviewed for AI-executability:

- **`mvp.05-adventure-map.03-hero-movement`** — model task. Has a
  fully-worked example with concrete inputs, terrain costs, MP
  arithmetic, validation steps, before/after state diff, and
  determinism contract.
- **`mvp.09-tactical-combat.03-damage-formula`** — model task. Includes
  the integer AST, baseline constants, and four numeric acceptance
  scenarios with exact expected values (e.g. ATK−DEF=80 → ×4.00).
- **`phase-2.07-ui-screen-backlog.26-marketplace-screen`** — model
  screen task. Anchors all UI behavior to a versioned screen package
  and routes interaction tokens through `screen-command-coverage.json`
  with stub-fallback rules for tokens whose engine task is still
  `planned`.

These are exactly the shape an AI agent can implement single-shot:
inputs known, outputs known, file paths declared, AC numerically
testable.

If any task is rewritten in the future, **use these three as the
template**:

1. `Read First:` block with relative-path links to ambient docs.
2. `Inputs:` listing typed prerequisites (other task IDs preferred).
3. `Outputs:` listing exact file paths + the public surface (function
   signature or command discriminant).
4. `Owned Paths:` exact filesystem claim.
5. `Dependencies:` other task IDs only (registry-resolvable).
6. `Acceptance Criteria:` numerically or behaviorally testable bullets.
7. `Estimated Time:` integer hours in the 2–6 band.
8. Worked example with concrete numbers when the task implements a
   formula or command.

---

## 6. Registry Issues

**None.**

`tasks/task-registry.json` is generated by
`scripts/generate-task-registry.mjs`. Cross-checked against:

- Filesystem walk → 281 task `.md` files match 281 registry entries.
- `resolvedDependencies` ↔ `unresolvedDependencies` balance → 0
  unresolved across 281 tasks.
- DAG: tarjan-style cycle scan → 0 cycles.
- Sources/sinks: exactly one source
  (`mvp.01-engine-core.01-initialize-root-workspace-and-module-layout`)
  — clean topological ordering for autonomous queues.
- Estimate parser: every `Estimated Time:` block parses to an integer
  or range; mean 3.43 h, max 6 h, min 2 h.

`tasks:next` and `tasks:next:hot` produce sane queues. The `hot`
ordering correctly surfaces high-fan-out unblocking tasks first
(verified: the engine-core entry task is the only ready item right
now, as expected from a fresh tree).

---

## 7. Execution Risks

### Where AI agents may stumble

1. **Phase-3 cross-cutting tasks with no `ownedPaths`.**
   `phase-3.04-polish.05-performance-profiling-plus-optimization`
   (272 deps) and `phase-3.04-polish.06-accessibility-pass` (116 deps)
   declare `ownedPathsOptOut: true` with the boilerplate "this task
   does not claim filesystem ownership" reason. An AI executing one of
   these cold may not know what to *touch*. Risk is contained because
   they fire only after almost the entire backlog is done — but the
   opt-out reason should be replaced with an enumerable list of in-scope
   files derived from acceptance criteria when they become next-ready.

2. **High-fan-out clusters.**
   `phase-2.01-spells-artifacts.04a-baseline-skill-pack` (20 deps),
   `phase-2.05-mod-system.05a-baseline-ruleset-and-shared-library-packs`
   (18), and `phase-3.02-ai-generation.03-auto-balancer-headless-battle-baseline`
   (19) all gate large downstream cones. None are AI-blocking — each
   has full AC sections — but the cone size means a regression in any
   of them blocks dozens of follow-ups. Treat them as integration
   gates and pair-review their outputs before unblocking the cone.

3. **Forward-referenced schemas.**
   Six schemas (campaign, quest, random-map-template,
   marketplace-rate-table, tavern-offer, university-skill-table) are
   referenced by Phase-2 UI tasks before the MVP creator tasks run.
   The dependency graph encodes the right order, but an AI that
   prefetches `schemaPaths` from the registry and tries to parse them
   from disk before running its task will trip a "file does not exist"
   error. Mitigation: AI executors should resolve dependencies by
   `resolvedDependencies` (registry), **not** by stat'ing schema files.

### Where human input is genuinely needed

- **Heroes-III balance constants.** Several damage / morale / luck
  formulas reference numeric constants (e.g. `atkBonusCap = 60`,
  `defReductionCap = 60`, `±10 stat differential ↔ 50 % multiplier`).
  These are baseline-corridor decisions. An AI can implement the
  evaluator, but a human must ratify constant changes during
  balance passes.
- **Faction flavor for Emberwild and Necropolis.** Two faction tasks
  (`mvp.04-faction-emberwild`, `phase-2.03-second-faction`) require
  unit ability sets and lore. The schemas constrain *shape*; humans
  pick *content*.
- **Audio/VFX direction in `phase-2.06-visual-fidelity` and
  `phase-3.04-polish.04-sound-system`.** Asset taste calls.

---

## 8. Fix Plan

**Priority: low** — system is production-shape today.

### Quick wins (≤ 1 h each)

1. Add a glossary anchor for H3-fidelity term aliases in
   `docs/architecture/glossary.md`:
   - `wandering monster → neutral-stack-template`
   - `primary skill → hero primary stat (attack/defense/power/knowledge)`
   - `specialist → hero specialty`

2. In `phase-3.04-polish.05-performance-profiling-plus-optimization`
   and `06-accessibility-pass`, replace the boilerplate opt-out reason
   with an enumerated **"Files this task is expected to modify"** list
   derived from acceptance criteria. Keep the opt-out flag, but make
   the implicit ownership explicit at the doc level.

### Medium polish (when starting Phase-2)

3. Re-scope `phase-3.04-polish.05` if it stays at 272 deps. The
   acceptance criteria currently include profiling + bench + a
   regression dashboard — split into:
   - `05a-perf-baseline-snapshot` (after MVP closes)
   - `05b-perf-regressions-and-budgets` (depends on 05a)
   - `05c-final-perf-pass` (depends on 05b)

   Each ≤ 6 h, each with its own dependency cone. This keeps the 2–6 h
   atomicity rule strictly true.

4. Add a thin "single-hit mechanic spot-check" line to each of:
   - `phase-2.07-ui-screen-backlog.13-hill-fort-screen`
   - `phase-2.07-ui-screen-backlog.27-thieves-guild-screen`
   - `mvp.05-adventure-map.22-obelisk-visits-and-grail-state`

   Just one bullet under AC: "scope verified against the
   `Deferred Mechanic Inventory` in `tasks/README.md`." Insulates
   single-owner tasks against silent scope drift.

### Not-needed-but-nice (post-MVP)

5. Add a `tasks:graph` script that emits a DOT or Mermaid view of the
   dependency DAG, scoped per phase. The lint already enforces
   correctness; visualization helps human reviewers spot
   over-coupling early.

6. Surface `screen-command-coverage.json` and
   `task-command-token-coverage.json` in the autogen task-system
   report so any coverage drift is caught the same day.

---

## Final Goal Verification

| Goal | Status |
|---|---|
| Every task is executable by AI | **Yes** — sampled tasks (`hero-movement`, `damage-formula`, `marketplace-screen`) are single-shot implementable. |
| Tasks align with UI + schema + architecture | **Yes** — 65/65 screen ownership, 39/39 schema references, 23/23 modules with tasks. |
| Backlog covers Heroes-III mechanics | **Yes** — all major systems present; six minor mechanics explicitly folded into parent tasks via `Deferred Mechanic Inventory`. |
| Registry supports automated execution | **Yes** — `npm run validate` and `npm run validate:tasks` pass; `tasks:next` produces a valid queue from a single source. |
| Generated report exists and is current | **Yes** — `docs/planning/task-system-report.md` regenerated on this audit. |

**Verdict:** ship it. The task system is ready for autonomous AI
execution starting from
`mvp.01-engine-core.01-initialize-root-workspace-and-module-layout`.
The fix plan above is hygiene, not unblocking.

---

## Auditor's Notes

- This audit was non-destructive: no task files, schemas, or registry
  entries were modified.
- The `npm run validate` run on this audit reproduces the same
  zero-issue result as the in-tree
  `docs/planning/task-system-report.md` claims, confirming the report
  is current and not stale.
- Prior consistency audits in
  `docs/planning/audits/AUDIT-2026-04-30-TASK-SYSTEM-FULL-CONSISTENCY.md`
  and earlier rounds describe a similar trajectory; this audit
  confirms the system has held its quality bar across two full days
  of changes.
