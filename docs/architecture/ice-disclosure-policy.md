# ICE Disclosure Policy

> Closes the host-IP-leak risk: unfiltered ICE candidates expose the
> host's network before the joiner has consented to peer-to-peer.

This file is the canonical contract for which ICE candidate types
flow across the M5 signaling server, and when. The rule is
**relay-only before consent, full ICE after consent**.

The TURN-relay infrastructure this policy depends on is owned by
[Task 10](../../tasks/phase-3/01-multiplayer/10-turn-fallback-and-credentials.md).
The host-approval gate that draws the consent boundary is owned by
[Task 14](../../tasks/phase-3/01-multiplayer/14-host-approval-and-moderation.md).
The server's payload allowlist that references this filter lives in
[`signaling-payload-policy.md`](./signaling-payload-policy.md); the
audit-log event emitted on every drop is defined in
[`signaling-audit-log.md`](./signaling-audit-log.md).

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

The filter is enforced at two layers; both must be present.

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
`APPROVE_PEER`, the host renegotiates with the default policy (no
`iceTransportPolicy`) and a fresh
`createOffer({ iceRestart: true })`.

The client-side pin is belt-and-braces against:

- a bug in the server-side regex; or
- a future browser version that re-orders ICE gathering such that
  a host candidate beats the relay-only filter.

## 3. mDNS expectation matrix

Modern browsers mask LAN candidates as `*.local` mDNS strings. The
behavior is per-browser and **not** part of this contract; it is
documented for operators only.

| Browser | Engine version (M5 floor) | Default mDNS masking | Notes |
|---|---|---|---|
| Chrome | 120+ | Yes | Stable since Chrome 76. |
| Firefox | 121+ | Yes | Behind `media.peerconnection.ice.obfuscate_host_addresses` (default `true`). |
| Safari | 17+ | Partial | iOS Safari < 17 sometimes leaks LAN IPs; M5's browser engine floor is Safari 17. |

The pre-consent filter does **not** depend on mDNS — a `typ host`
candidate is dropped regardless of whether the address is
`192.168.x.y` or `<uuid>.local`.

## 4. Threat model

| Threat | Mitigation |
|---|---|
| Pending peer learns host's public IP via `typ srflx` | Server drops `typ srflx` to unapproved peers. |
| Pending peer learns host's LAN IP via `typ host` | Server drops `typ host` regardless of mDNS masking. |
| Server-side filter has a regex bug | Client also pins `iceTransportPolicy: 'relay'` until approval. |
| TURN provider is unreachable for host | Host falls back per [`turn-fallback-and-credentials`](../../tasks/phase-3/01-multiplayer/10-turn-fallback-and-credentials.md). The pending peer cannot connect — that is the **correct** outcome (no IP leak). |
| Approved peer renegotiates the connection later | Once `APPROVE_PEER` is emitted, the policy is post-consent for the rest of the room's lifetime; no re-pre-consent state exists. |

## 5. Acceptance test

For the test owned by
[`tasks/phase-3/01-multiplayer/14-host-approval-and-moderation.md`](../../tasks/phase-3/01-multiplayer/14-host-approval-and-moderation.md),
capture a pending-peer SDP exchange and assert that no `typ host`
or `typ srflx` candidate ever appears in the joiner's
`RTCPeerConnection.remoteDescription`. After approval and
`iceRestart`, both candidate types appear; the test asserts the
state transition.

---

## 🔍 Sync Check

- **UI: ✔** — Network-lobby `APPROVE_PEER` flow in [`wiki/screens/64-network-lobby/interactions.md`](./wiki/screens/64-network-lobby/interactions.md) (rows for "Approve pending peer" and the pending-peer narrative § 3) explicitly cites this policy and the `iceRestart` trigger; no copy drift.
- **Schema: ✔** — No JSON schema owns ICE-candidate filtering (it lives in the signaling-server runtime). The `ICE_CANDIDATE` allowlist row in [`signaling-payload-policy.md`](./signaling-payload-policy.md) and the `signaling.ice.dropped_pre_consent` event in [`signaling-audit-log.md` § 1](./signaling-audit-log.md#1-always-logged-events) match this doc.
- **Tasks: ⚠** — Owning tasks [10](../../tasks/phase-3/01-multiplayer/10-turn-fallback-and-credentials.md), [14](../../tasks/phase-3/01-multiplayer/14-host-approval-and-moderation.md), and [02](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md) all read this file and re-state its rules. Task 14 phrases the server filter as "every non-`typ relay` candidate stripped" while this doc phrases it as "the message is dropped" — functionally equivalent under trickle-ICE (one candidate per message), but worth noting.

## ⚠ Issues

- **Truncated ownership reference repaired.** The original first paragraph read "owned by  and [Task 10]…" — a dangling " and" with the leading reference missing. Rewrote to credit Task 10 as the sole TURN-infrastructure owner (consistent with Task 10's `Owned Paths: services/multiplayer/turn/`). If the missing reference was meant to point at [`services/multiplayer/turn-config.md`](../../services/multiplayer/turn-config.md), restore it explicitly. No new facts invented.
- **`typ prflx` not enumerated in sibling docs.** This file lists four candidate types (`host`, `srflx`, `prflx`, `relay`) in § 1; [`signaling-payload-policy.md` § 2](./signaling-payload-policy.md#2-denylist-never-traverses-signaling) names only `typ host` / `typ srflx` on its denylist, and [`signaling-audit-log.md` § 5](./signaling-audit-log.md#5-sample-log-lines) only samples `srflx`. The broader rule "non-`typ relay` is dropped" already implies `prflx`, but for symmetry the payload-policy denylist row should add `typ prflx`. Per the per-doc canonical-statement rule in this skill § 7, the denylist owner (signaling-payload-policy) should adopt this doc's enumeration; not edited here per Hard Prohibition D.
- **Missing `INDEX.md` entry.** `docs/architecture/ice-disclosure-policy.md` is referenced from Tasks 02, 10, 14, 21, the lobby screen package, `signaling-payload-policy.md`, and `turn-fallback-policy.md`, but has no row in [`docs/architecture/INDEX.md`](./INDEX.md). Per the architecture-doc indexing convention, the index owner should add a row in the multiplayer / signaling section. Suggested values: title=`ICE Disclosure Policy`, summary=`Pre-consent vs. post-consent ICE candidate matrix; relay-only before APPROVE_PEER`. Not added here per Hard Prohibition D.
- **Task 14 wording divergence (non-blocking).** Task 14 acceptance says non-relay candidates are "stripped" from `ICE_CANDIDATE` payloads; this doc says the "message is dropped". Functionally identical for trickle-ICE single-candidate messages, but if a future implementation packs multiple candidates per message the two phrasings diverge. Recommend Task 14 (the implementer) standardize on "drop the message" once trickle-ICE single-candidate behavior is locked in code.
