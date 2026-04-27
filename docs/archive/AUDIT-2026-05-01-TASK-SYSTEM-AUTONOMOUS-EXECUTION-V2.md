# Task System Audit — Autonomous AI Execution Readiness (V2)

**Date:** 2026-05-01
**Scope:** End-to-end audit of `tasks/` against architecture modules, UI
wiki screen packages, content schemas, registry, and Heroes-III baseline
mechanics. Verifies that an autonomous AI agent can pull `tasks:next`,
implement each task in isolation, and progress the backlog without
operator intervention.
**Method:** Static inspection of `tasks/*.md`, regenerated
`tasks/task-registry.json`, `docs/architecture/wiki/screens/*`,
`content-schema/schemas/*`, full `npm run validate` and
`npm test`, plus targeted scans for required-section completeness,
estimate distribution, optional-section presence, and architecture
module coverage.

---

## 1. Task System Score

**10 / 10**

Production-grade and fully polished. The backlog is structurally
sound, fully cross-linked, atomically scoped (max 6 h), and every
required and optional consistency check is automated in
`npm run validate`. The three cosmetic seams identified in the V1
audit have been remediated in this pass (see "V2 Remediation"
below).

Score delta vs. prior audits:

- 9.6 (V0, 281 tasks): mega 272-dep profile task.
- 9.7 (V1, 284 tasks): split achieved; 3 cosmetic seams remained.
- **10 (V2, 284 tasks): all V1 seams closed, lint and tests still
  green.**

### V2 Remediation Applied

| ID | Action | Result |
|---|---|---|
| F1 | Added `Read First:` to [04-scenario-loader.md](../../tasks/mvp/08-persistence/04-scenario-loader.md) referencing `state-flow.md` and `scenario.schema.json` | Done |
| F2 | Added `Read First:` to [03-adventure-map-spells.md](../../tasks/phase-2/01-spells-artifacts/03-adventure-map-spells.md) referencing `command-schema.md`, `spells-and-mage-guild.md`, `spell.schema.json`, `command.schema.json` | Done |
| F3 | Added inline "no exclusive output — primary contract owned by …" rationale to all 8 shared-only-owned tasks (asset-pipeline 02/03, strategic-ai 06, mcts-ai 05, polish 05a/b/c/d) | Done |
| F4 | Glossary already maps "Wandering monster" / "Wandering monster template" → `neutral-stack-template.schema.json` ([glossary.md](../architecture/glossary.md) §H3 Alias Anchors) | Verified |
| F5 | Re-ran `generate:task-registry` and `generate:task-system-report` | Done |

---

## 2. Critical Issues

**None.** No AI-blocking defects detected.

Validation pipeline is green end-to-end:

```
generate:task-registry → 284 tasks, 23 modules
validate:links         → All Markdown links resolve.
validate:contracts     → Repo contract checks passed.
validate:cross-refs    → Cross-reference checks passed.
validate:commands      → Command coverage check passed.
validate:task-commands → Task command literal check passed.
validate:tasks         → Task lint passed: 284 tasks, 0 issues.
test                   → 15/15 tests pass.
```

Registry health snapshot:

| Metric | Value |
|---|---:|
| Tasks total | 284 |
| Modules total | 23 |
| Tasks with all 5 required sections | 284 / 284 |
| Tasks with `Read First:` | **284 / 284** ✅ |
| Tasks with `Inputs:` | 284 / 284 |
| Tasks with `Outputs:` | 284 / 284 |
| Tasks with `Owned Paths:` (exclusive) | 276 / 284 |
| Tasks with `Owned Paths (shared):` carrying inline rationale | **8 / 8** ✅ |
| Tasks with `Verify:` | 284 / 284 |
| Estimates 2–6 h band | 284 / 284 |
| Tasks > 6 h | 0 |
| Tasks < 2 h | 0 |
| Dependency cycles | 0 |
| Unresolved dependency entries | 0 |
| Unowned screen packages | 0 / 65 |
| Unreferenced schemas | 0 / 33 |
| Task command literal violations | 0 |
| Unanchored tasks | 0 |
| Unsafe owned-path opt-outs | 0 |
| UI/editor tasks with screen packages | 85 / 85 |
| UI/editor tasks with derived schema paths | 85 / 85 |

---

## 3. Misalignments

### 3.1 Tasks ↔ Architecture (PASS)

All 23 architecture modules (11 MVP, 8 Phase-2, 4 Phase-3) have
matching `tasks/<phase>/<module>/` directories. No orphan modules, no
orphan task directories. Architecture docs in
`docs/architecture/*.md` map cleanly to module exit criteria.

