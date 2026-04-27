# Set up Vite + TypeScript strict mode per module

Status: planned

Module: [Engine Core (M0)](../01-engine-core.md)

Description:
Each implementation module gets its own `tsconfig.json` extending a
root `tsconfig.base.json` with `strict: true`,
`noUncheckedIndexedAccess: true`, and
`exactOptionalPropertyTypes: true`. Vite is configured for library mode
in `src/engine` and `src/rules`; app mode for `src/ui`.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Inputs:
- Monorepo scaffold from Task 1

Outputs:
- `tsconfig.base.json` at root
- Per-module `tsconfig.json` files
- `vite.config.ts` in each module that needs a build target
- `npm run -ws build` produces `.js` + `.d.ts` for all implementation modules

Owned Paths:
- `tsconfig.base.json`
- `tsconfig.json`
- `vite.config.ts`
- `.js`
- `.d.ts`

Dependencies:
- mvp.01-engine-core.01-initialize-root-workspace-and-module-layout

Acceptance Criteria:
- `npm run -ws type-check` exits 0
- No `any` types in `src/engine` or `src/rules`
- Source maps generated for all implementation modules

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
