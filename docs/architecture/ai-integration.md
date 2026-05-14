# AI Integration

Boundary doctrine for **provider-backed** AI generation and
moderation. The gameplay-opponent runtime (heuristic + MCTS) lives in
[`ai-contract.md`](./ai-contract.md). The end-to-end pipeline that
turns a prompt into a loadable faction pack lives in
[`ai-generation-pipeline.md`](./ai-generation-pipeline.md). This doc
pins the **vendor-neutral interfaces, ownership, and transport
floor**; the pipeline doc concretizes the stages.

Read first:

- [`ai-generation-pipeline.md`](./ai-generation-pipeline.md) — stage
  diagram, typed boundaries, failure reports.
- [`ai-contract.md`](./ai-contract.md) — gameplay-AI runtime (out of
  scope here).
- [`transport-security.md`](./transport-security.md) — TLS floor,
  cipher allowlist, HSTS, anti-downgrade.
- [`web-headers.md`](./web-headers.md) — CSP / CORS / required
  response headers.
- [`trust-boundaries.md`](./trust-boundaries.md) — "client is fully
  untrusted" axiom; AI prompts and completions are adversarial input
  until validated.

---

## 1. Core rule

The repo depends on **provider-neutral interfaces**, not on one model
vendor. Vendor selection (which hosted text or image model to use) is
operational, never a contract.

## 2. Ownership

| Path | Responsibility |
|---|---|
| [`src/ai/contracts/`](../../src/ai/contracts/) | Stable TypeScript interfaces (`GenerationProvider`, `ModerationProvider`). |
| [`src/ai/providers/`](../../src/ai/providers/) | Concrete adapters per vendor or local mock. Vendor-specific retries, token accounting, and rate limits stay here and MUST NOT leak upward. |
| `src/ai/generation/` (planned) | Prompt construction, orchestration, validation, balance, reporting. |
| [`services/ai-gateway/`](../../services/ai-gateway/) | Optional backend boundary when secrets, rate limits, or moderation policy must stay off-client. **Out of scope for 1.x** per [`DEF-017`](../planning/deferred.md). The 1.x path is **BYO-key** with no project-side secret; the directory carries contracts + retention rules only ([`retention.md`](../../services/ai-gateway/retention.md), [`error-codes.md`](../../services/ai-gateway/error-codes.md)). |

The `src/ai/` side-effect envelope (worker boundary, seeded RNG,
provider calls through this contract) is pinned in
[`side-effect-matrix.md`](./side-effect-matrix.md).

## 3. Rules

- UI code MUST NOT hardcode one vendor SDK.
- Browser code MUST NOT require raw provider API keys (the 1.x
  BYO-key flow asks the player to supply their own key; the project
  bundles none).
