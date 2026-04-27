---
id: "10-turn-order"
title: "Turn Order Calculation"
category: "battle"
short: "10. Turn Order"
---

**Speed-based initiative with deterministic tie-breaking.** Each unit has a speed stat. Queue is sorted by speed descending. Ties broken by stack position (deterministic). WAIT moves unit to end. Same seed = same order.

```mermaid
flowchart TD
    A[Round starts] --> B[Collect all alive stacks]
    B --> C[For each stack:<br/>get speed stat]
    C --> D[Sort descending by speed]
    D --> E{Speed tie?}
    E -->|YES| F[Break by:<br/>1. side - attacker first<br/>2. position - top stack first<br/>3. unit id - alphabetical]
    E -->|NO| G[Use natural order]
    F --> H[Build initiative queue]
    G --> H
    H --> I[Take top of queue]
    I --> J{Action?}
    J -->|WAIT| K[Move to back of queue]
    J -->|ATTACK/DEFEND/CAST| L[Resolve action]
    K --> I
    L --> M{Queue empty?}
    M -->|NO| I
    M -->|YES| N[Round ends]
    N --> O{Battle over?}
    O -->|NO| A
    O -->|YES| P[Show victory]
    style A fill:#bbdefb
    style P fill:#a5d6a7
```

## Tie-Breaking Rules

When two stacks have identical speed, the order is determined by (in order):

1. **Side**: Attacker stacks go first
2. **Position**: Top stack (smaller index) first
3. **Unit ID**: Alphabetical fallback (rare)

This ensures the same seed always produces the same turn order.
