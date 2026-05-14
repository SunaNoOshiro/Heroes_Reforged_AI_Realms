# UI Frame-Lag Contract

**Status:** Approved for MVP
**Date:** 2026-05-02

Companion docs:
[`state-flow.md`](./state-flow.md) (reducer + subscription cadence),
[`determinism.md`](./determinism.md) (xxh64 canonical serializer
and the `state.ui.*` exclusion),
[`ui-technology-choice.md`](./ui-technology-choice.md) (Zustand
selectors, Z-Stack Contract),
[`ui-renderer-seam.md`](./ui-renderer-seam.md) (DOM ↔ canvas seam),
[`renderer-technology-choice.md`](./renderer-technology-choice.md)
(rAF loop, atlas warmup).

The engine reducer is synchronous. DOM components read through
Zustand selectors. The WebGL viewport reads through
`requestAnimationFrame`. This doc pins the lag bounds the rest of
the system relies on — single-player, optimistic UI, M5 lockstep,
WebGL2 context loss, and replay.

---

## 1. Single-Player Lag Bound

Authoritative state advances via `state' = apply(state, command)`.
DOM components subscribe through Zustand and re-render when the
selected slice changes.

- **Bound:** UI lags authoritative state by **at most 1 render frame**
  (~16 ms at 60 FPS).
- Guarantees:
  - synchronous reducer (no `setTimeout`-based scheduling),
  - Zustand notifies subscribers in the same micro-task,
  - React 18 fiber schedules each subscriber update on the next
    frame.
- The WebGL viewport reads `store.getState()` once per
  `requestAnimationFrame`, so canvas content is also at most one
  frame behind authoritative state.

---

## 2. Optimistic UI

Components MAY render "pending" placeholders bound to a draft slice.

- Drafts live exclusively under `state.ui.<screen>.draft.*`.
- Drafts are **non-replayed** and **non-hashed**: the canonical
  serializer excludes the `state.ui.*` branch from the xxh64 input.
  See
  [`determinism.md` § UI Draft Slice](./determinism.md#ui-draft-slice).
- A draft MUST clear when its matching command resolves (accepted
  or rejected). The clear is part of the same store action that
  applies the command.
- Drafts never fork `state.gameplay.*`; they may reference IDs but
  cannot stand in for reducer output.

Anti-patterns:

- ❌ Setting `state.gameplay.x = optimisticX` before the reducer
  approves the change.
- ❌ Swallowing reducer rejection silently. The UI MUST show a
  localized error and clear the draft.
- ❌ Persisting a draft across save/load. Drafts are session-only.

---

## 3. M5 Lockstep

M5 multiplayer uses lockstep command exchange. The UI binds to
**authoritative state only**.

- `state.net.tick` exposes the frame lag behind the authoritative
  cursor (telemetry + HUD).
- When `state.net.tick` exceeds the lockstep window for **≥ 60
  frames**, the UI shows the **synchronizing overlay** at z-layer
  9500 (see
  [`ui-technology-choice.md` § Z-Stack Contract](./ui-technology-choice.md#z-stack-contract))
  with a localized "synchronizing with peers" message and a
  cancel-game affordance.
- The overlay does not pause the engine. It blocks input above the
  canvas while the lockstep transport recovers.
- If the overlay is open at game end, the result screen replaces it.
- Optimistic drafts continue to work but never influence the
  authoritative command stream. Confirmation latency is the
  lockstep RTT plus one render frame.

---

## 4. WebGL2 Context Loss

WebGL2 contexts can be lost on tablet suspend/resume, GPU driver
reset, or browser memory pressure.

- On `webglcontextlost`: the renderer freezes its render loop. The
  DOM-side UI continues to function without interruption.
- On `webglcontextrestored`: the renderer re-uploads atlases by
  replaying the affected warmup phases from
  [diagram 28](./diagrams/28-loading-orchestration.md) and resumes
  the loop. The UI emits a non-blocking toast at z-layer 3000.
- Lag bound during context loss: authoritative state continues to
  advance; only the WebGL frame is stale. The DOM stays within
  one render frame of authoritative state.

---

## 5. Replay

Replay is a closed-loop variant of the live flow.

- The replay driver feeds commands from the command log into the
  same reducer.
- The UI binds to the same store, fed by the replay driver instead
  of live commands.
- **Lag bound is identical:** at most one render frame between
  reducer application and DOM update.
- The debug overlay's replay scrubber
  ([`screens/66-debug-overlay/`](./wiki/screens/66-debug-overlay/))
  manipulates the replay driver — never the live engine.
- Pausing replay does not pause authoritative state in live mode;
  in live mode there is no replay-driver involvement. Switching
  between live and replay modes is presentation-only.

---

## 6. Anti-Patterns

- ❌ Reading sim internals from React render bodies.
- ❌ Mutating gameplay slices from a `useEffect`. Reducers own
  gameplay mutations.
- ❌ Polling `pickAt` from a render function. Use the seam's
  synthetic-event channel
  ([`ui-renderer-seam.md`](./ui-renderer-seam.md)).
- ❌ Bypassing the lag bound for "responsiveness". Use a draft
  slice if a pending action must render immediately.

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

---

## 🔍 Sync Check

- **UI: ✔** — Synchronizing-overlay z-layer (9500), toast layer
  (3000), and the stacking rules match
  [`ui-technology-choice.md` § Z-Stack Contract](./ui-technology-choice.md#z-stack-contract);
  the replay-scrubber surface matches
  [`wiki/screens/66-debug-overlay/architecture.md`](./wiki/screens/66-debug-overlay/architecture.md).
- **Schema: ✔** — `state.ui.<screen>.draft.*` exclusion lines up
  with [`determinism.md` § UI Draft Slice](./determinism.md#ui-draft-slice);
  context-loss / context-restored events are covered by the
  closed [`renderer-event.schema.json`](../../content-schema/schemas/renderer-event.schema.json)
  union (row `RendererEvent` in [`schema-matrix.md`](./schema-matrix.md)).
  `state.net.tick` is runtime-only telemetry (no IndexedDB row owed)
  consistent with [`data-inventory.md`](./data-inventory.md), which
  only registers persisted slices.
- **Tasks: ✔** — Four inbound citations in
  [`tasks/task-registry.json`](../../tasks/task-registry.json) plus
  Read-First references from
  [`tasks/mvp/06-renderer/01-webgl2-context-setup-plus-resize-handler.md`](../../tasks/mvp/06-renderer/01-webgl2-context-setup-plus-resize-handler.md),
  [`tasks/mvp/07-ui-shell/01-react-18-app-shell-with-canvas-overlay.md`](../../tasks/mvp/07-ui-shell/01-react-18-app-shell-with-canvas-overlay.md),
  [`tasks/mvp/07-ui-shell/15-input-arbitration.md`](../../tasks/mvp/07-ui-shell/15-input-arbitration.md),
  and [`tasks/phase-2/08-meta-systems/08-debug-overlay-screen.md`](../../tasks/phase-2/08-meta-systems/08-debug-overlay-screen.md).
  No orphan tasks reference this doc without reciprocal mention.

## ⚠ Issues

_None._
