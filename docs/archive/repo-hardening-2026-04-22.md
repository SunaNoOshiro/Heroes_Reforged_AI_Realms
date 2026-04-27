# Repo Hardening Report — 2026-04-22

Scope: planning surface, task backlog quality, schema/example
navigation, and AI-assisted repo ergonomics.

Validation after this pass:

- `npm run validate` — pass
- `npm test` — pass
- task registry — `173` tasks across `21` modules

This report links to the canonical rewritten files rather than copying
their full contents into a second document. That keeps the repo aligned
with the contribution rule to prefer one canonical source of truth.

## 1. Updated File Structure

Key structure after the pass:

```text
.
├── AGENTS.md
├── CONTRIBUTING.md
├── README.md
├── content-schema/
│   ├── README.md
│   ├── examples/
│   │   ├── README.md
│   │   ├── generation/
│   │   │   ├── README.md
│   │   │   ├── emberwild.generated-faction.json
│   │   │   └── emberwild.generation-request.json
│   │   ├── packs/
│   │   │   ├── README.md
│   │   │   ├── emberwild-faction/...
│   │   │   └── emberwild-world/...
│   │   └── records/
│   │       ├── README.md
│   │       └── ... canonical standalone record fixtures ...
│   └── schemas/
│       ├── README.md
│       └── ... canonical JSON Schema files ...
├── docs/
│   ├── architecture/
│   │   ├── README.md
│   │   ├── overview.md
│   │   ├── determinism.md
│   │   ├── content-platform.md
│   │   ├── pack-contract.md
│   │   ├── schema-matrix.md
│   │   ├── effect-registry.md
│   │   ├── glossary.md
│   │   └── ai-integration.md
│   └── planning/
│       ├── README.md
│       ├── roadmap.md
│       ├── solo-build-lane.md
│       ├── implementation-log.md
│       ├── repo-hardening-2026-04-22.md
│       └── ... historical audits/reports ...
├── scripts/
│   ├── check-cross-references.mjs
│   ├── check-markdown-links.mjs
│   ├── check-repo-contracts.mjs
│   ├── generate-task-registry.mjs
│   └── __tests__/...
├── tasks/
│   ├── README.md
│   ├── task-registry.json
│   ├── mvp/
│   │   └── ... unchanged module layout, with hardened task docs ...
│   ├── phase-2/
│   │   └── 05-mod-system/
│   │       ├── 01-zip-pack-loader-jszip-plus-manifest-parser.md
│   │       ├── 02-ed25519-signature-verification.md
│   │       ├── 03-sandbox-mode-for-ai-generated-packs.md
│   │       ├── 04-mod-manager-ui-install-enable-disable.md
│   │       ├── 05a-baseline-ruleset-and-shared-library-packs.md
│   │       ├── 05b-sylvan-and-stormspire-reference-packs.md
│   │       ├── 05c-ashlord-and-deepway-reference-packs.md
│   │       └── 05d-official-pack-signing-and-bundle-verification.md
│   └── phase-3/
│       ├── 03-mcts-ai/
│       │   ├── 01a-mcts-tree-state-and-root-expansion.md
│       │   ├── 01b-ucb1-search-loop-and-budgeted-runner.md
│       │   └── 02-06 existing tasks
│       └── 04-polish/
│           ├── 01a-renderer-capability-detection-and-adapter.md
│           ├── 01b-webgpu-map-renderer-parity.md
│           ├── 01c-webgpu-particles-fallback-and-benchmark.md
│           └── 02-07 existing tasks
└── src/, research/, resources/, services/
    └── unchanged top-level runtime/planning placeholders
```

Structural deltas:

- Added `docs/planning/solo-build-lane.md`
- Added `content-schema/examples/packs/README.md`
- Added `content-schema/examples/records/README.md`
- Added `content-schema/schemas/README.md`
- Replaced one oversized mod-system task with four smaller tasks
- Replaced one oversized MCTS task with two smaller tasks
- Replaced one oversized WebGPU task with three smaller tasks

## 2. Updated Files

Planning and navigation:

- [README.md](../../README.md)
- [docs/architecture/README.md](../architecture/README.md)
- [docs/planning/README.md](../planning/README.md)
- [docs/planning/roadmap.md](../planning/roadmap.md)
- [docs/planning/solo-build-lane.md](../planning/solo-build-lane.md)
- [docs/planning/implementation-log.md](../planning/implementation-log.md)
- [tasks/README.md](../../tasks/README.md)

Content-system navigation:

- [content-schema/README.md](../../content-schema/README.md)
- [content-schema/examples/README.md](../../content-schema/examples/README.md)
- [content-schema/examples/records/README.md](../../content-schema/examples/records/README.md)
- [content-schema/examples/packs/README.md](../../content-schema/examples/packs/README.md)
- [content-schema/schemas/README.md](../../content-schema/schemas/README.md)
- [docs/architecture/schema-matrix.md](../architecture/schema-matrix.md)
- [content-schema/schemas/unit.schema.json](../../content-schema/schemas/unit.schema.json)

Task backlog hardening:

