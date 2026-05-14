# TURN-Down Fallback Policy

Client-side behaviour when **TURN is unavailable** — provider down,
credential refresh denied, or ICE relay-failure storm. The rule:
**one refresh attempt; on a second failure within 10 s, surface an
actionable lobby error and close the peer connection.**

Two corollaries follow from that rule and are enforced as
invariants:

- No silent fallthrough to `iceTransportPolicy: 'all'` after a
  deliberate relay attempt — see § 2.
- No auto-retry beyond one `REQUEST_TURN_REFRESH` round-trip — see
  § 3.

**Companion docs:**

- [`turn-credentials.md` § 6](./turn-credentials.md#6-refresh) —
  credential refresh round-trip wired to step 1 of this state
  machine.
- [`ice-disclosure-policy.md`](./ice-disclosure-policy.md) — bars
  the relay-only fallthrough that this policy explicitly rejects.
- [`signaling-rate-limits.md`](./signaling-rate-limits.md) — per-IP
  `REQUEST_TURN_REFRESH` cap (added by
  [Task 32](../../tasks/phase-3/01-multiplayer/32-signaling-rate-limit-augmentations.md)).
- [`wiki/screens/64-network-lobby/spec.md` § Connection-Failure States](./wiki/screens/64-network-lobby/spec.md#connection-failure-states),
  [`wiki/screens/64-network-lobby/interactions.md`](./wiki/screens/64-network-lobby/interactions.md),
  [`wiki/screens/64-network-lobby/data-contracts.md`](./wiki/screens/64-network-lobby/data-contracts.md)
  — lobby copy, handlers (`OnRelayUnavailable`, …), and the closed
  `state.net.lobby.errorState` shape.
- [`services/multiplayer/turn-config.md` § Client-Side Fallback Flow](../../services/multiplayer/turn-config.md#client-side-fallback-flow)
  — the *pre-failure* STUN-first → TURN flow (4 s ICE-gather
  timeout). This doc owns the *post-failure* contract.
- [`command-schema.md`](./command-schema.md) — runtime-only
  registrations for `REQUEST_TURN_REFRESH` and
  `CONNECTION_FAILED_RELAY_UNAVAILABLE`.

**Implementation:**

- Owning task —
  [`tasks/phase-3/01-multiplayer/35-edge-defense-and-health-segregation.md`](../../tasks/phase-3/01-multiplayer/35-edge-defense-and-health-segregation.md).
- Client hook lives in `src/net/webrtc/peer-connection.ts`, shared
  with
  [Task 02](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md)
  (primary owner; the TURN-down listener is additive).
- Credential refresh path is owned by
  [Task 33](../../tasks/phase-3/01-multiplayer/33-turn-credentials-doctrine-issuance.md).

---

## 1. State machine

After ICE has assembled at least one candidate pair, the
peer-connection client observes `iceconnectionstate` and acts as
follows.

```
  iceconnectionstate
       │
       ├── connected ───► steady state
       │
       ├── failed (1st)  ───► dispatch REQUEST_TURN_REFRESH
       │                       (rate-limited per
       │                        signaling-rate-limits.md)
       │
       └── failed (2nd within 10 s window)
               │
               ▼
        dispatch CONNECTION_FAILED_RELAY_UNAVAILABLE
        close peer connection
        set state.net.lobby.errorState = { kind: "relayUnavailable" }
```

| Transition | t | Action |
|---|---|---|
| `connected` | — | Steady state; no dispatch. |
| 1st `failed` | `t = 0` | Dispatch `REQUEST_TURN_REFRESH`; arm the 10 s recovery window. |
| 2nd `failed` | `t ≤ 10 s` | Dispatch `CONNECTION_FAILED_RELAY_UNAVAILABLE`; close the peer connection. |
| 2nd `failed` | `t > 10 s` | Counts as a new 1st `failed` (window has elapsed). |
| `failed → connected → failed` crossing the window | — | Re-counts as a 1st `failed`; window re-arms. |

The 10-second recovery window is local state on the
peer-connection module; it is **not** a deterministic gameplay
timer and never enters the canonical state hash, saves, or replays.

## 2. Why never silently fall through to relay-only

A `'relay'`-only `iceTransportPolicy` enacted *after* a relay
failure leaks the user's NAT topology through `srflx` and `host`
candidates already in the prior offer/answer; downgrading to
`'relay'`-only is also incompatible with the pre-consent ICE filter
in [`ice-disclosure-policy.md`](./ice-disclosure-policy.md).

Silent fallthrough is also the worst UX shape: a corporate-NAT
user sees "Connecting…" forever with no actionable message.

## 3. Why never auto-retry beyond once

A retry storm against `REQUEST_TURN_REFRESH` is an amplification
attack: every client whose match happens to drop simultaneously
(e.g., during a TURN provider hiccup) reissues. The single-retry
rule keeps worst-case dispatch fan-out at 1× the active match
count.

The user may **manually** retry by leaving the lobby and
re-creating the room.

## 4. Lobby UI surface

Per
[`64-network-lobby/spec.md` § Connection-Failure States](./wiki/screens/64-network-lobby/spec.md#connection-failure-states),
the lobby renders four named failure states. Each binds to
`state.net.lobby.errorState.kind` (closed shape pinned by
[`64-network-lobby/data-contracts.md`](./wiki/screens/64-network-lobby/data-contracts.md));
the handlers (`OnRelayUnavailable`, `OnRateLimited`, `OnRoomFull`,
`OnCodeLocked`) live in
[`64-network-lobby/interactions.md`](./wiki/screens/64-network-lobby/interactions.md).

| State | Copy | Action |
| --- | --- | --- |
| `relayUnavailable` | "Direct connection blocked — try a different network or wait a moment and retry." | Single button: "Back to setup" → `62-multiplayer-setup`. |
| `rateLimited` | "Too many attempts. Try again in {{retryAfterSeconds}} s." | Disabled button until the cooldown elapses. |
| `roomFull` | "This room is full." | Single button: "Back to setup". |
| `codeLocked` | "Too many wrong codes against this room. Try again in {{cooldownSeconds}} s." | Disabled button until cooldown elapses. |

This policy owns only the `relayUnavailable` row; the other three
are owned by `signaling-edge-defense.md` and the signaling rate
limits, and are reproduced here for the table-row contract.

## 5. Cross-References

- Credential refresh path: [`turn-credentials.md` § 6](./turn-credentials.md#6-refresh).
- ICE-disclosure policy that bars relay-only fallthrough: [`ice-disclosure-policy.md`](./ice-disclosure-policy.md).
- Lobby copy and handlers: [`64-network-lobby/spec.md`](./wiki/screens/64-network-lobby/spec.md), [`64-network-lobby/interactions.md`](./wiki/screens/64-network-lobby/interactions.md).
- Pre-failure STUN-first / TURN-fallback flow (4 s ICE-gather timeout): [`services/multiplayer/turn-config.md` § Client-Side Fallback Flow](../../services/multiplayer/turn-config.md#client-side-fallback-flow).
- Command registrations: [`command-schema.md`](./command-schema.md) (`REQUEST_TURN_REFRESH`, `CONNECTION_FAILED_RELAY_UNAVAILABLE`).

---

## 🔍 Sync Check

- **UI: ✔** — § 4 table copy matches
  [`64-network-lobby/spec.md` § Connection-Failure States](./wiki/screens/64-network-lobby/spec.md#connection-failure-states)
  verbatim; the `OnRelayUnavailable` handler in
  [`64-network-lobby/interactions.md`](./wiki/screens/64-network-lobby/interactions.md)
  consumes `CONNECTION_FAILED_RELAY_UNAVAILABLE` and writes the same
  `errorState` shape this doc names.
- **Schema: ✔** — This doc owns no JSON schema. The
  `state.net.lobby.errorState` closed shape is pinned in
  [`64-network-lobby/data-contracts.md`](./wiki/screens/64-network-lobby/data-contracts.md);
  `REQUEST_TURN_REFRESH` and `CONNECTION_FAILED_RELAY_UNAVAILABLE`
  are registered as runtime-only commands in
  [`command-schema.md`](./command-schema.md) (lines 771 and 780)
  with `turn-fallback-policy.md` cited as the rule source.
- **Tasks: ✔** — Owning task
  [`35-edge-defense-and-health-segregation`](../../tasks/phase-3/01-multiplayer/35-edge-defense-and-health-segregation.md)
  reads this file First and lists this exact state machine in its
  Acceptance Criteria; companion tasks
  [`02-webrtc-peer-connection-plus-datachannel-setup`](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md)
  (primary owner of `src/net/webrtc/peer-connection.ts`, additive
  TURN-down listener) and
  [`33-turn-credentials-doctrine-issuance`](../../tasks/phase-3/01-multiplayer/33-turn-credentials-doctrine-issuance.md)
  (owner of `REQUEST_TURN_REFRESH`) reciprocally cite this doc.

## ⚠ Issues

- **`_RECOVERY_TIMER` identifier had no implementation referent.**
  The original § 1 named the local 10-second window
  `_RECOVERY_TIMER`. No code, schema, or other doc uses that
  identifier (only the rendered architecture-wiki HTML mirrors this
  file). Per Hard Prohibition A (preserve meaning), the rewrite
  keeps the rule (10 s, local state, not a deterministic gameplay
  timer) but drops the coined name in favour of plain prose; once
  Task 02 / Task 35 land the listener, any implementation-side
  identifier supersedes this informal one.
- **`REQUEST_TURN_REFRESH` not yet enumerated in
  `signaling-rate-limits.md`.** § 1 of this doc and § 6 of
  [`turn-credentials.md`](./turn-credentials.md#6-refresh) cite
  [`signaling-rate-limits.md`](./signaling-rate-limits.md) as the
  rate-limit anchor, but the table in that doc does not yet contain
  a `REQUEST_TURN_REFRESH` row.
  [Task 32 § Outputs](../../tasks/phase-3/01-multiplayer/32-signaling-rate-limit-augmentations.md)
  adds the row (`per-IP REQUEST_TURN_REFRESH | 6 / min | 1 / 10 s
  | 6`). Forward-looking; the existing link is preserved per Hard
  Prohibition C. Closes when Task 32 ships and the rate-limits
  table absorbs the row.
- **`src/net/webrtc/peer-connection.ts` does not yet exist.** This
  doc and Task 02 / Task 35 cite the file as the implementation
  surface; today only `src/net/lockstep/` and `src/net/README.md`
  exist. Forward-looking; the path is owned by Task 02 and the
  TURN-down listener is contributed by Task 35. No CI-blocking
  drift; preserved per Hard Prohibition A.
