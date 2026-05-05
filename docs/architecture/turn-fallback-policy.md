# TURN-Down Fallback Policy

> Source plan:
> [`docs/implementation-plans/25-turn-credentials-and-signaling-server-abuse-plan.md`](../implementation-plans/25-turn-credentials-and-signaling-server-abuse-plan.md)
> § Critical Fix 5.

This file pins the **client-side fallback when TURN is
unavailable** — provider down, credential refresh denied, ICE
relay-failure storm. The rule is one refresh attempt; on second
failure, the client surfaces an actionable error and closes the
peer connection.

There is no silent fallthrough to `iceTransportPolicy: 'all'`
after a deliberate relay attempt; there is no auto-retry beyond
once.

The owning task is
[`tasks/phase-3/01-multiplayer/35-edge-defense-and-health-segregation.md`](../../tasks/phase-3/01-multiplayer/35-edge-defense-and-health-segregation.md).
The client-side hook lives in `src/net/webrtc/peer-connection.ts`
and is shared with
[Task 02](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md);
the credential refresh path is owned by
[Task 33](../../tasks/phase-3/01-multiplayer/33-turn-credentials-doctrine-issuance.md).

---

## 1. State machine

The peer-connection client sees three possible failure paths after
ICE has assembled at least one candidate pair.

```
  iceconnectionstate
       │
       ├── connected ───► steady state
       │
       ├── failed (1st)  ───► dispatch REQUEST_TURN_REFRESH
       │                       (rate-limited per signaling-rate-limits.md)
       │
       └── failed (2nd within 10 s window)
               │
               ▼
        dispatch CONNECTION_FAILED_RELAY_UNAVAILABLE
        close peer connection
        surface lobby copy "Direct connection blocked — try a
                            different network or wait a moment
                            and retry."
```

The 10-second window starts when the first `failed` is observed;
a `failed → connected → failed` flicker that crosses the window is
re-counted as a new first attempt. The `_RECOVERY_TIMER` is local
state on the peer-connection module; it is not a deterministic
gameplay timer.

## 2. Why never silently fall through to relay-only

A `'relay'`-only `iceTransportPolicy` after a relay failure leaks
the user's NAT topology through `srflx` and `host` candidates in
the prior offer/answer; downgrading to `'relay'`-only is also
incompatible with the pre-consent ICE filter in
[`ice-disclosure-policy.md`](./ice-disclosure-policy.md).

A silent fallthrough is also the worst UX shape: a corporate-NAT
user sees "Connecting…" forever with no actionable message.

## 3. Why never auto-retry beyond once

A retry storm against `REQUEST_TURN_REFRESH` is an amplification
attack: every client whose match happens to drop simultaneously
(e.g., during a TURN provider hiccup) reissues. The single-retry
rule keeps the worst-case dispatch fan-out at 1× the active match
count.

The client may **manually** retry by leaving the lobby and
re-creating the room.

## 4. Lobby UI surface

The lobby ([`64-network-lobby/spec.md` § Connection-Failure States](./wiki/screens/64-network-lobby/spec.md#connection-failure-states))
renders:

| State | Copy | Action |
| --- | --- | --- |
| `relayUnavailable` | "Direct connection blocked — try a different network or wait a moment and retry." | Single button: "Back to setup" → `62-multiplayer-setup`. |
| `rateLimited` | "Too many attempts. Try again in {{retryAfterSeconds}} s." | Disabled button until the cooldown elapses. |
| `roomFull` | "This room is full." | Single button: "Back to setup". |
| `codeLocked` | "Too many wrong codes against this room. Try again in {{cooldownSeconds}} s." | Disabled button until cooldown elapses. |

Each state binds to `state.net.lobby.errorState.kind`; the state
shape is pinned by
[`64-network-lobby/data-contracts.md`](./wiki/screens/64-network-lobby/data-contracts.md).

## 5. Cross-References

- Credential refresh path: [`turn-credentials.md` § 6](./turn-credentials.md#6-refresh).
- ICE-disclosure policy that bars relay-only fallthrough: [`ice-disclosure-policy.md`](./ice-disclosure-policy.md).
- Lobby copy and handlers: [`64-network-lobby/spec.md`](./wiki/screens/64-network-lobby/spec.md), [`64-network-lobby/interactions.md`](./wiki/screens/64-network-lobby/interactions.md).
- Existing 4-second STUN-first / TURN-fallback flow (the *pre-failure* fallback): [`services/multiplayer/turn-config.md` § Client-Side Fallback Flow](../../services/multiplayer/turn-config.md#client-side-fallback-flow).
