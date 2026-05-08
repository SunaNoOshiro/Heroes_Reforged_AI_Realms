---
name: mutation-test
description: Use this skill before marking any task done, when running tasks:done, when the user asks to verify a task, or when "mutation test", "kill mutants", "mutation score", or "Stryker" is mentioned. The skill enforces the mutation-score gate for tasks:done and the anti-cheat rules that prevent agents from gaming the gate.
---

# Mutation Test Gate

This skill is the VERIFICATION half of the `tasks:done` gate. The
[`task-tdd`](../task-tdd/SKILL.md) skill is the IMPLEMENTATION half:
it owns the red → green → refactor cycle. This skill receives a task
when its TDD cycle is complete and hands it off to `npm run tasks:done`
once the mutation-score floor is met.

When a surviving mutant cannot be killed by adding a test assertion
alone — i.e. the cure is a refactor of the source code — this skill
**hands the task BACK to [`task-tdd`](../task-tdd/SKILL.md)** rather
than weakening tests, deleting source from inside this skill, or
declaring a false equivalent. See § Hand-back to `task-tdd` below.

Use this skill for:
- finishing implementation work on a task
- responding to "is this task ready?"
- responding to "kill the surviving mutants"
- adding the mutation step to a task's `verifyCommands`

Do **not** use this skill for:
- writing the original tests (that is `task-tdd`'s RED step)
- code refactors that change shape, not just behavior preservation
  (hand back to `task-tdd`)
- unrelated lint/coverage questions
- full-repo CI mutation runs (owned by CI, not this gate)

## The Loop — execute in this order, do not skip

1. **Run unit tests scoped to the task's `ownedPaths`.**
   `npm test -- <ownedPaths>`
   If unit tests are red, fix code or tests first. Mutation testing on red unit tests is meaningless and wastes loops.

2. **Run mutation tests scoped to the task's `ownedPaths`.**
   `npm run test:mutation -- --mutate '<ownedPaths-glob>'`
   After the first run, add `--incremental` so only changed files re-mutate.

3. **Read the Stryker report.**
   HTML at `reports/mutation/mutation.html`, JSON at `reports/mutation/mutation.json`.
   For every surviving mutant, record: file, line, mutator kind, and the diff Stryker shows.

4. **Kill each surviving mutant by ADDING TEST ASSERTIONS,** OR hand
   the task back to [`task-tdd`](../task-tdd/SKILL.md) when the cure
   is a code refactor (dead branch, behavior split, dead defensive
   guard — see § Hand-back to `task-tdd` below). NEVER kill mutants by
   deleting source, softening assertions, or adding `// Stryker disable`
   lines. See § Anti-Cheat below.

5. **Re-run mutation tests.** Go to step 3.
   Stop when mutation score ≥ threshold for the task's module class:
   - `src/engine/`, `src/rules/`, `src/content-schema/`, `src/content-runtime/`: **80%**
   - `src/contracts/`, `services/`: **75%**
   - `src/ui/`, `src/renderer/`: **65%** (mutation score is noisier on presentation code)

6. **Only then run** `npm run tasks:done -- <task-id>`.
   The task's `verifyCommands` must include the mutation gate (see § Wiring below). `tasks:done` runs them in order; any failure aborts the status flip.

## Anti-Cheat Rules — hard prohibitions

These exist because every weak fix the agent finds first is also the cheapest way to fake a passing gate. Treat them as failures, not warnings.

**A. Never delete source lines to kill a mutant.**
If line X has a surviving mutant, the only allowed fix is a test that pins line X's behavior. Removing X removes the mutant by removing the code, not by proving correctness.

**B. Never weaken existing assertions.**
`expect(x).toBe(42)` may not be replaced with `expect(x).toBeDefined()`, `expect(x).toBeTruthy()`, or `expect(x).not.toThrow()` to make a mutant unreachable. If you find yourself softening an assertion, stop — you have the wrong fix.

**C. Never add `// Stryker disable` without an equivalence proof.**
A disable comment is only legal when the mutant is *behaviorally equivalent* to the original. The justification must explain *why the two programs are indistinguishable*, not why writing a test is hard. See § Equivalent Mutants below for the exact format.

**D. Never edit `stryker.conf.*` to lower the threshold or exclude `ownedPaths` files.**
The Stryker config is repo-owned, not task-owned. It does not appear in any task's `ownedPaths`. Threshold changes go through a separate PR with human review.

**E. Never edit another task's `ownedPaths` to fix a mutant.**
If a surviving mutant lives in a file outside this task's `ownedPaths`, surface it in the task notes — do not edit. Per [CLAUDE.md](../../../CLAUDE.md), `Owned Paths` and `Dependencies` are separate contracts.

**F. No coverage drops on `ownedPaths`.**
Line and branch coverage on `ownedPaths` files must not regress vs. the previous commit on the same branch. This catches "delete the line, kill the mutant" and "rewrite to a smaller surface, lose tests."

**G. No tautological tests.**
A test that calls a function without asserting on its meaningful output is forbidden. Stryker catches most of these (they kill ≈zero mutants), but flag any test whose only assertions are `toBeDefined`, `not.toThrow`, `toHaveBeenCalled` without arg matchers, or snapshot-only on the function's own output.

**H. Tests must live where the existing convention puts them.**
Per [`docs/architecture/testing-conventions.md`](../../../docs/architecture/testing-conventions.md): unit tests under `src/**/__tests__/`. Do not invent a parallel test directory to satisfy the gate.

## What "kill the mutant" looks like

Surviving mutant: in `src/rules/combat.ts`, `return atk - def` mutated to `return atk + def`. No test failed.

Wrong fix — delete the function:
> removes the mutant by removing the code; loses behavior; **rule A violated**.

Wrong fix — weaken the assertion:
> `expect(damage(5, 2)).toBeDefined()` still passes for both versions; **rule B violated**.

Wrong fix — disable Stryker on the line:
> `// Stryker disable next-line ArithmeticOperator -- "trust me"`; not an equivalence proof; **rule C violated**.

Right fix — pin the behavior:
> `expect(damage(5, 2)).toBe(3)` and `expect(damage(2, 5)).toBe(-3)` and `expect(damage(0, 0)).toBe(0)`. The mutant `atk + def` would now produce `7`, `7`, `0` — at least one assertion fails, mutant killed.

## Equivalent Mutants — when the mutant truly cannot be killed

Some mutants are behaviorally identical to the original (e.g. `i < n` vs `i <= n - 1` over an integer index, or a defensive branch that's mathematically unreachable). The process:

1. Above the mutator location, write:
   `// stryker-equivalent: <one-line proof of indistinguishability>`
2. Directly below, write:
   `// Stryker disable next-line <mutator-name> -- equivalent, see proof above`
3. The reviewer (or a second agent doing PR review) verifies the proof.
4. If the proof is wrong, that's a bug — kill the mutant the normal way (rule C).

A proof that says "this is fine," "trust me," "hard to test," "edge case," or "not worth it" is not a proof. The skill rejects it and the gate fails.

## Hand-back to `task-tdd` (refactor required)

Some surviving mutants cannot be killed by adding a test assertion
alone — the cure is to restructure the source code, not to write a new
test. **Source restructuring is NOT this skill's job.** This skill
covers test additions only; restructuring lives in the
[`task-tdd`](../task-tdd/SKILL.md) skill (its REFACTOR step, with the
test scaffolding to keep the change behavior-preserving).

Hand the task back when you see one of these patterns in the report:

- **Dead branch.** A mutant on a line that no test reaches because the
  branch is structurally unreachable. Either it's dead code (must be
  removed in a refactor cycle) or there's a missing input that should
  reach it (must be added via RED → GREEN). Either way, switch to
  `task-tdd`.

- **Behavior split.** A mutant survives because two distinct behaviors
  share one code path that should be split. The fix is a refactor that
  expresses the two behaviors separately, then this skill resumes and
  asserts each.

- **Unreachable defensive guard.** A precondition guard that no caller
  can violate. Either keep the guard with a `// stryker-equivalent: ...`
  proof per rule C below, or remove it via a refactor cycle in
  `task-tdd`.

The hand-back is NOT a license to skip rules A–H. The implementer
returns here AFTER the refactor (or refactor + new tests) so this
skill can re-run mutation and confirm the previously-surviving mutant
is now killed (or formally proved equivalent).

A mutant that "cannot be killed by adding tests" but that the refactor
also cannot eliminate is — in almost every case — actually a missing
test, not a real equivalent. Bias toward writing the test before
declaring equivalence.

## Wiring into `tasks:done`

A task that opts into this gate declares in its task spec under `## Verify`:

```
verifyCommands:
  - npm test -- <ownedPaths>
  - npm run test:mutation -- --mutate '<ownedPaths-glob>' --incremental
  - npm run validate:mutation-score -- --task <task-id>
  - npm run validate:coverage-floor -- --task <task-id>
```

The two `validate:*` scripts are anti-cheat checks:
- `validate:mutation-score` reads `reports/mutation/mutation.json`, confirms score ≥ threshold for the task's module class, and confirms every `ownedPaths` file appears in the report (no silent excludes).
- `validate:coverage-floor` compares line/branch coverage on `ownedPaths` against the parent commit and fails on any regression.

`tasks:done` runs `verifyCommands` in order; the first failure aborts. Per [CLAUDE.md](../../../CLAUDE.md), do not hand-edit `Status:` to skip this gate.

## What this skill does NOT do

- It does not run mutation tests on files outside the task's `ownedPaths`. Full-repo mutation belongs in CI on the merged branch.
- It does not regenerate snapshots, contracts, or registries. Those have their own gates per [CLAUDE.md](../../../CLAUDE.md) (enum-snapshot, contracts-ts, task-registry).
- It does not replace code review. A high mutation score means tests pin current behavior, not that the behavior is correct.
- It does not target 100%. Chasing equivalent mutants pushes the agent toward garbage tests; thresholds above are the contract.

## Quick checklist before running `tasks:done`

- [ ] Unit tests green on `ownedPaths`
- [ ] Mutation report read, every surviving mutant addressed
- [ ] Each "kill" is a new/strengthened assertion, not a deletion or softening
- [ ] No `// Stryker disable` without an equivalence proof
- [ ] `stryker.conf.*` untouched
- [ ] No edits outside this task's `ownedPaths`
- [ ] Coverage on `ownedPaths` did not regress
- [ ] `validate:mutation-score` and `validate:coverage-floor` both pass
