# Revocation Registry (signed list + client check + replay fallback)

Status: planned

Module: [Pack Runtime / Mod System (M4)](../05-mod-system.md)

Description:
Pre-publication moderation already exists (text moderation, hard
caps, sandboxed flag). After a pack is shared (exported, posted to
a forum, eventually a marketplace), there is **no path** to revoke
it: no community report flow, no reviewer queue, no hash-based
block list, no pack-revocation propagation, no replay-compatibility
handling for revoked packs. This task pins the contract: a
maintainer-signed registry, a client-side check at pack load, and a
replay-fallback rule.

The matching schemas are
[`content-schema/schemas/revocation-registry.schema.json`](../../../content-schema/schemas/revocation-registry.schema.json)
and
[`content-schema/schemas/revocation-entry.schema.json`](../../../content-schema/schemas/revocation-entry.schema.json).
The full contract lives in
[`docs/architecture/revocation.md`](../../../docs/architecture/revocation.md).

The maintainer-side signing-key operationalization (key custody,
rotation, publication endpoint) is deferred until a sharing layer
is actually being built.

Read First:
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)

Inputs:
- The `manifest.contentHash` field already produced by every pack
  (see [`pack-contract.md`](../../../docs/architecture/pack-contract.md)).
- Sandbox-enforcement contract (sibling task 10) — this task
  extends it.

Outputs:
- `content-schema/schemas/revocation-registry.schema.json`
- `content-schema/schemas/revocation-entry.schema.json`
- `content-schema/examples/revocation-registry/canonical.revocation-registry.json`
- `docs/architecture/revocation.md`
- A new "Revocation" section under "Sandbox enforcement" in
  [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md).
- A single-line cross-reference in
  [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md).
- Schema-matrix rows in
  [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)

Owned Paths:
- `content-schema/schemas/revocation-registry.schema.json`
- `content-schema/schemas/revocation-entry.schema.json`
- `content-schema/examples/revocation-registry/canonical.revocation-registry.json`
- `docs/architecture/revocation.md`

Dependencies:
- phase-2.05-mod-system.10-sandbox-enforcement-contract

Acceptance Criteria:
- Schemas validate the canonical example with zero errors.
- `additionalProperties: false` on every named object.
- Three components are pinned: signed list (registry + entry
  schemas), client-side check (load-time gate), replay fallback
  (revoked content present mode).
- `pack-contract.md` carries the new "Revocation" section.
- `content-platform.md` carries the single-line cross-reference.
- Schema-matrix rows exist.

Verify:
- npm run validate

Estimated Time:
- 5 hours
