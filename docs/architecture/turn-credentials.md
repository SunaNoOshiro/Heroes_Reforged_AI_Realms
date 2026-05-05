# TURN Credentials

> Source plan:
> [`docs/implementation-plans/25-turn-credentials-and-signaling-server-abuse-plan.md`](../implementation-plans/25-turn-credentials-and-signaling-server-abuse-plan.md)
> § Critical Fix 3.

This file is the canonical doctrine for **how TURN credentials are
provisioned, scoped, transported, rotated, and revoked** in M5. It
extends the older provider pin in
[`services/multiplayer/turn-config.md`](../../services/multiplayer/turn-config.md)
and the threat-model summary in
[`multiplayer-security.md` § TURN Credentials](./multiplayer-security.md#turn-credentials)
with the full credential-lifecycle contract; the older docs cross-link
forward into this one as the SSOT.

The owning task is
[`tasks/phase-3/01-multiplayer/33-turn-credentials-doctrine-issuance.md`](../../tasks/phase-3/01-multiplayer/33-turn-credentials-doctrine-issuance.md).
The wire shape is pinned by
[`turn-credential.schema.json`](../../content-schema/schemas/turn-credential.schema.json)
and embedded inside the `TURN_CREDENTIALS` variant of
[`signaling-message.schema.json`](../../content-schema/schemas/signaling-message.schema.json).

---

## 1. Provider

Default: **Cloudflare Calls TURN** (managed; no open-relay risk;
HMAC long-term-credential format compatible with this contract).
Self-hosted fallback: **coturn** (`coturn/coturn:latest-alpine`)
with the hardened config pinned in
[`services/turn/config/turnserver.example.conf`](../../services/turn/config/turnserver.example.conf).

The chosen provider for prod is committed in
`services/signaling/.env.example` (`TURN_PROVIDER`,
`TURN_URLS`, `TURN_SHARED_SECRET` placeholders). Switching providers
is a single env-var change on the signaling deployment; the wire
contract does not change.

## 2. Mechanism

The signaling server signs credentials using the long-term-credential
mechanism (RFC 8489 § 9.2 with HMAC-SHA1, as standardized by
Cloudflare / Twilio / coturn `lt-cred-mech`):

```
expEpochSeconds = floor((now + ttlMs) / 1000)
username        = `${expEpochSeconds}:${roomCode}:${peerId}`
credential      = base64( hmacSHA1(activeSharedSecret, username) )
```

`username` is parsed by the TURN server (and by the deny-list
sync script — § 7) by splitting on `:`; no database lookup is
required at allocation time.

## 3. TTL

Hard ceiling: **300 seconds (5 minutes)**. Issuance with
`expiresAt - now > 300_000` is a server-side bug and fails the
issuance unit test.

The 5-minute ceiling pairs with coturn's `stale-nonce=600` (which
is per-allocation, not per-credential) so an active call survives a
single credential expiry as long as the client has issued
`REQUEST_TURN_REFRESH` before the credential window closes.

## 4. Scope

Every credential is bound to one `(roomCode, peerId)` pair.
Sharing a credential between peers is a contract violation: the
TURN attribution log (§ 8) reports allocations under the
credential's `peerId`, so a stolen credential's traffic is
indistinguishable from the original peer's — a secondary peer
using a stolen credential is an account-takeover surface, not a
bandwidth-amplification surface.

The host's credential is **not** valid for the joiner's TURN
allocations. On `JOIN_ROOM` admit, both peers receive a fresh
`TURN_CREDENTIALS` envelope with their own scope.

## 5. Issuance

Triggers:

| Event | Recipient | Notes |
| --- | --- | --- |
| `CREATE_ROOM` succeeds | the creator | Issued before any joiner is admitted; lets the host pre-warm the relay path. |
| `JOIN_ROOM` admit (post-`APPROVE_PEER`) | the joiner | Issued at the same moment the joiner's slot is reserved. |
| `JOIN_ROOM` admit | the host | Re-issued; the host's previous credential may be near expiry. |
| `REQUEST_TURN_REFRESH` accepted | the requester | See § 6. |

Triggers that do **not** issue a credential:

- Lobby browse (M5 has no public lobby — see
  [`tasks/phase-3/01-multiplayer/18-mute-block-and-trust-banner.md`](../../tasks/phase-3/01-multiplayer/18-mute-block-and-trust-banner.md)
  and `DEF-016`).
- Anonymous WebSocket connect with no `JOIN_HANDSHAKE`. The
  connection has no associated `(roomCode, peerId)` scope.
- Static client bundle. The build never imports a `turn:` /
  `turns:` URL constant or a credential constant; the
  `npm run validate:turn` CI gate (deferred to the owning task)
  greps the source tree and fails on any literal.

## 6. Refresh

The client requests `REQUEST_TURN_REFRESH` when:

1. `iceconnectionstate === 'failed'` and a TURN candidate pair is
   in use, or
2. `expiresAt - now < 30_000` and a relay path is still active.

The signaling server:

- Looks up `(roomCode, peerId)` in the in-memory `room → peer` map.
- If still admitted, mints a fresh credential and emits
  `TURN_CREDENTIALS`.
