# TURN Credentials

> Crypto primitive in use here (HMAC-SHA-1, RFC 5766 mandate) is
> catalogued in [`crypto-primitives.md`](./crypto-primitives.md).

Canonical doctrine for **how M5 TURN credentials are provisioned,
scoped, transported, rotated, and revoked**. Supersedes the older
provider pin in
[`services/multiplayer/turn-config.md`](../../services/multiplayer/turn-config.md)
and the threat-model summary in
[`multiplayer-security.md` § TURN Credentials](./multiplayer-security.md#turn-credentials);
both cross-link forward into this file as the SSOT.

**Companion docs:**

- [`multiplayer-security.md`](./multiplayer-security.md) — threat
  model that this doctrine satisfies.
- [`signaling-message-schema.md`](./signaling-message-schema.md) —
  wire shape for the `TURN_CREDENTIALS` and `REQUEST_TURN_REFRESH`
  envelopes.
- [`signaling-rate-limits.md`](./signaling-rate-limits.md) —
  per-IP `REQUEST_TURN_REFRESH` cap.
- [`signaling-stateless-invariant.md`](./signaling-stateless-invariant.md)
  — why the deny-list is in-memory only.
- [`signaling-audit-log.md`](./signaling-audit-log.md) — log shape
  for the `turn.issued` event.
- [`transport-security.md`](./transport-security.md) — WSS-only
  delivery channel.
- [`turn-fallback-policy.md`](./turn-fallback-policy.md) — client
  behaviour when TURN is unavailable.
- [`services/multiplayer/turn-config.md`](../../services/multiplayer/turn-config.md)
  — provider pin and operational runbook.
- [`services/turn/README.md`](../../services/turn/README.md) —
  TURN-server hardening (no open relay, bandwidth quotas,
  attribution log).

**Implementation:**

- Owning task —
  [`tasks/phase-3/01-multiplayer/33-turn-credentials-doctrine-issuance.md`](../../tasks/phase-3/01-multiplayer/33-turn-credentials-doctrine-issuance.md).
- Schema —
  [`turn-credential.schema.json`](../../content-schema/schemas/turn-credential.schema.json),
  embedded inside the `TURN_CREDENTIALS` variant of
  [`signaling-message.schema.json`](../../content-schema/schemas/signaling-message.schema.json).

---

## 1. Provider

**Default — Cloudflare Calls TURN** (managed; no open-relay risk;
HMAC long-term-credential format compatible with this contract).
**Self-hosted fallback — coturn** (`coturn/coturn:latest-alpine`)
with the hardened config pinned in
[`services/turn/config/turnserver.example.conf`](../../services/turn/config/turnserver.example.conf).

The chosen provider for prod is committed in
`services/signaling/.env.example` (`TURN_PROVIDER`, `TURN_URLS`,
`TURN_SHARED_SECRET` placeholders). Switching providers is a single
env-var change on the signaling deployment; the wire contract does
not change.

## 2. Mechanism

The signaling server signs credentials with the long-term-credential
mechanism (RFC 8489 § 9.2 with HMAC-SHA1, as standardized by
Cloudflare / Twilio / coturn `lt-cred-mech`):

```
expEpochSeconds = floor((now + ttlMs) / 1000)
username        = `${expEpochSeconds}:${roomCode}:${peerId}`
credential      = base64( hmacSHA1(activeSharedSecret, username) )
```

The TURN server (and the deny-list sync worker — § 7) recovers the
expiry and scope by splitting `username` on `:`; no database lookup
is required at allocation time.

## 3. TTL

Hard ceiling: **300 seconds (5 minutes)**. Issuance with
`expiresAt - now > 300_000` is a server-side bug and fails the
issuance unit test.

The 5-minute ceiling pairs with coturn's `stale-nonce=600` (per-
allocation, not per-credential), so an active call survives a
single credential expiry as long as the client issues
`REQUEST_TURN_REFRESH` before the credential window closes.

## 4. Scope

Every credential is bound to one `(roomCode, peerId)` pair. Sharing
a credential between peers is a contract violation: the TURN
attribution log (§ 8) reports allocations under the credential's
`peerId`, so a stolen credential's traffic is indistinguishable
from the original peer's. The exposed surface is account-takeover,
not bandwidth amplification.

The host's credential is **not** valid for the joiner's TURN
allocations. On `JOIN_ROOM` admit, both peers receive a fresh
`TURN_CREDENTIALS` envelope with their own scope.

## 5. Issuance

| Trigger | Recipient | Notes |
| --- | --- | --- |
| `CREATE_ROOM` succeeds | the creator | Issued before any joiner is admitted; pre-warms the relay path. |
| `JOIN_ROOM` admit (post-`APPROVE_PEER`) | the joiner | Issued at the same moment the joiner's slot is reserved. |
| `JOIN_ROOM` admit | the host | Re-issued; the host's prior credential may be near expiry. |
| `REQUEST_TURN_REFRESH` accepted | the requester | See § 6. |

