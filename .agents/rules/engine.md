---
paths:
  - "src/engine/**"
  - "src/rules/**"
  - "src/contracts/**"
  - "src/shared/**"
  - "src/net/**"
---

# Engine, rules, contracts, shared, net

These modules carry the determinism contract. Every change here must
preserve byte-identical outputs for the same inputs across machines,
sessions, and replays.

## Determinism

- Integers only in sim code. All numeric values use fixed-point ×1000
  via the `src/engine/fixed-point.ts` helpers (`fpAdd`, `fpMul`, etc.;
  the file lands with the engine-core MVP task). Never use `*` or `/`
  on raw `FixedPoint`.
- No `Math.random` — use the seeded RNG from
  [`src/contracts/rng.ts`](../../src/contracts/rng.ts).
- No wall-clock reads — use the injected `Clock` from
  [`src/contracts/clock.ts`](../../src/contracts/clock.ts).
- No async I/O. The sim is synchronous. See
  [`docs/architecture/determinism.md`](../../docs/architecture/determinism.md)
  and the per-module ledger in
  [`docs/architecture/side-effect-matrix.md`](../../docs/architecture/side-effect-matrix.md).

## `src/contracts/` is generated

Every file in `src/contracts/` (other than hand-authored interface
contracts) is regenerated from a schema in `content-schema/schemas/`
by `npm run generate:contracts`. **Do not hand-edit.** The mapping
table is in
[`scripts/generate-contracts-from-schemas.mjs`](../../scripts/generate-contracts-from-schemas.mjs).

After editing any source schema with a TS counterpart, run
`generate:contracts` and commit the diff in the same change. CI
catches drift via `npm run validate:contracts-ts`.

## Module-graph rules

Cross-layer imports are bounded by
[`docs/architecture/module-graph.md`](../../docs/architecture/module-graph.md).
Specifically:

- `src/engine/` does **not** import from `src/renderer/`, `src/ui/`,
  or `src/net/`.
- `src/rules/` may depend on `src/engine/`; not vice versa.
- `src/contracts/` is leaf-level — no imports out.

CI catches violations via `npm run validate:arch`.

## Adversarial-input boundary

Per [`docs/architecture/trust-boundaries.md`](../../docs/architecture/trust-boundaries.md),
every byte from a peer browser, DataChannel, WebSocket, pack archive,
save file, AI prompt, AI completion, or worker `postMessage` is
**adversarial** until validated by a named gate. This applies inside
this folder when consuming any of those sources.

## Mutation gate

Module class **engine / rules / shared / net**: mutation-score floor
**80 %**, line coverage 90 %, branch coverage 80 %. See
[`scripts/lib/module-classes.mjs`](../../scripts/lib/module-classes.mjs).

## Common after-edit commands

```
npm run generate:contracts   # if you edited a schema with a TS counterpart
npm run validate:arch        # confirm module-graph rules
npm test
npm run test:mutation:changed
```
