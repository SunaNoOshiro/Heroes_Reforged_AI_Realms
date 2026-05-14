# Module Graph (Fitness Function)

The boundary table in [`state-flow.md`](./state-flow.md) names which
runtime layer owns which mutation. This file converts that table into
a CI-enforced fitness function over `src/`'s import graph.

The machine-readable form lives in
[`scripts/check-module-graph.mjs`](../../scripts/check-module-graph.mjs)
— a zero-dependency Node script that walks
`src/**/*.{ts,tsx,mts,cts,js,mjs,cjs}`, resolves relative imports,
and rejects forbidden edges plus cycles. The two formats are the
same contract; update them together. The per-module side-effect
ledger is in [`side-effect-matrix.md`](./side-effect-matrix.md).

## Enforcement shape

The script combines two rule kinds:

- **Denylist** — every edge in the Forbidden Edges table below is
  rejected.
- **Closed allowlist for `src/rules/`** — `src/rules/` may import
  only from `src/rules/` and `src/content-schema/`; any other
  `src/<x>/` target is a violation.
- **No cycles** — DFS over the resolved import graph; any back-edge
  is a violation.

The Allowed Edges table is the human-readable model the denylist is
derived from. Edges not listed there are not implicitly forbidden —
they are forbidden only when an entry in Forbidden Edges (or the
rules allowlist) covers them.

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
| `src/editor/**` | `src/content-runtime/**`, `src/content-schema/**`, `src/renderer/**` | Editor authors content; never mutates engine state |
| any module | `src/contracts/**` | `src/contracts/` is a zero-runtime types-only workspace package (`@hr/contracts`); every module may `import type { … } from "@hr/contracts/<file>"`. See [`testing-conventions.md`](./testing-conventions.md). |

Leaves (no imports outside their own directory):

- `src/content-schema/`
- `src/contracts/` (also ships no runtime values)

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

- Local: `npm run validate:arch`
- Aggregate: `npm run validate` (which includes `validate:arch`)
- CI: any GitHub Actions workflow that calls `npm run validate` is
  covered automatically.

## Adding a New Module

1. Pick a top-level folder under `src/` (or reuse one).
2. Add a row to **Allowed Edges** above.
3. Add the matching entry to `FORBIDDEN_EDGES` (or to
   `RULES_ALLOWED_PREFIXES` if the new module needs closed-allowlist
   semantics like `src/rules/`) in
   [`scripts/check-module-graph.mjs`](../../scripts/check-module-graph.mjs).
4. Add a row in [`side-effect-matrix.md`](./side-effect-matrix.md)
   for the new folder (CI enforces this via
   `scripts/check-cross-references.mjs`).
5. Run `npm run validate:arch` to confirm no current code violates
   the refined contract.

Renaming or removing a module is a breaking change to the contract —
update both files in the same PR.

## Related

- [`state-flow.md`](./state-flow.md) — boundary table this file
  enforces
- [`side-effect-matrix.md`](./side-effect-matrix.md) — per-module
  side-effect ledger (sister doc)
- [`overview.md`](./overview.md) — repo shape
- [`multi-engine-harness.md`](./multi-engine-harness.md) — purity
  rules that the boundary table protects

---

## 🔍 Sync Check

- **UI: ✔** — File documents engine-side import boundaries; it pins
  no UI surfaces, so there is no spec to compare against.
- **Schema: ✔** — `src/contracts/` is a real workspace package and
  `src/content-schema/` is a real leaf module; both match
  [`side-effect-matrix.md`](./side-effect-matrix.md) and
  [`overview.md`](./overview.md).
- **Tasks: ⚠** — Owning task
  [`mvp.00-core-architecture.arch-module-graph`](../../tasks/mvp/00-core-architecture/arch-module-graph.md)
  references this file and the script as Owned Paths. Acceptance
  criteria match the Forbidden Edges + DFS cycle list verbatim. The
  task does not cover `src/shared/`, which now exists in the tree
  (see Issues).

## ⚠ Issues

- **`src/shared/` is undocumented and unenforced.** The repo has
  [`src/shared/assert.ts`](../../src/shared/assert.ts) (per
  [`fail-loud.md` § 1](./fail-loud.md#1-the-assert-helper)), and
  [`.agents/rules/engine.md`](../../.agents/rules/engine.md) groups
  `src/shared/**` with the determinism modules. But this file's
  Allowed Edges table omits `src/shared/`, the script omits it from
  `FORBIDDEN_EDGES` and `RULES_ALLOWED_PREFIXES`, and
  [`side-effect-matrix.md`](./side-effect-matrix.md) has no row for
  it. Per CLAUDE.md ("cross-module imports are bounded by
  module-graph.md") and the "Adding a New Module" workflow above,
  the gap should close in
  [`mvp.00-core-architecture.arch-module-graph`](../../tasks/mvp/00-core-architecture/arch-module-graph.md)
  or a follow-up task. Suggested values: row `src/shared/**` may
  import `src/contracts/**` only (leaf-like, per the "engine, rules,
  contracts, shared, net" determinism cluster); side-effect-matrix
  row `purity = pure`, `permitted = throw `TrustViolationError``,
  `forbidden = network/storage/DOM/Date.now/Math.random`. Skill did
  not edit either sibling file (Hard Prohibition D).
- **`engine.md` rules-graph statement contradicts this file.**
  [`.agents/rules/engine.md` § Module-graph rules](../../.agents/rules/engine.md)
  states "`src/rules/` may depend on `src/engine/`; not vice versa",
  but both this file's Allowed Edges row and
  [`scripts/check-module-graph.mjs`](../../scripts/check-module-graph.mjs)
  (`RULES_ALLOWED_PREFIXES = ["src/rules/", "src/content-schema/"]`)
  forbid `src/rules/ → src/engine/`. The script is canonical; the
  rules file should be corrected to read `src/rules/` may depend
  only on `src/content-schema/`. Skill did not edit `engine.md`
  (Hard Prohibition D).
- **`module-graph.md` not listed in `INDEX.md`.** The architecture
  index at [`INDEX.md`](./INDEX.md) is selective by design, but
  `module-graph.md` is the canonical cross-module import contract
  cited from CLAUDE.md and from
  [`overview.md`](./overview.md#determinism-stack). Recommend adding
  it under the "Engine support (29–34)" cluster next to
  `side-effect-matrix.md`. Non-blocking; flagged for the next INDEX
  revision.
