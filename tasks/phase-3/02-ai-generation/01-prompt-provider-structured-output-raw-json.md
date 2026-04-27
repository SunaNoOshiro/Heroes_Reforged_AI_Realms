# Prompt → Provider Adapter → Raw JSON

Status: planned

Module: [AI Content Generation (M6)](../02-ai-generation.md)

Description:
Send a user's faction description to a provider-neutral generation
adapter that guarantees structured JSON output. Concrete model SDKs live
behind a `GenerationProvider` interface so UI and gameplay code never
depend on one vendor.

Read First:
- [`docs/architecture/ai-generation-pipeline.md`](../../../docs/architecture/ai-generation-pipeline.md)

Inputs:
- User prompt (e.g., "Undead pirates with ghost ships and cursed cannons")
- `FactionSchema`, `UnitSchema`, `BuildingSchema` as tool definitions

Outputs:
- `src/ai/contracts/generation-provider.ts`
- `src/ai/generation/prompt-to-faction.ts`
- `generateFaction(prompt: string, provider: GenerationProvider): Promise<RawFactionData>`
- One structured-output provider adapter under `src/ai/providers/`
- Tool definitions derived from Zod schemas (auto-generate JSON Schema from Zod)
- System prompt includes: faction design guidelines, balance constraints, and the baseline corridor from `research/deep-research-report.md`
- Optional backend route under `services/ai-gateway/` when credentials
  cannot live in the client

Owned Paths:
- `src/ai/contracts/generation-provider.ts`
- `src/ai/generation/prompt-to-faction.ts`
- `src/ai/providers/`
- `research/deep-research-report.md`
- `services/ai-gateway/`

System prompt includes:
- "Generate a complete faction with 7 unit tiers (base + upgrade each)"
- "Each unit must have a unique identity — no generic fighters"
- "Units should have 1–3 abilities each drawn from the effect registry"
- Baseline stat corridor from `research/deep-research-report.md`
  (damage ranges, HP, speed per tier)
- The Emberwild reference pack is shown as a complete, validated
  example — the model is told to match the shape, not the theme

Dependencies:
- mvp.02-content-schemas.01-unit-schema
- mvp.02-content-schemas.02-faction-schema
- mvp.02-content-schemas.03-spell-schema
- mvp.02-content-schemas.04-artifact-schema
- mvp.02-content-schemas.05-building-schema
- mvp.02-content-schemas.06-ruleset-schema
- mvp.02-content-schemas.07-hero-schema
- mvp.02-content-schemas.08-adventure-building-plus-map-object-schemas
- mvp.02-content-schemas.09-animation-vfx-sound-townpresentation-schemas
- mvp.02-content-schemas.10-zod-validators-for-all-schemas
- mvp.02-content-schemas.12-formula-dsl
- mvp.02-content-schemas.13-effect-registry

Acceptance Criteria:
- Returns complete `RawFactionData` with 14 units, buildings, heroes
- Structured output — no need to parse free text
- Handles provider rate-limit errors with retry + backoff
- No UI component or browser-only code holds provider secrets directly
- Total generation time < 30 seconds

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
