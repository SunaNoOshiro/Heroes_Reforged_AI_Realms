# Privacy Artifact and Legal Docs

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Author the canonical privacy artifact at
[`docs/architecture/privacy.md`](../../../docs/architecture/privacy.md)
plus four legal docs under `docs/legal/`: compliance posture, third-party
processor list, DPA checklist, and the manual erasure-process fallback.
Add the `state.privacy.acceptedPolicyVersion` /
`state.privacy.currentDisclosureVersion` slice declaration to
[`state-flow.md`](../../../docs/architecture/state-flow.md).

1 — Privacy artifact + Service-side observability + retention.

Read First:
- [`docs/architecture/data-inventory.md`](../../../docs/architecture/data-inventory.md)

Inputs:
- the data-inventory rows (medium / sensitivity / TTL / wipe scope).
- Chat / lobby / pack contracts.

Outputs:
- `docs/architecture/privacy.md` (versioned `policyVersion: 1`).
- `docs/legal/compliance.md` — GDPR / CCPA / COPPA scope, Art. 6 lawful
  basis, data-subject rights mapping, breach response.
- `docs/legal/processors.md` — third-party processor list with
  procurement gate; reserved categories with constraints.
- `docs/legal/dpa-checklist.md` — vendor-add rubric.
- `docs/legal/erasure-process.md` — manual server-side erasure fallback
  (email, 30-day SLA) until backend lands.

Owned Paths:
- `docs/architecture/privacy.md`
- `docs/legal/compliance.md`
- `docs/legal/processors.md`
- `docs/legal/dpa-checklist.md`
- `docs/legal/erasure-process.md`

Dependencies:
- mvp.02-content-schemas.33-data-inventory-and-wipe-scope-policy

Acceptance Criteria:
- `docs/architecture/privacy.md` carries `policyVersion: 1` at the top
  and links every legal doc.
- The retention TTL matrix names a TTL per surface (signaling logs, AI
  gateway prompts, AI gateway responses, crash log, audit log, save
  metadata).
- The four legal docs exist under `docs/legal/` and are linked from
  `privacy.md`.
- `state-flow.md` declares the `state.privacy.acceptedPolicyVersion`
  and `state.privacy.currentDisclosureVersion` fields.

Verify:
- npm run validate

Estimated Time:
- 5 hours
