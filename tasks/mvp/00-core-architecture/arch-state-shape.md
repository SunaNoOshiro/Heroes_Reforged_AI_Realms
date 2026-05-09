# Top-level GameState shape

Module: [Core Architecture Contracts (M0)](../00-core-architecture.md)

Description:
Define the closed JSON shape of `GameState`, the value the
deterministic reducer consumes. The reducer signature
`state' = apply(state, command)` is established, but until this task
the *shape* of `state` (top-level keys, normalization rule,
immutability strategy, serialization rules) is not pinned. Two
implementers would otherwise pick incompatible shapes and force a
later rewrite of every command handler.

Deliverables:
- A canonical `state-shape.md` enumerating top-level keys, the nested
  tactical-battle sub-state placement, the `byId` + `order`
  normalization rule, the structural-sharing immutability strategy
  (frozen plain objects only — no third-party library), and canonical
  JSON serialization rules consistent with
  [`determinism.md`](../../../docs/architecture/determinism.md).
- A closed JSON schema at
  `content-schema/schemas/game-state.schema.json` with
  `additionalProperties: false`.
- A canonical example covering one player, one hero, one town, one
  mine, and bootstrap RNG sub-streams under
  `content-schema/examples/game-state.example.json`.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Inputs:
- Existing per-record schemas under `content-schema/schemas/`

Outputs:
- `docs/architecture/state-shape.md`
- `content-schema/schemas/game-state.schema.json`
- `content-schema/examples/game-state.example.json`

Owned Paths:
- `docs/architecture/state-shape.md`
- `content-schema/schemas/game-state.schema.json`
- `content-schema/examples/game-state.example.json`

Dependencies:
- mvp.00-core-architecture.det-rng-streams

Acceptance Criteria:
- `content-schema/schemas/game-state.schema.json` exists and is
  parseable JSON Schema 2020-12 with `additionalProperties: false` on
  every fully-enumerated sub-shape.
- The example
  `content-schema/examples/game-state.example.json` validates against
  the schema (or is referenced by a future Zod test) and demonstrates
  one hero, one town, one mine.
- `state-shape.md` documents the structural-sharing + frozen-plain-
  objects immutability strategy and forbids third-party libraries
  (Immer / immutable.js).
- `schema-matrix.md` lists `GameState` and links the schema by
  canonical path.
- `glossary.md` has a `GameState` entry.

Verify:
- npm run validate

Estimated Time:
- 3 hours
