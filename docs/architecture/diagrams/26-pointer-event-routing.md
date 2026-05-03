---
id: "26-pointer-event-routing"
title: "Pointer Event Routing — DOM ↔ Canvas Seam"
category: "ui"
short: "26. Pointer Routing"
---

**Where a click goes.** The browser hit-tests DOM first; if the topmost
target is the canvas, the renderer's `pickAt` runs and the result
flows into the store as either a draft hover or a dispatched command.
Pinned in [`ui-renderer-seam.md`](../ui-renderer-seam.md).

```mermaid
sequenceDiagram
    actor Player
    participant Browser
    participant DOM as DOM overlay
    participant Canvas
    participant Seam as Seam Adapter
    participant Renderer
    participant Store as Zustand store
    participant Reducer

    Player->>Browser: pointerdown (x, y)
    Browser->>DOM: hit-test topmost element
    alt DOM portal owns target
        DOM-->>Browser: handler runs
        DOM->>Store: dispatch draft / action
        Store->>Reducer: action -> state'
    else target is canvas
        DOM-->>Browser: pointer-events: none falls through
        Browser->>Canvas: deliver event
        Canvas->>Seam: synthetic pointer
        Seam->>Renderer: pickAt(cssX, cssY)
        Renderer-->>Seam: PickResult | null
        alt PickResult is hover-only
            Seam->>Store: write state.ui.<screen>.pointer (draft)
        else click confirmed
            Seam->>Store: dispatch command via command hook
            Store->>Reducer: command -> state'
        end
    end
    Reducer-->>Store: state'
    Store-->>DOM: selector subscription wakes
    Store-->>Renderer: rAF reads new snapshot
```

## Rules

- DOM-first resolution. `pointer-events: none` is the only way the
  canvas sees an event under a DOM overlay.
- `pickAt` is read-only and synchronous. It is called from event
  handlers, never from React render bodies.
- Hover state is a **draft**. It lives under `state.ui.<screen>.*` and
  is never replayed or hashed.
- Confirmed clicks dispatch a command. The reducer is the only path
  that mutates authoritative state.

## Related diagrams

- [08 — Building Click → Action Flow](./08-building-click.md)
- [27 — Component Resolution](./27-component-resolution.md)
