# Trust Store Schema

Status: planned

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Per-installation persisted record of user pack-trust decisions.
Persisted in IndexedDB under a dedicated object store; not embedded
in any save record. Lookups key on `(packId, contentHash)` so a
content change re-prompts.

Read First:
- [`docs/architecture/pack-trust.md`](../../../docs/architecture/pack-trust.md)
- [`docs/architecture/wiki/screens/72-pack-trust-prompt/data-contracts.md`](../../../docs/architecture/wiki/screens/72-pack-trust-prompt/data-contracts.md)

Inputs:
- Trust-anchor lookup precedence in `pack-trust.md`

Outputs:
- `content-schema/schemas/trust-store.schema.json`
- Canonical example
  `content-schema/examples/trust-store/canonical.trust-store.json`

Owned Paths:
- `content-schema/schemas/trust-store.schema.json`
- `content-schema/examples/trust-store/`

Canonical files:
- Schema: [trust-store.schema.json](../../../content-schema/schemas/trust-store.schema.json)
- Example: [canonical.trust-store.json](../../../content-schema/examples/trust-store/canonical.trust-store.json)

Dependencies:
- mvp.02-content-schemas.10-zod-validators-for-all-schemas

Acceptance Criteria:
- Schema validates the canonical example.
- `decision` is the closed enum `["trust", "sandboxed", "deny"]`.
- `scope` is the closed enum `["session", "save", "global"]`.
- The schema is referenced from
  [`pack-trust.md` § Trust Anchors](../../../docs/architecture/pack-trust.md#4-trust-anchors).

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
