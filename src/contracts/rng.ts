// Seeded RNG contract for deterministic engine code.
//
// Pinned by docs/architecture/determinism.md § Non-Negotiable Stack
// (PCG32 with named sub-streams). The stream tags are part of the
// determinism contract; saves and replays serialize the (seed, stream
// counters) pair, never the live state of an unnamed RNG.

export type RngStream =
  | "world-gen"
  | "battle"
  | "morale"
  | "luck"
  | "ai"
  | "themed-week"
  | "loot";

export interface Rng {
  /** Returns a 32-bit unsigned integer drawn from the named stream. */
  nextUint32(stream: RngStream): number;

  /** Returns an integer in `[lo, hi]` inclusive. Uses rejection sampling so the result is unbiased across the range. */
  nextInt(stream: RngStream, lo: number, hi: number): number;

  /** Returns a stable serializable snapshot of every named stream's counter. */
  snapshot(): Readonly<Record<RngStream, number>>;
}
