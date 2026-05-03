---
id: "26-multiplayer-sync"
title: "Multiplayer Sync (WebRTC)"
category: "multiplayer"
short: "26. Multiplayer Sync"
---

**Two players share deterministic state.** WebRTC peer connection. Each player sends commands, both apply locally. Identical seeds + commands = identical state. Hash check after each turn detects desync.

```mermaid
sequenceDiagram
    participant P1 as Player 1
    participant Net as WebRTC
    participant P2 as Player 2

    P1->>P1: Issue MOVE_HERO
    P1->>P1: Apply locally
    P1->>Net: Send MOVE_HERO
    Net->>P2: Receive MOVE_HERO
    P2->>P2: Apply same command
    Note over P1,P2: Both have identical state

    P1->>P1: End turn
    P1->>P1: Compute state hash
    P1->>Net: Send hash
    P2->>P2: Compute state hash
    P2->>Net: Send hash
    Net->>Net: Compare hashes
    alt Hashes match
        Net-->>P1: ✓ in sync
        Net-->>P2: ✓ in sync
    else Hashes differ
        Net-->>P1: ✗ desync detected
        Net-->>P2: ✗ desync detected
        Note over P1,P2: 1. Try snapshot-resync<br/>(walk ring, restore<br/>last agreeing snapshot,<br/>re-apply log tail)
        Note over P1,P2: 2. If no snapshot agrees:<br/>bisect (Task 5)
        Note over P1,P2: 3. If bisect fails:<br/>report + quit
    end
```

## Determinism Requirements

For multiplayer to work, both clients MUST:

- Use the same pack versions (verified by content hash)
- Use the same RNG seed (provided by host)
- Apply commands in the same order
- Use deterministic floating-point math (or fixed-point integers)

Wall-clock readings are forbidden in the deterministic slice — see
[`docs/architecture/determinism.md` § Clock Policy](../determinism.md#clock-policy).
Synchronized clocks are not required because nothing in `state.*`
reads one.

## Recovery Flow

`DESYNC_DETECTED` does not abort the match by default. Recovery
runs as a three-step ladder:

1. **Snapshot-resync** — both peers exchange a compact
   `(seqOffset, stateHash)` digest of the in-memory snapshot ring
   (last 5 snapshots, taken every 20 turns) and restore the newest
   offset whose hash agrees on both sides. Defined in
   [`docs/architecture/determinism.md` § Snapshot Cadence and Resync](../determinism.md#snapshot-cadence-and-resync)
   and implemented by [Task 9](../../../tasks/phase-3/01-multiplayer/09-snapshot-resync-fallback.md).
2. **Bisect** — if no snapshot agrees, fall through to
   [Task 5](../../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md)'s
   binary search to find the first diverging command for a bug
   report.
3. **Report + quit** — if bisect cannot recover, hand the player a
   filed-ready desync report.
