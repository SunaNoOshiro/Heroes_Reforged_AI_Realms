# UI Smoke Contract

Per-screen browser-side smoke contract that every UI screen package
must satisfy before its owning task can flip to `done`. The smoke
layer is the lightest possible regression net that catches the bugs
which Node-only `npm test` cannot catch: a binding-name typo, a
missing event handler, an unmounted child, or a layout regression
that shows up in real DOM but never in the JSDOM render path.

The contract is intentionally narrow: the smoke layer is **not** a
full E2E suite. It mounts each screen with canonical example data and
asserts that the structural promises in the screen package
(`spec.md`, `interactions.md`, `data-contracts.md`) hold against the
real browser DOM. End-to-end gameplay flows are the responsibility of
higher-level test suites authored alongside each gameplay milestone.

## Why It Exists

[`tasks/mvp/01-engine-core/10-github-actions-ci.md`](../../../tasks/mvp/01-engine-core/10-github-actions-ci.md)
runs lint, type-check, unit tests, and the determinism fuzz harness
on every PR. None of these touch a real browser. The prior task-system
audits (archived under
[`docs/archive/`](../../archive/)) called out the same gap repeatedly:
"tests pass headless, UI breaks live." This contract closes that gap
by adding a third gate to `npm run tasks:done` that fires whenever a
task's `ownedPaths` include `src/ui/**`.

## Required Assertions

Every screen package gets exactly one `<screen>.smoke.test.ts` under
`src/ui/__tests__/screens/`. Each smoke test must perform three
assertions, in this order. A screen smoke test that omits any of them
is rejected by code review; the smoke runner does not invent missing
assertions.

1. **Mount with canonical example data.** Construct the screen
   component with the canonical example record cited in
   `data-contracts.md` (or, when no record applies, with the explicit
   default state declared by the screen). The test fails if mount
   throws, if React surfaces an error boundary, or if the rendered
   subtree is empty.
2. **Bindings reachable.** Every `data-component`, `data-state`,
   `data-action`, and `data-i18n` annotation declared in `spec.md`
   resolves to a node in the rendered DOM. Resolution uses the
   `data-component` registry pinned in
   [`ui-component-resolver.md`](../ui-component-resolver.md); a
   missing-component fallback is acceptable only when `spec.md`
   explicitly opts in.
3. **Interactions invokable.** Every control listed in
   `interactions.md` accepts a synthetic gesture (click, hover,
   keystroke) and routes through the documented handler. The handler
   may be a no-op spy in this layer; the smoke test only asserts that
   the gesture reached it without throwing. State transitions, command
   emission, and downstream effects belong to deeper test layers.

The three assertions together pin the screen against the source-of-
truth screen package. Any drift fails the smoke step and blocks
`tasks:done` from flipping the task to `done`.

## Runner

[`scripts/verify-ui-smoke.mjs`](../../../scripts/verify-ui-smoke.mjs)
is invoked by [`scripts/tasks.mjs`](../../../scripts/tasks.mjs) at
`done` time for any task whose `ownedPaths` glob matches
`src/ui/**`. The runner resolves smoke files via
`src/ui/**/*.smoke.test.ts` and dispatches them through
`vitest --browser run`. Failure is non-skippable; opt-out is rejected
by lint per
[`scripts/lib/task-readiness.mjs`](../../../scripts/lib/task-readiness.mjs).

The browser driver is `playwright`'s headless Chromium binary, pinned
to a single version inside the
[`tasks/mvp/02-tooling/01-ui-smoke-harness.md`](../../../tasks/mvp/02-tooling/01-ui-smoke-harness.md)
task so the smoke layer is reproducible across CI runners.

## Template

`src/ui/__tests__/smoke.template.test.ts` is the canonical starting
point for a new screen smoke. Copy it, replace the placeholders with
the screen package's bindings, and commit alongside the screen's
implementation. The template is documented as a template (not a
test); the runner skips files whose name matches `smoke.template.*`.

## Out Of Scope

- Visual-regression / pixel diffs. Screen mockups are documentation;
  pixel parity belongs to a future task that owns a snapshot store.
- Cross-screen flows. The smoke layer mounts one screen at a time.
- Localization correctness beyond `data-i18n` reachability. String
  validation belongs to the localization audit task.
- Asset loading. Smoke tests use the canonical asset index; missing
  assets fall back per
  [`ui-component-resolver.md`](../ui-component-resolver.md).
