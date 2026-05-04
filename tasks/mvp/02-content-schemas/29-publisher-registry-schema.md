# Publisher Registry Schema

Status: planned

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Client-local list of known publisher signing keys. Backs the
`tier=signed-known` ribbon on screen 72 (pack-trust prompt) per
[`pack-trust.md` § Trust Anchors](../../../docs/architecture/pack-trust.md#4-trust-anchors).
Shipped as a content artifact under `resources/registries/`; not
fetched at runtime.

Read First:
- [`docs/architecture/pack-trust.md`](../../../docs/architecture/pack-trust.md)
- [`docs/architecture/wiki/screens/72-pack-trust-prompt/data-contracts.md`](../../../docs/architecture/wiki/screens/72-pack-trust-prompt/data-contracts.md)

Inputs:
- Trust-anchor lookup precedence in `pack-trust.md`

Outputs:
- `content-schema/schemas/publisher-registry.schema.json`
- Canonical example
  `content-schema/examples/publisher-registry/canonical.publisher-registry.json`

Owned Paths:
- `content-schema/schemas/publisher-registry.schema.json`
- `content-schema/examples/publisher-registry/`

Canonical files:
- Schema: [publisher-registry.schema.json](../../../content-schema/schemas/publisher-registry.schema.json)
- Example: [canonical.publisher-registry.json](../../../content-schema/examples/publisher-registry/canonical.publisher-registry.json)

Dependencies:
- mvp.02-content-schemas.10-zod-validators-for-all-schemas

Acceptance Criteria:
- Schema validates the canonical example.
- `keyId` follows the documented `^[a-z0-9-]{4,64}$` pattern.
- `scheme` is the closed enum `["ed25519"]`.
- The schema is referenced from
  [`pack-trust.md` § Trust Anchors](../../../docs/architecture/pack-trust.md#4-trust-anchors).

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