- [tasks/mvp/02-content-schemas.md](../../tasks/mvp/02-content-schemas.md)
- [tasks/mvp/02-content-schemas/07-hero-schema.md](../../tasks/mvp/02-content-schemas/07-hero-schema.md)
- [tasks/mvp/02-content-schemas/08-adventure-building-plus-map-object-schemas.md](../../tasks/mvp/02-content-schemas/08-adventure-building-plus-map-object-schemas.md)
- [tasks/mvp/02-content-schemas/09-animation-vfx-sound-townpresentation-schemas.md](../../tasks/mvp/02-content-schemas/09-animation-vfx-sound-townpresentation-schemas.md)
- [tasks/mvp/02-content-schemas/11-schema-version-field-plus-migration-stub.md](../../tasks/mvp/02-content-schemas/11-schema-version-field-plus-migration-stub.md)
- [tasks/mvp/04-faction-emberwild/05-content-loader-validate-on-load.md](../../tasks/mvp/04-faction-emberwild/05-content-loader-validate-on-load.md)
- [tasks/mvp/09-tactical-combat/06-morale-and-luck-rolls.md](../../tasks/mvp/09-tactical-combat/06-morale-and-luck-rolls.md)
- [tasks/phase-2/04-content-editor/04-schema-validation-with-inline-error-display.md](../../tasks/phase-2/04-content-editor/04-schema-validation-with-inline-error-display.md)
- [tasks/phase-2/05-mod-system.md](../../tasks/phase-2/05-mod-system.md)
- [tasks/phase-2/05-mod-system/01-zip-pack-loader-jszip-plus-manifest-parser.md](../../tasks/phase-2/05-mod-system/01-zip-pack-loader-jszip-plus-manifest-parser.md)
- [tasks/phase-3/02-ai-generation/01-prompt-provider-structured-output-raw-json.md](../../tasks/phase-3/02-ai-generation/01-prompt-provider-structured-output-raw-json.md)
- [tasks/phase-3/02-ai-generation/02-schema-validation-plus-coherence-check.md](../../tasks/phase-3/02-ai-generation/02-schema-validation-plus-coherence-check.md)
- [tasks/phase-3/03-mcts-ai.md](../../tasks/phase-3/03-mcts-ai.md)
- [tasks/phase-3/03-mcts-ai/01a-mcts-tree-state-and-root-expansion.md](../../tasks/phase-3/03-mcts-ai/01a-mcts-tree-state-and-root-expansion.md)
- [tasks/phase-3/03-mcts-ai/01b-ucb1-search-loop-and-budgeted-runner.md](../../tasks/phase-3/03-mcts-ai/01b-ucb1-search-loop-and-budgeted-runner.md)
- [tasks/phase-3/03-mcts-ai/02-heuristic-evaluator-no-random-rollouts.md](../../tasks/phase-3/03-mcts-ai/02-heuristic-evaluator-no-random-rollouts.md)
- [tasks/phase-3/04-polish.md](../../tasks/phase-3/04-polish.md)
- [tasks/phase-3/04-polish/01a-renderer-capability-detection-and-adapter.md](../../tasks/phase-3/04-polish/01a-renderer-capability-detection-and-adapter.md)
- [tasks/phase-3/04-polish/01b-webgpu-map-renderer-parity.md](../../tasks/phase-3/04-polish/01b-webgpu-map-renderer-parity.md)
- [tasks/phase-3/04-polish/01c-webgpu-particles-fallback-and-benchmark.md](../../tasks/phase-3/04-polish/01c-webgpu-particles-fallback-and-benchmark.md)

Validation/tooling:

- [CONTRIBUTING.md](../../CONTRIBUTING.md)
- [scripts/check-repo-contracts.mjs](../../scripts/check-repo-contracts.mjs)

Removed or replaced task files:

- `tasks/phase-2/05-mod-system/05-reference-content-bundle.md`
- `tasks/phase-3/03-mcts-ai/01-mcts-core-ucb1-tree-search.md`
- `tasks/phase-3/04-polish/01-webgpu-optional-rendering-path.md`

## 3. Summary Of Changes

What was fixed:

- planning guidance now has one explicit solo-builder lane instead of
  scattering "what next?" across multiple mildly-overlapping docs
- content-schema folders are documented so schemas, record fixtures,
  pack fixtures, and generation fixtures are understandable in isolation
- stale schema/example references were corrected, including records that
  already existed but were still described as missing
- missing task-doc structure was filled in for schema tasks that lacked
  dependencies or acceptance criteria
- stale task dependencies were corrected where the content-schema module
  had drifted after new tasks were inserted
- oversized 8–16 hour tasks were split into smaller, 2–6 hour slices
- validation now fails if a task is missing core sections or exceeds the
  2–6 hour rule

Why:

- solo AI-assisted implementation depends more on clean task boundaries
  and explicit prerequisites than on additional design prose
- docs that do not reflect the current schema/example surface cause bad
  AI suggestions and wasted implementation time
- oversized backlog items create hidden dependency chains and make
  execution harder to parallelize or resume later
- task-hygiene drift needed an automated guard, not another manual note

## 4. Remaining Risks

- Runtime code still does not exist in `src/`; this pass improves the
  execution surface but does not implement engine/runtime modules.
- Module-level total estimates are still rough planning values, not
  audited summations for every module in the repo.
- Historical audit reports intentionally retain older file names and
  descriptions; they are preserved as snapshots rather than rewritten.
- The report links to canonical rewritten files instead of duplicating
  their full contents. That avoids drift, but anyone wanting literal
  file-by-file dumps should read the files directly.
