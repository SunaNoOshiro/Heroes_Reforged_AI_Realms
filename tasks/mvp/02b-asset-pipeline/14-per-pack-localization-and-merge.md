# Per-Pack Localization Layout + Merge

Status: planned

Module: [Asset Pipeline & Content Pack Architecture (M0/M1)](../02b-asset-pipeline.md)

Description:
Implement the per-pack localization merge described in
[`content-system-policy.md` § 6](../../../docs/architecture/content-system-policy.md#6-localization-bundling)
and [`pack-resolver.md` § 5](../../../docs/architecture/pack-resolver.md).
Each pack carries its own `locales/<locale>.localization.json`. The
content runtime merges them in resolution order with later-loaded
packs winning per key. A pack overriding a string key from another
pack must declare a dependency edge to it — otherwise →
`pack.error.locale.unordered`. The registry exposes
`getString(key, locale)` and `getStringSource(key, locale)` so the
localization editor can show "this string came from pack X."

Read First:
- [`docs/architecture/content-system-policy.md`](../../../docs/architecture/content-system-policy.md)
- [`docs/architecture/pack-resolver.md`](../../../docs/architecture/pack-resolver.md)
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)

Inputs:
- `content-schema/schemas/localization.schema.json`
- Canonical example
  [`content-schema/examples/packs/emberwild-faction/locales/en.localization.json`](../../../content-schema/examples/packs/emberwild-faction/locales/en.localization.json)

Outputs:
- `src/content-runtime/locale-registry.ts` exporting
  `LocaleRegistry` with `getString(key, locale)`,
  `getStringSource(key, locale)`, and a builder that consumes
  resolver output.

Owned Paths:
- `src/content-runtime/locale-registry.ts`

Dependencies:
- mvp.02b-asset-pipeline.12-pack-resolver-algorithm
- mvp.02b-asset-pipeline.16-pack-error-code-catalog
- mvp.02-content-schemas.14-localization-schema

Acceptance Criteria:
- Loading three packs (base, faction, translation) where the
  translation pack `dependencies` the faction pack:
  `getString("ui.faction.emberwild.name", "en")` returns the
  translation pack's value;
  `getStringSource(...)` returns the translation pack's id.
- A translation pack overriding a key without a declared dep edge
  to the providing pack rejects with `pack.error.locale.unordered`.
- Missing locale falls back to the file's `fallbackLocale`, then to
  `en`.
- Schema reference: `content-schema/schemas/localization.schema.json`.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
