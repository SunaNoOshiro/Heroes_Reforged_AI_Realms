# UI Smoke Harness

Status: planned

Module: [Test & Tooling Contracts (M0)](../02-tooling.md)

Description:
Promote
[`scripts/verify-ui-smoke.mjs`](../../../scripts/verify-ui-smoke.mjs)
from a placeholder owned-path checker into a real browser-side smoke
runner. Adopt `vitest --browser` (with Playwright's headless Chromium
binary as the driver) so every screen package gets a `*.smoke.test.ts`
that mounts the screen, asserts the bindings declared in
[`spec.md`](../../../docs/architecture/wiki/screens/01-main-menu/spec.md),
and dispatches each control listed in
[`interactions.md`](../../../docs/architecture/wiki/screens/01-main-menu/interactions.md).
Wire the runner into
[`scripts/tasks.mjs`](../../../scripts/tasks.mjs) so any task whose
`ownedPaths` glob matches `src/ui/**` automatically runs the smoke
step at `tasks:done` time.

Read First:
- [`docs/architecture/testing/ui-smoke-contract.md`](../../../docs/architecture/testing/ui-smoke-contract.md)
- [`docs/architecture/wiki/README.md`](../../../docs/architecture/wiki/README.md)
- [`docs/architecture/ui-component-resolver.md`](../../../docs/architecture/ui-component-resolver.md)
- [`docs/architecture/wiki/screens/01-main-menu/`](../../../docs/architecture/wiki/screens/01-main-menu/)

Inputs:
- Screen packages under
  [`docs/architecture/wiki/screens/`](../../../docs/architecture/wiki/screens/)
  — every numbered screen package is a downstream consumer; see the
  representative
  [`docs/architecture/wiki/screens/01-main-menu/`](../../../docs/architecture/wiki/screens/01-main-menu/)
  for the contract shape.
- Vitest pinned by
  `mvp.01-engine-core.02-set-up-vite-plus-typescript-strict-mode-per-module`

Outputs:
- `docs/architecture/testing/ui-smoke-contract.md` — three required
  assertions per screen (mount with canonical example data, bindings
  reachable, interactions invokable).
- `scripts/verify-ui-smoke.mjs` (rewritten) — resolves
  `src/ui/**/*.smoke.test.ts` via glob and dispatches
  `vitest --browser run` against each. Skips files whose name
  matches `smoke.template.*`.
- `src/ui/__tests__/smoke.template.test.ts` — copy-paste template
  every new screen package starts from.
- `package.json` script `test:ui-smoke` invoking the runner.
- `@vitest/browser` and `playwright` added to `devDependencies`.
- Edit to `scripts/tasks.mjs` `done` so any task with
  `ownedPaths.some(p => p.startsWith('src/ui/'))` prepends
  `npm run test:ui-smoke` to its verify chain.

Owned Paths:
- `docs/architecture/testing/ui-smoke-contract.md`
- `scripts/verify-ui-smoke.mjs`
- `src/ui/__tests__/smoke.template.test.ts`

Owned Paths (shared):
- `scripts/tasks.mjs` (primary owner: the task system itself; this
  task contributes the additive UI-smoke rule only).
- `package.json` (primary owner:
  `mvp.01-engine-core.01-initialize-root-workspace-and-module-layout`;
  this task contributes the `test:ui-smoke` script and the
  `@vitest/browser` + `playwright` devDependency entries only).

Dependencies:
- mvp.01-engine-core.02-set-up-vite-plus-typescript-strict-mode-per-module

Acceptance Criteria:
- `npm run test:ui-smoke` runs every `src/ui/**/*.smoke.test.ts`
  through `vitest --browser` against headless Chromium.
- A deliberate binding-name typo against any
  [`docs/architecture/wiki/screens/01-main-menu/spec.md`](../../../docs/architecture/wiki/screens/01-main-menu/spec.md)
  consumer causes the smoke step to fail.
- A deliberate missing handler on any control listed in any screen
  package's `interactions.md` causes the smoke step to fail.
- `scripts/tasks.mjs done <id>` for a task that owns a `src/ui/**`
  path runs `npm run test:ui-smoke` automatically; the task cannot
  flip to `done` if the smoke step fails.
- Smoke step adds < 60 s to CI total wall-clock budget so the
  overall < 3 minute budget pinned in
  `mvp.01-engine-core.10-github-actions-ci` still holds.
- Shared paths (`scripts/tasks.mjs`, `package.json`) are extended
  with additive scope only. This task must not rewrite the existing
  task-system CLI behavior, the existing CI verify chain, or the
  existing package metadata, and must not collapse other verify
  steps into the smoke runner. The primary owner of each shared
  path remains as named in Owned Paths (shared) above.

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
