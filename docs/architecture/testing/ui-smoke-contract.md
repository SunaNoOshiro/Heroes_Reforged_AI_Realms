# UI Smoke Contract

Per-screen browser-side smoke contract every screen package must
satisfy before its owning task can flip to `done`. The smoke layer
is the lightest possible regression net for the bugs Node-only
`npm test` cannot catch: a binding-name typo, a missing event
handler, an unmounted child, or a layout regression that shows up
in real DOM but never in the JSDOM render path.

Scope is deliberately narrow. The smoke layer mounts one screen at
a time with canonical example data and asserts that the structural
promises in the screen package (`spec.md`, `interactions.md`,
`data-contracts.md`) hold against the real browser DOM. End-to-end
gameplay flows are the responsibility of higher-level suites
authored alongside each gameplay milestone.

> Companion specs:
>
> - [`unit-test-contract.md`](./unit-test-contract.md) — Node-side
>   unit rubric and DI seams that the smoke layer complements.
> - [`coverage-policy.md`](./coverage-policy.md) — coverage floors;
>   UI class also runs the smoke gate.
> - [`ui-component-resolver.md`](../ui-component-resolver.md) —
>   `data-component` registry and the missing-component fallback.
> - [`wiki/README.md`](../wiki/README.md) — screen-package contract
>   shape (`spec.md`, `interactions.md`, `data-contracts.md`).
>
> Owning task: harness, template, and `tasks:done` wiring by
> [`mvp.02-tooling.01-ui-smoke-harness`](../../../tasks/mvp/02-tooling/01-ui-smoke-harness.md).
> CI host: [`mvp.01-engine-core.10-github-actions-ci`](../../../tasks/mvp/01-engine-core/10-github-actions-ci.md).

---

## 1. Why it exists

[`mvp.01-engine-core.10-github-actions-ci`](../../../tasks/mvp/01-engine-core/10-github-actions-ci.md)
runs lint, type-check, unit tests, and the determinism fuzz
harness on every PR. None of these touch a real browser. Prior
task-system audits (archived under
[`docs/archive/`](../../archive/)) flagged the same gap
repeatedly: tests pass headless, UI breaks live. This contract
closes the gap by adding a `tasks:done` gate that fires whenever a
task's `ownedPaths` include `src/ui/**`.

## 2. Required assertions

Every screen package gets exactly one `<screen>.smoke.test.ts`
under `src/ui/__tests__/screens/`. Each smoke test performs three
assertions, in this order. Code review rejects any smoke test that
omits one.

1. **Mount with canonical example data.** Construct the screen
   component with the canonical example record cited in
   `data-contracts.md` (or, when no record applies, with the
   explicit default state declared by the screen). The test fails
   if mount throws, if React surfaces an error boundary, or if the
   rendered subtree is empty.
2. **Bindings reachable.** Every `data-component`, `data-state`,
   `data-action`, and `data-i18n` annotation declared in `spec.md`
   resolves to a node in the rendered DOM. Resolution uses the
   `data-component` registry pinned in
   [`ui-component-resolver.md`](../ui-component-resolver.md); a
   missing-component fallback is acceptable only when `spec.md`
   explicitly opts in.
3. **Interactions invokable.** Every control listed in
   `interactions.md` accepts a synthetic gesture (click, hover,
   keystroke) and routes through the documented handler. The
   handler may be a no-op spy in this layer; the smoke test only
   asserts that the gesture reached it without throwing. State
   transitions, command emission, and downstream effects belong to
   deeper test layers.

Together these pin the screen against the source-of-truth screen
package. Any drift fails the smoke step and blocks `tasks:done`
from flipping the task to `done`.

## 3. Runner

