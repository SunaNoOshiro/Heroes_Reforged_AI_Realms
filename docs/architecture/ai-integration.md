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
  policy should not live in the browser. **Out of scope for 1.x**
  per [`DEF-017`](../planning/deferred.md); the 1.x path is
  **BYO-key** per [plan 29](../implementation-plans/29-rate-limiting-and-secret-management-plan.md)
  with no project-side secret. Today the directory carries
  contracts + retention rules only; no runtime.

## Rules

- UI code must not hardcode one vendor SDK.
- Browser code must not require raw provider API keys.
- Deterministic gameplay code must not call hosted AI providers.
- Generated content must still pass schema validation, coherence checks,
  and sandbox policy before it becomes loadable content.

## Recommended Interfaces

- `GenerationProvider.generateStructured(input): Promise<RawFactionData>`
- `ModerationProvider.moderate(input): Promise<ModerationResult>`
- `ModerationProvider.moderateImage(asset): Promise<ImageModerationReport>`

The exact interface can evolve, but orchestration code should accept the
contract, not a vendor client. Vendor selection for image moderation
is operational (which hosted moderation API to use), not a contract
decision — the same rule that applies to `GenerationProvider`.

The image-moderation report shape is pinned in
[`image-moderation-report.schema.json`](../../content-schema/schemas/image-moderation-report.schema.json):
three independent verdicts (NSFW, copyright/likeness, style
conformance) so each can fail independently and route to a distinct
UI recovery action.

## Provider failure taxonomy

Provider transport-layer failures form a closed four-class union
(see
[`provider-failure.schema.json`](../../content-schema/schemas/provider-failure.schema.json))
so the Generation UI can render distinct recovery actions instead of
a generic "failed" message:

- **`transport`** — timeout, network blip, 5xx response. Auto-retry
  with backoff up to N attempts; `retryAfterMs` carries the
  suggested delay.
- **`auth`** — invalid or expired credentials. Open a re-auth flow;
  do not auto-retry.
- **`quota`** — rate limit or per-period cap. Show a cooldown timer
  using `cooldownMs`; retry after expiry.
- **`content-policy`** — provider safety filter refused the request.
  Open a re-prompt UX nudging the user to rephrase; do not
  auto-retry.

This taxonomy is **independent** of the shape/coherence/balance
classes from
[`retry-policy.schema.json`](../../content-schema/schemas/retry-policy.schema.json) —
both can fire on the same generation. Adapters under
`src/ai/providers/` translate vendor-specific error shapes into one
of these four classes; orchestration and UI code never read
vendor-specific identifiers.

## Transport

The AI gateway and any direct provider calls reachable from the
client run over **HTTPS only**, with the TLS floor, cipher
allowlist, HSTS, anti-downgrade, and cert-lifecycle policy pinned
by [`transport-security.md`](./transport-security.md). The required
response headers (HSTS, `Access-Control-Allow-Origin` pinned to the
canonical web origin — never `*`) are pinned by
[`web-headers.md`](./web-headers.md). The AI-gateway adapter
refuses to attach to an `http://` upstream regardless of
environment.

## Why This Matters

Provider-neutral boundaries make it easier to:

- swap vendors without rewriting the pipeline
- move execution between browser and backend
- test generation logic with local mocks or fixtures
- keep secrets and quotas outside the client when needed
