# `src/contracts/` — Cross-module type surface

> Source plan:
> [`docs/implementation-plans/16-implementation-readiness-plan.md`](../../docs/implementation-plans/16-implementation-readiness-plan.md)
> (T7).

This workspace package is the **single source of truth** for every
cross-module TypeScript interface. Modules under `src/<module>/` import
shared contracts from here as `import type { X } from
"@hr/contracts/<file>";` so two modules can never silently disagree on
a shared shape.

The package is **types-only**:

- No runtime values exported.
- No runtime dependencies.
- `sideEffects: false` so bundlers prove the package compiles to
  nothing in production output.

## Layout

| File | What it owns |
|---|---|
| [`index.ts`](./index.ts) | Re-export surface; consumers usually `import type { ... } from "@hr/contracts"`. |
| [`rng.ts`](./rng.ts) | `Rng` interface + named sub-stream tags per [`determinism.md`](../../docs/architecture/determinism.md). |
| [`clock.ts`](./clock.ts) | Frame-counter `Clock` interface used by the engine reducer (no wall-clock reads). |
| [`id-allocator.ts`](./id-allocator.ts) | `IdAllocator` interface for deterministic monotonic IDs. |
| [`pack-registry.ts`](./pack-registry.ts) | `PackRegistry` interface — load, resolve, and look up packs / records / assets at runtime. |
| [`asset-loader.ts`](./asset-loader.ts) | `AssetLoader` interface — fetch atlas-resolved assets at the renderer seam. |
| [`command-bus.ts`](./command-bus.ts) | `CommandBus` interface — single emit-per-gesture command dispatch surface for the UI. |
| [`net-transport.ts`](./net-transport.ts) | `NetTransport` interface — WebRTC / NetSim contract; pinned in [`net-transport.md`](../../docs/architecture/net-transport.md). |
| [`renderer-event.ts`](./renderer-event.ts) | `RendererEvent` discriminated union derived from [`renderer-event.schema.json`](../../content-schema/schemas/renderer-event.schema.json). |
| [`reports.ts`](./reports.ts) | `ValidationReport`, `CoherenceReport`, `BalanceReport` derived from their JSON schemas. |
| [`fakes/`](./fakes/) | Canonical in-memory fakes per [`testing-conventions.md`](../../docs/architecture/testing-conventions.md). Bodies are landed by [15-testability-plan.md](../../docs/implementation-plans/15-testability-plan.md). |

## Generated vs hand-authored

- Files derived from `content-schema/schemas/*.schema.json` are
  **regeneratable** — re-run
  [`scripts/generate-contracts-from-schemas.mjs`](../../scripts/generate-contracts-from-schemas.mjs)
  after a schema change. Currently generated:
  `renderer-event.ts`, `reports.ts`.
- All other contracts are **hand-authored** TypeScript interfaces
  with no schema counterpart.

## Adding a new contract

1. Pick the file: schema-derived → re-run the generator; TS-only
   → add a new `<topic>.ts` file under this folder.
2. Re-export from [`index.ts`](./index.ts).
3. Add the row to the table above.
4. Add the corresponding row to
   [`testing-conventions.md`](../../docs/architecture/testing-conventions.md)
   §2 (shared fake catalogue) if a fake is implied.
5. Walk task files that previously inlined the interface and
   replace the inline block with `import type` from the new
   contract file (T7 follow-up sweep).