[`scripts/verify-ui-smoke.mjs`](../../../scripts/verify-ui-smoke.mjs)
is invoked by [`scripts/tasks.mjs`](../../../scripts/tasks.mjs) at
`done` time for any task whose `ownedPaths` glob matches
`src/ui/**`. It resolves smoke files via
`src/ui/**/*.smoke.test.ts` and dispatches them through
`vitest --browser run`. Failure is non-skippable; opt-out is
rejected by lint per
[`scripts/lib/task-readiness.mjs`](../../../scripts/lib/task-readiness.mjs).

The browser driver is `playwright`'s headless Chromium binary,
pinned to a single version inside the owning task
([`mvp.02-tooling.01-ui-smoke-harness`](../../../tasks/mvp/02-tooling/01-ui-smoke-harness.md))
so the smoke layer is reproducible across CI runners.

## 4. Template

[`src/ui/__tests__/smoke.template.test.ts`](../../../src/ui/__tests__/smoke.template.test.ts)
is the canonical starting point for a new screen smoke. Copy it,
replace the placeholders with the screen package's bindings, and
commit alongside the screen's implementation. The runner skips any
file whose name matches `smoke.template.*`, so the template itself
never executes as a test.

## 5. Out of scope

- **Visual-regression / pixel diffs.** Screen mockups are
  documentation; pixel parity belongs to a future task that owns a
  snapshot store.
- **Cross-screen flows.** The smoke layer mounts one screen at a
  time.
- **Localization correctness beyond `data-i18n` reachability.**
  String validation belongs to the localization audit task.
- **Asset loading.** Smoke tests use the canonical asset index;
  missing assets fall back per
  [`ui-component-resolver.md`](../ui-component-resolver.md).

---

## 🔍 Sync Check

- **UI: ✔** — Screen-package contract referenced here (`spec.md`,
  `interactions.md`, `data-contracts.md`, plus the `data-component`
  / `data-state` / `data-action` / `data-i18n` annotation set)
  matches the package shape pinned in
  [`wiki/README.md`](../wiki/README.md) and the representative
  [`wiki/screens/01-main-menu/`](../wiki/screens/01-main-menu/)
  (which contains `spec.md`, `interactions.md`, `data-contracts.md`,
  `architecture.md`, `mockup.html`).
- **Schema: ✔** — No content-schema cross-references; the contract
  is a runner / harness spec, not a data schema. `package.json`
  carries `"test:ui-smoke": "vitest --browser run -- src/ui/**/*.smoke.test.ts"`
  matching the glob asserted here.
- **Tasks: ✔** — Owning task
  [`mvp.02-tooling.01-ui-smoke-harness`](../../../tasks/mvp/02-tooling/01-ui-smoke-harness.md)
  references this doc in its Read First and lists it under Outputs
  + Owned Paths; CI host task
  [`mvp.01-engine-core.10-github-actions-ci`](../../../tasks/mvp/01-engine-core/10-github-actions-ci.md)
  exists. No orphan task references this contract without a
  reciprocal mention.

## ⚠ Issues

- **Runner / wiring are forward-looking; current code is a
  placeholder.** This contract describes the runner's final shape
  (`vitest --browser run` over `src/ui/**/*.smoke.test.ts`, dispatched
  from `scripts/tasks.mjs done` for any UI-touching task). The
  current
  [`scripts/verify-ui-smoke.mjs`](../../../scripts/verify-ui-smoke.mjs)
  is a placeholder owned-path checker (it greps for `export` and JSX
  on UI source files); it does **not** invoke Vitest. `scripts/tasks.mjs`
  also does not yet call the runner at `done` time (no `verify-ui-smoke`
  / `test:ui-smoke` reference in the file). This is consistent with
  [`mvp.02-tooling.01-ui-smoke-harness`](../../../tasks/mvp/02-tooling/01-ui-smoke-harness.md)
  being the task that promotes both surfaces; the doc is the contract
  the task must satisfy. No edit required to this file. Per Hard
  Prohibition D, the runner and `scripts/tasks.mjs` are not touched
  by this audit.
