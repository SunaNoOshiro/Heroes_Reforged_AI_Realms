# Content Moderation + Hard Caps

Module: [AI Content Generation (M6)](../02-ai-generation.md)

Description:
Before any generated content reaches the player, run moderation
checks: no offensive names/lore, no stat values exceeding hard caps,
sandbox flag set automatically. Hard caps themselves are no longer
re-decided here — they are loaded from
[`content-schema/schemas/balance-constraints.schema.json`](../../../content-schema/schemas/balance-constraints.schema.json)
(see sibling task
[`00b-balance-constraints-schema.md`](./00b-balance-constraints-schema.md))
so any non-orchestrator producer of `GeneratedFaction` (community
editor, hand-edited pack) is gated by the same numbers.

This task also writes the version pin into the materialized
manifest (`manifest.generation` per
[`00c-generation-config-schema.md`](./00c-generation-config-schema.md))
and writes `sandboxedReason: "ai-generated"` alongside the existing
`sandboxed: true` flag (per the new field added by
[`tasks/phase-2/05-mod-system/10-sandbox-enforcement-contract.md`](../../phase-2/05-mod-system/10-sandbox-enforcement-contract.md)).

Image moderation lives in the sibling task
[`06b-image-moderation.md`](./06b-image-moderation.md); this task
does not own image-moderation calls but MUST call the
`ModerationProvider.moderateImage` hook between Stage 5 and Stage 6
even for the placeholder SVG output of Task 5.

Read First:
- [`docs/architecture/ai-generation-pipeline.md`](../../../docs/architecture/ai-generation-pipeline.md)
- [`content-schema/schemas/balance-constraints.schema.json`](../../../content-schema/schemas/balance-constraints.schema.json)
- [`content-schema/schemas/generation-config.schema.json`](../../../content-schema/schemas/generation-config.schema.json)

Inputs:
- Generated faction data (Task 1), moderation provider adapter or
  local policy layer
- Hard caps loaded from
  [`content-schema/schemas/balance-constraints.schema.json`](../../../content-schema/schemas/balance-constraints.schema.json)

Outputs:
- `src/ai/contracts/moderation-provider.ts`
- `src/ai/generation/moderation.ts`
- `moderateContent(faction): ModerationResult`
- Hard caps consumed (not re-decided) from
  [`balance-constraints.schema.json`](../../../content-schema/schemas/balance-constraints.schema.json):
  HP ≤ 500, ATK ≤ 50, abilities per unit ≤ 5
- Offensive content: use `ModerationProvider` or explicit policy rules
  behind a provider-neutral contract
- Auto-set: `sandboxed: true` on all AI-generated packs (cannot be overridden)
- Auto-set: `sandboxedReason: "ai-generated"` on all AI-generated packs
- Auto-set: `manifest.generation` block populated with the
  orchestrator semver, prompt-template hash, and ruleset hash per
  [`generation-config.schema.json`](../../../content-schema/schemas/generation-config.schema.json)

Owned Paths:
- `src/ai/contracts/moderation-provider.ts`
- `src/ai/generation/moderation.ts`

Dependencies:
- phase-3.02-ai-generation.00b-balance-constraints-schema
- phase-3.02-ai-generation.00c-generation-config-schema
- phase-3.02-ai-generation.01-prompt-provider-structured-output-raw-json
- phase-3.02-ai-generation.02-schema-validation-plus-coherence-check

Acceptance Criteria:
- A unit named with a slur is blocked with `ModerationResult.blocked = true`
- Unit with HP=1000 is hard-capped to HP=500 with a warning in the
  result (the cap value is read from
  `balance-constraints.schema.json`, not hard-coded here).
- All AI-generated packs have `sandboxed: true` in their manifest
- All AI-generated packs have `sandboxedReason: "ai-generated"` in
  their manifest
- All AI-generated packs have a populated `manifest.generation`
  block (`orchestratorVersion`, `promptTemplateHash`, `rulesetHash`);
  failure to populate fails Stage 6 of the pipeline.
- Stage 5.5 image-moderation hook is called for every asset present
  in the materialized pack, even SVG placeholders from Task 5.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
