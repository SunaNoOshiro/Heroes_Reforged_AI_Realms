# Content Report Schema

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Player-submitted report targeting unsafe / infringing UGC content
(pack, scenario, hero, unit, AI-faction). Distinct from
`report-bundle.schema.json` (peer-behavior). Persisted locally in
`state.privacy.outboundReports[]` and dequeued by the future
moderation backend. Backs screen 75 (content-report).

Read First:
- [`docs/architecture/ugc-safety.md`](../../../docs/architecture/ugc-safety.md)
- [`docs/architecture/wiki/screens/75-content-report/data-contracts.md`](../../../docs/architecture/wiki/screens/75-content-report/data-contracts.md)

Inputs:
- Closed reason enum: `infringement`, `harassment`,
  `mature-without-rating`, `malware`, `other`.
- Closed targetType enum: `pack`, `scenario`, `hero`, `unit`,
  `ai-faction`.

Outputs:
- `content-schema/schemas/content-report.schema.json`
- Canonical example
  `content-schema/examples/content-report/canonical.content-report.json`

Owned Paths:
- `content-schema/schemas/content-report.schema.json`
- `content-schema/examples/content-report/`

Canonical files:
- Schema: [content-report.schema.json](../../../content-schema/schemas/content-report.schema.json)
- Example: [canonical.content-report.json](../../../content-schema/examples/content-report/canonical.content-report.json)

Dependencies:
- mvp.02-content-schemas.10-zod-validators-for-all-schemas

Acceptance Criteria:
- Schema validates the canonical example.
- `reason` is the closed enum listed above.
- `targetType` is the closed enum listed above.
- `notes` is bounded to `maxLength: 1000` and is sanitized via
  the `safeUserText(1000)` helper before persistence.
- The schema is referenced from
  [`ugc-safety.md`](../../../docs/architecture/ugc-safety.md) and
  screen 75.

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
