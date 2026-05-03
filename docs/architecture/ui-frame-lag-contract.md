# UI Frame-Lag Contract

**Status:** Approved for MVP
**Date:** 2026-05-02

The engine reducer is synchronous; the DOM-side UI reads through
Zustand selectors; the WebGL viewport reads through `requestAnimationFrame`.
This doc pins the lag bounds the rest of the system relies on —
single-player, optimistic UI, M5 lockstep, WebGL2 context loss, and
replay.

---

## 1. Single-Player Lag Bound

Authoritative state advances by `state' = apply(state, command)`.
DOM components subscribe through Zustand and re-render when the
selector observes a changed slice.

- **Bound:** UI lags authoritative state by **at most 1 render frame**
  (~16 ms at 60 FPS).
- Guaranteed by:
  - synchronous reducer (no `setTimeout`-based scheduling),
  - Zustand notifying subscribers in the same micro-task,
  - React 18 fiber scheduling each subscriber update on the next
    frame.
- WebGL viewport reads `store.getState()` once per
  `requestAnimationFrame`, so canvas content is also at most one
  frame behind authoritative state.

---

## 2. Optimistic UI

Components MAY render "pending" placeholders bound to a draft slice:

- Drafts live exclusively under `state.ui.<screen>.draft.*`.
- Drafts are **non-replayed** and **non-hashed**: the canonical state
  serializer
  ([`determinism.md`](./determinism.md)) excludes the `state.ui.*`
  branch from the xxh64 input.
- A draft must clear when its corresponding command resolves (accepted
  or rejected). The clearing is part of the same store action that
  applies the command.
- Drafts never fork the authoritative `state.gameplay.*` shape; they
  may reference IDs but they cannot be a stand-in for reducer output.

Anti-patterns:

- ❌ Setting `state.gameplay.x = optimisticX` before the reducer
  approves the change.
- ❌ Swallowing reducer rejection silently. The UI must show a
  localized error and clear the draft.
- ❌ Persisting a draft across save/load. Drafts are session-only.

---

## 3. M5 Lockstep

Multiplayer in M5 uses lockstep command exchange. The UI binds to
**authoritative state only**.

- A `state.net.tick` lag indicator (frames behind the authoritative
  cursor) is exposed for telemetry and HUD display.
- If `state.net.tick` exceeds the lockstep window for ≥ 60 frames,
  the UI surfaces the **synchronizing overlay** (z-layer 9500;
  see [`ui-technology-choice.md` § Z-Stack Contract](./ui-technology-choice.md#z-stack-contract))
  with a localized "synchronizing with peers" message and a
  cancel-game affordance.
- The synchronizing overlay does not pause the engine. It blocks
  input above the canvas while the lockstep transport recovers.
- If the overlay is open at game end, the result screen replaces it.
- Optimistic UI in lockstep: drafts continue to work but never
  influence the authoritative command stream. Confirmation latency
  is the lockstep RTT plus one render frame.

---

## 4. WebGL2 Context Loss

WebGL2 contexts can be lost on tablet suspend/resume, GPU driver
reset, or browser memory pressure.

- On `webglcontextlost`: renderer freezes its render loop. UI continues
  to function on the DOM side without interruption.
- On `webglcontextrestored`: renderer reuploads atlases (replays the
  warmup phases from
  [diagram 28](./diagrams/28-loading-orchestration.md) for the
  affected resources only) and resumes the loop. UI emits a
  non-blocking toast at z-layer 3000.
- Lag bound during context loss: authoritative state continues to
  advance; only the WebGL frame is stale. DOM-side state remains at
  most one render frame behind.

---

## 5. Replay

Replay is a closed-loop variant of the live flow.

- The replay driver feeds commands from the command log into the same
  reducer.
- UI binds to the same store, fed by the replay driver instead of
  live commands.
- Lag bound is identical: at most one render frame between reducer
  application and DOM update.
- The debug overlay's replay scrubber
  ([`screens/66-debug-overlay/`](./wiki/screens/66-debug-overlay/))
  manipulates the replay driver — never the live engine.
- Pausing replay does not pause authoritative state; in live mode
  there is no replay-driver involvement. Switching between live and
  replay modes is presentation-only.

---

## 6. Anti-Patterns

- ❌ Reading sim internals from React render bodies.
- ❌ Updating gameplay slices from a `useEffect`. Reducers own
  gameplay mutations.
- ❌ Polling `pickAt` from a render function. Use the seam's
  synthetic-event channel
  ([`ui-renderer-seam.md`](./ui-renderer-seam.md)).
- ❌ Bypassing the lag bound for "responsiveness". Use a draft slice
  if you need to render a pending action immediately.

---

## Related Files

- [`state-flow.md`](./state-flow.md)
- [`determinism.md`](./determinism.md)
- [`ui-technology-choice.md`](./ui-technology-choice.md)
- [`ui-renderer-seam.md`](./ui-renderer-seam.md)
- [`renderer-technology-choice.md`](./renderer-technology-choice.md)
- [`wiki/screens/07-adventure-map/architecture.md`](./wiki/screens/07-adventure-map/architecture.md)
- [`wiki/screens/66-debug-overlay/architecture.md`](./wiki/screens/66-debug-overlay/architecture.md)
- [`tasks/mvp/01-engine-core/`](../../tasks/mvp/01-engine-core/)
- [`tasks/mvp/07-ui-shell/`](../../tasks/mvp/07-ui-shell/)
