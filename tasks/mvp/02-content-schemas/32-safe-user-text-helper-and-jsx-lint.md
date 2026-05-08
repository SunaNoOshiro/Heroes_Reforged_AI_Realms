# safeUserText Helper And JSX / localStorage Lint

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Add the `safeUserText(maxLen)` helper consumed by every schema field
that accepts user-supplied text, and add CI lint rules that ban
`dangerouslySetInnerHTML` in `src/ui/`, `localStorage.setItem` in
`src/`, and `document.cookie =` in `src/`. Per
[`ugc-safety.md` § Text Sanitization Contract](../../../docs/architecture/ugc-safety.md#3-text-sanitization-contract)
and [`persistence.md` § localStorage Ban](../../../docs/architecture/persistence.md#2-localstorage-ban).

Read First:
- [`docs/architecture/ugc-safety.md`](../../../docs/architecture/ugc-safety.md)
- [`docs/architecture/persistence.md`](../../../docs/architecture/persistence.md)
- [`docs/architecture/data-inventory.md`](../../../docs/architecture/data-inventory.md)

Inputs:
- Closed allowlist of permitted markdown tags (`p`, `em`, `strong`,
  `ul`, `ol`, `li`, `code`, `a[href^="#"]`).
- Localization interpolation rules per
  [`localization.schema.json`](../../../content-schema/schemas/localization.schema.json).

Outputs:
- `src/content-schema/safe-user-text.ts` — Zod helper.
- `scripts/lint-jsx-dangerous-html.mjs` — zero-hit lint.
- `scripts/lint-banned-storage-apis.mjs` — zero-hit lint.

Owned Paths:
- `src/content-schema/safe-user-text.ts`
- `scripts/lint-jsx-dangerous-html.mjs`
- `scripts/lint-banned-storage-apis.mjs`

Dependencies:
- mvp.02-content-schemas.10-zod-validators-for-all-schemas

Acceptance Criteria:
- `safeUserText(maxLen)` strips control chars and clamps length;
  unit tests cover ASCII, multi-byte, RTL, and zero-width
  injections.
- `scripts/lint-jsx-dangerous-html.mjs` exits non-zero on any
  `dangerouslySetInnerHTML` match in `src/ui/`.
- `scripts/lint-banned-storage-apis.mjs` exits non-zero on any
  `localStorage.setItem` or `document.cookie =` match in `src/`
  (allowlist initially empty).
- Lints wired into `npm run validate` (additive; no existing
  pipeline regressions).

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
