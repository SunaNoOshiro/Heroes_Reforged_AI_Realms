# State serializer + xxh64 hash

Status: planned

Module: [Engine Core (M0)](../01-engine-core.md)

Description:
Implement canonical JSON serialization for `GameState`. "Canonical" means: keys sorted alphabetically, no `undefined` values, no `NaN` or `Infinity`, arrays stable-sorted where order doesn't matter. Then hash the canonical string with xxh64 to produce a 64-bit state fingerprint used for multiplayer desync detection.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Inputs:
- `GameState` from Task 6

Outputs:
- `src/engine/serializer.ts` — `serialize(state: GameState): string`
- `src/engine/hash.ts` — `hashState(state: GameState): bigint` (xxh64)
- Both functions are pure (no side effects)

Owned Paths:
- `src/engine/serializer.ts`
- `src/engine/hash.ts`

Dependencies:
- mvp.01-engine-core.06-command-dispatcher

Acceptance Criteria:
- `serialize(stateA) === serialize(stateB)` if and only if states are logically equal
- Hash is identical on Node 20, Chrome 120, Firefox 121, Safari 17 for the same state
- Round-trip: `deserialize(serialize(state))` produces a state with identical hash
- Performance: serialize + hash a 500-unit battle state in < 5ms

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
