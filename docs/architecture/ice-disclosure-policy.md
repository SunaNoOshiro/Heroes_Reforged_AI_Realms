# ICE Disclosure Policy

> Source plan:
> [`docs/implementation-plans/18-room-codes-and-lobby-discovery-plan.md`](../implementation-plans/18-room-codes-and-lobby-discovery-plan.md)
> § 2 (Issue: Host IP leaks via unfiltered ICE before consent;
> Q326–Q328).

This file is the canonical contract for which ICE candidate types
flow across the M5 signaling server, and when. The rule is
**relay-only before consent, full ICE after consent**.

The TURN-relay infrastructure that this policy depends on is owned
by [Plan 07](../implementation-plans/07-multiplayer-plan.md) and
[`tasks/phase-3/01-multiplayer/10-turn-fallback-and-credentials.md`](../../tasks/phase-3/01-multiplayer/10-turn-fallback-and-credentials.md).
The host-approval gate that draws the consent boundary is owned by
[Task 14](../../tasks/phase-3/01-multiplayer/14-host-approval-and-moderation.md).

---

## 1. Pre-consent vs. post-consent matrix

A peer is **pre-consent** from the moment its `JOIN_ROOM` reaches
the host until the host emits `APPROVE_PEER`. After
`APPROVE_PEER`, it is **post-consent**.

| Candidate type | Pre-consent | Post-consent |
|---|---|---|
| `typ host` (LAN) | DROP | FORWARD |
| `typ srflx` (server-reflexive, public IP via STUN) | DROP | FORWARD |
| `typ prflx` (peer-reflexive) | DROP | FORWARD |
| `typ relay` (TURN) | FORWARD | FORWARD |

The drop is **silent** to the pending peer (no error reply); from
the joiner's perspective, the host appears to have only TURN
candidates until approval. The signaling server emits a
`signaling.ice.dropped_pre_consent` log line per
[`signaling-audit-log.md`](./signaling-audit-log.md) for operator
visibility.

## 2. Implementation surfaces

Two layers cooperate:

### 2a. Server-side filter

The signaling server parses outbound `ICE_CANDIDATE { sdp }`
messages and inspects the `a=candidate:` line:

```
a=candidate:<foundation> <componentId> <transport> <priority>
            <connection-address> <port>
            typ <type> [raddr ...] [rport ...]
```

If `<type> != "relay"` and the destination peer is unapproved,
the message is dropped. The check is positional and uses no
third-party SDP parser; a minimal `String.split` matches the IETF
grammar precisely (drafted in
[`tasks/phase-3/01-multiplayer/14-host-approval-and-moderation.md`](../../tasks/phase-3/01-multiplayer/14-host-approval-and-moderation.md)).

### 2b. Client-side `iceTransportPolicy`

The host's `RTCPeerConnection` is created with
`iceTransportPolicy: 'relay'` while the joiner is pre-consent. On
`APPROVE_PEER`, the host renegotiates with the full ICE policy
(no transport policy — the default) and a fresh
`createOffer({ iceRestart: true })`.

This belt-and-braces approach defends against:

- A bug in the server-side regex.
- A future browser version that re-orders ICE gathering such that
  a host candidate beats the relay-only filter.

## 3. mDNS expectation matrix

Modern browsers mask LAN candidates as `*.local` mDNS strings. The
behavior is per-browser and not a contract; documenting it for
operators:

| Browser | Engine version (M5 floor) | Default mDNS masking | Notes |
|---|---|---|---|
| Chrome | 120+ | Yes | Stable since Chrome 76. |
| Firefox | 121+ | Yes | Behind `media.peerconnection.ice.obfuscate_host_addresses` (default `true`). |
| Safari | 17+ | Partial | iOS Safari < 17 sometimes leaks LAN IPs; M5's browser engine floor is Safari 17. |

The pre-consent relay-only filter does **not** depend on mDNS —
if a candidate is `typ host`, it is dropped regardless of whether
the address is `192.168.x.y` or `<uuid>.local`.

## 4. Threat model

| Threat | Mitigation |
|---|---|
| Pending peer learns host's public IP via `typ srflx` | Server drops `typ srflx` to unapproved peers. |
| Pending peer learns host's LAN IP via `typ host` | Server drops `typ host` regardless of mDNS masking. |
| Server-side filter has a regex bug | Client also pins `iceTransportPolicy: 'relay'` until approval. |
| TURN provider is unreachable for host | Host falls back per [`turn-fallback-and-credentials`](../../tasks/phase-3/01-multiplayer/10-turn-fallback-and-credentials.md). The pending peer cannot connect — that is the **correct** outcome (no IP leak). |
| Approved peer renegotiates the connection later | Once `APPROVE_PEER` is emitted, the policy is post-consent for the rest of the room's lifetime; no re-pre-consent state exists. |

## 5. Acceptance test

For the test under
[`tasks/phase-3/01-multiplayer/14-host-approval-and-moderation.md`](../../tasks/phase-3/01-multiplayer/14-host-approval-and-moderation.md)
acceptance criteria, capture a pending-peer SDP exchange and assert
that no `typ host` or `typ srflx` candidate ever appears in the
joiner's `RTCPeerConnection.remoteDescription`. After approval and
`iceRestart`, both candidate types appear; the test asserts the
state transition.
