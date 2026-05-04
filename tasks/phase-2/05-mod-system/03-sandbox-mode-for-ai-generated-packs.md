# Sandbox Mode for AI-Generated Packs

Status: planned

Module: [Pack Runtime / Mod System (M4)](../05-mod-system.md)

Description:
AI-generated content packs are automatically sandboxed: they cannot be used in ranked matches and display a visible indicator. Sandbox rules:
1. Pack flag `sandboxed: true` (set by AI generation pipeline, cannot be removed)
2. All units hard-capped: HP ≤ 500, ATK ≤ 50, abilities count ≤ 5
3. Cannot be signed as "official"

Read First:
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)
- [`docs/architecture/ai-generation-pipeline.md`](../../../docs/architecture/ai-generation-pipeline.md)

Inputs:
- Task 1, Task 2

Outputs:
- `src/content-runtime/mod-sandbox.ts`
- `validateSandboxCaps(unit: Unit): Result<Unit, CapViolation[]>`
- Applied to every unit in packs with `sandboxed: true`
- `SANDBOX` badge displayed on pack in mod manager

Owned Paths:
- `src/content-runtime/mod-sandbox.ts`

Dependencies:
- phase-2.05-mod-system.01-zip-pack-loader-jszip-plus-manifest-parser
- phase-2.05-mod-system.02-ed25519-signature-verification

Acceptance Criteria:
- AI pack with HP=1000 unit is rejected with `pack.error.sandbox.cap`
  ("HP cap exceeded (max 500)").
- Sandbox badge is visible and cannot be removed from sandboxed
  packs.
- Non-sandboxed pack with same unit loads fine (caps only apply to
  sandboxed packs).
- Sandboxed packs out of the balance corridor — either per-unit
  (`pack.error.balance.outOfCorridor`) or pack-wide
  (`pack.error.balance.factionImbalance`) — surface a
  `BALANCE-WARN` badge alongside `SANDBOX` instead of failing
  (downgraded codes per
  [`mvp.02b-asset-pipeline.15-balance-corridor-validator`](../../mvp/02b-asset-pipeline/15-balance-corridor-validator.md)
  / [`pack-error-codes.md`](../../../docs/architecture/pack-error-codes.md)).

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
