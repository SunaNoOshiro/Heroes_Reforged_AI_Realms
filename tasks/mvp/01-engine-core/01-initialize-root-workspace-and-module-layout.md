# Initialize root workspace and module layout

Status: planned

Module: [Engine Core (M0)](../01-engine-core.md)

Description:
Scaffold the repository root around `/src/`, `/content-schema/`,
`/resources/`, and `/services/`. Runtime implementation lives in
module folders under `/src/`. JSON schemas and example records stay
in `/content-schema/`. Add a `workspaces` array to the root
`package.json` that globs `src/*` and `services/*`. The repo
standardized on npm workspaces on 2026-04-22 (audit N8); do not
re-introduce pnpm.

Read First:
- [`docs/architecture/master-plan.md`](../../../docs/architecture/master-plan.md)
- [`docs/architecture/overview.md`](../../../docs/architecture/overview.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Inputs:
- Empty repository

Outputs:
- `"workspaces": ["src/*", "services/*"]` in root `package.json`
- `package.json` (root) with `"private": true` and shared dev dependencies
- `/content-schema/`
- `/src/engine/`, `/src/rules/`, `/src/content-schema/`, `/src/renderer/`, `/src/ui/`, `/src/ai/`, `/src/net/`, `/src/persistence/` (creator tooling lives under `/src/ui/editor/`)
- `/resources/packs/`
- `/services/signaling/`

Owned Paths:
- `package.json`
- `/content-schema/`
- `/src/engine/`
- `/src/rules/`
- `/src/content-schema/`
- `/src/renderer/`
- `/src/ui/`
- `/src/ai/`
- `/src/net/`
- `/src/persistence/`
- `/resources/packs/`
- `/services/signaling/`

Dependencies:
- None

Acceptance Criteria:
- `npm install` succeeds from root
- `npm run -ws build` runs (even if modules have empty `index.ts`)
- No circular module dependencies

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
