# Evaluation — Generate + Play 5 New Factions

Status: planned

Module: [AI Content Generation (M6)](../02-ai-generation.md)

Description:
Quality gate: generate 5 distinct factions, verify they all pass balance tests, and manually play 1 battle with each to confirm they're fun and thematically coherent.

Read First:
- [`docs/architecture/ai-generation-pipeline.md`](../../../docs/architecture/ai-generation-pipeline.md)

Inputs:
- All tasks in this module

Outputs:
- `src/ai/generation/__tests__/generation-eval.ts`
- Headless: generate 5 factions with different themes, run balance tests
- Report: win rate, optimization iterations needed, any moderation blocks

Owned Paths:
- `src/ai/generation/__tests__/generation-eval.ts`

Test prompts:
1. "Undead pirates with ghost ships and cursed cannons"
2. "Mechanical clockwork golems powered by steam"
3. "Ancient forest spirits that grow stronger near trees"
4. "Deep sea creatures with bioluminescence and crushing pressure"
5. "Celestial monks who channel starlight into combat abilities"

Dependencies:
- phase-3.02-ai-generation.01-prompt-provider-structured-output-raw-json
- phase-3.02-ai-generation.02-schema-validation-plus-coherence-check
- phase-3.02-ai-generation.03-auto-balancer-headless-battle-baseline
- phase-3.02-ai-generation.04-gradient-free-stat-optimizer
- phase-3.02-ai-generation.05-asset-generation-stub-imagegen-api
- phase-3.02-ai-generation.06-content-moderation-plus-hard-caps
- phase-3.02-ai-generation.07-generation-ui-prompt-preview-download

Acceptance Criteria:
- All 5 factions generate successfully (no pipeline failures)
- All 5 reach a Wilson 95 % CI inside [40 %, 60 %] vs Emberwild within
  10 optimiser iterations
- Manual review: factions are thematically coherent (names match description)

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
