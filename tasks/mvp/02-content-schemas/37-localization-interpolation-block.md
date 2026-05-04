# Localization Interpolation Block

Status: planned

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Extend [`localization.schema.json`](../../../content-schema/schemas/localization.schema.json)
with a per-key `interpolation` block (`mode: literal | named | icu`,
`allowedTokens: string[]`). Default `mode = literal` escapes `{` and
`}`; `named` and `icu` modes require an explicit `allowedTokens[]`
allowlist. Per [`ugc-safety.md` § ICU Locks](../../../docs/architecture/ugc-safety.md#4-icu-locks).

Read First:
- [`docs/architecture/ugc-safety.md`](../../../docs/architecture/ugc-safety.md)

Inputs:
- ICU formatter allowlist (`plural`, `select`, `selectordinal`,
  `number`, `date`, `time`).

Outputs:
- Updated `content-schema/schemas/localization.schema.json`.

Owned Paths:
- `content-schema/schemas/localization.schema.json`

Dependencies:
- mvp.02-content-schemas.14-localization-schema
- mvp.02-content-schemas.10-zod-validators-for-all-schemas

Acceptance Criteria:
- Schema accepts an entry with `interpolation.mode = "literal"`
  (default) and rejects any non-allowlisted ICU formatter.
- `allowedTokens` items match `^[a-zA-Z][a-zA-Z0-9_]{0,31}$`.
- UGC-supplied translation files cannot raise the interpolation
  tier of an existing canonical key (resolver enforces "tier-min").

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
