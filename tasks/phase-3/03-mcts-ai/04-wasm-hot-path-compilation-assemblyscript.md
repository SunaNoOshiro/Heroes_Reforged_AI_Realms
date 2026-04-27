# WASM Hot Path Compilation (AssemblyScript)

Status: planned

Module: [MCTS AI (M7)](../03-mcts-ai.md)

Description:
The MCTS inner loop (state clone + apply + evaluate) is called thousands of times per turn. Compile it to WebAssembly using AssemblyScript for a 5–10× speedup.

Read First:
- [`docs/architecture/ai-integration.md`](../../../docs/architecture/ai-integration.md)

Inputs:
- `BattleState` types, damage formula, movement logic
- AssemblyScript toolchain

Outputs:
- `src/ai/bots/wasm/battle-sim.ts` (AssemblyScript source)
- Compiled `battle-sim.wasm` included in build
- JS wrapper: `src/ai/bots/wasm/wasm-bridge.ts` — loads WASM, exports same interface as TS sim
- Fallback: if WASM fails to load, falls back to TS implementation transparently

Why this is risky: WASM number types differ from TypeScript. Fixed-point math must be re-verified in WASM. `BigInt` is not supported in AssemblyScript — use `i64` directly.

Owned Paths:
- `src/ai/bots/wasm/battle-sim.ts`
- `src/ai/bots/wasm/wasm-bridge.ts`

Dependencies:
- phase-3.03-mcts-ai.02-heuristic-evaluator-no-random-rollouts

Acceptance Criteria:
- WASM and TS implementations produce identical results for the same state + command sequence
- MCTS 500-node search completes in < 20ms with WASM (vs < 100ms TS)
- WASM binary < 500KB (no tree-shaking issues)
- Fallback works seamlessly when WASM is disabled

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
