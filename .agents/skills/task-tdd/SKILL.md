---
name: task-tdd
description: Use this skill when implementing or refactoring a task in the Heroes Reforged repo. It enforces a real test-driven-development cycle (red → green → refactor) and hands off to the mutation-test skill once the cycle completes. The mutation-test skill hands back here whenever a surviving mutant requires a code refactor instead of a test addition.
---

# Task TDD

Use this skill for any task in `tasks/` that has source-code `ownedPaths`
(under `src/` or `services/`). It is the IMPLEMENTATION half of the
`tasks:done` gate; the [`mutation-test`](../mutation-test/SKILL.md)
skill is the VERIFICATION half. The two skills hand off to each other
in a tight loop until the gate passes.

Use this skill for:
- starting a new task and writing the first failing test
- adding the next behavior to an in-progress task
- responding to a mutation-test hand-back ("the surviving mutant needs a
  refactor, not a new assertion")
- refactoring code while keeping all tests green

Do **not** use this skill for:
- pure documentation edits (no `src/`/`services/` paths in `ownedPaths`)
- the verification gate (mutation, coverage); use
  [`mutation-test`](../mutation-test/SKILL.md) instead
- task-system surgery (registry generators, ledger writers); those have
  their own scripts and are restricted per [AGENTS.md](../../../AGENTS.md)

## The TDD Loop — execute in this order, do not skip

For each acceptance criterion in the task's `## Acceptance Criteria`:

1. **RED — write a failing test FIRST.**
   - Place it where the existing convention puts it
     ([`docs/architecture/testing-conventions.md`](../../../docs/architecture/testing-conventions.md)):
     unit tests under `src/**/__tests__/`, named `*.test.ts` or `*.spec.ts`.
   - The test must encode ONE specific behavior from the spec, with
     concrete inputs and concrete expected outputs. No `toBeDefined()`,
     no `not.toThrow()`, no snapshot-only assertions — those are
     anti-cheat-rule-G violations and the mutation gate will catch them.
   - Run the relevant test command. **Confirm the test fails for the
     right reason** (the assertion fails, not a syntax error / missing
     import / wrong file path). A test that fails for the wrong reason
     is not a red phase — it is broken scaffolding.

2. **GREEN — write the minimum code to make the test pass.**
   - Stay inside the task's `Owned Paths`. Treat
     `Owned Paths (shared)` as additive-only extension points
     (per [AGENTS.md](../../../AGENTS.md) Workflow).
   - Stay inside the correct repo boundary (see § Repository Boundaries).
   - Resist the urge to add unrequested helpers, abstractions, or
     defensive branches. Code without a test that requires it has zero
     mutation score and will block the gate.
   - Run the test. Confirm it passes AND no previously-green test broke.

3. **REFACTOR — clean up while staying green.**
   - Rename, extract, inline, and de-duplicate freely — but only after
     the test is green and only as long as it stays green.
   - Refactoring is the right time to enforce the patterns in
     § Patterns To Prefer / Avoid below. Do not refactor in the GREEN
     step; mixing the two makes a failing test ambiguous.
   - Run the test again. If it goes red, your refactor was a behavior
     change, not a refactor — undo and try a smaller step.

4. **Loop back to RED for the next acceptance criterion.**

When all acceptance criteria are covered AND all tests are green, you
have finished the TDD half. **Hand off to [`mutation-test`](../mutation-test/SKILL.md).**

## Handoff to `mutation-test`

Once the TDD loop is complete for every acceptance criterion:

1. Confirm `npm test -- <ownedPaths>` is fully green.
2. Switch to the mutation-test skill and run its loop (mutate →
   read report → kill survivors by ADDING assertions → re-run).
3. The mutation-test skill knows the anti-cheat rules (no source
   deletion, no assertion weakening, no `// Stryker disable` without an
   equivalence proof). Trust its rules; do not pre-empt them here.

## Receiving a hand-back from `mutation-test`

The mutation-test skill MUST hand back to this skill (task-tdd) when a
surviving mutant cannot be killed by adding a test assertion alone. The
common shapes:

- **Dead branch.** A mutant on a line that no test can reach because
  the branch is structurally unreachable. Either the branch is genuine
  dead code (delete it — but ONLY here in a refactor, NOT in
  mutation-test) or there is a missing input that should reach it
  (write a new failing test in RED, then make it pass in GREEN).

- **Behavior split.** A mutant survives because two distinct behaviors
  share one code path that should be split into two paths. Refactor
  the code to express the two behaviors separately, then assert each.

- **Unreachable defensive guard.** An invariant guard that no caller
  can violate. Either the guard is genuine documentation of a
  precondition (write an `// stryker-equivalent: ...` proof per the
  mutation skill rule C, AND keep the guard) or the guard is dead and
  should be removed via a refactor cycle.

In each case, the FIX path is:

1. Switch to this skill (task-tdd).
2. If new behavior is needed: write a failing test (RED), implement
   (GREEN), refactor.
3. If refactor-only is needed: keep all tests green; restructure the
   code so the dead branch / unsplit behavior / dead guard is gone.
4. Switch back to mutation-test and re-run. The previously surviving
   mutant should now be killed (or formally proved equivalent).

A mutant that "cannot be killed by adding tests" but that the refactor
also cannot eliminate is — in almost every case — actually a missing
test, NOT a real equivalent. Bias toward writing the test. Only declare
equivalence after both task-tdd and mutation-test have looked at it.

## Final step

When the mutation-test skill confirms the score floor is met for the
task's module class AND coverage has not regressed:

```
npm run tasks:done -- <task-id>
```

`tasks:done` re-runs the task's `verifyCommands`. The chain for code-
path tasks is **structural pre-checks first, then the mutation gate**:

1. `npm run validate` (the repo aggregate)
2. `npm test`
3. `validate:duplication`, `validate:smells`, `validate:dead-code` —
   structural pre-checks. Failures route to the
   [`structural-checks`](../structural-checks/SKILL.md) skill, which
   owns the right-fix shape per category and the anti-cheat rules
   that prevent agents from gaming the gate by deletion or rule
   suppression.
4. `validate:mutation-score`, `validate:coverage-floor` — the
   behavior gate this skill hands off to.

The status flip to `done` only happens if every command exits 0. Do
not hand-edit [`tasks/task-status.json`](../../../tasks/task-status.json)
to skip this gate — the file is restricted (see
[AGENTS.md](../../../AGENTS.md)).

## Picking the right task

The repo has a task navigator. Use it instead of scanning `tasks/` by hand.

- `npm run tasks:pick` — the **single recommended next task** with an
  explicit action label (`continue` / `revalidate` / `implement`) on
  stderr. Best entry point for sequential work.
- `npm run tasks:next` — full ready queue (planned tasks whose
  dependencies are satisfied — `done` or `revalidate` — plus any
  in-progress task). Useful for parallel agent dispatch with
  `--phase=mvp --hot --json`.
- `npm run tasks:show -- <id>` — full record for one task.
- `npm run tasks:start -- <id>` — mark in-progress (writes the ledger).
- `npm run tasks:revalidate -- <id>` — promote a `revalidate`-status
  task (work was completed pre-gate) to a real `done`.
- `npm run tasks:status` — overall and per-module progress.
- `npm run validate:tasks` — task-system invariants
  (dependency cycles, missing screens, etc.).

Task IDs look like `mvp.01-engine-core.03-implement-pcg32-prng-…`. The
`--` before the id is required so npm forwards it to the script.

## Repository Boundaries

A task's `Owned Paths` always live inside ONE of these layers. If you
need to cross a boundary, stop and make the dependency explicit (a
shared interface, a contract type in `src/contracts/`, or a separate
task in the right module).

- `content-schema/` — canonical JSON schemas + canonical examples
- `src/engine/` — deterministic gameplay state, commands, reducers, replay
- `src/rules/` — formula and ruleset evaluation
- `src/content-schema/` — runtime validation, migrations, compatibility
- `src/content-runtime/` — manifest loading, dependencies, overrides,
  asset indirection, registry assembly
- `src/renderer/` — rendering, animation playback, asset consumption
- `src/ui/` — app shell and gameplay UI
- `src/editor/` — creator tooling
- `src/ai/` — bots, balancing, AI generation flows
- `src/net/` — multiplayer and sync
- `src/persistence/` — saves, replays, scenarios
- `services/` — backend adapters (signaling, AI gateway)
- `resources/` — authored packs and assets

## Non-Negotiables

These are repo-wide invariants the TDD cycle must not break. Violating
any of them is a hard failure (the validate gate or mutation gate will
reject the change):

- engine code is pure; rules are data
- deterministic paths must not use `Math.random()`, wall-clock time, or
  uncontrolled floating-point behavior
- gameplay records use IDs, never raw asset paths
- packs are the extension boundary
- stable IDs are public API
- missing visuals may fall back; missing gameplay requirements must
  fail loudly
- every persisted field is registered in
  [`docs/architecture/data-inventory.md`](../../../docs/architecture/data-inventory.md)

## Patterns To Prefer

- composition over inheritance
- discriminated unions using `type` or `kind`
- arrays of declarative effects
- shallow named objects (`presentation`, `economy`, `targeting`)
- registries and lookup tables instead of hardcoded branches
- pure functions in deterministic code
- additive-first schema evolution
- aliases or migrations for renamed IDs

## Patterns To Avoid

- hardcoded first-party factions, creatures, or assets in engine code
- raw file paths in gameplay records
- deep inheritance trees
- hidden fallback behavior
- broad god-objects mixing sim, UI, content loading, and rendering
- changing old field meaning when a new field or effect kind would work

## Anti-Cheat Reminders (full list lives in `mutation-test/SKILL.md`)

This skill cannot weaken the gate. The mutation skill enforces:

- **A.** Never delete source lines to kill a mutant.
- **B.** Never weaken existing assertions.
- **C.** Never add `// Stryker disable` without an equivalence proof.
- **D.** Never edit `stryker.conf.*` to lower the threshold.
- **E.** Never edit another task's `ownedPaths` to fix a mutant.
- **F.** No coverage drops on `ownedPaths`.
- **G.** No tautological tests.
- **H.** Tests live where the existing convention puts them.

Read the full text in [`mutation-test/SKILL.md`](../mutation-test/SKILL.md)
before claiming any mutant is equivalent.

## Quick checklist before handing off to `mutation-test`

- [ ] Every acceptance criterion has at least one test
- [ ] Each test asserts a concrete value, not just truthiness
- [ ] All tests pass via `npm test -- <ownedPaths>` (or the relevant scoped command)
- [ ] No edits outside `Owned Paths` (or additive-only inside `Owned Paths (shared)`)
- [ ] No deterministic-path violations (no `Math.random`, no `Date.now`, etc.)
- [ ] Refactor done before handoff (no half-finished cleanup)
