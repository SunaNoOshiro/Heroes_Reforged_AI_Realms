# Generation UI — Prompt → Preview → Download

Module: [AI Content Generation (M6)](../02-ai-generation.md)

Description:
In-game UI for the AI generation pipeline. User enters a description, watches progress, previews the faction, and downloads the mod pack.

Read First:
- [`docs/architecture/ai-generation-pipeline.md`](../../../docs/architecture/ai-generation-pipeline.md)
- `docs/architecture/wiki/screens/65-map-editor/spec.md`
- `docs/architecture/wiki/screens/65-map-editor/interactions.md`
- `docs/architecture/wiki/screens/65-map-editor/data-contracts.md`
- `docs/architecture/wiki/screens/65-map-editor/architecture.md`
- `docs/architecture/wiki/screens/65-map-editor/mockup.html`

Inputs:
- Tasks 1–6, `07-ui-shell.md`, `04-content-editor.md`
- Screen package `docs/architecture/wiki/screens/65-map-editor/`

Outputs:
- `src/ui/components/FactionGenerator.tsx`
- Text area: faction description
- Progress bar: steps (Generating → Validating → Balancing → Optimizing → Done)
- Preview: faction card with all 7 unit tiers shown
- Balance report: win rate vs Emberwild with Wilson 95 % CI, labelled
  "balanced" / "slightly OP" / "needs manual review" based on the CI
  band
- Download button: exports `.hrmod` file
- "Edit in Editor" button: opens faction in content editor for manual tweaks

Owned Paths:
- `src/ui/components/FactionGenerator.tsx`

Dependencies:
- phase-3.02-ai-generation.01-prompt-provider-structured-output-raw-json
- phase-3.02-ai-generation.02-schema-validation-plus-coherence-check
- phase-3.02-ai-generation.03-auto-balancer-headless-battle-baseline
- phase-3.02-ai-generation.04-gradient-free-stat-optimizer
- phase-3.02-ai-generation.05-asset-generation-stub-imagegen-api
- phase-3.02-ai-generation.06-content-moderation-plus-hard-caps

Acceptance Criteria:
- Full pipeline completes within 3 minutes for a typical prompt
- Progress bar updates at each pipeline stage (not just start/end)
- User can cancel generation at any stage
- Download produces a valid `.hrmod` file that loads in the mod manager
- Layout, bindings, and commands match `docs/architecture/wiki/screens/65-map-editor/mockup.html`, `docs/architecture/wiki/screens/65-map-editor/interactions.md`, and `docs/architecture/wiki/screens/65-map-editor/data-contracts.md`.
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.
- Each `ProviderFailure` class from
  [`content-schema/schemas/provider-failure.schema.json`](../../../content-schema/schemas/provider-failure.schema.json)
  (see [`07b-provider-failure-taxonomy.md`](./07b-provider-failure-taxonomy.md))
  is rendered with a distinct UI state: `transport` shows a
  retry-now affordance with backoff; `auth` opens a re-auth flow
  and disables retry until re-auth completes; `quota` shows a
  countdown timer using `cooldownMs`; `content-policy` opens a
  re-prompt UX that nudges the user to rephrase the prompt.
- A "Force regenerate" affordance bypasses the provider-response
  cache from
  [`docs/architecture/pack-lifecycle.md`](../../../docs/architecture/pack-lifecycle.md).

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