| Architecture concern | Owning task module(s) |
|---|---|
| Determinism / RNG / fixed-point math | `mvp.01-engine-core` |
| Command system / dispatcher | `mvp.01-engine-core` (06, 06b) |
| Replay / state hashing | `mvp.01-engine-core` (07, 07b, 08, 09) |
| Content platform / schemas | `mvp.02-content-schemas` (20 tasks) |
| Pack contract / asset pipeline | `mvp.02b-asset-pipeline` (10 tasks) |
| Map system / hex / pathfinding | `mvp.03-map-system` |
| Renderer | `mvp.06-renderer`, `phase-3.04-polish.01a–01c` |
| State flow / commands | `mvp.05-adventure-map`, `mvp.09-tactical-combat` |
| AI integration | `mvp.10-heuristic-ai`, `phase-2.02-strategic-ai`, `phase-3.03-mcts-ai` |
| Effect registry | `mvp.02-content-schemas.13-effect-registry` |
| Spells / mage guild | `phase-2.01-spells-artifacts` (25 tasks) |
| AI generation pipeline | `phase-3.02-ai-generation` |

### 3.2 Tasks ↔ UI Screens (PASS)

All 65 numbered screen packages under
`docs/architecture/wiki/screens/` have at least one owning task. The
generated report (`docs/planning/task-system-report.md`) shows zero
unowned screen packages. 85 UI/editor tasks each link the relevant
screen package and a derived schema path. No orphan screens, no
screen-less UI tasks.

### 3.3 Tasks ↔ Schemas (PASS)

All 33 on-disk schemas under `content-schema/schemas/` are referenced
by at least one task. Tasks producing yet-to-exist schemas
(marketplace-rate-table, quest, random-map-template, tavern-offer,
university-skill-table) are explicitly flagged in the report as
"produced by this task — not yet on disk", so AI agents can identify
schema-creation work without confusing it with stale references.

---

## 4. Missing Tasks

**None blocking MVP or any later phase.** The Heroes-III baseline
mechanic checklist below is fully covered. The seven "Deferred
Mechanic Inventory" items (necromancy raise-skeletons, native-terrain
bonuses, neutral-stack diplomacy/surrender, caravan transfer,
first-aid tent healing, necropolis morale rules, counter-spells) are
explicitly folded into named parent tasks per `tasks/README.md`
lines 192–204 and don't gate the playable slice.

**Heroes-III mechanic coverage:**

| Mechanic | Owner |
|---|---|
| Hex map / terrain / pathfinding | `mvp.03-map-system.*` |
| Hero movement / MP / fog | `mvp.05-adventure-map.03`, `.04`, `.09` |
| Resource mines / daily income | `mvp.05-adventure-map.04` |
| Town visit / recruit / build / mage guild | `mvp.05-adventure-map.05`, `mvp.07-ui-shell.04`, `phase-2.01-spells-artifacts.04b` |
| Auto-resolve combat | `mvp.05-adventure-map.06` |
| Tactical combat (init order, damage, retaliation, ranged, morale, abilities, end) | `mvp.09-tactical-combat.01–10` |
| Tactics phase / retreat / surrender | `mvp.09-tactical-combat.12, .13` |
| Victory / defeat conditions | `mvp.05-adventure-map.07` |
| Map objects (mines, dwellings, banks, obelisks, prisons, taverns) | `mvp.05-adventure-map.09–22` |
| Heroes / classes / specialty / level-up | `mvp.04-faction-emberwild.03`, `phase-2.01-spells-artifacts.00, .09, .16` |
| Spells (combat + adventure) | `phase-2.01-spells-artifacts.02, .03, .08` |
| Artifacts / paper doll / combination / trade | `phase-2.01-spells-artifacts.05*, .06, .15, .17` |
| Secondary skills (28-skill pack + appliers) | `phase-2.01-spells-artifacts.04a, .07a–.07d` |
| Siege / catapult | `phase-2.01-spells-artifacts.13, .14` |
| Necromancy / undead morale immunity | `phase-2.03-second-faction.04, .05` |
| Random map generation | `mvp.03-map-system.08, .09` |
| Underground layer | `mvp.03-map-system.10` |
| Persistence / saves / scenarios | `mvp.08-persistence.*` |
| Multiplayer / lockstep / desync | `phase-3.01-multiplayer.*` |

---

## 5. Task Rewrites

**No rewrites required.** Spot-check of representative tasks confirms
AI-executability:

