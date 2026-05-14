# Abandon Penalty

Canonical doctrine for **quorum-attested `PEER_DISCONNECTED`**, the
**abandon-penalty record**, and the **forfeit-vs-leave** UX gates.
Closes the disconnect-spoof / forfeit-fraud window where a peer about
to lose fakes the opponent's drop and claims a win-on-timeout.

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
corroborate within the 30 s attestation window:

1. **Surviving peer** — observes ≥ 30 s of heartbeat loss on the
   `heartbeat` DataChannel.
2. **Signaling server** — observes the WebSocket close and emits a
   `signalingObservedAt` timestamp.

The host (or the elected new host post-migration per
[Task 7](../../tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md))
wraps both observations into a host-signed envelope and broadcasts it
to the surviving peer.

If the two witnesses do not corroborate within the window, the
surviving peer surfaces
`Disconnect attestation failed — match aborted` and records no
penalty against either peer.

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

- `heartbeat-loss` — peer stopped responding; signaling server also
  observed the close. Both witnesses corroborate.
- `forced-leave` — peer voluntarily clicked `Leave room` mid-match in
  the in-game lobby UI.
- `verified-disconnect` — peer's continuity-challenge round-trip
  exceeded 120 s; conclusive abandonment.

`quorumWitnessIds` requires ≥ 1 entry (schema `minItems: 1`,
`maxItems: 8`); each entry is either a peer UUID or the literal
`signaling-server` token. Quorum-consumption code MUST additionally
require **at least one peer UUID and the `signaling-server` token**
before treating the record as `heartbeat-loss`.

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

Persistence: IndexedDB store `hr-profile.abandonHistory` per
[`data-inventory.md`](./data-inventory.md); wiped by
`WIPE_LOCAL_DATA scope=profile|all`.

Mutators:

- `RECORD_ABANDON_PENALTY` — runtime-only command per
  [`command-schema.md` § Multiplayer Trust & Identity Commands](./command-schema.md#multiplayer-trust--identity-commands);
  appends one row.
- `INSPECT_ABANDON_HISTORY` — local-UI command; opens a read-only
  panel rendering the buffer. Never enters the deterministic engine
  command log.

## 6. UI Surfaces

**Screen [`64-network-lobby`](./wiki/screens/64-network-lobby/spec.md):**
while the surviving peer awaits the attestation envelope,
`AwaitingDisconnectAttestationToast` renders
`Awaiting disconnect attestation…`. On envelope success, the toast
flips to `Forfeit confirmed` and the forfeit grace countdown starts.
On attestation timeout, the toast flips to
`Disconnect attestation failed — match aborted`.

**Trust banner:** peers with `penaltyTier === 'leaverboard-flag'`
show the `Frequent abandoner` badge defined in
[`peer-trust.md`](./peer-trust.md), under the same `(unverified)`
hint pattern.

## 7. Failure Modes

| Failure | Effect |
|---|---|
| Forged `PEER_DISCONNECTED` from a non-host peer | Envelope `signerId` does not match the elected host; envelope rejected per [`signaling-envelope.md` § 5](./signaling-envelope.md#5-verification-order). No penalty recorded. |
| Signaling-server attestation absent | Attestation window times out; surviving peer surfaces `Disconnect attestation failed — match aborted`. No penalty. |
| Both peers report each other dropped | Race resolved by the elected host's view; the host is the tiebreaker per [Task 7](../../tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md). |
| DTLS-fingerprint mismatch on rejoin | Penalty recorded only against the *originally pinned* peer, never the unverified rejoiner, per [`dtls-fingerprint-pinning.md` § 5](./dtls-fingerprint-pinning.md#5-failure-surface). |

## 8. Out of scope

- **Cross-host reputation** — bans / penalties are per-installation;
  central reputation is M7 polish or later.
- **Penalty appeal UX** — out of scope; the user clears their own
  history via `WIPE_LOCAL_DATA`.
- **Tournament integration** — tournament observers / authoritative
  modes are M7+ per [`multiplayer-security.md` § Deferred Mitigations](./multiplayer-security.md#deferred-mitigations).

---

## 🔍 Sync Check

- **UI: ✔** — `AwaitingDisconnectAttestationToast` and the three copy strings (`Awaiting disconnect attestation…` / `Forfeit confirmed` / `Disconnect attestation failed — match aborted`) match [`64-network-lobby/spec.md`](./wiki/screens/64-network-lobby/spec.md) and [`64-network-lobby/interactions.md`](./wiki/screens/64-network-lobby/interactions.md) exactly.
- **Schema: ✔** — Field set, `kind` enum (`heartbeat-loss | forced-leave | verified-disconnect`), and `penaltyTier` enum (`none | cooldown-15min | leaverboard-flag`) match [`abandon-penalty.schema.json`](../../content-schema/schemas/abandon-penalty.schema.json); registered as `AbandonPenaltyRecord` in [`schema-matrix.md`](./schema-matrix.md).
- **Tasks: ❌** — Owning task [`28-abandon-penalty-and-quorum-disconnect.md`](../../tasks/phase-3/01-multiplayer/28-abandon-penalty-and-quorum-disconnect.md) Reads First the target and pins the runtime, and `RECORD_ABANDON_PENALTY` / `INSPECT_ABANDON_HISTORY` are defined in [`command-schema.md`](./command-schema.md). However, `state.profile.abandonHistory` has **no row** in [`data-inventory.md`](./data-inventory.md) — the target asserts the slice is registered there, but it is not. CI-blocking per CLAUDE.md root contract.

## ⚠ Issues

- **Missing `state.profile.abandonHistory` row in `data-inventory.md`.** This doc and [`task 28`](../../tasks/phase-3/01-multiplayer/28-abandon-penalty-and-quorum-disconnect.md) both assert the slice is persisted in IndexedDB store `hr-profile.abandonHistory` and wiped by `WIPE_LOCAL_DATA scope=profile|all`, but [`data-inventory.md`](./data-inventory.md) has no matching row. Per CLAUDE.md root contract ("every persisted field is registered in `data-inventory.md`"), task `phase-3.01-multiplayer.28-abandon-penalty-and-quorum-disconnect` (or a precursor task on the persistence boundary) must add the row before the slice can ship. Suggested values: Field=`abandon-penalty history`, State path=`state.profile.abandonHistory`, Medium=`IndexedDB (hr-profile.abandonHistory)`, Sensitivity=`medium` (records peer UUIDs the user has played with), Retention=`ring buffer (64 most-recent)`, Wipe scope=`WIPE_LOCAL_DATA scope=profile\|all`, Notes=`abandon-penalty.schema.json` rows; quorum-attested per `abandon-penalty.md`. Skill did not add the row itself (Hard Prohibition D — never edit cross-checked files).
