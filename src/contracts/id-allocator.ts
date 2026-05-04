// Deterministic ID allocator contract.
//
// Issuance is monotonic per `kind`. Saves and replays serialize the
// (kind → next-id) map; rehydration restores the same counters so a
// command log replayed offline produces identical IDs.
//
// Pinned by docs/architecture/id-allocator.md.

export type IdAllocatorKind =
  | "hero"
  | "stack"
  | "battle"
  | "command"
  | "event"
  | "ai-decision";

export interface IdAllocator {
  /** Returns the next ID for `kind`, advancing the counter by one. IDs are namespaced strings (`<kind>:<n>`). */
  next(kind: IdAllocatorKind): string;

  /** Returns a stable serializable snapshot of every kind's counter. */
  snapshot(): Readonly<Record<IdAllocatorKind, number>>;
}