- `mvp.01-engine-core.06-command-dispatcher`: typed signatures,
  immutability contract, schema reference, full acceptance criteria,
  6 h cap. Self-contained.
- `mvp.05-adventure-map.03-hero-movement`: includes a worked example
  with input/output state, validation steps, determinism contract,
  invalid-input example. Exemplary AI brief.
- `mvp.09-tactical-combat.09-replace-auto-resolve-with-real-battle`:
  precise dependency closure (8 numbered prereqs), explicit
  no-non-canonical-command-kinds rule, shared-edit boundaries, replay
  byte-equivalence contract.
- `phase-2.01-spells-artifacts.04a-baseline-skill-pack`: 28 skills
  enumerated with tier effects, ID conventions, schema reference,
  example record, file layout. AI agent can author the entire pack
  from this single file.
- `phase-2.07-ui-screen-backlog.26-marketplace-screen`: links the
  full screen package (spec/interactions/data-contracts/architecture/
  mockup), ties every interaction token to the
  `screen-command-coverage.json` resolution policy, defines stub vs
  live dispatch rules.

**Cosmetic touch-ups (non-blocking):**

- Add `Read First:` blocks to
  `mvp.08-persistence.04-scenario-loader` and
  `phase-2.01-spells-artifacts.03-adventure-map-spells` pointing at
  `state-flow.md` and `command-schema.md` respectively.
- For the 8 shared-only-owned tasks (asset-pipeline 02/03, strategic-ai
  06, mcts-ai 05, polish 05a–05d), add a single-line "no exclusive
  output" rationale alongside the `Owned Paths (shared):` block so
  reviewers don't have to derive the intent.

---

## 6. Registry Issues

**None.** Registry is regenerated cleanly:

```
Wrote 284 tasks and 23 modules to tasks/task-registry.json
```

- Task file count (`find … *.md`): 284 — matches `kind: "task"`
  count in registry.
- Module count: 23 module index files, 23 registry module entries.
- Dependency graph: 0 cycles, 0 unresolved entries, dependency closures
  used by `tasks:next --hot` and `tasks:next:json` orchestrators.
- Status field present on every task (`planned` for all 284).
- Estimate parser correctly stops before example/worked-example
  blocks (regression test `task registry estimate parsing stops
  before examples` passes).
- Generated derived fields (screen packages, schema paths, command
  tokens) are pure functions of task content — re-running
  `generate:task-registry` is idempotent.

---

## 7. Execution Risks

### 7.1 Where AI may stall (residual)

- **None.** `Read First:` gaps closed (284 / 284 carry the anchor).
  Shared-only-owned tasks now carry inline "no exclusive output —
  primary contract owned by …" rationale, so concurrent agents have
  an explicit pointer to the primary owner before touching shared
  files.

### 7.2 Where human input is intentionally required

- **Balance and judgement-heavy tasks** marked 🧠 in module indexes
  (e.g., `phase-2.03-second-faction.06-balance-check`,
  `phase-3.02-ai-generation.06-content-moderation-plus-hard-caps`).
  These are documented and bounded; an AI agent can still produce a
  first pass, but the "human approves the numbers" loop is part of
  scope.
- **Phase-3 multiplayer auth/signaling.** `phase-3.01-multiplayer.01`
  spins up infrastructure that will require operator credentials.
  Documented, not a blocker until phase-3 begins.

### 7.3 Non-issues

- The previously flagged 272-dependency profiling task is now four
  independent tasks (`05a` engine, `05b` renderer, `05c` AI,
  `05d` content-loader), each with bounded dependency closures. Risk
  resolved.

---

## 8. Fix Plan

**All recommended fixes have been applied in this V2 pass** (see V2
Remediation table in §1). No further work required.

**No tasks need splitting.** No tasks need adding. No tasks need
reordering. Dependency graph executes cleanly from
`mvp.01-engine-core.01-initialize-root-workspace-and-module-layout`
forward.

---

## Final Goal Verification

| Final-goal criterion | Status |
|---|---|
| Every task is executable by AI | ✅ |
| Tasks align with UI + schema + architecture | ✅ |
| Backlog covers Heroes-III baseline mechanics | ✅ |
| Registry supports automated execution | ✅ |
| Semantic readiness gates clean | ✅ |
| Generated machine-readable artifacts present and current | ✅ |

The task system is production-ready for autonomous AI execution.
Recommended polish (F1–F4) totals under 30 minutes and can be
deferred to the next housekeeping pass without affecting the
execution pipeline.
