# Privacy Artifact

> **policyVersion: 1**
>
> Version is the integer mirrored by `state.privacy.acceptedPolicyVersion`
> (per [`state-flow.md` § Privacy Slice](./state-flow.md#privacy-slice))
> and `state.privacy.currentDisclosureVersion`. Increment when the
> material content of any section below changes; the next launch then
> re-shows the disclosure modal in screen
> [`56-options`](./wiki/screens/56-options/) before any analytics or
> reporting surface activates.
>
> Source plan:
> [`docs/implementation-plans/22-privacy-retention-and-error-leaks-plan.md`](../implementation-plans/22-privacy-retention-and-error-leaks-plan.md).

## 1. Data inventory

The canonical inventory lives in
[`data-inventory.md`](./data-inventory.md). Per-row sensitivity tier,
medium, retention, and `WIPE_LOCAL_DATA` coverage are pinned there;
this document is the user-facing summary.

## 2. Retention TTL matrix

| Surface | Medium | Retention TTL | Notes |
|---|---|---|---|
| Save metadata + payload | IndexedDB `hr-saves.slots` | until user-deleted | thumbnails included |
| Privacy options | IndexedDB `hr-profile.privacy` | until user-deleted | `WIPE_LOCAL_DATA scope=profile` |
| Audit log journal | IndexedDB `hr-profile.audit` | until user-deleted | `WIPE_LOCAL_DATA scope=profile` |
| Active-session display name | in-memory only | session | never persisted |
| Lobby chat | in-memory only | session | never persisted |
| Crash dump | in-memory only | session | export to file is user-initiated; no automatic upload |
| Signaling-server logs | server stdout via deploy platform | ≤ 24 h | no IPs, no SDP / ICE bodies, no chat content per [`services/signaling/observability.md`](../../services/signaling/observability.md) |
| AI gateway prompt | server stdout via deploy platform | logged as `promptHash` only | raw bodies never logged per [`services/ai-gateway/retention.md`](../../services/ai-gateway/retention.md) |
| AI gateway response | server response cache | ≤ 24 h | purged on TTL; never per-user |
| Outbound content reports | IndexedDB `hr-profile.reports` | until dequeued or user-deleted | `WIPE_LOCAL_DATA scope=profile` |

Retention beyond TTL on any surface is a CI-enforced violation: the
service-side docs name "do not log" / "log as hash" / "TTL" rows that
the deploy step must satisfy.

## 3. Scrubbing rules

The `formatUserError` / `formatDevError` redactor (per
[`error-formatter.md` § 3](./error-formatter.md#3-redaction-allowlist))
strips:

- file paths under `node_modules/` and absolute filesystem paths;
- IP literals (IPv4 dotted-quad, IPv6 colon-separated) — covers WebRTC
  ICE addresses surfaced in
  [`64-network-lobby/`](./wiki/screens/64-network-lobby/) peer-failure
  toasts;
- base64 payloads ≥ 32 characters (heuristic for SDP / ICE blobs and
  signed-blob fragments);
- any structured-error field tagged `redact: true` (used by
  pack-signature failures per
  [`crypto-rules.md` § 2](./crypto-rules.md#2-throw--uniform-error-never-carry-the-secret)).

In production builds, `Error.cause` chains are dropped entirely
(per [`production-build.md` rule 3](./production-build.md#3-formatusererror-is-the-only-ui-error-sink));
no stack frames carrying repository file paths reach the bundle's UI
sinks. The on-device crash log writer consumes `formatDevError` and
therefore inherits the same redactor.

The desync redactor declared in
[`desync-redaction.md`](./desync-redaction.md) tags command fields
`public` or `hidden` per the closed enum on
[`command-schema.md`](./command-schema.md), and rewrites the
last-K-commands payload before it leaves the engine — so a
desync report cannot leak hero loadouts, spell choices, or
fog-of-war movement intentions.

## 4. Third parties

The complete list of third-party processors that may receive any data
from this product lives in [`docs/legal/processors.md`](../legal/processors.md).
A change to that list (adding a CDN, hosting platform, AI provider,
or analytics SDK) requires a DPA per
[`docs/legal/dpa-checklist.md`](../legal/dpa-checklist.md) and a
matching policyVersion bump on this document.

## 5. Compliance posture

GDPR, CCPA, and COPPA scope, plus the age-gate hookup, live in
[`docs/legal/compliance.md`](../legal/compliance.md). The cliff
notes:

- COPPA: under-13 sign-in is not implemented; no account system at
  v1; mature-content gate (`config.player.allowMatureContent`) is
  off by default per [`pack-trust.md`](./pack-trust.md) § Content
  Rating.
- GDPR Art. 17: the erasure pathway is `WIPE_LOCAL_DATA` →
  `REQUEST_ERASURE_RECEIPT` → screen
  [`54-system-menu`](./wiki/screens/54-system-menu/). The signed
  receipt is the verifiable artifact.
- CCPA §1798.105: the same flow satisfies the "Right to Delete."
- No cross-border data export is in scope at v1 because no
  account / per-user identifiers are persisted.

## 6. Erasure pathway

`WIPE_LOCAL_DATA` (Plan 21) wipes the local inventory rows. This
plan layers the **receipt** on top:

1. `REQUEST_ERASURE_RECEIPT` writes a row to the local audit log
   ([`audit-log-entry.schema.json`](../../content-schema/schemas/audit-log-entry.schema.json))
   with `type: ERASURE`, `erasureRequestId`, `scope`, `performedAt`,
   `contentHash`.
2. Screen [`54-system-menu`](./wiki/screens/54-system-menu/) renders
   the receipt JSON
   ([`erasure-receipt.schema.json`](../../content-schema/schemas/erasure-receipt.schema.json))
   and offers "Copy to clipboard."
3. If the user is in an active multiplayer session, the receipt also
   carries `signalingSessionId` and the user is offered a second
   affordance "Request server-side erasure" that envelopes the
   receipt and queues it on the local outbound `erasure-queue`
   (delivered when the moderation backend lands).
4. Until that backend exists, the manual fallback in
   [`docs/legal/erasure-process.md`](../legal/erasure-process.md)
   names an email contact, a 30-day SLA, and a scope statement.

## 7. Telemetry posture

Telemetry is **off by default**. No analytics SDK loads at first
paint; `state.privacy.allowAnalytics === true` is the load gate
declared in [`production-build.md` rule 3](./production-build.md#3-formatusererror-is-the-only-ui-error-sink).
The opt-in toggle lives in screen
[`56-options`](./wiki/screens/56-options/) (Privacy pane) and is
gated behind the disclosure modal that lists every row of
[`data-inventory.md`](./data-inventory.md) before it can be flipped.

`state.privacy.options.analyticsClientId` is **not generated at v1**.
Future analytics integration must:

- be opt-in (`state.privacy.options.analyticsOptIn === true`);
- generate a UUIDv4 `analyticsClientId` on the toggle, never before;
- be regeneratable via "Reset analytics ID" in the privacy pane;
- be wiped by `WIPE_LOCAL_DATA scope=profile|all`.

## 8. Versioning

The top-of-file `policyVersion: 1` is mirrored by:

- `state.privacy.acceptedPolicyVersion` — the integer the user has
  accepted; gates the privacy-disclosure modal;
- `state.privacy.currentDisclosureVersion` — the compile-time
  constant that increments when a section above changes materially.

If `acceptedPolicyVersion < currentDisclosureVersion`, the disclosure
modal in screen [`56-options`](./wiki/screens/56-options/) re-opens
on next launch. The modal documents the diff between the two
versions and re-records consent before any opt-in toggle is honoured.

## 9. Cross-references

- [`data-inventory.md`](./data-inventory.md) — per-field inventory.
- [`error-formatter.md`](./error-formatter.md) — redactor.
- [`production-build.md`](./production-build.md) — load gates.
- [`crypto-rules.md`](./crypto-rules.md) — secret-compare contract.
- [`error-codes.md`](./error-codes.md) — closed wire-error vocabulary.
- [`desync-redaction.md`](./desync-redaction.md) — desync redactor.
- [`docs/legal/compliance.md`](../legal/compliance.md) — GDPR / CCPA / COPPA scope.
- [`docs/legal/processors.md`](../legal/processors.md) — third-party processor list.
- [`docs/legal/dpa-checklist.md`](../legal/dpa-checklist.md) — vendor-add gate.
- [`docs/legal/erasure-process.md`](../legal/erasure-process.md) — manual erasure fallback.
- [`services/signaling/observability.md`](../../services/signaling/observability.md) — signaling logs.
- [`services/ai-gateway/retention.md`](../../services/ai-gateway/retention.md) — AI gateway retention.
