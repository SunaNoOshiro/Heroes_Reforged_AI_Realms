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
        Note over P1,P2: Resync from last good state
    end
```

## Determinism Requirements

For multiplayer to work, both clients MUST:

- Use the same pack versions (verified by content hash)
- Use the same RNG seed (provided by host)
- Apply commands in the same order
- Use deterministic floating-point math (or fixed-point integers)
- Have synchronized clocks (for timestamps)

Any divergence is detected by hash comparison and triggers resync.