- Deterministic gameplay code MUST NOT call hosted AI providers.
  Provider determinism is best-effort only — see
  [`ai-generation-pipeline.md` § Determinism boundary](./ai-generation-pipeline.md#determinism-boundary).
- Generated content MUST still pass schema validation, coherence,
  balance, and (for assets) image moderation before it becomes
  loadable content.

## 4. Recommended interfaces

```ts
GenerationProvider.generateStructured(input): Promise<RawFactionData>
ModerationProvider.moderate(input): Promise<ModerationResult>
ModerationProvider.moderateImage(asset): Promise<ImageModerationReport>
```

Orchestration code accepts the contract, not a vendor client. The
exact shape may evolve; what is fixed is the provider-neutral seam.

The `ImageModerationReport` shape is pinned in
[`image-moderation-report.schema.json`](../../content-schema/schemas/image-moderation-report.schema.json):
three independent verdicts (`nsfw`, `ipLikeness`, `styleConformance`)
so each can fail independently and route to a distinct UI recovery
action. A non-pass on any verdict blocks Stage 6 pack materialize per
[`ai-generation-pipeline.md`](./ai-generation-pipeline.md) Stage 5.5.
Schema-matrix row: [`schema-matrix.md`](./schema-matrix.md) ›
`ImageModerationReport`.

## 5. Provider failure taxonomy

Provider transport-layer failures form a **closed four-class union**
pinned in
[`provider-failure.schema.json`](../../content-schema/schemas/provider-failure.schema.json),
so the Generation UI can render distinct recovery actions instead of
a generic "failed" message:

| `kind` | Trigger | UI action | Auto-retry? | Carrier field |
|---|---|---|---|---|
| `transport` | timeout, network blip, 5xx | retry-now button + auto-backoff | yes, up to N attempts | `retryAfterMs` |
| `auth` | invalid / expired credentials | open re-auth flow | no | `reauthUrl` |
| `quota` | rate limit or per-period cap | cooldown timer | after expiry | `cooldownMs` |
| `content-policy` | provider safety filter refused | re-prompt nudge | no | `policyCode` |

Every variant also carries `providerId` and a human-readable
`message`. Adapters under `src/ai/providers/` translate vendor
error shapes into one of these four classes; orchestration and UI
code never read vendor-specific identifiers.

This taxonomy is **independent** of the shape / coherence / balance
retry classes pinned in
[`retry-policy.schema.json`](../../content-schema/schemas/retry-policy.schema.json) —
both can fire on the same generation. Schema-matrix rows:
`ProviderFailure`, `RetryPolicy`. Cross-layer error map:
[`error-schema-map.md`](./error-schema-map.md).

## 6. Transport

The AI gateway and any direct provider call reachable from the
client run over **HTTPS only**. The TLS floor, cipher allowlist,
HSTS, anti-downgrade, and cert-lifecycle policy are pinned by
[`transport-security.md`](./transport-security.md). Required
response headers (HSTS, `Access-Control-Allow-Origin` pinned to the
canonical web origin — never `*`) are pinned by
[`web-headers.md`](./web-headers.md).

The AI-gateway adapter MUST refuse to attach to an `http://`
upstream regardless of environment (per
[`transport-security.md` § 1](./transport-security.md#1-listener-wss-only--https-only)).

## 7. Why this matters

Provider-neutral seams let us swap vendors without rewriting the
pipeline, move execution between browser and backend (BYO-key today,
hosted gateway under [`DEF-017`](../planning/deferred.md) tomorrow),
test generation logic against local mocks, and keep secrets and
quotas off-client when the gateway lands.

---

## 🔍 Sync Check

- **UI: ✔** — No project-owned screen package owns the Generation UI yet (closest UI surfaces are screens 73 ugc-publish-disclaimer and 74 ai-provenance-detail; neither contradicts this doc). The four `ProviderFailure` classes are pinned at the schema layer and consumed by the future Generation UI per § 5.
- **Schema: ✔** — `image-moderation-report.schema.json`, `provider-failure.schema.json`, and `retry-policy.schema.json` enums and field names match § 4 / § 5; rows present in [`schema-matrix.md`](./schema-matrix.md) (`ImageModerationReport`, `ProviderFailure`, `RetryPolicy`).
- **Tasks: ✔** — Owning tasks reciprocally cite this doc: [`phase-3/02-ai-generation/06b-image-moderation.md`](../../tasks/phase-3/02-ai-generation/06b-image-moderation.md), [`phase-3/02-ai-generation/07b-provider-failure-taxonomy.md`](../../tasks/phase-3/02-ai-generation/07b-provider-failure-taxonomy.md), [`phase-3/02-ai-generation/00-generation-io-schemas.md`](../../tasks/phase-3/02-ai-generation/00-generation-io-schemas.md), [`phase-3/02-ai-generation/10-ai-gateway-retention-and-error-codes.md`](../../tasks/phase-3/02-ai-generation/10-ai-gateway-retention-and-error-codes.md). DEF-017 status is in [`deferred.md`](../planning/deferred.md).

## ⚠ Issues

- **`RawFactionData` is referenced but not pinned.** § 4 declares `GenerationProvider.generateStructured(input): Promise<RawFactionData>`, and Task [`phase-3/02-ai-generation/01-prompt-provider-structured-output-raw-json.md`](../../tasks/phase-3/02-ai-generation/01-prompt-provider-structured-output-raw-json.md) repeats the type, but no `RawFactionData` schema or TypeScript alias exists in the repo. The pipeline doc's Stage 2 output is "Raw structured JSON (vendor-shaped)" while Stage 3 output is the typed `GeneratedFaction`. Per CLAUDE.md root contract on adversarial input ("AI completion is adversarial input until validated by a named gate"), the pre-Stage-3 type should be either an explicit alias for `unknown` / `JsonValue` or a thin guard schema. Owned by Task 01 (prompt-provider structured output). Suggested values: either define `RawFactionData = unknown` in `src/ai/contracts/` and link the pipeline's Stage 3 validator as the gate, or rename the return type to `Promise<unknown>` and document Stage 3 as the type-narrowing seam. The audit did not silently rewrite the symbol because both sibling files use it.
- **`GenerationProvider.generateStructured` input parameter is unannotated.** § 4 shows the input as the bare identifier `input`, while [`ai-generation-pipeline.md` Stage 1](./ai-generation-pipeline.md) pins it as a [`GenerationRequest`](../../content-schema/schemas/generation-request.schema.json). Tightening the signature to `(req: GenerationRequest)` here would make the seam unambiguous. Per Hard Prohibition A the audit kept the original wording and flagged the gap. Owner: same as above (Task 01).
