# Pack Revocation List Schema

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Client-local user-decision revocation surface consulted by the trust
pipeline before mounting a pack. Distinct from the maintainer-signed
[`revocation-registry`](../../../content-schema/schemas/revocation-registry.schema.json).
A revoked entry blocks `GRANT_PACK_TRUST` and forces sandboxed at
most.

Read First:
- [`docs/architecture/pack-trust.md`](../../../docs/architecture/pack-trust.md)
- [`docs/architecture/wiki/screens/71-pack-manager/data-contracts.md`](../../../docs/architecture/wiki/screens/71-pack-manager/data-contracts.md)

Inputs:
- Trust-anchor lookup precedence in `pack-trust.md`

Outputs:
- `content-schema/schemas/pack-revocation-list.schema.json`
- Canonical example
  `content-schema/examples/pack-revocation-list/canonical.pack-revocation-list.json`

Owned Paths:
- `content-schema/schemas/pack-revocation-list.schema.json`
- `content-schema/examples/pack-revocation-list/`

Canonical files:
- Schema: [pack-revocation-list.schema.json](../../../content-schema/schemas/pack-revocation-list.schema.json)
- Example: [canonical.pack-revocation-list.json](../../../content-schema/examples/pack-revocation-list/canonical.pack-revocation-list.json)

Dependencies:
- mvp.02-content-schemas.10-zod-validators-for-all-schemas

Acceptance Criteria:
- Schema validates the canonical example.
- `reason` is the closed enum `["malware", "tampered", "deprecated", "user-revoked"]`.
- `contentHash` follows the documented `^[a-f0-9]{16}$` pattern.

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
