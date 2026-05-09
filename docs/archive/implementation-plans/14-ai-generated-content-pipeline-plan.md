# Implementation Plan: 14 — AI-Generated Content Pipeline

> Source audit: [docs/archive/readiness-audit/14-ai-generated-content-pipeline.md](../readiness-audit/14-ai-generated-content-pipeline.md)
>
> The audit file is **not** modified. This plan converts every
> ❌ UNKNOWN, ⚠ Partial, Missing-Logic, and Risk item from that audit
> into concrete schema, documentation, task, and tooling work, all
> grounded in the existing M7 generation tree under
> [tasks/phase-3/02-ai-generation/](../../../tasks/phase-3/02-ai-generation/),
> the architecture spec at
> [docs/architecture/ai-generation-pipeline.md](../../architecture/ai-generation-pipeline.md),
> the provider rules in
> [docs/architecture/ai-integration.md](../../architecture/ai-integration.md),
> and the pack contract at
> [docs/architecture/pack-contract.md](../../architecture/pack-contract.md).
>
> Nothing here invents new gameplay mechanics. Every change formalizes a
> rule the pipeline doc, manifest schema, or moderation task already
> implies but has not yet pinned in one place.

---

## 1. Overview

**Scope.** Close the eleven distinct gaps the AI-generated content
audit flagged across the generation lifecycle:

- explicit retry policy for shape/coherence/balance failures (Q237)
- image moderation — NSFW, copyright/likeness, style conformance (Q238)
- asset normalization — size, palette, frame count, atlas binding (Q239)
- determinism boundary clarity — seed is hint, not guarantee (Q240)
- runtime enforcement of `sandboxed: true` in matchmaking, lobby,
  ranked, replay-validator code paths (Q243)
- caching, dedupe-beyond-hash, GC, and disk-quota policy (Q244)
- recovery UX for provider transport failures (timeout, rate-limit,
  auth, content-policy) (Q245)
- post-hoc moderation / takedown / revocation flow (Q246)
- first-class generator-version pin: orchestrator semver +
  prompt-template hash + ruleset hash (Q247)
- hard-cap relocation: caps live in moderation today, but a
  non-orchestrator producer of `GeneratedFaction` could write a pack
  that bypasses them (Risk)
- provider-failure taxonomy so distinct UI recovery actions can be
  rendered (Improvement)

**Readiness state today.** AI-Readiness scored **6.5/10**. The boundary
contracts (`GenerationRequest`, `GeneratedFaction`), the six-stage
pipeline, the provider-neutral interface, the `sandboxed: true`
quarantine flag, and `contentHash`-keyed pack identity are sound and
already enforced at the schema layer. The remaining gaps are all in
the **lifecycle** layer — pre-publication for assets, runtime
enforcement of quarantine, and post-publication moderation/lifecycle
of distributed packs. Closing every Improvement item the audit names
lifts this to **9/10** per the audit's own rationale, which is the
threshold for safely opening a sharing or ranked layer over generated
content.

**Out of scope.**

- Authoring runtime engine code (the orchestrator, the moderation
  provider implementation, the matchmaker, the marketplace). This plan
  formalizes the contracts those layers must satisfy.
- Choosing a hosted image-moderation vendor. The provider-neutral
  contract is defined; vendor selection is operational.
- Implementing a marketplace, sharing layer, or ranked matchmaker.
  This plan defines what those layers will read from `manifest.json`
  and from the revocation registry; it does not build them.
- Re-opening already-`✔ Defined` answers (Q234, Q235, Q236, Q241,
  Q242). Those contracts are stable; nothing below modifies them.

---

## 2. Critical Fixes (Must Do First)

These are the items where leaving the gap unaddressed creates a
shipping blocker — either a safety hazard (image moderation), a
bypass that defeats existing controls (hard caps in schema,
`sandboxed` enforcement), or a state-explosion risk on user disks
(GC). They must land before any layer that *exposes* generated content
to other players (sharing, marketplace, ranked) is implemented.

### Issue: Image moderation is undefined for sprite/portrait output

**Source:** Q238 (⚠ Partial), Missing Logic #1, Risk: NSFW slips
through if image gen is wired before moderation.

**Problem:** The `ModerationProvider` contract today moderates **text
only** (faction names, lore, ability descriptions). Task #5
([asset-generation-stub-imagegen-api](../../../tasks/phase-3/02-ai-generation/05-asset-generation-stub-imagegen-api.md))
is a colored-SVG placeholder and explicitly **does not** call image
moderation. The pipeline doc lists moderation as a separate
pre-stage-1 step, but the moderation-task spec covers no image checks
at all. The moment Task #5 is upgraded from a stub to a real
image-gen call (Phase-3 follow-on), generated sprites flow into packs
with **no NSFW, copyright/likeness, or style-conformance gating**.

**Impact:**

- A user could prompt the generator into producing a pack with
  unsafe imagery, write `sandboxed: true` per current rules, and
  then share that pack — the `sandboxed` flag is honor-system today
  (see Q243).
- Copyright/likeness violations against well-known IPs are
  indistinguishable from inspired-by art at the schema layer, so
  they ship into manifests with no checkpoint.
- Style drift (e.g. a photographic portrait inside an otherwise
  pixel-art faction) breaks renderer assumptions silently.

