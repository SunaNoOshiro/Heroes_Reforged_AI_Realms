# Schema Validation + Coherence Check

Status: planned

Module: [AI Content Generation (M6)](../02-ai-generation.md)

Description:
Validate the generated JSON against the shared schema validator entry
point, then run deterministic coherence checks that schemas alone
cannot catch: duplicate IDs, building-tree cycles, impossible unit
stats, and pack-shape gaps.

Read First:
- [`docs/architecture/ai-generation-pipeline.md`](../../../docs/architecture/ai-generation-pipeline.md)

Inputs:
- Raw JSON from Task 1
- Schema validators (`02-content-schemas.md` Task 10)

Outputs:
- `src/ai/generation/validate-generated.ts`
- `src/ai/generation/check-generated-coherence.ts`
- `validateGenerated(raw: RawFactionData): Result<ValidatedFaction, ValidationReport>`
  whose error shape matches
  [`content-schema/schemas/validation-report.schema.json`](../../../content-schema/schemas/validation-report.schema.json)
  (sharing the closed `findings[]` shape with
  [`content-schema/schemas/report-base.schema.json`](../../../content-schema/schemas/report-base.schema.json)).
- `checkCoherence(faction: ValidatedFaction): CoherenceReport`
  whose output shape matches
  [`content-schema/schemas/coherence-report.schema.json`](../../../content-schema/schemas/coherence-report.schema.json).
- Coherence checks:
  - No unit ID collision with any existing pack that ships in the default load-order
  - `dmgMin ≤ dmgMax` for all units
  - Building tree is a DAG (no cycles)
  - Each tier has exactly 2 units (base + upgrade)
  - No ability references a nonexistent ability ID (flag as warning, not error)
- Auto-repair: for minor issues (missing optional fields), fill in sensible defaults

Owned Paths:
- `src/ai/generation/validate-generated.ts`
- `src/ai/generation/check-generated-coherence.ts`

Dependencies:
- phase-3.02-ai-generation.01-prompt-provider-structured-output-raw-json
- mvp.02-content-schemas.10-zod-validators-for-all-schemas

Acceptance Criteria:
- Valid generated faction passes with 0 errors
- Faction with `dmgMin > dmgMax` is rejected with specific unit + field in error
- Auto-repair fills missing `weeklyGrowth` with tier-appropriate default
- Coherence report distinguishes blocking errors from warnings
- Coherence check runs in < 500ms
- Coherence failures route through the `RetryPolicy` from
  [`content-schema/schemas/retry-policy.schema.json`](../../../content-schema/schemas/retry-policy.schema.json)
  (see [`02b-retry-policy.md`](./02b-retry-policy.md)) — `coherence`
  retries respect `maxAttempts` and the `degrade` exhaustion action
  drops the referencing record instead of failing the whole pack.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
