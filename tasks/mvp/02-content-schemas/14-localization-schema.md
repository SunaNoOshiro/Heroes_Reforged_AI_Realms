# Localization Schema

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Define the locale-scoped string table used by UI screen packages.
Screens consume stable localization keys such as `ui.main-menu.title`
and `ui.common.ok`; gameplay records continue to store IDs and never
embed localized labels.

Read First:
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)
- `docs/architecture/wiki/screens/01-main-menu/data-contracts.md`

Inputs:
- `content-schema/schemas/localization.schema.json`
- Screen-package localization key tables under `docs/architecture/wiki/screens/*/data-contracts.md`

Outputs:
- `src/content-schema/localization.ts` exporting `LocalizationSchema`
  and `LocalizationBundle`
- `t(locale, key, params?)` helper contract documented for UI tasks

Owned Paths:
- `src/content-schema/localization.ts`

Dependencies:
- mvp.01-engine-core.02-set-up-vite-plus-typescript-strict-mode-per-module

Acceptance Criteria:
- A bundle with `schemaVersion`, `locale`, and non-empty `entries`
  validates
- Missing localization keys fail loudly at screen bind time; missing
  presentation assets may still fall back through the asset resolver
- Interpolation placeholders are explicit and never evaluated as code
- UI tasks read keys through a `t()` helper, not raw string literals
- Per-pack layout `<pack>/locales/<locale>.localization.json` is the
  canonical placement; per-pack merge order is owned by
  [`mvp.02b-asset-pipeline.14-per-pack-localization-and-merge`](../02b-asset-pipeline/14-per-pack-localization-and-merge.md)
  and pinned in
  [`content-system-policy.md` § 6](../../../docs/architecture/content-system-policy.md#6-localization-bundling).

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