**Solution:** Extend the moderation contract from text-only to
structured **image-moderation calls** invoked at the boundary
between asset generation (Stage 5/6) and pack materialize (Stage 6).
Define an `ImageModerationReport` shape parallel to the existing
text moderation report, with three independent verdicts (NSFW,
copyright/likeness, style conformance) so each can fail
independently and route to a distinct UI recovery action (Q245).

**Files to Update:**

- [tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md](../../../tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md)
  — extend acceptance criteria to require image moderation for any
  asset present in the materialized pack.
- [tasks/phase-3/02-ai-generation/05-asset-generation-stub-imagegen-api.md](../../../tasks/phase-3/02-ai-generation/05-asset-generation-stub-imagegen-api.md)
  — add a `Dependencies` line on the moderation task and an explicit
  "stub MUST NOT skip the moderation hook even though placeholder
  SVGs always pass" clause.
- [docs/architecture/ai-generation-pipeline.md](../../architecture/ai-generation-pipeline.md)
  — add a Stage 5.5 ("Image moderation") row to the stage table
  and the failure-modes table.
- [docs/architecture/ai-integration.md](../../architecture/ai-integration.md)
  — extend `ModerationProvider` interface signature to include
  `moderateImage(asset): Promise<ImageModerationReport>` alongside
  the existing text method.

**New Files:**

- `content-schema/schemas/image-moderation-report.schema.json` —
  Zod-backed shape with three verdicts (`nsfw`, `ipLikeness`,
  `styleConformance`), each `{ pass: boolean, score: number,
  reasonCode: string, message: string }`. `additionalProperties:
  false`.
- `content-schema/examples/image-moderation-report/pass.json` and
  `…/fail-nsfw.json` — canonical examples.
- `tasks/phase-3/02-ai-generation/06b-image-moderation.md` — owns
  the contract + the orchestrator hook between Stage 5 and Stage 6.
  Lists the existing moderation task as a dependency.

**Implementation Steps:**

1. Add the schema and examples; wire into
   [content-schema/schemas/index.json](../../../content-schema/schemas/index.json)
   per the conventions in
   [docs/architecture/schema-matrix.md](../../architecture/schema-matrix.md).
2. Add the new task file with `ownedPaths` covering the new schema
   and the Stage 5.5 prose paragraph in `ai-generation-pipeline.md`.
   Mark Task #5 and Task #6 as `Dependencies`.
3. Update the pipeline doc's six-stage table to a seven-stage table
   (re-numbering Stage 6 → Stage 7 is **not** required; preferred is
   inserting Stage 5.5 to avoid renumbering downstream references).
4. Update `ai-integration.md` `ModerationProvider` interface and
   include a one-line "vendor selection is operational, not a
   contract decision" note that mirrors the existing rule for
   `GenerationProvider`.
5. Run `npm run validate:tasks` and `npm run validate` to confirm
   schema-matrix and task-registry consistency.

**Dependencies:** Existing Task #5 and Task #6 must remain in their
current shape; this plan extends, not rewrites.

**Complexity:** M.

---

### Issue: Hard caps live only in moderation, bypassable by direct pack writes

**Source:** Q236 (✔ Defined for the orchestrator path), Risk #2 in
the audit summary.

**Problem:** Stat hard caps (HP ≤ 500, ATK ≤ 50, abilities per unit
≤ 5) are enforced in
[tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md](../../../tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md)
— i.e. inside the orchestrator. The `GeneratedFaction` schema does
**not** itself encode these caps, so any non-orchestrator producer
(another tool, a hand-edited pack, a community editor) can write a
faction with HP = 9999 and the schema validator (Stage 3) will pass
it. The caps are then only enforced if that file is round-tripped
through the orchestrator, which it might not be.

**Impact:**

- Schema validation is no longer the canonical "is this pack
  legal?" gate — it becomes "is this pack legal **only if** the
  orchestrator wrote it?", a distinction the runtime cannot
  recover at load time.
- A community pack that uses `GeneratedFaction` as its on-disk
  format (a reasonable choice, since it already exists) inherits
  zero balance protection.
- Future contributors who read the schema as the source of truth
  are misled.

**Solution:** Introduce a separate `balance-constraints.schema.json`
that owns the numeric caps, and reference it from
`generated-faction.schema.json` via JSON-schema `$ref` (so caps
remain authoritative in **one** file but are enforceable at every
schema-validating entry point — orchestrator, pack loader, editor
import). Move the hard-cap definitions out of the moderation task
prose and into the constraints schema; the moderation task becomes
the **enforcement** of the constraints schema, not the **source** of
the values.

**Files to Update:**

- [content-schema/schemas/generated-faction.schema.json](../../../content-schema/schemas/generated-faction.schema.json)
  — replace inline numeric ranges (where present) with `$ref`s into
  the new constraints schema; tighten `maxItems` for `abilities`
  arrays to match.
- [tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md](../../../tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md)
  — change the task description from "owns hard caps" to "consumes
  hard caps from `balance-constraints.schema.json` and runs them
  alongside text moderation"; update `ownedPaths` accordingly.
- [tasks/phase-3/02-ai-generation/04-gradient-free-stat-optimizer.md](../../../tasks/phase-3/02-ai-generation/04-gradient-free-stat-optimizer.md)
  — update the optimizer-bounds prose to reference the constraints
  schema as the single source of truth.
- [docs/architecture/ai-generation-pipeline.md](../../architecture/ai-generation-pipeline.md)
  — add a sentence to Stage 3 ("Shape validation") clarifying that
  shape validation now also fails on constraint-bound violations.
