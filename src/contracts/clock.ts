// Frame-counter clock contract.
//
// The engine reducer must never read wall-clock time. This contract
// defines the only legal time source inside src/engine/: a monotonic
// frame counter that is advanced exclusively by the dispatcher. See
// docs/architecture/determinism.md § Wall-clock readers.

export interface Clock {
  /** Current monotonic frame counter. Always integer; never decreases within a session. */
  frame(): number;

  /** Advances the counter by `n` frames. Only the dispatcher may call this. */
  tick(n: number): void;
}