Triggers that do **not** issue a credential:

- Lobby browse (M5 has no public lobby — see
  [`tasks/phase-3/01-multiplayer/18-mute-block-and-trust-banner.md`](../../tasks/phase-3/01-multiplayer/18-mute-block-and-trust-banner.md)
  and `DEF-016`).
- Anonymous WebSocket connect with no `JOIN_HANDSHAKE` — the
  connection has no associated `(roomCode, peerId)` scope.
- Static client bundle — the build never imports a `turn:` /
  `turns:` URL constant or a credential constant. The
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

The refresh path is rate-limited per
[`signaling-rate-limits.md`](./signaling-rate-limits.md); see the
per-IP `REQUEST_TURN_REFRESH` cap added by
[Task 32](../../tasks/phase-3/01-multiplayer/32-signaling-rate-limit-augmentations.md).

## 7. Revocation-on-End

When a peer's `room → peer` mapping is removed (DC, kick, room
evicted, room closed), the signaling server appends
`(roomCode, peerId, expEpochSeconds)` to a **short-lived deny-list**
(TTL = `expEpochSeconds + 60_000`).

The
[`services/turn/scripts/sync-deny-list.ts`](../../services/turn/scripts/sync-deny-list.ts)
worker subscribes to this deny-list (Redis pub/sub for self-hosted
coturn; HTTP push for Cloudflare Calls — provider-specific) and:

- **coturn:** issues a `closesession` admin command keyed on
  `username`, dropping any active allocation under the deny-listed
  scope.
- **Cloudflare Calls:** invokes the credential-revocation API.

The deny-list is **in-memory** in the signaling server; it does not
persist across restart. This is a deliberate trade-off — see
[`signaling-stateless-invariant.md`](./signaling-stateless-invariant.md)
for the reasoning. The 5-minute credential TTL upper-bounds any
missed revocation.

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

Fields **never** logged:

- `username` (carries the credential's full payload pattern)
- `credential` (the HMAC tag)
- `TURN_SHARED_SECRET` value
- the credential's `urls` (provider-controlled; not actor data, but
  a free fingerprint of the deploy — redacted to avoid drift)

The TURN server's per-allocation log (per
[`services/turn/log/`](../../services/turn/log/)) is similarly
PII-scrubbed: peer addresses are bucketed to `/24` IPv4 / `/64`
IPv6 and the credential payload is not echoed.

## 9. Rotation

