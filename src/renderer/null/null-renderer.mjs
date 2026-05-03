// Null renderer: a non-WebGL renderer for headless tests, debug
// overlays, and CI gates. It consumes the event log via
// event-log-consumer.mjs and exposes the resulting AnimationTrace as
// in-memory data.
//
// Contract:
//   - The renderer never mutates engine state.
//   - The renderer never calls back into rules / formula evaluators.
//   - DAMAGE_FRAME visuals are surfaced from cues already authored by
//     the engine inside events[i].
//
// See:
//   - docs/architecture/animation-contract.md (DAMAGE_FRAME Ownership)
//   - docs/architecture/diagrams/11-attack-anim.md

import { consumeEventLog } from "./event-log-consumer.mjs";

export function createNullRenderer({ animations, sounds, vfx, statuses } = {}) {
  const registries = {
    animations: animations ?? new Map(),
    sounds:     sounds     ?? new Map(),
    vfx:        vfx        ?? new Map(),
    statuses:   statuses   ?? new Map()
  };

  const state = {
    eventLogIndex: 0,
    trace: { timelines: [], cuesEmitted: [], warnings: [], invariants: { damageEverEmittedFromRenderer: false } }
  };

  function play(events) {
    state.trace = consumeEventLog(events, registries);
    state.eventLogIndex = events.length;
    return state.trace;
  }

  function reset() {
    state.eventLogIndex = 0;
    state.trace = { timelines: [], cuesEmitted: [], warnings: [], invariants: { damageEverEmittedFromRenderer: false } };
  }

  function getTrace() {
    return state.trace;
  }

  return {
    play,
    reset,
    getTrace,
    get eventLogIndex() { return state.eventLogIndex; }
  };
}
