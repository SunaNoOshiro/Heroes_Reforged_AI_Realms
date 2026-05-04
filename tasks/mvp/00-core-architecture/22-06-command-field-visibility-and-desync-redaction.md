# Command Field Visibility and Desync Redaction

Status: planned

Module: [Core Architecture Contracts (M0)](../00-core-architecture.md)

Description:
Author [`docs/architecture/desync-redaction.md`](../../../docs/architecture/desync-redaction.md)
declaring the redactor that runs on every desync report and every
auto-bisect round before any UI / log / peer sink. Add a per-field
`visibility: 'public' | 'hidden'` tag to
[`command-schema.md`](../../../docs/architecture/command-schema.md)
with worked examples for `MOVE_HERO`, `INITIATE_BATTLE`,
`BATTLE_ATTACK`, `CAST_SPELL`, `TRANSFER_ARTIFACT`, `RECRUIT_UNIT`,
and `SET_GUARD`. The redactor replaces `hidden` fields with
`sha256(canonical(field))` truncated to 12 hex chars + length-class.

Plan 22 § 3 — Command-schema field-visibility tag.

Read First:
- [`docs/implementation-plans/22-privacy-retention-and-error-leaks-plan.md`](../../../docs/implementation-plans/22-privacy-retention-and-error-leaks-plan.md)
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- [`docs/architecture/error-formatter.md`](../../../docs/architecture/error-formatter.md)

Inputs:
- The closed two-value visibility enum (`public` / `hidden`).
- The four-bucket length-class labels (`<8`, `<32`, `<128`, `>=128`).

Outputs:
- `docs/architecture/desync-redaction.md`
- Field-visibility section + worked-example table appended to
  `command-schema.md`.

Owned Paths:
- `docs/architecture/desync-redaction.md`

Owned Paths (shared):
- `docs/architecture/command-schema.md` is the **primary contract**
  of `mvp.00-core-architecture.cmd-dispatcher-queue` and the
  per-command tasks; this task adds the field-visibility section
  **additively** and does not rewrite any existing command
  envelope or per-command rule.

Dependencies:
- mvp.00-core-architecture.22-01-error-formatter-contract

Acceptance Criteria:
- The redaction doc declares the closed visibility enum, the
  four-bucket length-class labels, and the pipeline placement
  (redactor runs **before** any sink).
- Worked-example rows cover at least the seven kinds named above.
- The redactor reuses the formatter's `redact: true` allowlist.

Owned Paths (shared) acceptance:
- `docs/architecture/command-schema.md` is **owned by** the
  dispatcher task family (`mvp.00-core-architecture.cmd-dispatcher-queue`
  is the primary owner of the command envelope). This task is
  **additive**: one new "Field Visibility (Desync Redaction)"
  section is appended; the existing command envelope, per-command
  validation rules, deduplication rules, cross-actor ordering, and
  serialization contract must not rewrite anything else.

Verify:
- npm run validate

Estimated Time:
- 4 hours
