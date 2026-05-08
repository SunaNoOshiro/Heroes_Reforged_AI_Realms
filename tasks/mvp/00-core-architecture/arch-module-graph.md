# Module-graph fitness check

Module: [Core Architecture Contracts (M0)](../00-core-architecture.md)

Description:
The intended dependency graph (engine → schemas; UI/AI/net → engine
contracts; renderer read-only) is acyclic and unidirectional in
design, but no automated check existed. This task adds a
zero-dependency Node script that codifies the boundary table from
[`state-flow.md`](../../../docs/architecture/state-flow.md), wires
`validate:arch` into `npm run validate`, and authors a human-readable
`module-graph.md` that mirrors the script's rules in prose.

Implementation note: the source plan suggested `dependency-cruiser`,
but that pulls in 43 transitive packages to lint a tree that today is
empty. The custom script is a ~200-line replacement that resolves
relative imports, flags forbidden cross-layer edges, and detects
cycles via DFS. When the engine reducer lands and the import graph
gets dense, swapping the script for `dependency-cruiser` (or `madge`)
remains a one-line change in `package.json`.

Source audit:
[`docs/readiness-audit/01-core-architecture.md`](../../../docs/readiness-audit/01-core-architecture.md)
(Q22, Q24, Issue 3.A-2).

Read First:
- [`docs/implementation-plans/01-core-architecture-plan.md`](../../../docs/implementation-plans/01-core-architecture-plan.md)
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)
- [`docs/architecture/overview.md`](../../../docs/architecture/overview.md)

Inputs:
- Audit Q22 / Q24 in
  [`docs/readiness-audit/01-core-architecture.md`](../../../docs/readiness-audit/01-core-architecture.md)

Outputs:
- `scripts/check-module-graph.mjs`
- `docs/architecture/module-graph.md`
- `validate:arch` script entry in `package.json`
- Mention of `validate:arch` in `AGENTS.md` workflow guide

Owned Paths:
- `scripts/check-module-graph.mjs`
- `docs/architecture/module-graph.md`

Dependencies:
- mvp.00-core-architecture.det-rng-streams

Acceptance Criteria:
- `npm run validate:arch` exits 0 on the current `src/` tree (no
  violations expected since the tree is largely placeholders).
- `validate:arch` is included in the `validate` aggregate script.
- `scripts/check-module-graph.mjs` codifies at minimum:
  `src/engine/` ⇏ `src/renderer/`, `src/engine/` ⇏ `src/ui/`,
  `src/engine/` ⇏ `src/ai/`, `src/engine/` ⇏ `src/net/`,
  `src/engine/` ⇏ `src/persistence/`, `src/engine/` ⇏ `src/editor/`,
  `src/renderer/` ⇏ `src/engine/`,
  `src/rules/` ⇏ anything outside `src/rules/` and
  `src/content-schema/`, plus a no-cycles rule via DFS.
- `module-graph.md` documents the same edges in prose plus an
  "Adding a New Module" workflow.
- `AGENTS.md` and `CLAUDE.md` mention `npm run validate:arch`.

Verify:
- npm run validate

Estimated Time:
- 3 hours
