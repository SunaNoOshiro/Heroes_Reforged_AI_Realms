# Abandon Penalty

Canonical doctrine for **quorum-attested `PEER_DISCONNECTED`**, the
**abandon-penalty record**, and the **forfeit-vs-leave** UX gates.
Closes the disconnect-spoof / forfeit-fraud window where a peer about
to lose can fake the opponent's drop and claim a win-on-timeout.

> Source plan:
> [`docs/implementation-plans/24-tls-enforcement-and-webrtc-authentication-plan.md`](../implementation-plans/24-tls-enforcement-and-webrtc-authentication-plan.md)
> § Critical Fix 5.

Companion docs:

- [`signaling-envelope.md`](./signaling-envelope.md) — every
  `PEER_DISCONNECTED` is wrapped here.
- [`dtls-fingerprint-pinning.md`](./dtls-fingerprint-pinning.md) —
  ambiguous-rejoin gate.
- [`peer-trust.md`](./peer-trust.md) — friend / recent peer trust
  tiers (orthogonal to penalty).
- [`multiplayer-security.md`](./multiplayer-security.md) — anti-cheat
  threat-model table.
- Schema:
  [`abandon-penalty.schema.json`](../../content-schema/schemas/abandon-penalty.schema.json).

---

## 1. Quorum Rule

A `PEER_DISCONNECTED` event is **only consumed** when both witnesses
agree:

1. **Surviving peer** observes ≥ 30 s of heartbeat loss on the
   `heartbeat` DataChannel.
2. **Signaling server** observes the WebSocket close and emits a
   `signalingObservedAt` timestamp into a host-signed
   `PEER_DISCONNECTED` envelope.

The host (or the elected new host post-migration per
[Task 7](../../tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md))
wraps both observations into a signed envelope and broadcasts
to the surviving peer.

If both witnesses do not corroborate within the 30 s attestation
window, the surviving peer surfaces
`Disconnect attestation failed — match aborted` and refuses to
record a penalty against either peer.

## 2. Heartbeat & Forfeit Windows

| Event | Window | Owner |
|---|---|---|
| Heartbeat-loss observation | 30 s of missed beats | [Task 3](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md) |
| Reconnect grace | 120 s wall-clock from heartbeat-loss start | [Task 6](../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md) |
| Forfeit declaration | After 120 s with no successful continuity-challenge round-trip | [Task 6 + this doc](#3-record-shape) |
| Attestation timeout | 30 s after heartbeat-loss observation begins | This doc + [Task 28](../../tasks/phase-3/01-multiplayer/28-abandon-penalty-and-quorum-disconnect.md) |

## 3. Record Shape

`abandon-penalty.schema.json` pins the per-event record:

```jsonc
{
  "schemaVersion": 1,
  "peerId": "<peerId UUID>",
  "sessionId": "<sessionId UUID>",
  "observedAt": "<ISO 8601>",
  "kind": "heartbeat-loss" | "forced-leave" | "verified-disconnect",
  "quorumWitnessIds": ["<peerId>", "signaling-server"],
  "penaltyTier": "none" | "cooldown-15min" | "leaverboard-flag"
}
```

`kind` values:

- `heartbeat-loss` — peer stopped responding; signaling server
  also observed the close. Both witnesses corroborate.
- `forced-leave` — peer voluntarily clicked `Leave room` mid-match
  in the in-game lobby UI.
- `verified-disconnect` — peer's continuity-challenge
  round-trip exceeded 120 s; conclusive abandonment.

## 4. Penalty Tiers

| Tier | Trigger | Effect | Decay |
|---|---|---|---|
| `none` | First `forced-leave`; any `verified-disconnect` where the peer reconnected within 120 s | None | — |
| `cooldown-15min` | Second `verified-disconnect` within a rolling 24 h window | 15-minute matchmaking cooldown for the abandoning peer | One step decay per 5 clean (= no `verified-disconnect`) sessions |
| `leaverboard-flag` | Third `verified-disconnect` within the rolling 24 h window | Public-lobby trust banner shows `Frequent abandoner`; private rooms unaffected | One step decay per 10 clean sessions |

Decay runs locally on each peer's profile per
[`peer-trust.md`](./peer-trust.md). There is no central reputation
service in M5–M7.

## 5. Ring-Buffer Storage

`state.profile.abandonHistory` is a ring buffer capped at the **64
most-recent records**. Older entries are dropped on push.

The ring is persisted in IndexedDB `hr-profile.abandonHistory` per
[`data-inventory.md`](./data-inventory.md) and wiped by
`WIPE_LOCAL_DATA scope=profile|all`.

## 6. UI Surfaces

- **`64-network-lobby`**: while the surviving peer awaits the
  attestation envelope, render
  `Awaiting disconnect attestation…` toast. On envelope success,
  flip to `Forfeit confirmed` and start the forfeit grace
  countdown. On timeout, render
  `Disconnect attestation failed — match aborted`.
- **Trust banner**: peers with `penaltyTier === 'leaverboard-flag'`
  show the badge defined in
  [`peer-trust.md`](./peer-trust.md) under the same `(unverified)`
  hint pattern.

## 7. Failure Modes

| Failure | Effect |
|---|---|
| Forged `PEER_DISCONNECTED` from a non-host peer | Envelope `signerId` does not match the elected host; envelope rejected per [`signaling-envelope.md` § 5](./signaling-envelope.md#5-verification-order). No penalty recorded. |
| Signaling-server attestation absent | Attestation window times out; `Disconnect attestation failed`. No penalty. |
| Both peers report each other dropped | Race resolved by elected host's view; the host is the tiebreaker per [Task 7](../../tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md). |

## 8. Out of scope

- **Cross-host reputation** — bans / penalties are per-installation;
  central reputation is M7 polish or later.
- **Penalty appeal UX** — out of scope; the user clears their own
  history via `WIPE_LOCAL_DATA`.
- **Tournament integration** — tournament observers / authoritative
  modes are M7+ per [`multiplayer-security.md` § Deferred Mitigations](./multiplayer-security.md#deferred-mitigations).
