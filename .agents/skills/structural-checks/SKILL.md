---
name: structural-checks
description: Use this skill when running, debugging, or fixing failures from `validate:duplication`, `validate:smells`, or `validate:dead-code` (the three structural pre-checks that gate `tasks:done` BEFORE the mutation gate). The skill enforces the right-fix shape per category and the anti-cheat rules that prevent agents from gaming the gate by deletion, suppression, or threshold-lowering. Trigger phrases include "duplication detected", "code smell", "knip", "dead code", "unused file", "unused export", "eslint-disable", "cognitive complexity", "no-identical-functions", "no-duplicate-string", "egregious clone".
---

# Structural Checks Gate

This skill is the FIX-SIDE counterpart of the three structural
pre-checks wired into `tasks:done` and `npm run validate`:

- `validate:duplication` — jscpd, fails on >1.5 % project duplication
  or any single clone ≥200 tokens.
- `validate:smells` — ESLint with sonarjs + unicorn rules.
- `validate:dead-code` — knip, fails on unused files, exports, deps.

The mutation-test skill ([`../mutation-test/SKILL.md`](../mutation-test/SKILL.md))
is the BEHAVIOR gate that runs AFTER these. The two skills share the
same anti-cheat philosophy: a violation is killed by changing the
*code shape*, not by hiding the violation from the gate.

Use this skill when:
- a `tasks:done` run fails on one of the three structural gates
- a CI run on `npm run validate` reports duplication/smells/dead-code
- a teammate or the user asks "how do I fix this jscpd / eslint /
  knip warning"

Do **not** use this skill for:
- the mutation gate (use `mutation-test`)
- one-off code style preferences not enforced by the gate
- adding new rules to the eslint config (that's an architecture
  amendment, not a fix)

---

## § Duplication — `validate:duplication`

### What it flags

Any clone group with ≥60 tokens spanning ≥8 lines, in `src/` or
`services/`. Tests, fixtures, generated `src/contracts/`, and the
migration template are excluded.

The gate fails when:
1. Project-wide duplication ratio > 1.5 %, OR
2. Any single clone group is ≥200 tokens (≈20–30 lines of typical TS).

### Right fix

Extract the duplicated body into a shared helper. Both call sites
import it. Pick the home that fits the existing surface:

| Both clones in… | Helper home |
|---|---|
| same `src/<module>/` | `src/<module>/util.ts` or a sibling file |
| different modules | `src/shared/<topic>.ts` |
| engine + rules | `src/rules/` (rules depends on engine, not vice versa) |
| UI presenter logic | `src/ui/<screen>/<topic>.ts` |

Keep the helper's signature as close to either call site's needs as
possible. Don't introduce options/strategy patterns until a third
caller exists.

### Wrong fixes — hard prohibitions

**A. Never delete one of the clones to pass the gate.**
Two clones means *two real call sites*. Deleting one removes
behavior. If a clone genuinely shouldn't exist (e.g. a left-over
draft), that's a separate change with its own justification — and a
mutation-score regression test.

**B. Never rename variables, reorder lines, or split a function to
defeat the token matcher.**
The matcher is intentionally lossy on names and whitespace. If your
fix needs you to *make the code less identical*, you've found the
wrong fix. The semantics still duplicate.

**C. Never lower `minTokens`, `minLines`, or `threshold` in `.jscpd.json`.**
Threshold changes are repo-owned, not task-owned. They go through a
separate PR with human review and a written rationale.

**D. Never add the offending file to `.jscpd.json#ignore` to silence
the gate.**
Ignore entries are for files where duplication is *expected by
design* (test fixtures, generated code, migration templates). They
are not an escape hatch for a real clone.

### Worked example

Surviving clone:

```ts
// src/engine/combat.ts
function applyDamage(target, amount) {
  const next = Math.max(0, target.hp - amount);
  log({ at: now(), target: target.id, before: target.hp, after: next });
  target.hp = next;
  return target;
}

// src/engine/regen.ts
function applyHeal(target, amount) {
  const next = Math.max(0, target.hp + amount);
  log({ at: now(), target: target.id, before: target.hp, after: next });
  target.hp = next;
  return target;
}
```

**Wrong fix** — delete `applyHeal`: kills the regen feature.
**Wrong fix** — rename inner var: same semantics, jscpd may still match, and now the code is less readable.
**Right fix** — extract the shared shape:

```ts
// src/engine/hp.ts
export function setHp(target: Unit, next: number): Unit {
  next = Math.max(0, next);
  log({ at: now(), target: target.id, before: target.hp, after: next });
  target.hp = next;
  return target;
}

// src/engine/combat.ts
import { setHp } from "./hp.ts";
function applyDamage(target, amount) { return setHp(target, target.hp - amount); }

// src/engine/regen.ts
import { setHp } from "./hp.ts";
function applyHeal(target, amount) { return setHp(target, target.hp + amount); }
```

