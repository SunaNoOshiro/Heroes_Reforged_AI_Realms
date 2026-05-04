# AI Generation Pipeline

How a user prompt becomes loadable faction content, step by step.

This file concretizes [`ai-integration.md`](./ai-integration.md) into
a running pipeline: which schemas cross each boundary, what validates
at each step, and where a run can fail. The pipeline is
provider-neutral — no vendor name appears in any record.

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
or a `ValidationReport` with field-path errors.

Implemented via Zod (see
[`src/content-schema/README.md`](../../src/content-schema/README.md)).
Discriminated-union failures (unknown effect kind, cross-kind
specialty fields) surface at this stage with human-readable paths.

### 4. Coherence check

Input: validated `GeneratedFaction`.
Output: `{ ok, warnings, errors }`.

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
Output: `BalanceReport` with Wilson 95 % confidence interval over N
headless auto-resolves against first-party factions.

Gate: the generated faction's win rate CI must overlap
`[35 %, 65 %]` against every first-party faction. Below 35 % → too
weak, reject. Above 65 % → too strong, reject. Inside → the orchestrator
may accept or route to a stat optimizer for narrowing.

This stage exists as a standalone task in
[`tasks/phase-3/02-ai-generation/03-auto-balancer-headless-battle-baseline.md`](../../tasks/phase-3/02-ai-generation/03-auto-balancer-headless-battle-baseline.md).

### 6. Pack materialize

Input: accepted `GeneratedFaction`.
Output: faction pack directory with:
- `manifest.json` declaring dependencies and `contentHash`
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

| Stage | Failure | Response |
|---|---|---|
| 3 | Unknown effect `kind` | Return `ValidationReport`; do not retry; surface to user |
| 4 | Unresolved ability ID | Return `CoherenceReport`; ask provider to regenerate with resolved IDs listed, or drop the referencing unit |
| 4 | Stat outside corridor | Return `CoherenceReport`; optionally route to stat optimizer (task 02-ai-generation/04) |
| 5 | CI below 35 % or above 65 % | Return `BalanceReport`; route to optimizer or reject |
| 6 | `contentHash` collision with existing pack | Fail pack write; require rename |

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
