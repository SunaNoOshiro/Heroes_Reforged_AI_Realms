# Privacy Options Schema

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Per-installation privacy preferences slice (`displayNameMode`,
`analyticsOptIn`, `allowMatureContent`, `saltFingerprint`).
Persisted in IndexedDB `hr-profile.privacy` per
[`persistence.md`](../../../docs/architecture/persistence.md).
Backs the Privacy pane in screen 56-options.

Read First:
- [`docs/architecture/data-inventory.md`](../../../docs/architecture/data-inventory.md)
- [`docs/architecture/wiki/screens/56-options/data-contracts.md`](../../../docs/architecture/wiki/screens/56-options/data-contracts.md)

Inputs:
- Display-name policy from
  [`docs/architecture/display-name-policy.md`](../../../docs/architecture/display-name-policy.md).
- Mature-content gate from
  [`docs/architecture/pack-trust.md`](../../../docs/architecture/pack-trust.md).

Outputs:
- `content-schema/schemas/privacy-options.schema.json`
- Canonical example
  `content-schema/examples/privacy-options/canonical.privacy-options.json`

Owned Paths:
- `content-schema/schemas/privacy-options.schema.json`
- `content-schema/examples/privacy-options/`

Canonical files:
- Schema: [privacy-options.schema.json](../../../content-schema/schemas/privacy-options.schema.json)
- Example: [canonical.privacy-options.json](../../../content-schema/examples/privacy-options/canonical.privacy-options.json)

Dependencies:
- mvp.02-content-schemas.10-zod-validators-for-all-schemas

Acceptance Criteria:
- Schema validates the canonical example.
- `displayNameMode` defaults to `hashed`.
- `analyticsOptIn` defaults to `false`.
- `allowMatureContent` defaults to `false`.
- `saltFingerprint` (when present) matches `^[a-f0-9]{4}$`.

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
