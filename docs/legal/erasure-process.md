# Erasure Process

The user-facing process for satisfying GDPR Art. 17 / CCPA §1798.105
"Right to Delete." This file documents the **manual fallback** that
applies until a server-side moderation/erasure backend exists; the
client-side flow (`WIPE_LOCAL_DATA` → `REQUEST_ERASURE_RECEIPT`) is
authoritative for *local* data and is described in
[`docs/architecture/privacy.md` § 6](../architecture/privacy.md#6-erasure-pathway).

> Source plan:
> [`docs/implementation-plans/22-privacy-retention-and-error-leaks-plan.md`](../implementation-plans/22-privacy-retention-and-error-leaks-plan.md).

## 1. Local erasure (always available)

This path is fully implemented client-side and does not require
contacting a human:

1. Open screen [`54-system-menu`](../architecture/wiki/screens/54-system-menu/).
2. Select "Forget me on this device" (Plan 21).
3. Choose scope: `all`, `saves`, `profile`, or `chat`.
4. Confirm.
5. Press "Receipt" — screen renders the receipt JSON
   ([`erasure-receipt.schema.json`](../../content-schema/schemas/erasure-receipt.schema.json))
   and offers "Copy to clipboard."

The receipt is the auditable artifact. The salt fingerprint
in the privacy pane changes after the wipe; this is the
user-visible verification that the erasure succeeded.

## 2. Server-side erasure (manual fallback)

When the user was in an active multiplayer session at the moment
of erasure, the receipt also carries a `signalingSessionId`. Until
the moderation backend is implemented:

1. The receipt is queued in the local outbound `erasure-queue`
   (the queue is non-blocking; the local wipe completes regardless).
2. The user is offered an "Email this receipt" affordance that
   composes a `mailto:` envelope to **privacy@<reserved-domain>**
   (the canonical address is reserved by Plan 30 deploy).
3. We acknowledge within **30 days** of receiving the email and
   delete any matching server-side state. If no server-side state
   matches the receipt, the response confirms that result.
4. We retain the email plus our acknowledgment for the minimum
   period required by applicable law, then delete.

## 3. Scope statement

The data potentially held server-side, when any of the optional
services are deployed, is bounded by:

- **Signaling**: per-room ephemeral state (peer ids, ICE
  candidate counts) — already cleared on room empty per
  [`services/signaling/observability.md`](../../services/signaling/observability.md);
  platform-side access logs ≤ 24 h.
- **AI gateway**: prompt hashes, response cache entries — ≤ 24 h
  per [`services/ai-gateway/retention.md`](../../services/ai-gateway/retention.md).
- **No account / per-user identifier** is persisted at v1;
  there is therefore no per-user record to delete unless the user
  was actively in a session at the moment of erasure.

## 4. Response SLA

| Step | SLA |
|---|---|
| Acknowledge erasure email | ≤ 7 days |
| Locate matching server-side state (or confirm none) | ≤ 30 days |
| Confirm deletion or absence | ≤ 30 days |
| Inform downstream processors (when any) | ≤ 30 days |

When the server-side intake lands (Plan 30), this file is updated
and the SLA shortens to the platform-supported window (typically
≤ 7 days).

## 5. Cross-references

- [`docs/architecture/privacy.md`](../architecture/privacy.md) — privacy artifact.
- [`docs/legal/compliance.md`](./compliance.md) — GDPR / CCPA scope.
- [`docs/legal/processors.md`](./processors.md) — processor list.
- [`docs/architecture/data-inventory.md`](../architecture/data-inventory.md) — wipe scope per row.
- [`content-schema/schemas/erasure-receipt.schema.json`](../../content-schema/schemas/erasure-receipt.schema.json) — receipt schema.
- [`content-schema/schemas/audit-log-entry.schema.json`](../../content-schema/schemas/audit-log-entry.schema.json) — local journal schema.