- [docs/architecture/schema-matrix.md](../../architecture/schema-matrix.md)
  — add the new schema row.

**New Files:**

- `content-schema/schemas/balance-constraints.schema.json` — owns
  every numeric cap (`maxHp`, `maxAtk`, `maxAbilitiesPerUnit`,
  `tierCorridors[]`). `additionalProperties: false`.
- `content-schema/examples/balance-constraints/canonical.json` —
  the canonical values used by the orchestrator today.
- `tasks/phase-3/02-ai-generation/00b-balance-constraints-schema.md`
  — owns the new schema; sits alongside the existing
  [00-generation-io-schemas.md](../../../tasks/phase-3/02-ai-generation/00-generation-io-schemas.md)
  task.

**Implementation Steps:**

1. Author the constraints schema with the exact numeric values
   currently in Task #6's prose (HP ≤ 500, ATK ≤ 50, abilities ≤ 5)
   plus the tier corridors from
   [research/deep-research-report.md](../../../research/deep-research-report.md).
2. Refactor `generated-faction.schema.json` to `$ref` the
   constraints schema rather than inline numbers.
3. Update Task #6 acceptance criteria: "moderation does **not**
   re-decide caps; it loads `balance-constraints.schema.json` and
   short-circuits."
4. Update Task #4 (optimizer) to read its bounds from the same
   schema.
5. Add the schema-matrix row.
6. `npm run validate:tasks` then `npm run validate` to confirm.

**Dependencies:** Task #0 (generation-io-schemas) must already be
done at the schema-matrix level; this plan adds a sibling task, not
a replacement.

**Complexity:** M.

---

### Issue: `sandboxed: true` is an honor-system flag with no runtime enforcement

**Source:** Q243 (⚠ Partial), Risk #3, Improvement: "Document
`sandboxed` enforcement points (matchmaker, replay validator, lobby
gate) in `pack-contract.md`."

