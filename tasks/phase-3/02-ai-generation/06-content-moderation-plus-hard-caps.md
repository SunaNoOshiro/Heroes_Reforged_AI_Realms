# Content Moderation + Hard Caps

Status: planned

Module: [AI Content Generation (M6)](../02-ai-generation.md)

Description:
Before any generated content reaches the player, run moderation checks: no offensive names/lore, no stat values exceeding hard caps, sandbox flag set automatically.

Read First:
- [`docs/architecture/ai-generation-pipeline.md`](../../../docs/architecture/ai-generation-pipeline.md)

Inputs:
- Generated faction data (Task 1), moderation provider adapter or local
  policy layer

Outputs:
- `src/ai/contracts/moderation-provider.ts`
- `src/ai/generation/moderation.ts`
- `moderateContent(faction): ModerationResult`
- Hard caps (enforced regardless of optimizer output): HP ≤ 500, ATK ≤ 50, abilities per unit ≤ 5
- Offensive content: use `ModerationProvider` or explicit policy rules
  behind a provider-neutral contract
- Auto-set: `sandboxed: true` on all AI-generated packs (cannot be overridden)

Owned Paths:
- `src/ai/contracts/moderation-provider.ts`
- `src/ai/generation/moderation.ts`

Dependencies:
- phase-3.02-ai-generation.01-prompt-provider-structured-output-raw-json
- phase-3.02-ai-generation.02-schema-validation-plus-coherence-check

Acceptance Criteria:
- A unit named with a slur is blocked with `ModerationResult.blocked = true`
- Unit with HP=1000 is hard-capped to HP=500 with a warning in the result
- All AI-generated packs have `sandboxed: true` in their manifest

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
