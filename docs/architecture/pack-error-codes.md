# Pack Load Error Codes

Single canonical catalog for every pack-load failure code. Tasks that
emit a new code MUST add it here in the same change. Localizers
translate the localization-key column; telemetry buckets failures by
code; the mod-manager UI renders the localized message and maps
severity to its badge and blocking behavior.

Companion docs:

- [`content-system-policy.md` § 8](./content-system-policy.md#8-error-codes)
  — cross-cutting policy that produces these codes.
- [`error-schema-map.md`](./error-schema-map.md) — layer / consumer /
  owning-plan map across every error-shaped artifact.
- [`pack-contract.md`](./pack-contract.md) — archive / templating /
  asset-fallback rules referenced from the table.
- [`asset-policy.md`](./asset-policy.md),
  [`asset-loading.md`](./asset-loading.md),
  [`ugc-safety.md`](./ugc-safety.md),
  [`sandbox-model.md`](./sandbox-model.md) — emitting subsystems.

A typed enum mirror at `src/content-runtime/error-codes.ts` lands
once the runtime begins (Task
[`mvp.02b-asset-pipeline.16`](../../tasks/mvp/02b-asset-pipeline/16-pack-error-code-catalog.md)).
Until then, this doc is the single source.

## Code Convention

Every code is a stable string namespaced as
`pack.error.<area>.<reason>`. The localization key is the same
string (no separate prefix). Areas match the validation-pipeline
stages in
[`content-system-policy.md` § 7](./content-system-policy.md#7-validation-pipeline)
and the load-time ordering in
[`pack-contract.md` § Verification Ordering](./pack-contract.md#verification-ordering).

## Catalog

Rows are grouped by area in roughly the order the loader runs each
stage. Severity values are the canonical-tier defaults; sandbox
exceptions are spelled out per row.

### Archive (pre-schema parser hardening)

| Code | Severity | Localization Key | When Emitted |
|---|---|---|---|
| `pack.error.archive.path-traversal` | fatal | `pack.error.archive.path-traversal` | ZIP entry path contains `..`, leading `/`, backslashes, NUL bytes, or symlink flags. See [`pack-contract.md` § Archive Rule](./pack-contract.md#archive-rule). |
| `pack.error.archive.too-large` | fatal | `pack.error.archive.too-large` | Cumulative compressed bytes exceed `maxCompressedBytes` (64 MB). |
| `pack.error.archive.uncompressed-too-large` | fatal | `pack.error.archive.uncompressed-too-large` | Cumulative uncompressed bytes exceed `maxUncompressedBytes` (512 MB). |
| `pack.error.archive.ratio` | fatal | `pack.error.archive.ratio` | Decompression ratio exceeds `maxDecompressionRatio` (200:1). |
| `pack.error.archive.entry-count` | fatal | `pack.error.archive.entry-count` | ZIP entry count exceeds `maxEntries` (20 000). |

### Manifest

| Code | Severity | Localization Key | When Emitted |
|---|---|---|---|
| `pack.error.manifest.missing` | fatal | `pack.error.manifest.missing` | Archive contains no `manifest.json`. |
| `pack.error.manifest.schema` | fatal | `pack.error.manifest.schema` | Manifest fails JSON-schema validation (carries inner JSON path). |
| `pack.error.manifest.id-pattern` | fatal | `pack.error.manifest.id-pattern` | `id` violates the namespace pattern in [`content-system-policy.md` § 1](./content-system-policy.md#1-pack-identity), or uses a reserved prefix without authorization. |
| `pack.error.manifest.base-url-scheme` | fatal | `pack.error.manifest.base-url-scheme` | `manifest.baseUrl` is not `blob:`, `pack://`, or a same-origin absolute path; `http:`, `https:`, `file:`, `data:`, and any cross-origin URL are rejected. See [`sandbox-model.md` § 2](./sandbox-model.md#2-capability-matrix). |

### Dependency resolver

| Code | Severity | Localization Key | When Emitted |
|---|---|---|---|
| `pack.error.dependency.missing` | fatal | `pack.error.dependency.missing` | Resolver cannot find a declared dependency `{id, version}`. |
| `pack.error.dependency.cycle` | fatal | `pack.error.dependency.cycle` | Resolver detects a cycle; payload lists every pack in the cycle. |
| `pack.error.dependency.version-conflict` | fatal | `pack.error.dependency.version-conflict` | Two installed versions of the same dep `id` satisfy different ranges with no overlap. |

### Override resolver

| Code | Severity | Localization Key | When Emitted |
|---|---|---|---|
| `pack.error.override.unordered` | fatal | `pack.error.override.unordered` | Two packs override the same target without a dep edge between them, OR a pack `provides` an ID that another loaded pack already provides without an `overrides` declaration. |
| `pack.error.override.sandboxed-shadow-canonical` | fatal | `pack.error.override.sandboxed-shadow-canonical` | A sandboxed-tier pack would shadow a canonical-tier record. Refused at registry assembly per [`sandbox-model.md` § 3](./sandbox-model.md#3-override-precedence-trust-rule). |
| `pack.error.override.community-shadow-canonical` | fatal | `pack.error.override.community-shadow-canonical` | A community-signed pack would silently shadow a canonical-tier record without an explicit `overrides[]` declaration. Refused at registry assembly per [`sandbox-model.md` § 3](./sandbox-model.md#3-override-precedence-trust-rule). |

### Asset

| Code | Severity | Localization Key | When Emitted |
|---|---|---|---|
| `pack.error.asset.missing` | fatal (gameplay) / warn (presentation) | `pack.error.asset.missing` | Pack-validator cannot find a declared asset path. Severity follows the matrix in [`pack-contract.md` § Asset Fallback And Placeholders](./pack-contract.md#asset-fallback-and-placeholders). |
| `pack.error.asset.integrity` | fatal | `pack.error.asset.integrity` | Asset bytes hash to a value other than `assets[].sha256`. |
| `pack.error.asset.external-url` | fatal | `pack.error.asset.external-url` | `assets/index.json` declares a path with an absolute scheme (`http`, `https`, `file`, `data`, `blob`) or otherwise non-pack-relative path. See [`ugc-safety.md` § External URL Ban](./ugc-safety.md#1-external-url-ban). |
| `pack.error.asset.kind-forbidden` | fatal | `pack.error.asset.kind-forbidden` | `assets/index.json` declares a `kind` outside the closed enum, or one of the forbidden kinds (`svg`, `font`, `video`, `html`, `wasm`, `js`, `mjs`, `cjs`, `ts`). See [`asset-policy.md` § 2](./asset-policy.md#2-forbidden-kinds). |
| `pack.error.asset.mime-mismatch` | fatal | `pack.error.asset.mime-mismatch` | Magic-byte gate refused: declared `kind` does not match the observed first bytes per [`asset-loading.md` § 4](./asset-loading.md#4-magic-byte-table). |
| `pack.error.asset.too-large` | fatal | `pack.error.asset.too-large` | Asset bytes exceed `maxAssetBytes` (32 MB) per [`asset-loading.md` § 1.1](./asset-loading.md#11-per-asset-decoder-caps), or per-pack residency exceeded. |
| `pack.error.asset.dim-cap` | fatal | `pack.error.asset.dim-cap` | Image dim pre-flight refused on `maxImageWidth`, `maxImageHeight`, or `maxImagePixels` per [`asset-loading.md` § 1.1](./asset-loading.md#11-per-asset-decoder-caps). |
| `pack.error.asset.audio-cap` | fatal | `pack.error.asset.audio-cap` | Audio header pre-flight or post-decode check refused on `maxAudioChannels`, `maxAudioSampleRate`, or `maxAudioDurationMs` per [`asset-loading.md` § 1.1](./asset-loading.md#11-per-asset-decoder-caps). |
| `pack.error.asset.fetch-rate` | fatal | `pack.error.asset.fetch-rate` | Per-pack token bucket exhausted (`maxConcurrentFetches`, `maxFetchesPerSecondPerPack`); request queued > 5 s per [`asset-loading.md` § 1.2](./asset-loading.md#12-per-pack-budgets). |
| `pack.error.asset.logical-id-not-found` | fatal (gameplay) / warn (presentation) | `pack.error.asset.logical-id-not-found` | Asset registry has no row for the requested logical id. Severity matches `pack.error.asset.missing` per [`asset-path-resolution.md`](./asset-path-resolution.md). |
| `pack.error.asset.atlas-slot-missing` | fatal (gameplay) / warn (presentation) | `pack.error.asset.atlas-slot-missing` | Asset registry resolves to an atlas, but the named slot is absent. Severity matches `pack.error.asset.missing` per [`asset-path-resolution.md`](./asset-path-resolution.md). |

### Record

| Code | Severity | Localization Key | When Emitted |
|---|---|---|---|
| `pack.error.record.raw-asset-path` | fatal | `pack.error.record.raw-asset-path` | Gameplay record embeds a raw asset path instead of a registered logical id, violating the asset-path-resolution contract in [`asset-path-resolution.md`](./asset-path-resolution.md). |

### Balance corridor

| Code | Severity | Localization Key | When Emitted |
|---|---|---|---|
| `pack.error.balance.outOfCorridor` | fatal (non-sandbox) / warn (sandbox) | `pack.error.balance.outOfCorridor` | Numeric stat outside the tier corridor in [`content-schema/balance/corridor.json`](../../content-schema/balance/corridor.json). |
| `pack.error.balance.factionImbalance` | fatal (non-sandbox) / warn (sandbox) | `pack.error.balance.factionImbalance` | Pack-wide average unit skew exceeds `factionBudget.skewThreshold`. Every unit may be in-corridor individually, but the pack as a whole skews above (or below) tier average — author must compensate by lowering or raising other units. |

### Signature and signing

| Code | Severity | Localization Key | When Emitted |
|---|---|---|---|
| `pack.error.signature.invalid` | fatal | `pack.error.signature.invalid` | ed25519 verification failed. Owned by Task [`phase-2.05-mod-system.02`](../../tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md). |
| `pack.error.signing.tier-mismatch` | fatal | `pack.error.signing.tier-mismatch` | Manifest declares `trustTier: "canonical"` (or `"community-signed"`) but the verified signature key is not registered for that tier. See [`sandbox-model.md` § 5](./sandbox-model.md#5-schema-seam). |

### Sandbox

| Code | Severity | Localization Key | When Emitted |
|---|---|---|---|
| `pack.error.sandbox.cap` | fatal | `pack.error.sandbox.cap` | Sandboxed pack exceeds HP / ATK / abilities cap. Owned by Task [`phase-2.05-mod-system.03`](../../tasks/phase-2/05-mod-system/03-sandbox-mode-for-ai-generated-packs.md). |

### Canonical-packs registry

| Code | Severity | Localization Key | When Emitted |
|---|---|---|---|
| `pack.error.canonical.missing` | fatal | `pack.error.canonical.missing` | Canonical-packs registry entry has `required: true` but no matching pack is loaded. |
| `pack.error.canonical.mismatch` | fatal | `pack.error.canonical.mismatch` | Canonical-packs registry pinned `version`, `signatureKeyId`, or `contentHash` does not match the loaded pack. |

### Locale merge

| Code | Severity | Localization Key | When Emitted |
|---|---|---|---|
| `pack.error.locale.unordered` | fatal | `pack.error.locale.unordered` | Two packs define the same locale key without a dep edge between them. |
| `pack.error.locale.template-syntax` | fatal | `pack.error.locale.template-syntax` | Localization payload contains template syntax other than ICU `{var}` (Mustache, EJS, Handlebars, Pug). See [`pack-contract.md` § Templating Rule](./pack-contract.md#templating-rule). |

## Severity

- **fatal** — the pack does not load; the mod manager surfaces a
  blocking error badge and the resolver excludes the pack from the
  loaded set.
- **warn** — the pack loads; the mod manager surfaces a warning badge
  alongside `SANDBOX` (or other applicable badges). Warnings are
  reported to telemetry but do not block ranked play unless combined
  with a fatal code.

## Adding a Code

1. Append a row to the relevant area subtable above with code,
   severity, localization key, and "when emitted".
2. Add the matching `pack.error.*` key to the canonical English
   localization at
   `resources/packs/heroes_reforged_locale_en/locales/en.localization.json`
   (or to the locale file owned by Task
   [`mvp.02b-asset-pipeline.14`](../../tasks/mvp/02b-asset-pipeline/14-per-pack-localization-and-merge.md)).
3. Re-export the code from `src/content-runtime/error-codes.ts` once
   that module exists.
4. Update the emitting task to reference the code by name (no ad-hoc
   strings). The `validate:tasks` lint will fail on a `pack.error.*`
   token in a task that is not in this table.

---

## 🔍 Sync Check

- **UI: ✔** — The mod-manager rendering contract (localized message + severity-to-badge mapping) is delegated to [`wiki/screens/71-pack-manager/`](./wiki/screens/71-pack-manager/) via [`content-system-policy.md` § 8](./content-system-policy.md#8-error-codes); this doc owns no copy strings directly.
- **Schema: ✔** — Every numeric and enum constant in the table resolves to its canonical source: archive caps to [`pack-trust.md` § Resource Limits](./pack-trust.md#1-resource-limits), per-asset decoder caps to [`asset-loading.md` § 1.1](./asset-loading.md#11-per-asset-decoder-caps), per-pack budgets to [`asset-loading.md` § 1.2](./asset-loading.md#12-per-pack-budgets), magic bytes to [`asset-loading.md` § 4](./asset-loading.md#4-magic-byte-table), forbidden kinds to [`asset-policy.md` § 2](./asset-policy.md#2-forbidden-kinds), balance corridor to [`content-schema/balance/corridor.json`](../../content-schema/balance/corridor.json), and the `trustTier` / `baseUrl` schema seam to [`sandbox-model.md`](./sandbox-model.md) §§ 2, 5. No schema-matrix row applies (this doc is a markdown catalog, not a JSON schema; cross-referenced from [`error-schema-map.md`](./error-schema-map.md) instead).
- **Tasks: ⚠** — Catalog owner [`mvp.02b-asset-pipeline.16`](../../tasks/mvp/02b-asset-pipeline/16-pack-error-code-catalog.md) lists this file as its sole `Owned Path`; reciprocal references from emitting tasks `phase-2.05-mod-system.{02,03,08,09}`, `mvp.02b-asset-pipeline.{12,13,15,18}`, `mvp.00-core-architecture.{22-04,22-05}`, and `phase-2.05-mod-system.04` all resolve. Sibling-doc references to override-shadow codes are not yet in the catalog — see `## ⚠ Issues`.

## ⚠ Issues

- **Override shadow codes are referenced by sibling docs but not registered here.** [`pack-contract.md` § Override Precedence](./pack-contract.md#override-precedence) names `override.sandboxed-shadow-canonical` and `override.unauthorized-shadow`, and [`sandbox-model.md` § 3](./sandbox-model.md#3-override-precedence-trust-rule) additionally names `override.community-shadow-canonical`. None of these three appear in the catalog. Per the "Tasks that emit a new code MUST add it here in the same change" rule above, the gap belongs to [`tasks/phase-2/05-mod-system/08-override-precedence-and-patch-merge.md`](../../tasks/phase-2/05-mod-system/08-override-precedence-and-patch-merge.md) (override-precedence implementer) and [`tasks/phase-2/05-mod-system/10-sandbox-enforcement-contract.md`](../../tasks/phase-2/05-mod-system/10-sandbox-enforcement-contract.md) (sandbox-enforcement consumer). Suggested entries, all severity `fatal`, in the Override resolver subtable: `pack.error.override.sandboxed-shadow-canonical` ("sandboxed pack may not shadow a higher-tier record"), `pack.error.override.community-shadow-canonical` ("community-signed pack may not silently shadow a canonical record"), and either an explicit `pack.error.override.unauthorized-shadow` row or a one-line note that the existing `pack.error.override.unordered` row covers the same-tier-without-`overrides[]` case under a different name. Skill did not add the rows (Hard Prohibition B — never invent codes; this is a sibling-doc gap that needs a catalog amendment by the emitting task). The same gap is independently flagged in the `content-system-policy.md`, `pack-contract.md`, and `sandbox-model.md` audits.
- **Catalog references `signatureKeyId` while content-system-policy.md § 9 also uses `signatureKeyId`; canonical-packs schema field name not verified by this audit.** The `pack.error.canonical.mismatch` row names three pinned fields (`version`, `signatureKeyId`, `contentHash`) that match the prose in [`content-system-policy.md` § 9](./content-system-policy.md#9-canonical-pack-registry). The canonical source is [`canonical-packs.schema.json`](../../content-schema/schemas/canonical-packs.schema.json); if that schema names the field differently, the divergence is owned by [`phase-2.05-mod-system.09-canonical-packs-registry`](../../tasks/phase-2/05-mod-system/09-canonical-packs-registry.md). Surfaced for the next pass so a reader cross-checking the schema is not surprised; no rewrite implied.
- **Locale file path in § Adding a Code does not yet exist on disk.** Step 2 directs new codes to `resources/packs/heroes_reforged_locale_en/locales/en.localization.json`; the path is not present in the repo today (verified by `Glob resources/packs/**/en.localization.json`). The "or to the locale file owned by Task 02b-14" branch correctly resolves to [`mvp.02b-asset-pipeline.14-per-pack-localization-and-merge`](../../tasks/mvp/02b-asset-pipeline/14-per-pack-localization-and-merge.md), so the rewrite kept the dual-path wording. Closer: whichever of `mvp.02b-asset-pipeline.14` (locale file) or `mvp.02b-asset-pipeline.16` (this catalog) lands first establishes the canonical path; the other reconciles. No edit to a non-target file in this audit (Hard Prohibition D).