---

## § Smells — `validate:smells`

### What it flags

ESLint with the rules defined in [`eslint.config.mjs`](../../../eslint.config.mjs).
Most relevant categories:

| Rule | What it catches | Right fix |
|---|---|---|
| `sonarjs/no-identical-functions` | Two functions with the same body | Extract a shared helper. |
| `sonarjs/no-duplicate-string` | A literal string used ≥5 times | Define `const NAME = "value"` and import. |
| `sonarjs/cognitive-complexity` | Function complexity > 15 | Extract sub-functions; replace nested branches with early returns or a lookup table. |
| `sonarjs/no-collapsible-if` | `if (a) { if (b) … }` | `if (a && b) …`. |
| `sonarjs/no-redundant-boolean` | `x === true`, `!!x` chain | Drop the redundant operator. |
| `sonarjs/no-useless-catch` | `catch (e) { throw e; }` | Remove the try/catch. |
| `sonarjs/prefer-immediate-return` | `let r = …; return r;` | `return …;`. |
| `unicorn/prefer-includes` | `arr.indexOf(x) !== -1` | `arr.includes(x)`. |
| `unicorn/prefer-array-some` | `arr.find(p) !== undefined` | `arr.some(p)`. |
| `unicorn/no-useless-undefined` | `() => undefined` | `() => {}`. |
| `unicorn/prefer-node-protocol` | `require("fs")` / `import "fs"` | `import "node:fs"`. |

### Right fix per rule shape

- **Identical functions** — extract a shared helper (same shape as duplication § above).
- **Duplicate string literals** — promote to a `const` at module top, or to a `src/<module>/constants.ts` if used across files.
- **Cognitive complexity** — name the sub-steps. A function called `applyTurn` doing 18 things splits into `applyTurn` + `resolveAttacks` + `tickEffects` + `commitEnergy`. Each is testable on its own.
- **Idiomatic API rules** (`prefer-includes`, `prefer-array-some`, etc.) — straightforward 1-for-1 replacement; behavior is identical.

### Wrong fixes — hard prohibitions

**A. Never add `// eslint-disable*` without a `-- reason: <text>` justification on the same line.**
A separate gate (`validate:suppression-audit`) fails on unjustified suppressions. The reason must explain *why this code is correct as-is*, not "trust me" or "hard to fix".
Allowed:
```ts
// eslint-disable-next-line sonarjs/cognitive-complexity -- reason: state machine, splitting hides intent
```
Not allowed:
```ts
// eslint-disable-next-line sonarjs/cognitive-complexity
```

**B. Never add a useless argument or rename a function to defeat `no-identical-functions`.**
If `f(x)` and `g(x)` have the same body, *they are the same function*. Adding `f(x, _ignored)` or renaming variables doesn't change that — it just hides it from the matcher.

**C. Never lower a threshold in `eslint.config.mjs` to make warnings disappear.**
The thresholds are repo-owned. A change requires a separate PR with a written rationale, not a drive-by tweak.

**D. Never disable a rule globally to silence one site.**
Per-file or per-line overrides with a `-- reason:` justification are allowed. Removing a rule from the shared rule set is an architecture change.

**E. Never fix `prefer-immediate-return` by deleting the function.**
The lint says "you wrote `let r = …; return r;`" — the fix is `return …;`, not removing the call.

### Worked example: cognitive-complexity

Surviving violation:

```ts
function processTurn(state) {        // complexity: 18
  if (state.phase === "move") {
    for (const unit of state.units) {
      if (unit.alive && unit.canMove) {
        if (unit.target) {
          // … 12 more nested branches
        }
      }
    }
  } else if (state.phase === "attack") {
    // …
  }
}
```

**Wrong fix** — `// eslint-disable-next-line sonarjs/cognitive-complexity` without a reason: rule A violated.
**Wrong fix** — split into `processTurn1`, `processTurn2`: arbitrary names, still incomprehensible.
**Right fix** — semantic split:

```ts
function processMovePhase(state) { for (const u of state.units) moveOne(state, u); }
function moveOne(state, unit)    { if (!unit.alive || !unit.canMove) return; … }
function processAttackPhase(state) { … }
function processTurn(state) {
  if (state.phase === "move")   return processMovePhase(state);
  if (state.phase === "attack") return processAttackPhase(state);
}
```

Now each sub-function is < 15 complexity AND independently testable.

---

## § Dead code — `validate:dead-code`

### What it flags

knip walks `entry` files, follows imports, and reports anything in
`project` that's never reached:

- **Unused files** — file in scope but no import path leads to it.
- **Unused exports** — symbol exported but never imported.
- **Unused dependencies** — package in `package.json` but not imported anywhere.
- **Unlisted dependencies** — imported from code but missing from `package.json`.

