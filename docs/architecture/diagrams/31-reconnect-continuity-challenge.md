---
id: "31-reconnect-continuity-challenge"
title: "Reconnect Continuity Challenge"
category: "multiplayer"
short: "31. Reconnect Continuity"
---

**Reconnecting peer must prove identity continuity.** When a peer
drops and re-signals, the host issues a fresh nonce. The reconnecting
peer signs the nonce with the **original** Ed25519 keypair (the one
that signed the original `JOIN_ROOM`). The host then re-pins the new
DTLS fingerprint **only if** both the keypair signature and the
pinned-fingerprint comparison agree.

Companion docs:
[`docs/architecture/dtls-fingerprint-pinning.md`](../dtls-fingerprint-pinning.md),
[`docs/architecture/signaling-envelope.md`](../signaling-envelope.md),
[`docs/architecture/peer-identity.md`](../peer-identity.md),
[`tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md`](../../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md).

```mermaid
sequenceDiagram
    participant P2 as Reconnecting Peer
    participant Sig as Signaling
    participant P1 as Host

    Note over P2: Heartbeat lost / RTC closed
    P2->>Sig: WSS connect + JOIN_HANDSHAKE
    Sig->>P1: forwarded
    Note over P1: Pinned dtlsFp + originalPeerPubKey on file
    P1->>P1: Mint fresh CHALLENGE nonce (16 B CSPRNG)
    P1->>Sig: signed envelope { CHALLENGE, nonce }
    Sig->>P2: relay envelope
    P2->>P2: verify envelope sig (host pubKey)
    P2->>P2: sign nonce with ORIGINAL Ed25519 key
    P2->>Sig: signed envelope { CHALLENGE_RESPONSE, nonce, sig }
    Sig->>P1: relay envelope
    P1->>P1: verify CHALLENGE_RESPONSE sig
    alt sig + DTLS fingerprint both match
        P1->>P1: Re-pin new dtlsFp
        P1->>P2: APPROVE_REJOIN
        Note over P1,P2: Resume from log-range request<br/>(per Task 6, no bisect → report → quit needed)
    else sig OR fingerprint mismatch
        P1->>P1: Dispatch TRUST_VIOLATION_DETECTED
        P1->>P2: REJECT_REJOIN { reason }
        Note over P1,P2: 5 s grace toast → leave room
    end
```

## State Transitions

| Source state | Trigger | Destination |
|---|---|---|
| `connected` | heartbeat lost ≥ 30 s | `awaitingRejoin` |
| `awaitingRejoin` | host emits `CHALLENGE` | `awaitingChallengeResponse` |
| `awaitingChallengeResponse` | both gates pass | `connected` (re-pinned) |
| `awaitingChallengeResponse` | either gate fails | `awaitingTrustViolationDecision` |
| `awaitingChallengeResponse` | 120 s with no response | `verifiedDisconnect` (forfeit per [`abandon-penalty.md`](../abandon-penalty.md)) |

## Why two gates

The Ed25519 signature gate prevents a fresh attacker from
impersonating the dropped peer. The DTLS fingerprint gate
prevents a man-in-the-middle from interposing during the rejoin
WebRTC handshake (the original peer's keypair is unchanged but
the channel they think they reopened is now MITM'd). Either
gate alone is bypassable; both together close the swap window.
