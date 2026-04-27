# AI Integration

This file defines the boundary for provider-backed AI generation and
moderation work.

## Core Rule

The repo should depend on provider-neutral interfaces, not on one model
vendor.

## Ownership

- `src/ai/contracts/`
  Stable TypeScript interfaces such as `GenerationProvider` or
  `ModerationProvider`.
- `src/ai/providers/`
  Concrete adapters for specific model vendors or local implementations.
- `src/ai/generation/`
  Prompt construction, orchestration, validation, balancing, and
  reporting.
- `services/ai-gateway/`
  Optional backend boundary when secrets, rate limits, or moderation
  policy should not live in the browser.

## Rules

- UI code must not hardcode one vendor SDK.
- Browser code must not require raw provider API keys.
- Deterministic gameplay code must not call hosted AI providers.
- Generated content must still pass schema validation, coherence checks,
  and sandbox policy before it becomes loadable content.

## Recommended Interfaces

- `GenerationProvider.generateStructured(input): Promise<RawFactionData>`
- `ModerationProvider.moderate(input): Promise<ModerationResult>`

The exact interface can evolve, but orchestration code should accept the
contract, not a vendor client.

## Why This Matters

Provider-neutral boundaries make it easier to:

- swap vendors without rewriting the pipeline
- move execution between browser and backend
- test generation logic with local mocks or fixtures
- keep secrets and quotas outside the client when needed
