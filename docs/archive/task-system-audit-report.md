# Task System Audit Report

Audit Date: 2026-04-29
Auditor role: Senior engineering manager + AI workflow architect + task system auditor
Scope: tasks/*, tasks/task-registry.json, docs/architecture/*, content-schema/*, docs/architecture/wiki/screens/*

This is a fresh audit, independent of [docs/planning/task-system-report.md](../planning/task-system-report.md), which is generated from the registry and confirms the same headline numbers.

---

## 1. Task System Score — 8.2 / 10

| Dimension | Score | Notes |
|---|---:|---|
| Backlog ↔ architecture | 9 | All 12 architecture modules have tasks; pack-contract owners present. |
| Backlog ↔ UI screens | 9 | 65/65 screen packages owned (84 UI/editor tasks). |
| Backlog ↔ data contracts | 9 | 33/33 schemas referenced by ≥ 1 task. |
| Task atomicity | 10 | Every task is between 2 and 6 hours. |
| Task completeness | 10 | All 262 tasks include the five required sections. |
| AI executability per-task | 8 | Tasks include Read First, Inputs, Outputs, Owned Paths, Verify; some still rely on cross-file context (e.g. Adventure UI screens that defer to mockup.html for control labels). |
| Registry validity | 10 | `npm run validate:tasks` passes; 0 cycles, 0 unresolved deps. |
| Dependency graph | 9 | No cycles; `module:` macro deps resolve correctly. One-blocker bottleneck through `mvp.01-engine-core.01` is by design. |
| Baseline-corridor mechanics coverage | 6 | Several **schema-defined commands lack any engine-reducer task** (siege, tactics phase, stack splits/upgrades, transfers, combine artifacts). UI dispatches them but no reducer can apply them. This is the single biggest risk. |
| MVP playable loop | 9 | Engine, schemas, faction, map, adventure, renderer, UI shell, persistence, tactical combat, and heuristic AI all present; 7-day smoke test exists. |
| AI execution flow (`tasks:next`) | 9 | Verified. First ready task is well-formed; flow is monotonic. |
| Cross-layer traceability | 9 | UI tasks cite screen packages; schema tasks cite schema files; engine tasks cite architecture docs. |

**Headline numbers (confirmed live):**
- `npm run validate:tasks` → **passed**, 262 tasks, 0 issues
- `npm run validate` → all five sub-validators pass (links, contracts, cross-refs, commands, tasks)
- `npm run tasks:next:mvp` → 1 ready, 113 blocked-by-deps; chain start = `mvp.01-engine-core.01-initialize-root-workspace-and-module-layout`

---

## 2. Critical Issues

### C1 — Schema-defined commands without an engine-reducer owner (BLOCKER)
The following commands are in `content-schema/schemas/command.schema.json` and are surfaced from screen interactions, but **no task in `tasks/` owns the engine reducer**:

| Command | Schema | Screen UI task | Engine task |
|---|:---:|:---:|:---:|
| `FIRE_CATAPULT` | yes | yes (43-siege-combat) | **missing** |
| `PLACE_TACTICS_STACK` | yes | yes (45-tactics-phase) | **missing** |
| `START_BATTLE_AFTER_TACTICS` | yes | yes (45-tactics-phase) | **missing** |
| `SPLIT_ARMY_STACK` | yes | yes (51-split-stack-dialog) | **missing** |
| `UPGRADE_ARMY_STACK` | yes | implicit (24-town / hill-fort) | **missing** |
| `UPGRADE_ALL_ELIGIBLE_STACKS` | yes | implicit | **missing** |
| `COMBINE_ARTIFACTS` | yes | yes (52-artifact-combine-dialog) | partial only — `phase-2.01-spells-artifacts.06` detects bonuses but does not implement the `COMBINE_ARTIFACTS` reducer |
| `TRANSFER_GARRISON_STACK` | yes | yes (22-garrison-structure) | **missing** |
| `TRANSFER_HERO_ARMY_STACK` | yes | yes (24-town / 49-hero-meeting) | **missing** |
| `TRANSFER_TOWN_ARMY_STACK` | yes | yes (24-town) | **missing** |
| `TRANSFER_HERO_ARTIFACT` | yes | yes (49-hero-meeting / 32-artifact-merchant) | **missing** |
| `AUTO_RESOLVE_BATTLE` | yes | yes (40-pre-battle-dialog) | implicit only — `mvp.05-adventure-map.06-auto-resolve-combat` does not bind to the literal command name and has no command-dispatcher contract |

UI tasks dispatch these via `screen-command-coverage.json`, but at runtime the dispatcher would return `ValidationError("STUB")` and gameplay would not progress. Add explicit engine tasks (see §8).

### C2 — Siege engine logic is not modelled in the MVP backlog
`44-combat-spell-targeting`, `38-combat-screen`, and `43-siege-combat` exist as UI tasks. There is **no engine task** for: wall HP / gate state machine, moat damage on entry, tower auto-fire, hero spell-only-mode in defender position, catapult action turn ordering. The screen `interactions.md` will reference behaviors that no reducer implements.

### C3 — `mvp.05-adventure-map.06-auto-resolve-combat` is a logic task, not a command-dispatcher task
The file specifies a `autoResolveBattle(...)` function but does not specify which `Command` kind invokes it, nor where it plugs into the dispatcher. With `AUTO_RESOLVE_BATTLE` in the schema, this is a contract gap.

### C4 — The MVP smoke test (`08-7-day-playable-smoke-test`) cannot pass without the auto-resolve / battle wiring being explicit
That task asserts that a 7-day Emberwild scenario is playable end-to-end, but if `AUTO_RESOLVE_BATTLE` has no reducer in MVP and tactical combat (`09-tactical-combat.09-replace-auto-resolve-with-real-battle`) explicitly replaces auto-resolve later, it is unclear which command path is intended for *the smoke test itself*. Today this is implicit.

### C5 — Baseline-corridor creature stack interactions are mostly UI-only
Stack manipulation (split, merge by drag-drop, transfer between hero/town/garrison) has UI screen ownership but no engine ownership. These are core baseline-corridor interactions; players hit them dozens of times per session. They cannot be left to the screen tasks.

---

## 3. Misalignments

### Tasks ↔ UI
- All 65 screen packages have an owning task (`task-system-report.md` confirms 84/84 UI tasks bind a package).
- **Risk:** UI tasks in `phase-2/07-ui-screen-backlog/` reference commands whose engine reducers do not exist (see §C1). The screen-command coverage check passes only because every token is **either** schema-backed, aliased, UI-local, **or out of scope** — so a token can be schema-backed yet still have no reducer.
- 3 screens have 4+ owning tasks (`07-adventure-map`, `46-hero-screen`, `65-map-editor`). That is a layered-implementation pattern, not a defect.

### Tasks ↔ Schema
- All 33 schemas have ≥ 1 referencing task. No unreferenced schemas.
- **Asymmetric:** the inverse check (every schema-declared `command.kind` has a task) is not enforced and is the source of §C1.

### Tasks ↔ Architecture
- All architecture modules in `docs/architecture/overview.md` have at least one MVP task family.
- `docs/architecture/screen-command-coverage.json` correctly records the cinematic / multiplayer / campaign-runner deferrals to phase-2 / phase-3 — those are **not** gaps.

---

## 4. Missing Tasks

### Missing engine reducer tasks (MVP-critical)
Add the following under `tasks/mvp/05-adventure-map/` or `tasks/mvp/09-tactical-combat/`:

1. `mvp.05-adventure-map.17-split-army-stack-command` — `SPLIT_ARMY_STACK` reducer (hero or town stacks).
2. `mvp.05-adventure-map.18-transfer-stack-commands` — `TRANSFER_HERO_ARMY_STACK`, `TRANSFER_TOWN_ARMY_STACK`, `TRANSFER_GARRISON_STACK`, plus garrison↔hero edge cases.
3. `mvp.05-adventure-map.19-transfer-hero-artifact-command` — `TRANSFER_HERO_ARTIFACT` between adjacent heroes (and into Artifact Merchant flow later).
4. `mvp.05-adventure-map.20-upgrade-army-stack-command` — `UPGRADE_ARMY_STACK` plus `UPGRADE_ALL_ELIGIBLE_STACKS` (single command, two payloads).
5. `mvp.05-adventure-map.21-auto-resolve-command-binding` — bind `AUTO_RESOLVE_BATTLE` to the existing `auto-resolve.ts` evaluator and acceptance-test it against the smoke test.

### Missing tactical-combat tasks (MVP)
6. `mvp.09-tactical-combat.12-tactics-phase-engine` — `PLACE_TACTICS_STACK`, `START_BATTLE_AFTER_TACTICS`, deterministic placement rules. (Numbering: keep `13` retreat/surrender; insert `12` before it.)

### Missing siege-combat tasks (phase-2 acceptable; MVP if siege ships pre-launch)
7. `phase-2.01-spells-artifacts.13-siege-state-machine` — wall HP, gate state, moat, tower auto-fire, defender spell-only-mode while siege intact. Owns `BATTLE_RESOLVED` siege variant and references siege constants in the ruleset.
8. `phase-2.01-spells-artifacts.14-fire-catapult-command` — `FIRE_CATAPULT` reducer, target selection, deterministic damage roll.

### Missing artifact tasks (phase-2)
9. `phase-2.01-spells-artifacts.15-combine-artifacts-command` — `COMBINE_ARTIFACTS` reducer (in addition to existing detection task `06`).

### Missing UI/data tasks
None at the schema layer. UI screen ownership is complete.

### Missing engine tasks not surfaced by schema
- Hero specialty effect application (baseline-corridor specialty — buffs to a class of units / spell). The hero schema supports it but the runtime applier task is missing. Suggest `phase-2.01-spells-artifacts.16-hero-specialty-applier`.
- Morale/luck event log surface for the UI feed. The `06-morale-and-luck-rolls` task exists but the *event* type for HUD is not specified anywhere.

---

## 5. Task Rewrites

### Rewrite A — `mvp.05-adventure-map.06-auto-resolve-combat`
Add an explicit command binding. Append to `Outputs:` section:

```
- src/engine/commands/auto-resolve.ts dispatching `AUTO_RESOLVE_BATTLE`
- Command payload: { battleId: string, attackerHeroId, defenderHeroId | defenderStackId }
- Returns { winner, attackerLosses, defenderLosses, eventLog: Event[] }
```

Append to `Acceptance Criteria:`:

```
- Dispatching AUTO_RESOLVE_BATTLE on a non-existent battle returns ValidationError
- Dispatching AUTO_RESOLVE_BATTLE consumes the pending battle from AdventureState
- Smoke test (08) drives all combat through AUTO_RESOLVE_BATTLE and replays byte-identically
```

### Rewrite B — `phase-2.07-ui-screen-backlog/45-tactics-phase-screen.md`
Today this UI screen depends only on `mvp.07-ui-shell.*` and `mvp.09-tactical-combat.11-combat-hud-overlay`. After §4 #6 is added, change `Dependencies:` to include:

```
- mvp.09-tactical-combat.12-tactics-phase-engine
```

Otherwise the screen will dispatch `PLACE_TACTICS_STACK` into a missing reducer and acceptance criterion #2 ("Every command listed … is resolved") cannot pass without falling back to `ValidationError("STUB")`.

### Rewrite C — `phase-2.07-ui-screen-backlog/43-siege-combat-screen.md`
Same pattern. Add a dependency on the new `phase-2.01-spells-artifacts.13-siege-state-machine` and `…14-fire-catapult-command`. Without these, siege controls render disabled with localized "not yet implemented" reasons; that is acceptable for an early pass but not for a final shipping screen.

### Rewrite D — `phase-2.07-ui-screen-backlog/51-split-stack-dialog-screen.md`
Add dependency on the new `mvp.05-adventure-map.17-split-army-stack-command`.

### Rewrite E — Add a sub-acceptance to every UI screen task
Today the acceptance criterion "every interaction token is resolved" passes by routing un-implemented engine tokens to disabled controls. Strengthen to:

```
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render disabled
  with a localized reason that cites the planned task id.
```

This single change converts the currently-permissive coverage check into a forward-progress signal: UI tasks become re-runnable when their engine deps land.

---

## 6. Registry Issues

`tasks/task-registry.json` — generation runs on every `validate` sweep. No issues found. Live counts:

- 23 modules
- 262 tasks
- 0 dependency cycles
- 0 unresolved task ids
- All 65 screen packages owned
- All 33 schemas referenced

The macro form `module:<id>` resolves to the union of that module's task ids in `scripts/tasks.mjs:51`. There are 39 such macro deps in the registry; all resolve to known modules.

**Minor parser improvement opportunity:** `parseDependencies` accepts the literal `None` and silently skips it (correct), but does not warn when a task has neither `None` nor any concrete dep. Today no task is in that state. Consider adding `lint` rule "task must declare at least `Dependencies: None`" to keep the contract crisp.

---

## 7. Execution Risks

### Where AI will fail
- **R1 (high):** An AI agent picks up `phase-2.07-ui-screen-backlog/45-tactics-phase-screen.md`, reads the `interactions.md` package, sees `PLACE_TACTICS_STACK`, and cannot dispatch it because no reducer exists. The agent will either (a) silently fall through to the stub branch, (b) invent a reducer in a place it does not own, or (c) get stuck. All three are bad outcomes. **Mitigation:** add the engine task and re-run.
- **R2 (medium):** `mvp.05-adventure-map.06-auto-resolve-combat` produces a function but not a command. An agent implementing the smoke-test (`08`) cannot wire combat without making an architecture decision. **Mitigation:** Rewrite A.
- **R3 (low):** `mvp.05-adventure-map.05-town-visit-recruit-build-mage-guild` bundles three concerns (visit, recruit, build, plus mage-guild). It is 4h, but the scope is wide. If the agent misorders, it can break the smoke test. **Mitigation:** consider splitting into `05a-town-visit`, `05b-build-building`, `05c-recruit-units`, `05d-mage-guild-day-one-spells`.
- **R4 (low):** Some `Read First:` lists send the agent to large screen packages (`mockup.html` for layout). The mockup files are HTML + CSS; an agent without browser rendering must read style and infer pixel layout from CSS. This is workable but verbose. **Mitigation:** Each screen package's `spec.md` should be the *primary* contract; treat `mockup.html` as a tie-breaker rather than a source of truth.

### Where human input is needed
- Any `🧠` task (judgement-heavy): balance values (Emberwild ruleset, baseline skill pack, action scorer weights). These are explicitly marked in module index files; no rewrite needed but human review on first PR is required.
- Baseline-corridor fidelity calls — e.g. exact morale curves, exact luck probabilities, exact stack-merging UX — require a human reference call.

---

## 8. Fix Plan

Concrete, ordered, executable today:

### Add (highest priority — unblocks UI in phase-2)

1. **Add** `tasks/mvp/05-adventure-map/17-split-army-stack-command.md` — engine reducer for `SPLIT_ARMY_STACK`.
2. **Add** `tasks/mvp/05-adventure-map/18-transfer-stack-commands.md` — three reducers grouped (`TRANSFER_HERO_ARMY_STACK`, `TRANSFER_TOWN_ARMY_STACK`, `TRANSFER_GARRISON_STACK`).
3. **Add** `tasks/mvp/05-adventure-map/19-transfer-hero-artifact-command.md` — `TRANSFER_HERO_ARTIFACT` between two heroes on adjacent hexes.
4. **Add** `tasks/mvp/05-adventure-map/20-upgrade-army-stack-command.md` — `UPGRADE_ARMY_STACK` and `UPGRADE_ALL_ELIGIBLE_STACKS`.
5. **Add** `tasks/mvp/09-tactical-combat/12-tactics-phase-engine.md` — `PLACE_TACTICS_STACK`, `START_BATTLE_AFTER_TACTICS`.

### Rewrite (binding existing logic to commands)

6. **Rewrite** `mvp.05-adventure-map.06-auto-resolve-combat.md` per Rewrite A above to bind `AUTO_RESOLVE_BATTLE`.
7. **Rewrite** every UI screen task whose interaction set targets a previously-orphan command, adding the new engine-task id to its `Dependencies:`. Concretely: 22, 24, 32, 45, 49, 51, 52.

### Add (phase-2)

8. **Add** `tasks/phase-2/01-spells-artifacts/13-siege-state-machine.md`.
9. **Add** `tasks/phase-2/01-spells-artifacts/14-fire-catapult-command.md`.
10. **Add** `tasks/phase-2/01-spells-artifacts/15-combine-artifacts-command.md`.
11. **Add** `tasks/phase-2/01-spells-artifacts/16-hero-specialty-applier.md`.

### Strengthen lint

12. **Extend** `scripts/check-command-coverage.mjs` with a new pass: every `command.schema.json` `kind` enum value must have at least one task whose body literal-matches the command name. Today only the screen→schema direction is checked; this audit found 11+ commands without an owning engine task because the inverse direction is unchecked.
13. **Extend** `scripts/tasks.mjs lint` with a "no orphan command" rule that emits the gap list above and is wired into `npm run validate`.

### Split (optional, only if the smoke test misbehaves)

14. **Split** `mvp.05-adventure-map.05-town-visit-recruit-build-mage-guild.md` into `05a-town-visit-events`, `05b-build-building-command`, `05c-recruit-units-command`, `05d-mage-guild-day-one-spells`. Each comes in at 1.5–2 h.

### Reorder

15. None required. The MVP critical chain (engine → schemas → asset pipeline → faction → map → adventure → renderer → UI shell → persistence → tactical combat → heuristic AI) is internally consistent and matches `docs/architecture/overview.md` build order.

After steps 1–7, re-run:

```
npm run validate
npm run tasks:next:mvp
```

The first command should still pass; the second should report 1 ready (still `mvp.01-engine-core.01`), with the new tasks queued behind the existing chain. After step 12, expect the new lint to flag the schema↔task gap as a hard error; once steps 1–6 land, that error must clear.

---

## 9. AI-Execution Smoke Sample

Simulating a fresh agent picking up `mvp.05-adventure-map.03-hero-movement.md`:

| Question | Answer in the task file? |
|---|---|
| What do I produce? | Yes — `src/engine/commands/move-hero.ts` |
| What is the input shape? | Yes — `{ heroId: string, path: HexCoord[] }` |
| What state am I mutating? | Yes — `AdventureState` (depends on `mvp.05-adventure-map.01`) |
| What is the validation contract? | Yes — five validations enumerated |
| What edge cases must I handle? | Yes — 0 MP, impassable, ZoC |
| What integer-cost factor? | Yes — `× 100`, baseline ruleset constants |
| Where is the worked example? | Yes — full `MOVE_HERO` round-trip, before/after state, fog-of-war notes |
| What is the verify command? | Yes — `npm run validate && npm test` |
| Who depends on me? | Implicit — all `screen 07-adventure-map` UI tasks |

**Verdict:** This task is AI-executable with no extra context. It is the gold standard the rest of the backlog should match.

Counter-example — `phase-2.07-ui-screen-backlog/45-tactics-phase-screen.md` (illustrative):
- Outputs ✓, Inputs ✓, Acceptance ✓
- BUT: depends on `mvp.09-tactical-combat.11-combat-hud-overlay`, dispatches `PLACE_TACTICS_STACK`, `START_BATTLE_AFTER_TACTICS` — neither has an engine task. The agent will discover this only at `npm run validate` time, after writing UI code that cannot work.

---

## 10. Final Goal Check

| Goal | Today | After fix plan |
|---|:---:|:---:|
| Every task is executable by AI | mostly — 11 UI tasks block on missing engine deps | yes |
| Tasks align with UI + schema + architecture | yes | yes |
| Backlog covers baseline-corridor mechanics | partial — siege, tactics, stack management gaps | yes |
| Registry supports automated execution | yes | yes |
| Generated report exists | yes (`docs/planning/task-system-report.md`) | yes |

**Recommendation:** treat steps 1–7 of the fix plan as MVP-blocking. The current 8.2/10 score becomes ~9.5/10 once the engine-reducer gap is closed and the schema↔task lint inversion is added.

---

## Appendix A — Command-Schema vs Engine-Task Coverage Matrix

49 commands declared in `content-schema/schemas/command.schema.json`:

```
ACCEPT_BATTLE_SURRENDER         mvp.09-tactical-combat.13-retreat-and-surrender-commands
ACKNOWLEDGE_CALENDAR_ANNOUNCEMENT  mvp.05-adventure-map.15-acknowledge-week-month-event-command
ASSIGN_SKILL                    phase-2.01-spells-artifacts.01a-hero-skill-assignment
AUTO_RESOLVE_BATTLE             implicit only — see Rewrite A          ⚠
BATTLE_ATTACK                   mvp.09-tactical-combat.* (combat module)
BATTLE_DEFEND                   mvp.09-tactical-combat.02a-defend-damage-reduction
BATTLE_MOVE                     mvp.09-tactical-combat.* (combat module)
BATTLE_RESOLVED                 emitted by tactical-combat module
BATTLE_WAIT                     mvp.09-tactical-combat.02-initiative-queue…
BUILD_BOAT                      phase-2.05-mod-system.06-build-boat-command-and-shipyard
BUILD_BUILDING                  mvp.05-adventure-map.05-town-visit-recruit-build-mage-guild
BUILD_GRAIL_STRUCTURE           phase-2.05-mod-system.07-build-grail-structure-command
BUY_ARTIFACT                    phase-2.01-spells-artifacts.10-buy-artifact-command
BUY_WAR_MACHINE                 phase-2.01-spells-artifacts.11-buy-war-machine-command
CAPTURE_MINE                    mvp.05-adventure-map.04-resource-mine-capture-plus-daily-income
COLLECT_CREATURE_BANK_REWARD    mvp.05-adventure-map.14-collect-creature-bank-reward-command
COMBINE_ARTIFACTS               partial only — see Fix Plan #10        ⚠
END_DAY                         mvp.05-adventure-map.02-turn-structure
END_HERO_TURN                   mvp.05-adventure-map.02-turn-structure
EQUIP_HERO_ARTIFACT             mvp.05-adventure-map.16-equip-unequip-artifact-commands
FIRE_CATAPULT                   missing — see Fix Plan #9              ⚠
GENERATE_RANDOM_MAP             mvp.03-map-system.09-random-map-generator-deterministic-runner
HIRE_TAVERN_HERO                mvp.05-adventure-map.11-hire-tavern-hero-command
INITIATE_BATTLE                 mvp.09-tactical-combat.01-battlestate-init…
LEARN_SPELL                     phase-2.01-spells-artifacts.04b-mage-guild-content…
LEARN_UNIVERSITY_SKILL          phase-2.01-spells-artifacts.12-learn-university-skill-command
LEVEL_UP                        phase-2.01-spells-artifacts.09-leveling-up-hero…
MOVE_HERO                       mvp.05-adventure-map.03-hero-movement
PLACE_TACTICS_STACK             missing — see Fix Plan #5              ⚠
RECRUIT_EXTERNAL_DWELLING_UNITS mvp.05-adventure-map.13-recruit-external-dwelling-command
RECRUIT_UNITS                   mvp.05-adventure-map.05-town-visit-recruit-build-mage-guild
RELEASE_PRISON_HERO             mvp.05-adventure-map.12-release-prison-hero-command
RETREAT_BEFORE_BATTLE           mvp.09-tactical-combat.13-retreat-and-surrender-commands
ROLL_RMG_SEED                   mvp.03-map-system.09-random-map-generator-deterministic-runner
SCENARIO_LOAD                   mvp.08-persistence.04-scenario-loader
SELL_ARTIFACT                   phase-2.01-spells-artifacts.10-buy-artifact-command (paired)
SPELL_CAST                      phase-2.01-spells-artifacts.02-combat-spells / 03-adventure-map-spells
SPLIT_ARMY_STACK                missing — see Fix Plan #1              ⚠
START_BATTLE_AFTER_TACTICS      missing — see Fix Plan #5              ⚠
TRADE_ARTIFACT                  mvp.05-adventure-map.16-equip-unequip-artifact-commands (partial)
TRADE_RESOURCES                 mvp.05-adventure-map.10-trade-resources-command
TRANSFER_GARRISON_STACK         missing — see Fix Plan #2              ⚠
TRANSFER_HERO_ARMY_STACK        missing — see Fix Plan #2              ⚠
TRANSFER_HERO_ARTIFACT          missing — see Fix Plan #3              ⚠
TRANSFER_TOWN_ARMY_STACK        missing — see Fix Plan #2              ⚠
UNEQUIP_HERO_ARTIFACT           mvp.05-adventure-map.16-equip-unequip-artifact-commands
UPGRADE_ALL_ELIGIBLE_STACKS     missing — see Fix Plan #4              ⚠
UPGRADE_ARMY_STACK              missing — see Fix Plan #4              ⚠
VISIT_MAP_OBJECT                mvp.05-adventure-map.09-map-object-dialogs
```

**12 commands lack an explicit engine task.** This is the canonical fix list and the basis of §C1.

---

## Appendix B — Inventory snapshot

- Tasks: 262
- Modules: 23
- Screen packages: 65 (all owned)
- JSON schemas: 33 (all referenced)
- Architecture docs read-by-tasks: 14 of 14
- `npm run validate` exit: 0
- `npm run validate:tasks` exit: 0
- `npm run tasks:next:mvp` ready set size: 1
