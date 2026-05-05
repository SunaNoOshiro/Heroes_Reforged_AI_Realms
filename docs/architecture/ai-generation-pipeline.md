# AI Generation Pipeline

How a user prompt becomes loadable faction content, step by step.

This file concretizes [`ai-integration.md`](./ai-integration.md) into
a running pipeline: which schemas cross each boundary, what validates
at each step, and where a run can fail. The pipeline is
provider-neutral — no vendor name appears in any record.

## Determinism boundary

`GenerationRequest.seed` is a **best-effort reproducibility hint** —
not a determinism guarantee. Provider output may be non-deterministic
even with the same seed (temperature drift, model version rotation),
so callers must not depend on bit-identical re-runs from the provider
call alone. **Determinism in this pipeline begins at Stage 4 onward,
once content is shape- and coherence-validated.** Stages 4–6 are
pure functions of their typed inputs; saves, replays, and multiplayer
load `GeneratedFaction` records that have already crossed that
boundary, so they remain reproducible. See
[`determinism.md`](./determinism.md) for the engine-side contract.

## Stages

```
user prompt / theme
       │
       ▼
┌──────────────────────┐   GenerationRequest schema
│ 1. Request assembly  │   (generation-request.schema.json)
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐   provider-neutral structured output
│ 2. Provider call     │   GenerationProvider.generateStructured
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐   GeneratedFaction schema
│ 3. Shape validation  │   (generated-faction.schema.json)
└──────────┬───────────┘
           │                   fail → return ValidationReport
           ▼
┌──────────────────────┐   ruleset + corridor
│ 4. Coherence check   │   (ID resolution + stat corridor gate)
└──────────┬───────────┘
           │                   fail → return CoherenceReport
           ▼
┌──────────────────────┐   headless auto-resolve vs first-party
│ 5. Auto-balance gate │   Wilson 95 % CI ∈ [35 %, 65 %]
└──────────┬───────────┘
           │                   fail → return BalanceReport
           ▼
┌──────────────────────┐   ModerationProvider.moderateImage(asset)
│ 5.5 Image moderation │   NSFW / IP-likeness / style conformance
└──────────┬───────────┘   → ImageModerationReport
           │                   fail → return ImageModerationReport
           ▼
┌──────────────────────┐   per-role dimension/palette/frame normalization
│ 5.6 Asset normalize  │   (asset-normalization.md)
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐   writes faction pack on disk
│ 6. Pack materialize  │   (manifest + records + assets/index.json)
└──────────┬───────────┘
           │
           ▼
     loadable faction pack
```

Every arrow is a typed boundary. No stage mutates the previous
stage's output in place; each stage produces a new value with its
own report.

## Stage contracts

### 1. Request assembly

Input: user prompt + optional seed faction reference.
Output: a [`GenerationRequest`](../../content-schema/schemas/generation-request.schema.json)
object.

The request carries theme, tier bands, power budget, constraints,
and reference-faction ID. It does **not** carry a model name or
vendor key — the orchestrator picks the provider from config.

### 2. Provider call

Input: `GenerationRequest`.
Output: raw structured JSON (vendor-shaped).

The `GenerationProvider` adapter is responsible for turning the
request into a vendor-specific prompt and parsing the structured
response. Any vendor-specific retry, token accounting, or
rate-limiting lives here and must not leak into later stages.

### 3. Shape validation

Input: raw JSON from stage 2.
Output: a typed [`GeneratedFaction`](../../content-schema/schemas/generated-faction.schema.json)
or a [`ValidationReport`](../../content-schema/schemas/validation-report.schema.json)
with field-path errors.

Implemented via Zod (see
[`src/content-schema/README.md`](../../src/content-schema/README.md)).
The report shape is shared with the coherence and balance stages
through [`report-base.schema.json`](../../content-schema/schemas/report-base.schema.json).
Discriminated-union failures (unknown effect kind, cross-kind
specialty fields) surface at this stage with human-readable paths.