**Problem:** Every AI-generated pack writes `sandboxed: true` (Q242 ✔
Defined, enforcement automatic in Task #6). But **nothing reads it**.
There is no rule in
[docs/architecture/pack-contract.md](../../architecture/pack-contract.md)
or [docs/architecture/content-platform.md](../../architecture/content-platform.md)
that says "ranked matchmaking refuses sandboxed packs," "shared
sessions gate sandboxed content behind explicit opt-in," or "replay
validation rejects sandboxed packs in canonical replays." So
quarantine is a label, not a fence.

**Impact:**

- The moment a multiplayer matchmaker ships, a community pack with
  unsafe content can be loaded into a ranked match — the flag is
  there but no code path reads it.
- Replays cannot be safely shared if they reference a sandboxed
  pack; today there is no rule that says "replay validator rejects
  sandboxed packs unless the consuming session also accepted them."
- Auditing whether a given gameplay outcome is canonical or
  experimental is impossible without a documented enforcement
  surface.

**Solution:** Add a new section "Sandbox enforcement" to
`pack-contract.md` that names every place the `sandboxed` flag is
read and what each consumer must do. Mirror it as a one-line
reference in `content-platform.md`. Add a single shared
`isSandboxAllowed(context, manifest)` predicate task — not the
implementation, but the **contract** — that future matchmaker, lobby,
and replay-validator tasks must satisfy.

**Files to Update:**

- [docs/architecture/pack-contract.md](../../architecture/pack-contract.md)
  — add "Sandbox enforcement" section with a four-row table
  (consumer, required behavior, default, override mechanism).
- [docs/architecture/content-platform.md](../../architecture/content-platform.md)
  — single-line cross-reference to the new section.
- [content-schema/schemas/manifest.schema.json](../../../content-schema/schemas/manifest.schema.json)
  — add a `sandboxedReason` string field next to `sandboxed`, so
  consumers can render *why* (AI-generated vs. user-edited vs.
  un-signed). Keep it optional to stay additive.
- [tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md](../../../tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md)
  — extend the auto-set rule to also write `sandboxedReason:
  "ai-generated"`.

**New Files:**

- `tasks/phase-2/04-sandbox-enforcement-contract.md` — owns the
  predicate signature, the four consumer rules, and a verify-link
  to `pack-contract.md`. Sits in Phase-2 because matchmaker code is
  Phase-2; the contract is needed before any of that lands.

**Implementation Steps:**

1. Author the `pack-contract.md` "Sandbox enforcement" section with
   exactly four rows — Ranked matchmaker (refuse), Shared lobby
   (require explicit opt-in), Replay validator (refuse for
   canonical replay; allow for sandbox replay), Editor (allow,
   warn). Each row cites the future task that owns the consumer.
2. Add `sandboxedReason` (additive optional string) to the manifest
   schema and re-run `npm run validate`.
3. Author the new Phase-2 contract task that names the predicate
   and lists the four consumers.
4. Update Task #6 to write the reason field.
5. Update
   [docs/planning/implementation-log.md](../../../docs/planning/implementation-log.md)
   with one line documenting that runtime enforcement is now
   contractual rather than discretionary.

**Dependencies:** None blocking. The matchmaker, lobby, and replay
implementations remain future work; this plan only defines what
they must do.

**Complexity:** S.

---

### Issue: No cache, dedupe-beyond-hash, GC, or disk-quota policy

**Source:** Q244 (❌ UNKNOWN), Missing Logic #3, Risk #4 ("sandboxed
packs accumulate indefinitely on user disks").

**Problem:** Pack identity collisions are caught at Stage 6
(byte-identical packs are rejected), but **everything else** in pack
lifecycle is undefined: no provider-response cache (so a regenerate
re-pays the API cost), no LRU on validated `GeneratedFaction` JSON
between stages, no disk-quota policy on sandboxed packs, no GC rule
("when does a sandboxed pack the user never loaded get pruned?"), no
ownership of the lifecycle ("does the launcher own pruning, or the
generator UI, or never?").

**Impact:**

- Disk usage grows monotonically. A user who experiments with the
  generator for an evening can fill several GB of unreferenced
  sandboxed packs.
- Provider cost is paid on every regenerate even if the user just
  wants to retry the moderation step.
- A reproducibility-style "regenerate the same prompt+seed" test is
  expensive when it could be free.

**Solution:** Define a single `pack-lifecycle.md` doc that codifies
four policies: (1) **provider-response cache** keyed by `(promptHash,
seed, providerId, modelHint)`, with a documented TTL and a
documented bypass for "force regenerate"; (2) **disk-quota policy**
for sandboxed packs (per-user soft cap, hard cap, eviction order
LRU-by-last-loaded); (3) **GC rule** invoked on launch and on
explicit "Manage AI content" action; (4) **lifecycle ownership** —
the launcher owns the cache and the GC; the generator UI owns the
"force regenerate" override.

**Files to Update:**

- [docs/architecture/ai-generation-pipeline.md](../../architecture/ai-generation-pipeline.md)
  — add a "Lifecycle" subsection cross-referencing the new doc.
- [docs/architecture/pack-contract.md](../../architecture/pack-contract.md)
  — single-line cross-reference under "Sandbox enforcement".

**New Files:**

- `docs/architecture/pack-lifecycle.md` — the four policies above,
  written as a contract not as code.
- `content-schema/schemas/provider-response-cache-entry.schema.json`
  — keys + content payload. Used by the cache layer to validate its
  own on-disk records.
- `tasks/phase-3/02-ai-generation/09-pack-lifecycle-cache-and-gc.md`
  — owns the new doc and the cache-entry schema. Sits after Task #8
  in numbering so existing dependencies remain stable.

**Implementation Steps:**

1. Author `pack-lifecycle.md` with the four numbered policies and
   their concrete defaults (suggested defaults: 30-day TTL on
   cache, 2 GB soft / 5 GB hard sandboxed quota, LRU-by-last-loaded
   eviction; values pin in the doc, not in code).
2. Author the cache-entry schema (key fields + payload + timestamps).
3. Author Task #9 with `ownedPaths` covering the new doc and
   schema; cite Task #5 (asset gen) and Task #7 (generation UI) as
   dependencies for the "force regenerate" wiring.
4. Add the cross-references in pipeline + pack-contract docs.
5. Update the schema-matrix row.

**Dependencies:** Task #6 (moderation) must already write
`sandboxedReason` (from the previous critical fix) so the GC can
distinguish AI-generated packs from user-edited packs.

**Complexity:** M.

---

## 3. System Improvements

The remaining gaps are not pre-publication safety blockers but they
each leave a contract under-specified and force the next implementer
to invent a policy on the fly. They are grouped by the system they
extend.

### Schemas

#### Issue: Generator version is not pinned in materialized packs

**Source:** Q247 (⚠ Partial), Improvement: "Define a
`GenerationConfig` record (orchestrator version + prompt-template
hash + ruleset hash) and bake it into the materialized pack's
manifest."

**Problem:** Reproducibility today depends on `GenerationRequest.seed`
+ `GeneratedFaction.notes.providerId/promptHash/modelHint`. The
**orchestrator semver**, the **prompt-template version** (the system
prompt is a templated artifact, not input), and the **ruleset version
pin** (`research/deep-research-report.md` versioning) are not
recorded. Two regenerations from the "same prompt + seed" can produce
divergent packs if the orchestrator was upgraded between runs, and
nothing in the materialized pack reveals which version produced it.

**Impact:**

- A bug report that says "this pack is unbalanced" cannot be tied
  to a specific orchestrator/prompt-template/ruleset combination.
- A regression test "regenerate the canonical 5 factions and check
  for drift" cannot detect drift caused by orchestrator updates.
- Future migration of older AI-generated packs (auto-upgrade on
  load) has no version key to switch on.

**Solution:** Add a `GenerationConfig` schema and require Task #6
to bake it into the materialized pack manifest under a new
`manifest.generation` block. Three fields: `orchestratorVersion`
(semver), `promptTemplateHash` (sha256 of the template file the
orchestrator used), `rulesetHash` (sha256 of
`research/deep-research-report.md` at orchestrator-build time).

**Files to Update:**

- [content-schema/schemas/manifest.schema.json](../../../content-schema/schemas/manifest.schema.json)
  — add optional `generation` block of type `GenerationConfig`.
- [content-schema/schemas/generated-faction.schema.json](../../../content-schema/schemas/generated-faction.schema.json)
  — `notes` block remains, but add a one-line spec note that
  `notes.providerId` is best-effort metadata; `manifest.generation`
  is the authoritative version pin.
- [tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md](../../../tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md)
  — extend Stage-6 acceptance to require writing
  `manifest.generation`.
- [docs/architecture/ai-generation-pipeline.md](../../architecture/ai-generation-pipeline.md)
  — Stage 6 description gains a "Version pin" bullet.

**New Files:**

- `content-schema/schemas/generation-config.schema.json` —
  three-field shape, `additionalProperties: false`.
- `content-schema/examples/generation-config/canonical.json` —
  populated example.
- `tasks/phase-3/02-ai-generation/00c-generation-config-schema.md`
  — owns the new schema; sits next to existing Task #0.

**Implementation Steps:**

1. Author the schema and example.
2. Author the new Task #0c, dependencies on Task #0 only.
3. Update manifest schema additively (no breaking change to
   first-party packs because the field is optional).
4. Update Task #6 acceptance to require writing the block; failure
   to write it should fail Stage 6.
5. Update Task #8 (evaluation) to assert that the five generated
   factions have a populated `manifest.generation` block.
6. Schema-matrix row + `npm run validate`.

**Dependencies:** None blocking.

**Complexity:** S.

---

#### Issue: Determinism contract conflates "seed" with "guarantee"

**Source:** Q240 (⚠ Partial), Risk #1 ("Provider non-determinism
leaking into 'reproducible' claims if `seed` is treated as a
guarantee instead of a hint").

**Problem:** `GenerationRequest.seed` is documented as a
"deterministic seed passed to providers that support reproducible
output." The pipeline doc *does* clarify ("No determinism guarantee
on provider output") but the schema field's `description` does not.
A future contributor reading only the schema sees a deterministic
seed and writes code that assumes reproducibility.

**Impact:**

- Tests can be written that depend on a guarantee that does not
  hold in practice (provider-side temperature drift, model version
  rotation).
- The line "determinism begins at Stage 4 onward" gets lost when
  someone refactors and assumes seed propagates earlier.

**Solution:** Tighten the schema description on `seed` to "best-
effort hint to providers; not a determinism guarantee — see
ai-generation-pipeline.md." Rename downstream usage from
"deterministic seed" to "reproducibility hint" in
`GenerationRequest`. Add a one-paragraph callout box in
`ai-generation-pipeline.md` titled "Determinism boundary" that names
Stage 4 as the first deterministic stage.

**Files to Update:**

- [content-schema/schemas/generation-request.schema.json](../../../content-schema/schemas/generation-request.schema.json)
  — tighten `seed.description`.
- [docs/architecture/ai-generation-pipeline.md](../../architecture/ai-generation-pipeline.md)
  — add the callout box.
- [docs/architecture/determinism.md](../../architecture/determinism.md)
  — single-line cross-reference.
- [tasks/phase-3/02-ai-generation/00-generation-io-schemas.md](../../../tasks/phase-3/02-ai-generation/00-generation-io-schemas.md)
  — note that the description is part of the schema contract.

**New Files:** None.

**Implementation Steps:**

1. Edit the schema description.
2. Add the callout in `ai-generation-pipeline.md` directly above the
   Stage 1 row.
3. Add the `determinism.md` cross-reference.
4. `npm run validate`.

**Dependencies:** None.

**Complexity:** S.

---

### Architecture / Pipeline

#### Issue: Asset normalization pipeline is undefined

**Source:** Q239 (❌ UNKNOWN), Missing Logic #2.

**Problem:** No spec for sprite dimensions, palette quantization,
animation frame counts, or atlas binding for AI-generated assets.
Task #5 produces a single colored placeholder SVG with no dimension
constraint. There is a general renderer/asset contract elsewhere
(`assets/index.json`), but the pipeline doc's Stage 6 only writes
`assets/index.json` "with placeholder bindings" — no normalization.

**Impact:**

- Once Task #5 is upgraded to call a real image-gen API, generated
  sprites will be at whatever resolution/palette the provider
  returned, breaking renderer assumptions about sprite size and
  faction palette consistency.
- Atlas packing, which assumes uniform frame counts and sizes,
  cannot ingest mixed-size AI output without a normalization stage.

**Solution:** Author an `asset-normalization.md` spec defining four
contracts: (1) **dimension contract** — target widths/heights per
asset role (creature sprite, hero portrait, building, ability
icon); (2) **palette contract** — per-faction palette derived from
faction metadata, applied via quantization; (3) **frame-count
contract** — per-asset-role required frame counts (idle, attack,
death) with a fallback rule; (4) **atlas binding** — a
deterministic packing of normalized assets into the renderer atlas.
Each contract is a stage-input/stage-output pair, runnable
independently.

**Files to Update:**

- [docs/architecture/ai-generation-pipeline.md](../../architecture/ai-generation-pipeline.md)
  — Stage 6 description gains a "Normalize before bind" bullet
  pointing at the new spec.
- [tasks/phase-3/02-ai-generation/05-asset-generation-stub-imagegen-api.md](../../../tasks/phase-3/02-ai-generation/05-asset-generation-stub-imagegen-api.md)
  — extend "future-work" section to require the normalization
  contract.

**New Files:**

- `docs/architecture/asset-normalization.md` — the four contracts
  above, written as deterministic stage transformations.
- `content-schema/schemas/asset-normalization-spec.schema.json` —
  per-asset-role dimension/frame-count constraints.
- `content-schema/examples/asset-normalization-spec/canonical.json`
  — the values used by first-party packs (read from existing
  faction sprite metadata).
- `tasks/phase-3/02-ai-generation/05b-asset-normalization.md` —
  owns the new doc, schema, and the normalization stage between
  raw image-gen output and pack materialize.

**Implementation Steps:**

1. Author the asset-normalization spec doc.
2. Author the schema and example, populating from existing faction
   sprite assumptions.
3. Author Task #5b with `ownedPaths` over the doc, schema, and
   normalization-stage prose paragraph in the pipeline doc.
4. Update Task #5 to cite Task #5b as a downstream consumer.
5. Schema-matrix row + `npm run validate`.

**Dependencies:** Image moderation task (#6b above) must already be
defined; normalization runs **after** moderation and **before** pack
materialize.

**Complexity:** L (new spec writing dominates).

---

#### Issue: No explicit retry policy for shape/coherence/balance failures

**Source:** Q237 (⚠ Partial), Missing Logic #6, Improvement: "Codify
a `RetryPolicy` for shape/coherence/balance failures (max attempts,
what re-prompt to issue)."

**Problem:** The failure-modes table in the pipeline doc says shape
errors do not auto-retry, coherence errors **may** route to
"regenerate with resolved IDs," and balance failures **may** route
to the optimizer. The optimizer has a hard cap of 10 iterations
(coordinate descent). But the **outer** retry policy — "if shape
fails, do we re-prompt? how many times? with what prompt?" — is
informal.

**Impact:**

- Two implementers will write two different retry policies and
  produce divergent UX.
- "Why did my generation succeed yesterday but fail today?" is
  unanswerable without a documented retry surface.
- Cost-per-generation is unbounded without a max-attempts cap.

**Solution:** Add a `RetryPolicy` schema and a section in the
pipeline doc that names the policy per failure class. Three failure
classes: **shape** (re-prompt with the validation report attached as
a "fix this" instruction; max 2 attempts), **coherence** (re-prompt
with resolved-ID hints; max 1 attempt; fall through to "drop the
referencing record"), **balance** (route to optimizer as today; no
re-prompt). Each policy has a `maxAttempts`, an
`onExhaust` action (`fail`/`degrade`/`escalate-to-user`), and a
`backoff` (none for the first re-prompt, fixed 1s before the second).

**Files to Update:**

- [docs/architecture/ai-generation-pipeline.md](../../architecture/ai-generation-pipeline.md)
  — replace the "may route to" prose in the failure-modes table
  with a citation of the new schema.
- [tasks/phase-3/02-ai-generation/02-schema-validation-plus-coherence-check.md](../../../tasks/phase-3/02-ai-generation/02-schema-validation-plus-coherence-check.md)
  — extend acceptance to require respecting the retry policy.
- [tasks/phase-3/02-ai-generation/01-prompt-provider-structured-output-raw-json.md](../../../tasks/phase-3/02-ai-generation/01-prompt-provider-structured-output-raw-json.md)
  — extend acceptance to consume `RetryPolicy` for shape failures.

**New Files:**

- `content-schema/schemas/retry-policy.schema.json` —
  `{maxAttempts, onExhaust, backoff}`, plus a per-failure-class map.
- `content-schema/examples/retry-policy/canonical.json` — the
  defaults above.
- `tasks/phase-3/02-ai-generation/02b-retry-policy.md` — owns
  the schema + the failure-mode-table revision.

**Implementation Steps:**

1. Author the schema and canonical example.
2. Update the pipeline doc's failure-mode table to cite the schema.
3. Update Task #1 and Task #2 acceptance criteria.
4. Author Task #2b with `ownedPaths` covering only the new schema
   and the table prose.
5. `npm run validate`.

**Dependencies:** None.

**Complexity:** S.

---

#### Issue: Provider transport failures have no taxonomy or recovery UX

**Source:** Q245 (⚠ Partial), Missing Logic #7, Improvement: "Add a
provider-failure taxonomy (transport, auth, quota, content-policy)
so the UI can render distinct recovery actions."

**Problem:** Task #7
([generation-ui-prompt-preview-download](../../../tasks/phase-3/02-ai-generation/07-generation-ui-prompt-preview-download.md))
specifies a progress bar, cancel, and edit-in-editor recovery for
**balance** results. **Transport** failures (timeout, rate-limit,
auth, content-policy refusal) have no documented UX. Each requires
a different user action (retry-now, retry-after-cooldown,
sign-in-again, change-prompt), and none are specified.

**Impact:**

- The Generation UI cannot tell the user *what to do*; it can only
  say "failed."
- Telemetry cannot distinguish a temporary network blip from a
  systemic rate-limit issue.
- Adding a second provider later is awkward because the failure
  contract is implicit.

**Solution:** Define a four-class `ProviderFailure` discriminated
union: `transport` (auto-retry with backoff up to N), `auth`
(re-auth flow, no retry), `quota` (cool-down timer in UI, retry
after expiry), `content-policy` (re-prompt UX, no auto-retry). Each
class is independent of the schema/coherence/balance classes from
the previous section — both can fire on the same generation.

**Files to Update:**

- [docs/architecture/ai-integration.md](../../architecture/ai-integration.md)
  — add a "Provider failure taxonomy" section.
- [tasks/phase-3/02-ai-generation/07-generation-ui-prompt-preview-download.md](../../../tasks/phase-3/02-ai-generation/07-generation-ui-prompt-preview-download.md)
  — extend acceptance to cover the four failure classes with
  distinct UI states.
- [docs/architecture/wiki/screens/](../../architecture/wiki/screens/)
  — extend the existing generation screen package (under whichever
  index it lives, see
  [docs/architecture/wiki/screens/index.json](../../architecture/wiki/screens/index.json))
  to add the four failure interactions.

**New Files:**

- `content-schema/schemas/provider-failure.schema.json` — the four-
  class union, `additionalProperties: false`.
- `content-schema/examples/provider-failure/transport.json`,
  `…/auth.json`, `…/quota.json`, `…/content-policy.json` —
  canonical examples per class.
- `tasks/phase-3/02-ai-generation/07b-provider-failure-taxonomy.md`
  — owns the schema + the `ai-integration.md` section.

**Implementation Steps:**

1. Author the schema and four canonical examples.
2. Author the `ai-integration.md` section.
3. Update Task #7 acceptance to require a UI handler per class.
4. Author Task #7b.
5. Update the generation screen package's `interactions.md` and
   `data-contracts.md`.
6. `npm run validate`.

**Dependencies:** None blocking; this lives entirely upstream of
Task #7's implementation.

**Complexity:** M.

---

### Lifecycle / Distribution

#### Issue: No post-hoc moderation, takedown, or revocation flow

**Source:** Q246 (❌ UNKNOWN), Missing Logic #5, Risk #5 ("No
takedown story means a marketplace/share layer cannot be opened
safely").

**Problem:** Pre-publication moderation is defined (text moderation,
hard caps, `sandboxed: true`). But after a pack is shared (e.g.
exported, posted to a forum, eventually a marketplace), there is
**no path** to revoke it: no community report flow, no reviewer
queue, no hash-based block list, no pack-revocation propagation, no
replay-compatibility handling for revoked packs.

**Impact:**

- A marketplace or sharing layer cannot ship safely; the audit
  explicitly calls this out.
- A pack that turns out to violate IP or safety after distribution
  cannot be removed from clients except by manual user action.
- Replays referencing a revoked pack have undefined behavior.

**Solution:** Define a `revocation-registry.schema.json` and a
contract doc for how clients consume it. Three components: (1) a
**signed revocation list** maintained by maintainers, listing
`contentHash`es with reason codes; (2) a **client-side check** at
pack load that consults the cached list (refreshed on launch); (3) a
**replay-fallback rule** — replays referencing a revoked pack are
flagged but still playable in a "revoked content present" mode, so
old replays do not silently break.

**Files to Update:**

- [docs/architecture/pack-contract.md](../../architecture/pack-contract.md)
  — add "Revocation" section under "Sandbox enforcement."
- [docs/architecture/content-platform.md](../../architecture/content-platform.md)
  — single-line cross-reference.

**New Files:**

- `content-schema/schemas/revocation-registry.schema.json` —
  signed-list record shape (entry list + signature + version).
- `content-schema/schemas/revocation-entry.schema.json` —
  per-entry shape: `contentHash`, `reasonCode`, `revokedAt`,
  `signature`.
- `content-schema/examples/revocation-registry/canonical.json` —
  empty registry (no revocations at launch).
- `docs/architecture/revocation.md` — the three-component contract
  above.
- `tasks/phase-2/05-revocation-registry.md` — owns the schemas
  and the contract doc. Sits in Phase-2 because consuming the
  registry is a runtime concern; the contract is needed before
  any sharing layer.

**Implementation Steps:**

1. Author the two schemas and the empty registry example.
2. Author `revocation.md` with the three components.
3. Author Task #5 (Phase-2) with `ownedPaths` covering the new
   files and the prose section in `pack-contract.md`.
4. Add cross-reference in `content-platform.md`.
5. Schema-matrix rows + `npm run validate`.

**Dependencies:** Sandbox enforcement contract task (above) — this
plan extends it.

**Complexity:** L.

---

### Tasks

The new task files this plan introduces, in dependency order, are
listed in §4.

---

## 4. Suggested Task Breakdown

New task files (one Markdown task per item, sized to fit the
existing `tasks/phase-3/02-ai-generation/` and `tasks/phase-2/`
conventions):

- [ ] `tasks/phase-3/02-ai-generation/00b-balance-constraints-schema.md`
      — extract hard caps from moderation prose into a
      schema-enforced contract.
- [ ] `tasks/phase-3/02-ai-generation/00c-generation-config-schema.md`
      — orchestrator semver + prompt-template hash + ruleset hash
      pinned in `manifest.generation`.
- [ ] `tasks/phase-3/02-ai-generation/02b-retry-policy.md`
      — codify retry policy for shape/coherence/balance failures.
- [ ] `tasks/phase-3/02-ai-generation/05b-asset-normalization.md`
      — dimensions, palette, frame counts, atlas binding for AI
      output.
- [ ] `tasks/phase-3/02-ai-generation/06b-image-moderation.md`
      — NSFW + IP-likeness + style conformance for sprites/portraits.
- [ ] `tasks/phase-3/02-ai-generation/07b-provider-failure-taxonomy.md`
      — transport / auth / quota / content-policy classes with
      distinct UI handlers.
- [ ] `tasks/phase-3/02-ai-generation/09-pack-lifecycle-cache-and-gc.md`
      — provider-response cache, disk-quota policy, GC, ownership.
- [ ] `tasks/phase-2/04-sandbox-enforcement-contract.md`
      — predicate signature + four-consumer enforcement matrix.
- [ ] `tasks/phase-2/05-revocation-registry.md`
      — signed revocation list, client check, replay-fallback rule.
- [ ] Edit
      `tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md`
      to consume `balance-constraints.schema.json` (rather than
      owning the cap values), to write `manifest.generation`, and
      to write `sandboxedReason: "ai-generated"`.
- [ ] Edit
      `tasks/phase-3/02-ai-generation/05-asset-generation-stub-imagegen-api.md`
      to require the moderation hook even for the SVG stub.
- [ ] Edit
      `tasks/phase-3/02-ai-generation/04-gradient-free-stat-optimizer.md`
      to read its bounds from `balance-constraints.schema.json`.
- [ ] Edit
      `tasks/phase-3/02-ai-generation/01-prompt-provider-structured-output-raw-json.md`
      and `…/02-schema-validation-plus-coherence-check.md` to
      consume `retry-policy.schema.json`.
- [ ] Edit
      `tasks/phase-3/02-ai-generation/07-generation-ui-prompt-preview-download.md`
      to render distinct UI states per `provider-failure` class.

Each new task must declare `ownedPaths` covering only the schema +
doc paragraphs it introduces, with `Dependencies` on existing tasks
listed in §3 above. Run `npm run validate:tasks` after each.

---

## 5. Execution Order

Topological order — strict prerequisites only, no fan-out
optimization. Items that share a row can be done in either order
within the row.

1. **Schema scaffolding** (no runtime consumers yet, no breaking
   changes):
   - `00b-balance-constraints-schema.md`
   - `00c-generation-config-schema.md`
   - `02b-retry-policy.md`
   - `07b-provider-failure-taxonomy.md`
2. **Edit existing M7 tasks** to consume the schemas above:
   - Edit Task #4 to read bounds from `balance-constraints`.
   - Edit Task #6 to consume caps + write `manifest.generation` +
     write `sandboxedReason`.
   - Edit Tasks #1 + #2 to consume `retry-policy`.
   - Edit Task #7 to render distinct states per `provider-failure`.
3. **Determinism-boundary tightening** (`Q240` description fix; safe
   in parallel with step 2).
4. **`sandbox-enforcement-contract`** (Phase-2 task): authors the
   pack-contract section + manifest `sandboxedReason` field. Must
   land before revocation, because revocation extends it.
5. **Image moderation** (`06b-image-moderation.md`) — extends
   `ModerationProvider`, adds the schema, edits Task #5 + Task #6.
6. **Asset normalization** (`05b-asset-normalization.md`) — depends
   on image moderation (normalization runs **after** moderation in
   the stage table).
7. **Pack-lifecycle / cache / GC**
   (`09-pack-lifecycle-cache-and-gc.md`) — depends on Task #6
   already writing `sandboxedReason` (step 2) so GC can target
   AI-generated packs precisely.
8. **Revocation registry** (`tasks/phase-2/05-revocation-registry.md`)
   — depends on the sandbox-enforcement contract (step 4).
9. **Final validation:** `npm run generate:task-system-report`,
   `npm run validate:tasks`, `npm run validate`. Confirm the
   schema-matrix lists every new schema, every new task is in the
   registry, every new doc is linked from the wiki index.

The first three steps are pure additive schema/doc work and can be
landed in any order without breaking existing `npm run validate`.
Steps 4 onward modify cross-cutting contracts and must be sequenced.

---

## 6. Risks if Not Implemented

The audit's Risk list, restated as the operational consequence of
shipping the next layer (sharing / ranked / marketplace) without
each fix:

- **Image moderation undefined** → unsafe imagery ships in shared
  packs the moment Task #5 is upgraded from a stub. Single-largest
  reputational blocker.
- **Hard caps in moderation, not schema** → a non-orchestrator
  producer of `GeneratedFaction` (community editor, hand-edited
  pack) can write caps-violating content that round-trips through
  shape validation. Defeats the orchestrator-level enforcement
  silently.
- **`sandboxed` flag without enforcement** → the moment a
  multiplayer matchmaker ships, sandboxed packs can enter ranked
  matches. Ranked integrity collapses on day one.
- **No GC / quota** → user disks fill with abandoned sandboxed
  packs over weeks of generator use. Generator becomes
  user-hostile after the first heavy-use evening.
- **No takedown / revocation** → a marketplace cannot ship safely.
  Content that turns out to violate IP or safety after distribution
  is unreachable from the maintainer side.
- **No retry policy** → cost-per-generation unbounded; UX
  divergence between implementers.
- **No provider-failure taxonomy** → UI can only say "failed";
  cannot tell the user what to do; cannot distinguish transient
  from systemic failures in telemetry.
- **No generator-version pin** → bug reports cannot be tied to
  orchestrator/prompt-template/ruleset combinations; regression
  tests for "regenerate canonical 5 factions" cannot detect drift.
- **Determinism description mismatch** → a future contributor
  treats `seed` as a guarantee and writes brittle tests against
  provider non-determinism.
- **No asset normalization** → real image-gen output breaks
  renderer assumptions about sprite size, palette, and frame
  count. Atlas packing fails or produces visually broken factions.

---

## 7. AI Implementation Readiness

Score: **9/10** *(after this plan lands; today's score is 6.5/10
per the audit)*.

Reason: Once the schemas in §4 land and the existing Phase-3 tasks
are edited to consume them, every gap the audit names becomes a
documented contract that an autonomous implementer can satisfy
without inventing policy. The remaining 1 point reflects the items
that **cannot** be closed at the contract layer alone — choosing a
hosted image-moderation vendor, choosing exact disk-quota numbers
for production, and operationalizing the maintainer signing key for
the revocation registry — which are operational decisions, not
contract decisions, and are correctly deferred until a sharing
layer is actually being built.

The plan deliberately does **not** alter any of the five answers
the audit marked `✔ Defined` (Q234, Q235, Q236, Q241, Q242). Those
contracts are the foundation this plan extends.
