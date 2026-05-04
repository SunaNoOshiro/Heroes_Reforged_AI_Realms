# Visibility Policy

Single canonical doc enumerating every subsystem's
`visibilitychange` and `pagehide` behavior. Cross-cutting framing
in
[`edge-cases-policy.md` § 14](./edge-cases-policy.md#14-tab-backgrounding--visibilitychange-q217).

---

## Events

The browser's
[`document.visibilityState`](https://developer.mozilla.org/docs/Web/API/Document/visibilityState)
tracks whether the tab is `visible` or `hidden`. The page also
fires `pagehide` when the document is being unloaded; the policy
treats `pagehide` as a forced `:hidden` transition.

---

## Per-Subsystem Behavior

### Audio

- On `visibilitychange:hidden`: mute the master gain (smooth
  ramp-down over 50 ms).
- On `visibilitychange:visible`: restore the master gain to the
  user-configured level (smooth ramp-up over 50 ms).
- Plays no role in determinism; uses `audioContext.currentTime` for
  scheduling, never wall-clock.

### Renderer

- On `visibilitychange:hidden`: cancel the in-flight
  `requestAnimationFrame` and stop pumping the loop. The animation
  timeline is paused (no advance).
- On `visibilitychange:visible`: start a fresh rAF chain. The
  delta-time clock is reset so the first restored frame does not
  fast-forward.
- Owned by
  [`tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md`](../../tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md).

### Persistence (Autosave)

- On `visibilitychange:hidden` and on `pagehide`: fire a
  best-effort tab-resume autosave. The write uses a synchronous
  IDB transaction where possible, wrapped in a 50 ms timeout.
- If the budget is exceeded, the autosave is dropped silently and
  a telemetry counter is emitted. No modal is shown because the
  page is on its way out.
- Subsequent `visibilitychange:visible` does not re-fire the save.
- Owned by
  [`tasks/mvp/08-persistence/06-autosave.md`](../../tasks/mvp/08-persistence/06-autosave.md).

### Multiplayer Heartbeat

- On `visibilitychange:hidden`: emit a `WILL_BACKGROUND` transport
  message to the peer. The peer's heartbeat tolerance for this
  side is extended from **6 s** to **30 s** for the next **60 s**.
- After 60 s of continuous backgrounding, the normal 6 s
  threshold resumes — mobile sleep ≈ disconnect.
- On `visibilitychange:visible`: emit a state-hash comparison
  request to the peer. If hashes match, the match resumes; if
  they diverge, the standard reconnection flow fires.
- Owned by
  [`tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md`](../../tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md).

### Sim Reducer

- No idle work. The reducer is event-driven; backgrounding does
  not pause anything reducer-side.

---

## Resume Reconciliation

The state-hash comparison on `visibilitychange:visible` is the
single chokepoint for "did anything diverge while we were away?":

1. The renderer requests `state.persistence.lastKnownStateHash`
   from the local engine.
2. The multiplayer transport sends a `STATE_HASH_PROBE` to each
   peer with `{ turn, stateHash }`.
3. A peer's `STATE_HASH_AGREE` reply resumes normally.
4. A `STATE_HASH_DISAGREE` reply hands off to the standard
   reconnection / desync flow already pinned in
   [`determinism.md` § Snapshot Cadence and Resync](./determinism.md#snapshot-cadence-and-resync).

Single-player sessions skip steps 2–4; the renderer simply
restarts the rAF loop.

---

## Cross-References

- [`edge-cases-policy.md` § 14](./edge-cases-policy.md#14-tab-backgrounding--visibilitychange-q217)
- [`determinism.md` § Snapshot Cadence and Resync](./determinism.md#snapshot-cadence-and-resync)
- [`tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md`](../../tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md)
- [`tasks/mvp/08-persistence/06-autosave.md`](../../tasks/mvp/08-persistence/06-autosave.md)
- [`tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md`](../../tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md)
