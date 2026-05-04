# Implementation Report: 14 — AI-Generated Content Pipeline

> Plan: [14-ai-generated-content-pipeline-plan.md](./14-ai-generated-content-pipeline-plan.md)
> Validation: `npm run all` passes (links, contracts, cross-refs,
> commands, tasks lint, arch, ui-components, animation budgets,
> enums, balance, error-codes, asset-index, wiki, task-system
> report). `npm test` — 32 / 32 pass.

This report records the changes that landed for the
AI-generated-content readiness audit. Every gap the audit named
is now a documented, schema-validatable contract.

---

## 1. Updated Files

- `content-schema/schemas/manifest.schema.json` — added optional
  `sandboxedReason` (enum) and `generation` ($ref to
  `generation-config.schema.json`).
- `content-schema/schemas/generation-request.schema.json` — tightened
  `seed.description` to call out that seed is a best-effort
  reproducibility hint, not a determinism guarantee.
- `content-schema/schemas/generated-faction.schema.json` — added a
  description-level pointer to `balance-constraints.schema.json` as
  the single source of truth for caps; clarified that
  `notes.providerId` is best-effort metadata while the authoritative
  version pin is `manifest.generation`.
- `docs/architecture/ai-generation-pipeline.md` — added a
  "Determinism boundary" callout, a Stage 5.5 (image moderation)
  and Stage 5.6 (asset normalize) row, a Stage 6 "Version pin /
  Sandbox metadata / Normalize before bind" bullet list, a
  cap-violation row in the failure-modes table, a citation of
  `retry-policy.schema.json` for outer-loop retry, a citation of
  `provider-failure.schema.json` for transport-layer failures, and a
  "Lifecycle" subsection cross-referencing `pack-lifecycle.md`.
- `docs/architecture/ai-integration.md` — extended
  `ModerationProvider` with `moderateImage`; added a
  "Provider failure taxonomy" section enumerating four classes.
- `docs/architecture/pack-contract.md` — added a "Sandbox
  enforcement" section with a four-row consumer/behavior table and
  a "Revocation" section pointing at `revocation.md`. Added
  `sandboxedReason` under "Trust Fields".
- `docs/architecture/content-platform.md` — single-line
  cross-references to sandbox enforcement, lifecycle, and
  revocation under "Asset-Load Failure Policy".
- `docs/architecture/determinism.md` — single-line "hosted
  AI-provider calls" entry under "Forbidden In Deterministic Paths"
  pointing at the pipeline's determinism boundary.
- `docs/architecture/schema-matrix.md` — ten new rows: BalanceConstraints,
  GenerationConfig, RetryPolicy, ProviderFailure,
  ImageModerationReport, AssetNormalizationSpec,
  ProviderResponseCacheEntry, RevocationEntry, RevocationRegistry.
- `docs/planning/implementation-log.md` — one entry recording that
  AI-generated-content lifecycle is now contractual rather than
  discretionary.
- `tasks/phase-3/02-ai-generation.md` — added the seven new task
  index entries (00b, 00c, 02b, 05b, 06b, 07b, 09).
- `tasks/phase-2/05-mod-system.md` — added the two new task index
  entries (10, 11).
- `tasks/phase-3/02-ai-generation/00-generation-io-schemas.md` —
  added an acceptance criterion that `seed.description` is part of
  the contract.
- `tasks/phase-3/02-ai-generation/01-prompt-provider-structured-output-raw-json.md`
  — added an acceptance criterion that shape failures consume
  `RetryPolicy.shape`.
- `tasks/phase-3/02-ai-generation/02-schema-validation-plus-coherence-check.md`
  — added an acceptance criterion that coherence failures route
  through `RetryPolicy.coherence`.
- `tasks/phase-3/02-ai-generation/04-gradient-free-stat-optimizer.md`
  — bounds now read from `balance-constraints.schema.json`; added
  `00b` as a dependency.
- `tasks/phase-3/02-ai-generation/05-asset-generation-stub-imagegen-api.md`
  — stub MUST call the moderation hook; future-work clause cites
  the normalization stage; added `06b` as a dependency.
- `tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md`
  — caps consumed (not re-decided) from `balance-constraints`; auto-set
  `sandboxedReason` and `manifest.generation`; added `00b`, `00c` as
  dependencies; image-moderation hook must be called.
- `tasks/phase-3/02-ai-generation/07-generation-ui-prompt-preview-download.md`
  — distinct UI states per `ProviderFailure` class; "Force
  regenerate" affordance bypasses the lifecycle cache.
- `scripts/check-repo-contracts.mjs` — added suffix mappings for
  every new example-file family.

## 2. New Files

### Schemas

- `content-schema/schemas/balance-constraints.schema.json`
- `content-schema/schemas/generation-config.schema.json`
- `content-schema/schemas/retry-policy.schema.json`
- `content-schema/schemas/provider-failure.schema.json`
- `content-schema/schemas/image-moderation-report.schema.json`
- `content-schema/schemas/asset-normalization-spec.schema.json`
- `content-schema/schemas/provider-response-cache-entry.schema.json`
- `content-schema/schemas/revocation-entry.schema.json`
- `content-schema/schemas/revocation-registry.schema.json`

### Examples

