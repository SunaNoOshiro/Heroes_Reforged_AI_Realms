# 14. AI-GENERATED CONTENT PIPELINE

### Q: 234. What is the input contract to the generator (prompt, schema, constraints)?

**Status:** ✔ Defined

**Answer:**
The input contract is the `GenerationRequest` schema (provider-neutral). It carries `schemaVersion`, `kind` (faction/hero/spell/artifact/scenario), `prompt` (`user`, optional `system`, optional `examples`), `constraints` (`targetTier`, `maxUnits`, `allowedSchools`, `bannedTraits`, `powerBudget`, `referenceFactionId`, `referenceRulesetId`, `temperatureHint`), an optional deterministic `seed`, and opaque `providerHints`. Orchestration code constructs this object — vendor names, API keys, and model selectors are NOT part of the contract.

**Evidence:**
- [content-schema/schemas/generation-request.schema.json](../../content-schema/schemas/generation-request.schema.json)
- [docs/architecture/ai-generation-pipeline.md](../architecture/ai-generation-pipeline.md) — Stage 1: Request assembly
- [docs/architecture/ai-integration.md](../architecture/ai-integration.md) — `GenerationProvider.generateStructured(input)`
- [tasks/phase-3/02-ai-generation/00-generation-io-schemas.md](../../tasks/phase-3/02-ai-generation/00-generation-io-schemas.md)

---

### Q: 235. What is the output contract, and is it strictly schema-validated?

**Status:** ✔ Defined

**Answer:**
The output contract is `GeneratedFaction` (for `kind="faction"`), with `schemaVersion`, a `faction` header, arrays of `units` (1–7), `heroes`, `buildings`, `abilities`, optional `spells`, and informational `notes`. Stage 3 ("Shape validation") strictly validates raw provider JSON against this schema (Zod-backed), and discriminated-union failures (e.g. unknown effect `kind`) surface as a `ValidationReport` with field paths. `additionalProperties: false` is enforced at every level.

**Evidence:**
- [content-schema/schemas/generated-faction.schema.json](../../content-schema/schemas/generated-faction.schema.json)
- [docs/architecture/ai-generation-pipeline.md](../architecture/ai-generation-pipeline.md) — Stage 3: Shape validation
- [tasks/phase-3/02-ai-generation/02-schema-validation-plus-coherence-check.md](../../tasks/phase-3/02-ai-generation/02-schema-validation-plus-coherence-check.md)

---

### Q: 236. Are generated stats clamped to balance ranges?

**Status:** ✔ Defined

**Answer:**
Yes, in two layers. (1) Stage 4 "Coherence check" enforces tier corridor ranges from `research/deep-research-report.md`; outliers are allowed only if a compensating ability exists. (2) The moderation layer enforces hard caps regardless of optimizer output: HP ≤ 500, ATK ≤ 50, abilities per unit ≤ 5. The gradient-free optimizer is also constrained to never push a stat below 1 or above the hard caps.

**Evidence:**
- [docs/architecture/ai-generation-pipeline.md](../architecture/ai-generation-pipeline.md) — Stage 4 coherence check
- [tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md](../../tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md) — hard caps
- [tasks/phase-3/02-ai-generation/04-gradient-free-stat-optimizer.md](../../tasks/phase-3/02-ai-generation/04-gradient-free-stat-optimizer.md) — optimizer constraints

---

### Q: 237. Is there a rejection-and-retry loop on invalid output?

**Status:** ⚠ Partial

**Answer:**
Rejection is defined per-stage with typed reports (`ValidationReport`, `CoherenceReport`, `BalanceReport`). The failure-mode table specifies responses: shape errors do NOT auto-retry (surfaced to user); coherence errors MAY route to "regenerate with resolved IDs" or drop the referencing unit; balance failures MAY route to the stat optimizer. However, the explicit retry policy (max attempts, backoff, when to give up) is not codified — orchestration logic for "ask provider to regenerate" is described informally and lives in the not-yet-implemented orchestrator.