### Right fix per category

**Unused file** — two valid fixes:
1. **Wire it up** — add an import from a real consumer. If you're
   adding the file as part of the current task, the consumer should
   land in the same PR. Don't merge "scaffolding for next task".
2. **Delete it** — if the file genuinely isn't needed.
3. **Allow as scaffolding** (rare) — add the path to `knip.json#ignore`
   AND add a one-line reason to `knip.ignore-reasons.json`. The
   `validate:knip-ignores` gate fails when ignore entries lack a
   reasons-file entry. This is for "foundational module that the
   task system intentionally lays down before its consumer task".

**Unused export** — drop the `export` keyword if the symbol is
file-local, or delete it entirely if no one reads it. "Reserved for
the future" is not a fix; the future use can re-introduce the export.

**Unused dependency** — `npm uninstall <pkg>`. If the dep is invoked
via a CLI binary that knip can't trace (e.g. through `npx` in a
script), add to `knip.json#ignoreDependencies` with a one-line
comment in the same diff explaining the indirection.

**Unlisted dependency** — `npm install --save-exact <pkg>` (or
`--save-dev` if it's only used in scripts/tests). Commit the
`package-lock.json` change.

### Wrong fixes — hard prohibitions

**A. Never re-export a symbol from a barrel solely to silence knip.**
Re-exports without a real consumer just move the orphan one level up.

**B. Never add a fake test that imports the unused file just to mark
it reachable.**
A test whose only purpose is to import the file kills no mutants and
adds no value. Stryker will catch the tautology, but agents should
not write it in the first place.

**C. Never add a path to `knip.json#ignore` without a corresponding
entry in `knip.ignore-reasons.json`.**
A separate gate (`validate:knip-ignores`) fails on missing reasons.
The reason must say *why this orphan is allowed*, not "TODO" or
"placeholder".

**D. Never delete a file that another task or in-progress branch
depends on.**
If you don't recognize the file's purpose, surface it in the task
notes or ask. Deleting "I don't know what this does" is a regression
waiting to happen. `git log -- <file>` and the originating task ID
in the commit message are usually enough to find the owner.

**E. Never weaken the knip config to skip a category (`rules.files: off`,
`rules.exports: warn`).**
The categories are repo-owned. Tweaks require a separate PR with a
written rationale.

### Worked example: unused export

```
knip: src/engine/util.ts: clamp01, lerp, fract
```

**Wrong fix** — `export * from "./util.ts"` from a barrel: orphan moved.
**Wrong fix** — `it("util compiles", () => { expect(typeof clamp01).toBe("function"); });`: tautology, kills no mutants.
**Right fix A** — start using the symbols from the consumer that needs them in this PR.
**Right fix B** — drop the `export` keyword if the symbol is only used inside `util.ts`.
**Right fix C** — delete the symbol entirely if neither (A) nor (B) applies.

---

## Order of operations during `tasks:done`

```
npm run validate              ← repo-wide invariants (incl. suppression-audit
                                and knip-ignores anti-cheat gates)
npm test                      ← script-level unit tests
npm run validate:duplication  ← THIS skill, § duplication
npm run validate:smells       ← THIS skill, § smells
npm run validate:dead-code    ← THIS skill, § dead-code
npm run test:coverage
npm run test:mutation:changed
npm run validate:mutation-score   ← mutation-test skill
npm run validate:coverage-floor   ← mutation-test skill
```

`validate:suppression-audit` and `validate:knip-ignores` ride inside
`npm run validate` (the first command above). They fail the task
*before* the structural gates even run, so an agent can't bypass a
duplication/smell finding by reaching for a suppression — the
suppression itself is gated.

The structural gates run first because they are cheap and because a
smelly/duplicated/orphaned change should be reshaped *before* the
mutation gate spends Stryker time on it. A red structural gate aborts
the run; you do not progress to mutation until the shape is clean.

## What this skill does NOT do

- It does not run mutation tests (use `mutation-test`).
- It does not change rule sets, thresholds, or ignore lists. Those
  are repo-owned and require separate PRs.
- It does not catch *behavior* bugs. A function with low complexity
  and no clones can still be wrong; that's what the mutation gate is
  for.
- It does not replace code review.

## Quick checklist before re-running `tasks:done`

- [ ] Each duplication failure is fixed by a shared helper, not a deletion.
- [ ] Each smell failure is fixed by reshaping code, not suppressing the rule.
- [ ] Every `// eslint-disable*` has a `-- reason: <text>` justification.
- [ ] Each unused file is either wired in, deleted, or in `knip.ignore-reasons.json`.
- [ ] No threshold lowered in `.jscpd.json`, `eslint.config.mjs`, or `knip.json`.
- [ ] `validate:suppression-audit` and `validate:knip-ignores` pass.