- `content-schema/examples/balance-constraints/canonical.balance-constraints.json`
- `content-schema/examples/generation-config/canonical.generation-config.json`
- `content-schema/examples/retry-policy/canonical.retry-policy.json`
- `content-schema/examples/provider-failure/{transport,auth,quota,content-policy}.provider-failure.json`
- `content-schema/examples/image-moderation-report/{pass,fail-nsfw}.image-moderation-report.json`
- `content-schema/examples/asset-normalization-spec/canonical.asset-normalization-spec.json`
- `content-schema/examples/provider-response-cache-entry/canonical.provider-response-cache-entry.json`
- `content-schema/examples/revocation-registry/canonical.revocation-registry.json`

### Architecture docs

- `docs/architecture/asset-normalization.md`
- `docs/architecture/pack-lifecycle.md`
- `docs/architecture/revocation.md`

### Tasks

- `tasks/phase-3/02-ai-generation/00b-balance-constraints-schema.md`
- `tasks/phase-3/02-ai-generation/00c-generation-config-schema.md`
- `tasks/phase-3/02-ai-generation/02b-retry-policy.md`
- `tasks/phase-3/02-ai-generation/05b-asset-normalization.md`
- `tasks/phase-3/02-ai-generation/06b-image-moderation.md`
- `tasks/phase-3/02-ai-generation/07b-provider-failure-taxonomy.md`
- `tasks/phase-3/02-ai-generation/09-pack-lifecycle-cache-and-gc.md`
- `tasks/phase-2/05-mod-system/10-sandbox-enforcement-contract.md`
- `tasks/phase-2/05-mod-system/11-revocation-registry.md`

## 3. Assumptions

- ⚠️ Assumption: The plan named the two new phase-2 task files at
  `tasks/phase-2/04-sandbox-enforcement-contract.md` and
  `tasks/phase-2/05-revocation-registry.md`, but those slots are
  already taken by the existing module files
  `04-content-editor.md` and `05-mod-system.md`. Following existing
  repo patterns (numbered task files live under their module's
  subdirectory), I placed the two new tasks under
  `tasks/phase-2/05-mod-system/` as `10-sandbox-enforcement-contract.md`
  and `11-revocation-registry.md`.
- ⚠️ Assumption: `generated-faction.schema.json` had no inline
  numeric ranges for HP / ATK / abilities to refactor, so the
  $ref-into-balance-constraints request became a description-level
  pointer plus moving the cap values to the new
  `balance-constraints.schema.json`. The unit-level abilities cap
  remains enforced by the moderation step that consumes the
  constraints schema, not by a JSON-schema `maxItems` change to
  `unit.schema.json` (out of this task's owned paths).
- ⚠️ Assumption: The plan suggests "Lists the existing moderation
  task as a dependency" for `06b-image-moderation.md`. I read this
  as Task 6 only (text moderation contract), not Task 5, to avoid a
  dependency cycle with Task 5 (which the plan also says should
  list the moderation task as a dependency).
- ⚠️ Assumption: `tier corridors` in `balance-constraints.schema.json`
  duplicate the values already in
  `content-schema/balance/corridor.json` (consumed by
  `npm run validate:balance`). The two files are intentionally
  parallel: corridor.json is the validator's input, balance-constraints
  is the AI-generation entry-point contract. Keeping them in lockstep
  is a future hygiene task; the canonical example holds the same
  numbers today.
- ⚠️ Assumption: `manifest.schema.json`'s primary owner is not
  declared in any existing task (no task lists it under
  `Owned Paths:`), so both `00c-generation-config-schema.md` and
  `10-sandbox-enforcement-contract.md` claim it under
  `Owned Paths (shared)` with the additive-extension acceptance
  criteria the lint requires.

## 4. Blockers

None.

## 5. Validation

```
npm run all
  generate:task-registry → 360 tasks, 26 modules
  validate:links → All Markdown links resolve.
  validate:contracts → Repo contract checks passed.
  validate:cross-refs → Cross-reference checks passed.
  validate:commands → Command coverage check passed.
  validate:tasks → Task lint passed: 360 tasks, 0 issues.
  validate:arch → Module-graph check passed.
  validate:ui-components → Screen component coverage check passed.
  validate:animation-budgets → ok
  validate:enums → Enum snapshot check passed.
  validate:balance → 0 violations.
  validate:error-codes → 0 unknown codes referenced.
  build:asset-index --check → 0 drifted packs.
  generate:wiki → built docs/architecture/architecture-wiki.html
  generate:task-system-report → wrote docs/planning/task-system-report.md

npm test → 32 / 32 pass
```

## 6. Commit Message

```
Implement AI-generated-content pipeline plan (14)

Closes the eleven gaps the AI-generated-content readiness audit
flagged: image moderation, hard-cap relocation, sandbox enforcement,
pack lifecycle (cache + quota + GC), determinism boundary,
generator-version pin, retry policy, provider-failure taxonomy,
asset normalization, post-hoc revocation. Each becomes a
schema-validatable contract: nine new schemas, three new
architecture docs, nine new task files, and additive edits to the
manifest, generation-request, generated-faction, pipeline,
integration, pack-contract, content-platform, determinism, and
schema-matrix files. `npm run all` and `npm test` both pass.
```