- If not (peer dropped, room evicted), replies
  `ERROR { code: "validation_failed", action: "turn_refresh" }`.
- The refresh path is rate-limited per
  [`signaling-rate-limits.md`](./signaling-rate-limits.md);
  see the per-IP `REQUEST_TURN_REFRESH` cap added by
  [Task 32](../../tasks/phase-3/01-multiplayer/32-signaling-rate-limit-augmentations.md).

## 7. Revocation-on-End

When a peer's `room → peer` mapping is removed (DC, kick, room
evicted, room closed), the signaling server appends
`(roomCode, peerId, expEpochSeconds)` to a **short-lived
deny-list** (TTL = `expEpochSeconds + 60_000`).

The `services/turn/scripts/sync-deny-list.ts` worker subscribes to
this deny-list (Redis pub/sub for self-hosted coturn; HTTP push for
Cloudflare Calls — provider-specific) and:

- For coturn: pushes a `closesession` admin command keyed on
  `username`, dropping any active allocation under the deny-listed
  scope.
- For Cloudflare Calls: invokes the credential-revocation API.

The deny-list is **in-memory** in the signaling server; it does not
persist across restart. This is a deliberate trade-off — see
[`signaling-stateless-invariant.md`](./signaling-stateless-invariant.md)
for the reasoning. The 5-minute TTL ceiling on the credentials it
revokes makes a missed revocation upper-bounded by the credential
TTL.

## 8. Logging

The `turn.issued` audit-log event (per
[`signaling-audit-log.md`](./signaling-audit-log.md)) carries:

```jsonc
{
  "event": "turn.issued",
  "ts": <epochMs>,
  "roomCode": "ABCD1234",
  "peerId": "11111111-2222-4333-8444-555555555555",
  "expEpochSeconds": 1809222400
}
```

The fields **never** logged:

- `username` (carries the credential's full payload pattern)
- `credential` (the HMAC tag)
- `TURN_SHARED_SECRET` value
- the credential's `urls` (provider-controlled; not actor data, but
  a free fingerprint of the deploy; redacted to avoid drift)

The TURN server's per-allocation log (§ 8 of
[`services/turn/log/`](../../services/turn/log/)) is similarly
PII-scrubbed: peer addresses are bucketed to `/24` IPv4 / `/64`
IPv6 and the credential payload is not echoed.

## 9. Rotation

The shared secret (`TURN_SHARED_SECRET`) is rotated on a 7-day
cadence (cross-link
[`services/multiplayer/turn-config.md` § Rotation Policy](../../services/multiplayer/turn-config.md#rotation-policy);
this section supersedes the older 30-day cadence with the
canonical 7-day window).

**Dual-secret overlap window**: the signaling server tracks the
`current` and `previous` shared secrets and the corresponding
`previous-secret-valid-until` timestamp:

| Phase | Server reads | Server signs new | Server accepts inbound issuance from peers |
| --- | --- | --- | --- |
| Steady state | current | current | n/a (server is the only issuer) |
| 5-minute pre-rotate window | current + previous | previous | n/a |
| 5-minute post-rotate window | current + previous | current | n/a |
| Steady state | current | current | n/a |

coturn validates against either secret during the 5-minute window.
After the window, only the new secret is accepted by both the
signaling issuer and the coturn validator.

Deploy order (zero-downtime):

1. Deploy signaling with both `TURN_SHARED_SECRET` and
   `TURN_SHARED_SECRET_PREVIOUS` set; signing pins to `previous`.
2. Reload coturn with both secrets in `static-auth-secret-file`
   pair.
3. After 5 minutes, redeploy signaling with the signing pin
   flipped to `current`; coturn keeps the dual-secret config for
   the 5-minute post-window.
4. After another 5 minutes, redeploy signaling with only
   `TURN_SHARED_SECRET` set; reload coturn with the single secret.

Rollback path: keep the dual-secret config until the rotation has
been observed in production for 24 hours; revert step 4 if any
client receives `401` from coturn. Cross-link the secret-management
runbook in [Plan 29](../implementation-plans/29-rate-limiting-and-secret-management-plan.md)
when it lands.

## 10. Transport

`TURN_CREDENTIALS` envelopes traverse the signaling WebSocket only.
The WebSocket is **WSS-only** in staging and production per
[`transport-security.md`](./transport-security.md);
plain `ws://` is rejected at the listener. There is no email / SMS /
HTTP-plain delivery path; there is no client-bundle constant; there
is no QR-code path.

## 11. Cross-References

- Wire shape: [`turn-credential.schema.json`](../../content-schema/schemas/turn-credential.schema.json).
- Wrapping `TURN_CREDENTIALS` envelope: [`signaling-message-schema.md`](./signaling-message-schema.md).
- TURN-server hardening (no open relay, bandwidth quotas, attribution log): [`services/turn/README.md`](../../services/turn/README.md).
- Fallback policy when TURN is unavailable: [`turn-fallback-policy.md`](./turn-fallback-policy.md).
- Provider pin and operational runbook: [`services/multiplayer/turn-config.md`](../../services/multiplayer/turn-config.md).
- Threat model (credential leak, bandwidth abuse, provider lock-in): [`multiplayer-security.md` § TURN Credentials](./multiplayer-security.md#turn-credentials).
