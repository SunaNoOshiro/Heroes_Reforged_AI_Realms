# Generation I/O Schemas (provider-neutral boundary)

Module: [AI Content Generation (M6)](../02-ai-generation.md)

Description:
Wire the two provider-neutral schemas
(`content-schema/schemas/generation-request.schema.json` and
`content-schema/schemas/generated-faction.schema.json`) into the
runtime as Zod validators and TypeScript types. These schemas are
the only surface the generation UI and provider adapters are allowed
to pass across — every concrete LLM provider (`GenerationProvider`
interface) accepts a `GenerationRequest` and returns a
`GeneratedFactionDraft`, nothing else. Swapping one vendor adapter
for another (or for a local model) is a constructor swap, not a
pipeline rewrite.

This task lands *before* Task 1 (prompt → provider adapter) because
the adapter must implement a typed interface from day one.

All AI code lives under `src/ai/`. Do not introduce a parallel
`src/generation/` tree — the architecture docs
(`docs/architecture/ai-integration.md`, `docs/architecture/overview.md`)
and the contract checker both treat `src/generation/` as a forbidden
path.

Read First:
- [`docs/architecture/ai-generation-pipeline.md`](../../../docs/architecture/ai-generation-pipeline.md)

Inputs:
- `content-schema/schemas/generation-request.schema.json`
- `content-schema/schemas/generated-faction.schema.json`

Outputs:
- `src/ai/generation/types.ts` — TS types + Zod schemas for both
  records (re-exports `GenerationRequest`, `GeneratedFactionDraft`)
- `src/ai/generation/provider.ts` — `GenerationProvider` interface:
  ```ts
  interface GenerationProvider {
    readonly name: string;
    generate(req: GenerationRequest): Promise<GeneratedFactionDraft>;
  }
  ```
- `src/ai/generation/validators.ts` — `validateRequest`,
  `validateDraft`; both return discriminated `{ ok: true, value } |
  { ok: false, errors }` with per-field error paths
- Vendor adapters live under `src/ai/providers/` (one file per
  vendor). They must not leak vendor identifiers into
  `src/ai/generation/` or into the UI layer.
- Example fixture:
  `content-schema/examples/generation/emberwild-roundtrip.json`
  (request input + expected draft output shape)

Owned Paths:
- `src/ai/generation/types.ts`
- `src/ai/generation/provider.ts`
- `src/ai/generation/validators.ts`

Dependencies:
- mvp.02-content-schemas.10-zod-validators-for-all-schemas

Acceptance Criteria:
- Both Zod validators round-trip the example fixture without errors
- `GenerationProvider` is the only exported shape coupling the UI to
  model backends — vendor-specific identifiers appear only inside
  `src/ai/providers/`, never in `src/ai/generation/` or in the UI
  layer
- A minimal `InMemoryEchoProvider` test double implements the
  interface and is used in unit tests
- Schema validation errors surface field paths (e.g.
  `draft.units[3].stats.attack`) so the UI can highlight the
  offending field
- `scripts/check-repo-contracts.mjs` passes — no file under
  `tasks/` or `docs/` references `src/generation/`
- The `seed.description` text on
  [`generation-request.schema.json`](../../../content-schema/schemas/generation-request.schema.json)
  is part of the schema contract (calls out that seed is a
  best-effort reproducibility hint, not a determinism guarantee).
  Implementations must not relax that wording when porting Zod
  types, because downstream code reads the description as the
  contract.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
