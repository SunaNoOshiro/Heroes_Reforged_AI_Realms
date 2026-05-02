# Module Graph (Fitness Function)

The boundary table in [`state-flow.md`](./state-flow.md) defines who
owns each layer of the runtime. This file converts that table into a
fitness function: a closed list of allowed and forbidden import edges
that CI enforces on every PR via `npm run validate:arch`.

The machine-readable form lives in
[`scripts/check-module-graph.mjs`](../../scripts/check-module-graph.mjs)
— a small zero-dependency Node script that walks `src/**/*.{ts,tsx,js,mjs,cjs}`,
resolves relative imports, and rejects forbidden edges plus cycles.
Update this prose and the `.mjs` together — they are the same contract
in two formats.

## Allowed Edges

| From | May import | Reason |
|---|---|---|
| `src/engine/**` | `src/content-schema/**`, `src/rules/**` | Engine consumes schemas and rule formulas |
| `src/rules/**` | `src/content-schema/**` | Rules walk the formula AST defined by schemas |
| `src/content-runtime/**` | `src/content-schema/**` | Manifest loader needs the schemas it validates against |
| `src/renderer/**` | `src/content-schema/**` | Renderer reads asset manifests + presentation records |
| `src/ui/**` | any of the above | UI shell composes everything below |
| `src/ai/**` | `src/engine/**`, `src/rules/**`, `src/content-schema/**` | AI is a co-actor; it queries state and emits commands |
| `src/net/**` | `src/engine/**`, `src/content-schema/**` | Multiplayer wraps the engine via `createEngine()` |
| `src/persistence/**` | `src/engine/**`, `src/content-schema/**` | Saves serialize engine state |
| `src/editor/**` | `src/content-runtime/**`, `src/content-schema/**`, `src/renderer/**` | Editor authors content; it never mutates engine state |

`src/content-schema/` is a leaf: it has no imports outside itself.

## Forbidden Edges

| Rule | Why |
|---|---|
| `src/engine/**` ⇏ `src/renderer/**` | Engine is the pure deterministic core; renderer is presentation. |
| `src/engine/**` ⇏ `src/ui/**` | UI emits commands; engine never sees UI internals. |
| `src/engine/**` ⇏ `src/ai/**` | AI is a co-actor. Engine being AI-aware would couple bot heuristics to gameplay RNG. |
| `src/engine/**` ⇏ `src/net/**` | Multiplayer wraps the engine, not the other way around. |
| `src/engine/**` ⇏ `src/persistence/**` | Saves/replays read engine state; engine never reaches into save IO. |
| `src/engine/**` ⇏ `src/editor/**` | Editor is content-authoring; it must not pollute the deterministic core. |
| `src/renderer/**` ⇏ `src/engine/**` | Renderer is read-only via state snapshots. |
| `src/rules/**` ⇏ anything outside `src/rules/**` and `src/content-schema/**` | Keeps rule evaluation portable to other hosts. |
| any cycle in `src/**` | Cycles defeat the layer ordering above. |

## Invocation

- Run locally: `npm run validate:arch`
- Aggregate: `npm run validate` (which now includes `validate:arch`)
- CI: any GitHub Actions workflow that calls `npm run validate` is
  covered automatically.

## Adding a New Module

1. Pick a top-level folder under `src/` (or reuse one).
2. Add the row to **Allowed Edges** above.
3. Add the matching entry to the `FORBIDDEN_EDGES` array in
   `scripts/check-module-graph.mjs` if the new module's edges are not
   already covered.
4. Run `npm run validate:arch` to confirm no current code violates the
   refined contract.

Renaming or removing a module is a breaking change to the contract —
update both files in the same PR.

## Related

- [`state-flow.md`](./state-flow.md) — boundary table this file
  enforces
- [`overview.md`](./overview.md) — repo shape
- [`multi-engine-harness.md`](./multi-engine-harness.md) — purity
  rules that the boundary table protects
