# Implement PCG32 PRNG with named sub-streams

Status: planned

Module: [Engine Core (M0)](../01-engine-core.md)

Description:
Implement PCG32 in pure TypeScript using `BigInt` for 64-bit internal state. Expose named sub-streams (e.g., `rng.map`, `rng.battle`, `rng.aiNoise`) that each maintain independent state but are seeded from a single root seed. This ensures that drawing from one stream does not affect others — critical for determinism across AI/map/combat paths.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Inputs:
- Root seed (number or BigInt)

Outputs:
- `src/engine/rng.ts` exporting `createRng(seed: bigint): Rng`
- `Rng` interface: `{ nextU32(): number; nextFloat(): never; fork(name: string): Rng }`
- Note: `nextFloat()` deliberately throws — use `nextU32() % range` for bounded randoms

Owned Paths:
- `src/engine/rng.ts`

Dependencies:
- mvp.01-engine-core.02-set-up-vite-plus-typescript-strict-mode-per-module

Acceptance Criteria:
- `createRng(42n).fork('battle').nextU32()` produces identical output on Node, Chrome, Firefox, Safari
- 10 million calls in < 50ms (benchmark in test)
- No `Math.random()` usage anywhere in the implementation
- Full unit test suite with known PCG32 reference vectors

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