`TURN_SHARED_SECRET` rotates on a **7-day cadence**. This supersedes
the older 30-day cadence cross-linked from
[`services/multiplayer/turn-config.md` § Rotation Policy](../../services/multiplayer/turn-config.md#rotation-policy);
this section is canonical, and the older doc points back here.

**Dual-secret overlap window.** The signaling server tracks the
`current` and `previous` shared secrets and the corresponding
`previous-secret-valid-until` timestamp:

| Phase | Server reads | Server signs new |
| --- | --- | --- |
| Steady state | current | current |
| 5-minute pre-rotate window | current + previous | previous |
| 5-minute post-rotate window | current + previous | current |
| Steady state | current | current |

(The signaling server is the only credential issuer; there is no
inbound issuance from peers.)

coturn validates against either secret during the 5-minute window.
After the window, only the new secret is accepted by both the
signaling issuer and the coturn validator.

**Deploy order (zero-downtime):**

1. Deploy signaling with both `TURN_SHARED_SECRET` and
   `TURN_SHARED_SECRET_PREVIOUS` set; signing pins to `previous`.
2. Reload coturn with both secrets in `static-auth-secret-file`
   pair.
3. After 5 minutes, redeploy signaling with the signing pin
   flipped to `current`; coturn keeps the dual-secret config for
   the 5-minute post-window.
4. After another 5 minutes, redeploy signaling with only
   `TURN_SHARED_SECRET` set; reload coturn with the single secret.

**Rollback path:** keep the dual-secret config until the rotation
has been observed in production for 24 hours; revert step 4 if any
client receives `401` from coturn.

## 10. Transport

`TURN_CREDENTIALS` envelopes traverse the signaling WebSocket only.
The WebSocket is **WSS-only** in staging and production per
[`transport-security.md`](./transport-security.md); plain `ws://`
is rejected at the listener. There is no email / SMS / HTTP-plain
delivery path; there is no client-bundle constant; there is no
QR-code path.

## 11. Cross-References

- Wire shape: [`turn-credential.schema.json`](../../content-schema/schemas/turn-credential.schema.json).
- Wrapping `TURN_CREDENTIALS` envelope: [`signaling-message-schema.md`](./signaling-message-schema.md).
- TURN-server hardening (no open relay, bandwidth quotas, attribution log): [`services/turn/README.md`](../../services/turn/README.md).
- Fallback policy when TURN is unavailable: [`turn-fallback-policy.md`](./turn-fallback-policy.md).
- Provider pin and operational runbook: [`services/multiplayer/turn-config.md`](../../services/multiplayer/turn-config.md).
- Threat model (credential leak, bandwidth abuse, provider lock-in): [`multiplayer-security.md` § TURN Credentials](./multiplayer-security.md#turn-credentials).

---

## 🔍 Sync Check

- **UI: ✔** — Doc owns no UI surface; the lobby's TURN-failure copy
  is owned by
  [`turn-fallback-policy.md` § 4](./turn-fallback-policy.md#4-lobby-ui-surface)
  and
  [`64-network-lobby/spec.md`](./wiki/screens/64-network-lobby/spec.md),
  which this doc defers to.
- **Schema: ✔** — § 2 username pattern, § 3 300 s TTL ceiling, and
  § 4 `(roomCode, peerId)` scope match
  [`turn-credential.schema.json`](../../content-schema/schemas/turn-credential.schema.json)
  exactly; the `TURN_CREDENTIALS` and `REQUEST_TURN_REFRESH` variants
  in
  [`signaling-message.schema.json`](../../content-schema/schemas/signaling-message.schema.json)
  match the §§ 5–6 issuance and refresh contracts; row registered as
  `TurnCredential` in
  [`schema-matrix.md`](./schema-matrix.md).
- **Tasks: ✔** — Owning task
  [`33-turn-credentials-doctrine-issuance`](../../tasks/phase-3/01-multiplayer/33-turn-credentials-doctrine-issuance.md)
  reads this doc First, owns the schema, the in-memory deny-list, and
  the `validate:turn` CI gate; companion tasks
  [`32-signaling-rate-limit-augmentations`](../../tasks/phase-3/01-multiplayer/32-signaling-rate-limit-augmentations.md)
  (refresh rate limit) and
  [`34-turn-server-hardening`](../../tasks/phase-3/01-multiplayer/34-turn-server-hardening.md)
  (deny-list-sync consumer, hardened coturn config) cite this doc in
  their Read First and reciprocally appear in
  [`tasks/task-registry.json`](../../tasks/task-registry.json).

## ⚠ Issues

- **Deny-list TTL formula mixes time units (this doc is the SSOT).**
  § 7 sets `TTL = expEpochSeconds + 60_000`, which adds seconds
  (`expEpochSeconds`) and milliseconds (`60_000`); the same wording
  is mirrored in
  [`signaling-stateless-invariant.md` § 1](./signaling-stateless-invariant.md#1-allowed-in-memory-state)
  with that doc's `## ⚠ Issues` block already pointing back here as
  the canonical owner. Intent — keep deny-list entries until ≤ 1
  minute past credential expiry, with a 5-minute ceiling totalling
  ≤ 6 minutes — is unambiguous in prose. Per Hard Prohibition A
  (no meaning change in the rewrite), the literal wording is
  preserved here. Suggested fix (owner: Task 33): pick one unit
  end-to-end — either `expEpochSeconds + 60` (seconds) or
  `(expEpochSeconds * 1000) + 60_000` (ms) — and align the
  sibling doc in the same commit.
- **`services/signaling/.env.example` does not yet exist.** § 1
  cites the env-var placeholder file as the prod commit point for
  `TURN_PROVIDER` / `TURN_URLS` / `TURN_SHARED_SECRET`. Today the
  file is absent; it is pinned in
  [Task 33 § Outputs](../../tasks/phase-3/01-multiplayer/33-turn-credentials-doctrine-issuance.md)
  and the surrounding contract is forward-looking. No CI-blocking
  drift — the rewrite preserved the present-tense wording (Hard
  Prohibition A). Closes when Task 33 ships.
- **`Task 18` cross-link in § 5 is a weak fit for "no public
  lobby".**
  [`tasks/phase-3/01-multiplayer/18-mute-block-and-trust-banner.md`](../../tasks/phase-3/01-multiplayer/18-mute-block-and-trust-banner.md)
  owns mute / block / trust-banner UX, not the absence of a lobby
  browser. The canonical "no public lobby" anchor is `DEF-016`
  (already cited alongside) which resolves to
  [`docs/planning/deferred.md`](../planning/deferred.md). Hard
  Prohibition C kept the existing link in the rewrite; suggested
  follow-up (any future edit of this section): drop the `Task 18`
  citation and keep only `DEF-016`.
- **Dangling reference removed from § 9 deploy step 4.** The prior
  revision ended with "Cross-link the secret-management runbook in
  \n when it lands.", a sentence with a missing link target and
  trailing whitespace. The rewrite drops the incomplete clause and
  retains the rollback rule itself unchanged. No meaning lost: the
  removed fragment had no resolvable referent. The runbook can be
  cross-linked here once it exists.