Shape validation also fails on numeric-cap violations from
[`balance-constraints.schema.json`](../../content-schema/schemas/balance-constraints.schema.json)
(HP, ATK, abilities-per-unit). The constraints schema is the single
source of truth so any non-orchestrator producer of `GeneratedFaction`
(community editor, hand-edited pack) is gated by the same numbers
the orchestrator uses.

### 4. Coherence check

Input: validated `GeneratedFaction`.
Output: a [`CoherenceReport`](../../content-schema/schemas/coherence-report.schema.json)
(closed shape; carries cross-record consistency findings).

Checks performed:
- Every referenced `unitId`, `abilityId`, `buildingId`, `skillId` is
  either defined inside the generated faction or resolvable through
  the declared pack dependencies (usually `shared_abilities` and
  `shared_skills`). Unresolved IDs fail the stage.
- Every unit's stats fit inside the tier corridor from
  [`research/deep-research-report.md`](../../research/deep-research-report.md).
  Outliers are allowed only when the unit has a compensating ability.
- Every cost uses only the canonical resource enum from
  [`resource-id.schema.json`](../../content-schema/schemas/resource-id.schema.json).
- Every building prerequisite exists in the same town tree.

### 5. Auto-balance gate

Input: validated `GeneratedFaction`.
Output: a [`BalanceReport`](../../content-schema/schemas/balance-report.schema.json)
with Wilson 95 % confidence interval over N headless auto-resolves
against first-party factions.

Gate: the generated faction's win rate CI must overlap
`[35 %, 65 %]` against every first-party faction. Below 35 % → too
weak, reject. Above 65 % → too strong, reject. Inside → the orchestrator
may accept or route to a stat optimizer for narrowing.

This stage exists as a standalone task in
[`tasks/phase-3/02-ai-generation/03-auto-balancer-headless-battle-baseline.md`](../../tasks/phase-3/02-ai-generation/03-auto-balancer-headless-battle-baseline.md).

### 5.5 Image moderation

Input: each AI-generated asset (sprite, portrait, building, ability
icon).
Output: an
[`ImageModerationReport`](../../content-schema/schemas/image-moderation-report.schema.json)
per asset, carrying three independent verdicts (NSFW,
copyright/likeness, style conformance). A non-pass on any verdict
blocks pack materialize. The provider-neutral
`ModerationProvider.moderateImage(asset)` adapter is defined in
[`ai-integration.md`](./ai-integration.md). Even Task 5's placeholder
SVG path MUST call the hook so the integration seam never falls out
of the pipeline.

### 5.6 Asset normalize

