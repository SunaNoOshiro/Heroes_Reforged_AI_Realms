# Pack Load Error Codes

Single canonical catalog for every pack-load failure code. Tasks that
emit a new code MUST add it here in the same change. Localizers
translate the localization key column; telemetry buckets failures by
the code column. The mod manager UI renders the localized message and
maps severity to its badge / blocking behavior.

The cross-cutting policy that produces these codes lives in
[`content-system-policy.md` § 8](./content-system-policy.md#8-error-codes).

A typed enum mirror at `src/content-runtime/error-codes.ts` is added
once the runtime begins (Task
[02b-16](../../tasks/mvp/02b-asset-pipeline/16-pack-error-code-catalog.md)).
Until then, this doc is the single source.

## Code Convention

Every code is a stable string namespaced as `pack.error.<area>.<reason>`.
The localization key is the same string (no separate prefix). Areas
match the validation pipeline stages in
[`content-system-policy.md` § 7](./content-system-policy.md#7-validation-pipeline).

## Catalog

| Code | Severity | Localization Key | When Emitted |
|---|---|---|---|
| `pack.error.manifest.missing` | fatal | `pack.error.manifest.missing` | Archive contains no `manifest.json`. |
| `pack.error.manifest.schema` | fatal | `pack.error.manifest.schema` | Manifest fails JSON-schema validation (carries inner JSON path). |
| `pack.error.manifest.id-pattern` | fatal | `pack.error.manifest.id-pattern` | `id` violates the namespace pattern in [`content-system-policy.md` § 1](./content-system-policy.md#1-pack-identity), or uses a reserved prefix without authorization. |
| `pack.error.dependency.missing` | fatal | `pack.error.dependency.missing` | Resolver cannot find a declared dependency `{id, version}`. |
| `pack.error.dependency.cycle` | fatal | `pack.error.dependency.cycle` | Resolver detects a cycle; payload lists every pack in the cycle. |
| `pack.error.dependency.version-conflict` | fatal | `pack.error.dependency.version-conflict` | Two installed versions of the same dep id satisfy different ranges with no overlap. |
| `pack.error.override.unordered` | fatal | `pack.error.override.unordered` | Two packs override the same target without a dep edge between them, OR a pack `provides` an ID that another loaded pack already provides without an `overrides` declaration. |
| `pack.error.asset.missing` | fatal (gameplay) / warn (presentation) | `pack.error.asset.missing` | Pack-validator cannot find a declared asset path. Severity follows the matrix in [`pack-contract.md` § Asset Fallback And Placeholders](./pack-contract.md#asset-fallback-and-placeholders). |
| `pack.error.asset.integrity` | fatal | `pack.error.asset.integrity` | Asset bytes hash to a value other than `assets[].sha256`. |
| `pack.error.sandbox.cap` | fatal | `pack.error.sandbox.cap` | Sandboxed pack exceeds HP / ATK / abilities cap (Task 5-03). |
| `pack.error.balance.outOfCorridor` | fatal (non-sandbox) / warn (sandbox) | `pack.error.balance.outOfCorridor` | Numeric stat outside the tier corridor in [`content-schema/balance/corridor.json`](../../content-schema/balance/corridor.json). |
| `pack.error.balance.factionImbalance` | fatal (non-sandbox) / warn (sandbox) | `pack.error.balance.factionImbalance` | Pack-wide average unit skew exceeds `factionBudget.skewThreshold`. Every unit may be in-corridor individually, but the pack as a whole skews above (or below) tier average — author must compensate by lowering or raising other units. |
| `pack.error.signature.invalid` | fatal | `pack.error.signature.invalid` | ed25519 verification failed (Task 5-02). |
| `pack.error.canonical.missing` | fatal | `pack.error.canonical.missing` | Canonical-packs registry entry has `required: true` but no matching pack is loaded. |
| `pack.error.canonical.mismatch` | fatal | `pack.error.canonical.mismatch` | Canonical-packs registry pinned `version`, `signatureKeyId`, or `contentHash` does not match the loaded pack. |
| `pack.error.locale.unordered` | fatal | `pack.error.locale.unordered` | Two packs define the same locale key without a dep edge between them. |

## Severity

- **fatal** — the pack does not load; the mod manager surfaces a
  blocking error badge and the resolver excludes the pack from the
  loaded set.
- **warn** — the pack loads; the mod manager surfaces a warning badge
  alongside `SANDBOX` (or other applicable badges). Warnings are
  reported to telemetry but do not block ranked play unless
  combined with a fatal code.

## Adding a Code

1. Append a row to the table above with code, severity, localization
   key, and "when emitted".
2. Add the matching `pack.error.*` key to the canonical English
   localization at `resources/packs/heroes_reforged_locale_en/locales/en.localization.json`
   (or to the locale file owned by Task 02b-14).
3. Re-export the code from `src/content-runtime/error-codes.ts` once
   that module exists.
4. Update the emitting task to reference the code by name (no ad-hoc
   strings). The `validate:tasks` lint will fail on a `pack.error.*`
   token in a task that is not in this table.
