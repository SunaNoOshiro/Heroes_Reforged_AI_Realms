# Determinism

Hard constraint: the same seed, the same commands, and the same content
hashes produce the same state on any machine, any time.

## Non-Negotiable Stack

The engine must provide these, in this order:

1. **Seeded RNG** (PCG32 with named sub-streams, no
   `Math.random()`). The canonical sub-stream catalogue lives in
   [`rng-streams.md`](./rng-streams.md); every `rng.next()` site
   MUST cite a stream from that table.
2. **Fixed-point math** (integer arithmetic with explicit
   numerator/denominator ratios).
3. **Command dispatcher** (pure reducer: `state = apply(state, command)`).
4. **Canonical serializer + state hash** (sorted keys, no whitespace,
   xxh64 over canonical bytes).
5. **Replay API** (seed + command log reproduces final state). The
   seed itself is resolved by the precedence list in
   [`command-schema.md` § Seed Source Precedence](./command-schema.md#seed-source-precedence)
   and pinned into `SCENARIO_LOAD`.
6. **Fuzz harness** (N random commands replayed bit-identically). The
   companion **multi-engine harness** runs two `createEngine()`
   instances in parallel and compares hashes per step; see
   [`multi-engine-harness.md`](./multi-engine-harness.md).

## Forbidden In Deterministic Paths

- `Math.random()` and `Date.now()` / `performance.now()`.
- JavaScript floats in gameplay math.
- `eval` / `new Function(...)` / runtime-parsed formula strings.
- Map/Set iteration where order matters without an explicit sort.
- Async timing (no `setTimeout`-based race decisions).

## Formulas Are Data

Ruleset formulas live as structured fixed-point ASTs (see
[`content-schema/schemas/formula.schema.json`](../../content-schema/schemas/formula.schema.json)),
not strings. The evaluator is a small pure function over named
variables: `add`, `sub`, `mul`, `divFloor`, `ratio`, `min`, `max`,
`clamp`, `neg`, `abs`.

This avoids a second parser, prevents code-injection via packs, and
keeps determinism portable across languages.

## Fixed-Point Conventions

- Damage, HP, and resources are integers.
- Ratios are stored as paired constants (e.g.
  `atkBonusPerPointNum=1, atkBonusPerPointDen=20` for 0.05 per ATK
  differential).
- Multiply first, divide with floor last. Document overflow bounds in
  the ruleset.
- Caps live as integer **stat-differential points**, not percent of
  base. `atkBonusCap=60` and `defReductionCap=60` are clamped before
  the per-point ratio is applied. The JSON
  ([`baseline.ruleset.json`](../../content-schema/examples/records/rulesets/baseline.ruleset.json))
  is the single source of truth; update it first and re-run
  `npm test` before editing this prose.

## Content Hash + Engine Hash

Every pack manifest carries a `contentHash` (canonical-JSON digest of
all records) and an `engineHash` (build digest). Saves, replays, and
multiplayer pin both. Any mismatch fails loud at load time; never
silent.

## Cross-Platform Portability

- All state numbers serialize as integer JSON literals. No exponents,
  no `Infinity`, no `NaN`.
- String order is Unicode-codepoint ascending.
- Map iteration uses explicit sorted keys where it affects state.