**Evidence:**
- [docs/architecture/ai-generation-pipeline.md](../architecture/ai-generation-pipeline.md) — Failure modes table
- [tasks/phase-3/02-ai-generation/04-gradient-free-stat-optimizer.md](../../tasks/phase-3/02-ai-generation/04-gradient-free-stat-optimizer.md) — coordinate-descent (max 10 iterations) is the only formal retry loop
- ❌ No explicit retry-policy schema or task for shape/coherence retries

---

### Q: 238. Are generated assets reviewed by automated checks (NSFW, copyright, style)?

**Status:** ⚠ Partial

**Answer:**
A `ModerationProvider` contract is defined and a moderation task exists (offensive names/lore are blocked; `sandboxed: true` is auto-set). Hard caps cover stat-based "abuse." However, NSFW image checks, copyright/likeness detection, and style conformance for generated SPRITES are not specified — the asset-generation task (#5) is currently a placeholder (colored SVGs) and explicitly does not yet wire image moderation. The pipeline doc lists moderation as a separate, optional pre-stage 1 step.

**Evidence:**
- [tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md](../../tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md) — text-based moderation only
- [tasks/phase-3/02-ai-generation/05-asset-generation-stub-imagegen-api.md](../../tasks/phase-3/02-ai-generation/05-asset-generation-stub-imagegen-api.md) — stub, no image moderation
- [docs/architecture/ai-generation-pipeline.md](../architecture/ai-generation-pipeline.md) — "No moderation gate" inside pipeline; moderation is a separate provider call
- ❌ No NSFW/copyright/style check defined for image outputs

---

### Q: 239. Are generated assets normalized (size, palette, frame count)?

**Status:** ❌ UNKNOWN

**Answer:**
Asset normalization (sprite dimensions, palette quantization, animation frame counts, atlas binding) is not defined for AI-generated assets. Task #5 only produces a single colored placeholder SVG with no dimension/palette spec. There is a general renderer/asset contract elsewhere (`assets/index.json`), but no normalization pipeline (resize, crop, palette match, frame-count enforcement) is described for AI-generated output.

**Evidence:**
- [tasks/phase-3/02-ai-generation/05-asset-generation-stub-imagegen-api.md](../../tasks/phase-3/02-ai-generation/05-asset-generation-stub-imagegen-api.md) — only colored SVG placeholder
- [docs/architecture/ai-generation-pipeline.md](../architecture/ai-generation-pipeline.md) — Stage 6 writes `assets/index.json` with placeholder bindings; no normalization step
- ❌ No documented normalization contract

---

### Q: 240. Is generation deterministic given seed + prompt?

**Status:** ⚠ Partial

**Answer:**
Partial: `GenerationRequest.seed` is defined as a "deterministic seed passed to providers that support reproducible output," and the auto-balancer derives per-battle seeds from `seed + battleIndex`. However, the pipeline doc explicitly states: *"No determinism guarantee on provider output. Provider calls may be non-deterministic; the pipeline treats raw output as untrusted input. Determinism begins at stage 4 onward, once content is validated."* So determinism is best-effort upstream and guaranteed downstream of validation.

**Evidence:**
- [content-schema/schemas/generation-request.schema.json](../../content-schema/schemas/generation-request.schema.json) — `seed` field
- [docs/architecture/ai-generation-pipeline.md](../architecture/ai-generation-pipeline.md) — "What the pipeline does not do" section
- [tasks/phase-3/02-ai-generation/03-auto-balancer-headless-battle-baseline.md](../../tasks/phase-3/02-ai-generation/03-auto-balancer-headless-battle-baseline.md) — deterministic battle seeds

---

### Q: 241. Can generation introduce non-determinism into gameplay?

**Status:** ✔ Defined

**Answer:**
No, by architectural rule. Once a pack is materialized (Stage 6) it is a frozen on-disk record with a `contentHash` in the manifest. The gameplay engine consumes that pack like any first-party pack and never re-invokes a generator at runtime. `ai-integration.md` codifies this: "Deterministic gameplay code must not call hosted AI providers." Pack materialization "writes once. Live games never rewrite pack records based on telemetry."

**Evidence:**
- [docs/architecture/ai-integration.md](../architecture/ai-integration.md) — "Deterministic gameplay code must not call hosted AI providers"
- [docs/architecture/ai-generation-pipeline.md](../architecture/ai-generation-pipeline.md) — "No runtime mutation"
- [docs/architecture/determinism.md](../architecture/determinism.md)

---

### Q: 242. Is generated content quarantined from canonical content?

**Status:** ✔ Defined

**Answer:**
Yes. AI-generated packs are written with `sandboxed: true` in their manifest (auto-set, cannot be overridden by the generator). The pack manifest schema includes the `sandboxed` boolean field, and the pipeline materializes generated content as a separate pack (with its own `manifest.json`, `contentHash`, and dependency declarations on `shared_abilities`/`shared_skills`) — it never overwrites first-party records.

**Evidence:**
- [content-schema/schemas/manifest.schema.json](../../content-schema/schemas/manifest.schema.json) — `sandboxed` field
- [tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md](../../tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md) — auto-set `sandboxed: true`
- [docs/architecture/ai-generation-pipeline.md](../architecture/ai-generation-pipeline.md) — Stage 6: pack materialize

---

### Q: 243. Is there a sandbox mode where generated content cannot affect ranked or shared games?

**Status:** ⚠ Partial

**Answer:**
The `sandboxed: true` flag is set on all AI-generated packs, which signals quarantine intent. However, the runtime enforcement story — i.e., "ranked matchmaking refuses sandboxed packs," "shared games gate sandboxed content behind explicit opt-in" — is NOT documented. There is no ranked-mode spec yet and no rule in pack-contract.md or content-platform.md explaining how `sandboxed` is consumed by the matchmaker or session host.

**Evidence:**
- [content-schema/schemas/manifest.schema.json](../../content-schema/schemas/manifest.schema.json) — flag exists
- [tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md](../../tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md) — flag is set
- ❌ No documented enforcement of `sandboxed` in matchmaking/lobby/ranked code paths

---

### Q: 244. How is generated content cached, deduplicated, and garbage-collected?

**Status:** ❌ UNKNOWN

**Answer:**
The pipeline produces packs identified by `contentHash` and rejects collisions at Stage 6 (Pack materialize), which provides intrinsic deduplication of byte-identical packs. However, no caching layer (e.g., reuse of validated `GeneratedFaction` JSON between runs), no LRU/disk-quota policy, no garbage-collection rules (when sandboxed packs are pruned, who owns lifecycle), and no provider-response cache are specified.

**Evidence:**
- [docs/architecture/ai-generation-pipeline.md](../architecture/ai-generation-pipeline.md) — `contentHash` collision → fail pack write
- ❌ No caching, GC, or quota policy in any architecture or task file

---

### Q: 245. Are generation failures user-visible and recoverable?

**Status:** ⚠ Partial

**Answer:**
Failures produce typed reports (`ValidationReport`, `CoherenceReport`, `BalanceReport`) the UI can render. The Generation UI task specifies a progress bar with stages (Generating → Validating → Balancing → Optimizing → Done), supports cancellation at any stage, and includes an "Edit in Editor" recovery path for borderline balance results. However, recovery flows for shape-validation failures (other than "show error") and provider/network failures (timeout, rate-limit, auth) are not specified.

**Evidence:**
- [tasks/phase-3/02-ai-generation/07-generation-ui-prompt-preview-download.md](../../tasks/phase-3/02-ai-generation/07-generation-ui-prompt-preview-download.md) — progress, cancel, edit-in-editor
- [docs/architecture/ai-generation-pipeline.md](../architecture/ai-generation-pipeline.md) — failure-mode table
- ❌ No explicit policy for provider transport failures or for retry UX

---

### Q: 246. Is there a moderation / takedown path for shared generated content?

**Status:** ❌ UNKNOWN

**Answer:**
Pre-publication moderation is defined (text moderation, hard caps, `sandboxed: true`). But a **post-hoc takedown path** for content that has been shared/distributed (community report flow, reviewer queue, hash-based block list, pack-revocation propagation, replay-compatibility handling for revoked packs) is not specified anywhere. The repo currently has no marketplace or sharing layer, so this is unscoped.

**Evidence:**
- [tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md](../../tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md) — pre-publication only
- ❌ No takedown / revocation / report flow defined

---

### Q: 247. Is the generator itself versioned and reproducible?

**Status:** ⚠ Partial

**Answer:**
Several reproducibility hooks exist: `GenerationRequest.schemaVersion`, `GeneratedFaction.schemaVersion`, optional `seed`, and `notes.providerId`/`notes.promptHash`/`notes.modelHint`/`notes.tokenCount` recorded on output. The pack manifest carries a `contentHash`. However, there is no first-class "generator version" record (e.g., orchestrator semver, prompt-template version, ruleset version pin, config snapshot) bundled with the pack — only loose metadata in `notes`. End-to-end reproducibility (same prompt + seed → same pack) is best-effort, contingent on provider determinism.

**Evidence:**
- [content-schema/schemas/generated-faction.schema.json](../../content-schema/schemas/generated-faction.schema.json) — `notes` block
- [content-schema/schemas/generation-request.schema.json](../../content-schema/schemas/generation-request.schema.json) — `schemaVersion`, `seed`
- [docs/architecture/ai-generation-pipeline.md](../architecture/ai-generation-pipeline.md) — provider output is treated as untrusted; determinism only post-validation
- ❌ No formal generator/orchestrator/prompt-template version pin

---

## 🔍 Summary

### Missing Logic
- Image-asset moderation (NSFW, copyright/likeness, style conformance) for AI-generated sprites/portraits.
- Asset normalization pipeline (size, palette quantization, frame counts, atlas binding) for AI output.
- Cache, deduplication beyond `contentHash` collision, disk-quota and garbage-collection policy for sandboxed packs.
- Runtime enforcement of `sandboxed: true` in matchmaking, ranked, and shared-session paths.
- Post-hoc moderation / takedown / revocation flow for distributed generated content.
- Explicit retry policy (max attempts, backoff, escalation) for shape and coherence failures.
- Recovery UX for provider transport failures (timeout, rate-limit, auth).
- First-class generator version pin (orchestrator semver, prompt-template version, ruleset pin) on materialized packs.

### Risks
- Provider non-determinism leaking into "reproducible" claims if `seed` is treated as a guarantee instead of a hint.
- Hard caps live in moderation but not in the schema itself, so a non-orchestrator producer of a `GeneratedFaction` could bypass them by writing the pack directly.
- `sandboxed: true` is an honor-system signal until matchmaking/lobby code consumes and enforces it.
- Without GC policy, sandboxed packs accumulate indefinitely on user disks.
- No takedown story means a marketplace/share layer cannot be opened safely.

### Improvements
- Define a `GenerationConfig` record (orchestrator version + prompt-template hash + ruleset hash) and bake it into the materialized pack's manifest.
- Codify a `RetryPolicy` for shape/coherence/balance failures (max attempts, what re-prompt to issue).
- Add an asset normalization spec next to `assets/index.json` and a corresponding validator.
- Document `sandboxed` enforcement points (matchmaker, replay validator, lobby gate) in `pack-contract.md`.
- Add a provider-failure taxonomy (transport, auth, quota, content-policy) so the UI can render distinct recovery actions.
- Add a takedown/revocation schema (revoked-content list signed by maintainers) before any sharing/marketplace ships.
- Move hard caps into a dedicated balance-constraint schema so they are not bypassable by direct pack writes.

### AI-Readiness
Score: 6.5/10
Reason: The boundary contracts (`GenerationRequest`, `GeneratedFaction`), pipeline stages, and provider-neutral interfaces are clear and well-typed, and quarantine via `sandboxed: true` plus `contentHash` is sound. Significant gaps remain around image moderation, asset normalization, lifecycle (cache/GC/takedown), runtime enforcement of `sandboxed`, and end-to-end reproducibility metadata. Sufficient for an AI implementer to begin Phase-3 generation tasks; insufficient for safely shipping a public sharing or ranked layer.
