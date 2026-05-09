# Screen View-Model Types Generation

Module: [UI Shell (M1)](../07-ui-shell.md)

Description:
Generate TypeScript view-model interfaces for every screen package
from the structured "Selectors" tables in
`docs/architecture/wiki/screens/<nn-screen>/data-contracts.md`.
Today each `data-contracts.md` lists the schemas and selectors a
screen consumes by name only — the shape of the props/DTO the
renderer actually receives is not formally typed. A screen rewrite
allowed by the UI evolution policy cannot be contract-checked
against the previous renderer's input, and two parallel agents
implementing the same screen can shape the same selector
differently with no detection.

Read First:
- [`docs/architecture/wiki/README.md`](../../../docs/architecture/wiki/README.md)
- [`docs/architecture/wiki/screens/07-adventure-map/data-contracts.md`](../../../docs/architecture/wiki/screens/07-adventure-map/data-contracts.md)
- [`docs/architecture/wiki/screens/24-town-screen/data-contracts.md`](../../../docs/architecture/wiki/screens/24-town-screen/data-contracts.md)
- [`docs/architecture/wiki/screens/38-combat-screen/data-contracts.md`](../../../docs/architecture/wiki/screens/38-combat-screen/data-contracts.md)
- [`docs/architecture/ui-state-contract.md`](../../../docs/architecture/ui-state-contract.md)
- [`content-schema/schemas/validation-error.schema.json`](../../../content-schema/schemas/validation-error.schema.json)

Inputs:
- The 65 screen packages under
  [`docs/architecture/wiki/screens/`](../../../docs/architecture/wiki/screens/)
- All schemas under
  [`content-schema/schemas/`](../../../content-schema/schemas/)
- The validation-error contract from
  [`tasks/mvp/02-content-schemas/22-validation-error-contract.md`](../02-content-schemas/22-validation-error-contract.md)

Outputs:
- `scripts/generate-screen-types.mjs`
- `src/ui/screen-view-models.generated.ts` (machine-generated;
  checked in for diff visibility)
- `package.json` exposes `npm run generate:screen-types`; the
  generator is wired into `npm run validate` so a stale or missing
  diff fails CI

Owned Paths:
- `scripts/generate-screen-types.mjs`
- `src/ui/screen-view-models.generated.ts`

Owned Paths (shared):
- `package.json`
- Per-screen `data-contracts.md` files under
  `docs/architecture/wiki/screens/<nn-screen>/data-contracts.md`
  (additive: add the parseable Selectors table when missing)

Dependencies:
- mvp.02-content-schemas.22-validation-error-contract
- mvp.07-ui-shell.13-screen-package-contract-sweep

Acceptance Criteria:
- The shared edits to `package.json` and per-screen
  `data-contracts.md` files are **additive**: this task adds the
  `generate:screen-types` script and a parseable "Selectors" table
  where missing. Each screen package's primary contract remains
  owned by its primary screen-curation task per
  [`docs/architecture/wiki/README.md`](../../../docs/architecture/wiki/README.md);
  this task must not rewrite mockups, component trees, or behaviour
  prose.
- Every screen package under
  `docs/architecture/wiki/screens/<nn-screen>/data-contracts.md` has
  a parseable "Selectors" table with columns `name`, `type-ref`,
  `required`. The contract sweep already enforces this on swept
  screens; this task adds the table where missing and pins the
  format in `docs/architecture/wiki/README.md`.
- For at least the three high-traffic screen packages
  [`docs/architecture/wiki/screens/07-adventure-map/`](../../../docs/architecture/wiki/screens/07-adventure-map/),
  [`docs/architecture/wiki/screens/24-town-screen/`](../../../docs/architecture/wiki/screens/24-town-screen/),
  and
  [`docs/architecture/wiki/screens/38-combat-screen/`](../../../docs/architecture/wiki/screens/38-combat-screen/),
  the generator emits a `ScreenViewModel<id>` interface that resolves
  every selector type-ref against a real schema in
  `content-schema/schemas/`.
- `scripts/generate-screen-types.mjs` reads each
  `data-contracts.md`, resolves type refs against existing JSON
  Schemas (e.g. `unit.schema.json#/definitions/Unit`), and emits
  one `ScreenViewModel<<id>>` interface per package to
  `src/ui/screen-view-models.generated.ts`.
- An unresolved type reference produces a
  `ValidationError` of `rule: ref` and fails the generator.
- `npm run generate:screen-types && git diff --exit-code` is clean
  on a freshly checked-out tree.
- `npm run generate:screen-types` is wired into `npm run validate`.
- A lint rule (or convention documented in
  `docs/architecture/wiki/README.md`) requires screen renderers to
  import the generated `ScreenViewModel<id>` instead of declaring an
  ad-hoc inline shape.

Verify:
- npm run generate:screen-types
- npm run validate:contracts
- npm run validate:tasks
- npm run validate

Estimated Time:
- 6 hours