Input: moderated asset bytes.
Output: dimension-, palette-, and frame-count-normalized assets
ready for pack materialize. The four normalization rules
(dimension, palette, frame counts, atlas binding) live in
[`asset-normalization.md`](./asset-normalization.md). Normalization
runs **after** moderation and **before** pack materialize so the
renderer sees uniform sprite dimensions, per-faction palette
consistency, and uniform inputs into the deterministic atlas
packer (see [`pack-contract.md` § Atlas Generation`](./pack-contract.md#atlas-generation)).

### 6. Pack materialize

Input: accepted `GeneratedFaction`.
Output: faction pack directory with:
- `manifest.json` declaring dependencies and `contentHash`
- **Normalize before bind**: assets are written from the normalized
  bytes produced at Stage 5.6 (see
  [`asset-normalization.md`](./asset-normalization.md)) — the
  materializer never accepts raw provider output without
  normalization.
- **Version pin**: `manifest.generation` carries the orchestrator
  semver, prompt-template hash, and ruleset hash per
  [`generation-config.schema.json`](../../content-schema/schemas/generation-config.schema.json).
  Failure to populate fails Stage 6.
- **Sandbox metadata**: `sandboxed: true` and
  `sandboxedReason: "ai-generated"` are auto-set; the
  sandbox-enforcement layer (see
  [`pack-contract.md` § Sandbox enforcement`](./pack-contract.md#sandbox-enforcement))
  reads both fields.
- **AI provenance disclosure**: Stage 6 emits the
  `manifest.aiProvenance` block by re-asserting the values from
  `GeneratedFaction.notes` (`providerId`, `modelHint`,
  `modelVersion`, `promptHash`, `tokenCount`,
  `playerInspectable`, optional truncated `promptExcerpt` ≤ 280
  chars). `aiProvenance.present` is set to `true`. Screen 74
  (`ai-provenance-detail`) is the player-facing surface that
  consumes this block, per [`ugc-safety.md`](./ugc-safety.md).
- **Optional publish ack**: if the user picks "Save and share"
  instead of "Save locally", Stage 6 routes the export through
  screen 73 (`ugc-publish-disclaimer`) which records a per-pack
  `signed-acks/<contentHash>.json` companion file before writing
  the `.hrmod`.
- records under `units/`, `heroes/`, `buildings/`, `abilities/`
- `assets/index.json` with placeholder asset bindings
- raw per-frame PNGs under `sprites/<entityId>/<frame>.png`
- `atlas-manifest.json` listing each entity to be packed at
  publish time

The manifest declares `shared_abilities` and `shared_skills` as
dependencies whenever the generated faction references shared IDs;
the materializer never inlines a shared record.

**AI output is per-frame, never atlased.** The pack-publish step
(see [`atlas-pipeline.md`](./atlas-pipeline.md)) is the **only**
step allowed to produce `<pack>/atlases/<entityId>.png` and
`<pack>/atlases/<entityId>.atlas.json`. AI-generated and
hand-authored packs share the same packer, the same flags, and the
same lexicographic input ordering, so atlas bytes are byte-identical
across machines for the same input set. This is what keeps
deterministic UV sampling stable across pack origins.

## Failure modes

Outer-loop retry behavior for shape, coherence, and balance failures
is pinned in
[`retry-policy.schema.json`](../../content-schema/schemas/retry-policy.schema.json)
(canonical example
[`retry-policy/canonical.retry-policy.json`](../../content-schema/examples/retry-policy/canonical.retry-policy.json)).
Each policy entry carries `maxAttempts`, `onExhaust`
(`fail` / `degrade` / `escalate-to-user`), and `backoff`. The
optimizer's 10-iteration cap is the inner loop and is unchanged.

| Stage | Failure | Response |
|---|---|---|
| 3 | Unknown effect `kind` | Return `ValidationReport`; consume `RetryPolicy.shape` (max 2 re-prompts with the validation report attached as a fix-this instruction); on exhaust, surface to user. |
| 3 | Numeric cap violation (`balance-constraints.schema.json`) | Return `ValidationReport`; treated as shape failure under `RetryPolicy.shape`. |
| 4 | Unresolved ability ID | Return `CoherenceReport`; consume `RetryPolicy.coherence` (max 1 re-prompt with resolved-ID hints); on exhaust, drop the referencing record (`onExhaust: degrade`). |
| 4 | Stat outside corridor | Return `CoherenceReport`; optionally route to stat optimizer (task 02-ai-generation/04). |
| 5 | CI below 35 % or above 65 % | Return `BalanceReport`; consume `RetryPolicy.balance` (no re-prompt); route to optimizer or reject. |
| 5.5 | NSFW / IP-likeness / style verdict failure | Return `ImageModerationReport`; block pack materialize; surface per-verdict UI recovery. |
| 6 | `contentHash` collision with existing pack | Fail pack write; require rename. |
| 6 | Missing `manifest.generation` block | Fail Stage 6 (the version pin is mandatory at materialize time). |

Provider transport-layer failures (timeout, rate-limit, auth,
content-policy refusal) form a separate axis from the
shape/coherence/balance classes above and are pinned in
[`provider-failure.schema.json`](../../content-schema/schemas/provider-failure.schema.json);
the four classes (`transport`, `auth`, `quota`, `content-policy`)
each map to a distinct UI recovery action — see
[`ai-integration.md`](./ai-integration.md).

## Gameplay vs Presentation Boundary

AI-generated assets carry **pixels and audio waveforms only**. Any
field that affects deterministic state — frame timing, hitbox
geometry, projectile speed, attack-frame index — is a **gameplay
record**, gated by the pre-ingest validator (stage 3 above) and
loaded pre-session via the gameplay-record path. The streamed
asset path never accepts an AI-generated *gameplay* record at
runtime.

This rule is enforced because animation manifests (which encode
attack-frame *timing*) sit on the boundary: timing data is
gameplay and must travel through the validated record path. Pixels
that decorate those frames travel through the streamed asset path
and obey the fallback chain in
[`docs/architecture/edge-cases-policy.md` § 12](./edge-cases-policy.md#12-asset-load-failure-q215).

## Lifecycle

Provider-response caching, sandbox-pack disk quotas, GC, and
ownership of the lifecycle layer (launcher vs generator UI) live in
[`pack-lifecycle.md`](./pack-lifecycle.md). The four policies that
file pins:

1. **Provider-response cache** keyed by
   `(promptHash, seed, providerId, modelHint)` with a 30-day TTL
   and a "force regenerate" bypass exposed in the generator UI.
2. **Disk-quota policy** for sandboxed packs (per-user soft / hard
   cap, LRU-by-last-loaded eviction).
3. **GC rule** invoked on launch and on the explicit "Manage AI
   content" action.
4. **Lifecycle ownership** — the launcher owns the cache and GC;
   the generator UI owns the force-regenerate override.

GC distinguishes AI-generated packs from user-edited packs by
reading `manifest.sandboxedReason` (set to `"ai-generated"` at
Stage 6).

## What the pipeline does not do

- **No determinism guarantee on provider output.** Provider calls
  may be non-deterministic; the pipeline treats raw output as
  untrusted input. Determinism begins at stage 4 onward, once content
  is validated.
- **No moderation gate.** Moderation is a separate
  `ModerationProvider` step called before stage 1 if configured; it
  is not part of the content contract.
- **No runtime mutation.** Pack materialization writes once. Live
  games never rewrite pack records based on telemetry.

## Transport

Stage 2 (provider call) and any direct upstream contact run over
**HTTPS only**. TLS floor, cipher allowlist, HSTS, anti-downgrade,
and cert-lifecycle policy are pinned by
[`transport-security.md`](./transport-security.md); the AI-gateway
adapter refuses to attach to an `http://` upstream regardless of
environment. The required response headers
(`Access-Control-Allow-Origin` pinned to the canonical web origin
— never `*`) live in [`web-headers.md`](./web-headers.md).

## Why this matters

Pinning the pipeline to typed boundaries — `GenerationRequest` →
`GeneratedFaction` → coherence → balance → pack — means any vendor
can plug in at stage 2 without any other stage knowing. It also
means any stage can be tested in isolation with JSON fixtures, and
any failure has a known report type the UI can render.

## Related task backlog

- [tasks/phase-3/02-ai-generation/00-generation-io-schemas.md](../../tasks/phase-3/02-ai-generation/00-generation-io-schemas.md)
- [tasks/phase-3/02-ai-generation/01-prompt-provider-structured-output-raw-json.md](../../tasks/phase-3/02-ai-generation/01-prompt-provider-structured-output-raw-json.md)
- [tasks/phase-3/02-ai-generation/02-schema-validation-plus-coherence-check.md](../../tasks/phase-3/02-ai-generation/02-schema-validation-plus-coherence-check.md)
- [tasks/phase-3/02-ai-generation/03-auto-balancer-headless-battle-baseline.md](../../tasks/phase-3/02-ai-generation/03-auto-balancer-headless-battle-baseline.md)
- [tasks/phase-3/02-ai-generation/04-gradient-free-stat-optimizer.md](../../tasks/phase-3/02-ai-generation/04-gradient-free-stat-optimizer.md)
