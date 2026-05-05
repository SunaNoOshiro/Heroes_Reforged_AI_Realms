// Plan 26 — Critical Fix 4 / Turn Timer & Stall Detection.
//
// Stub for the turn-timer state machine. Owning task:
// tasks/phase-3/01-multiplayer/11-turn-timer-and-stall-detection.md.
// Doctrine: docs/architecture/turn-timer.md.
//
// Wall-clock-driven; emits canonical END_DAY { source: 'auto-timeout' }
// envelope at STALL_LIMIT_MS through the lockstep envelope wrap pipeline
// from src/net/lockstep/envelope.ts.

export const TURN_TIMER_DEFAULTS = {
  WAITING_THRESHOLD_MS: 30_000,
  STALL_LIMIT_MS: 90_000
} as const;

export type TurnTimerState = "waiting" | "stalled" | "auto-end-day";
