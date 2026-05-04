// Command bus contract.
//
// The UI emits commands through this surface; the engine consumes them
// through its dispatcher. The UI never reaches into the engine reducer
// directly. See docs/architecture/state-flow.md and
// docs/architecture/command-schema.md.
//
// `dispatch` is fire-and-forget from the UI's perspective: confirmation
// arrives through a state-store update or an emitted event log entry.

export interface CommandMetadata {
  readonly nonce: string;
  readonly issuedAtFrame: number;
  readonly originPlayerId: number;
}

export interface CommandEnvelope<TKind extends string = string> {
  readonly kind: TKind;
  readonly payload: unknown;
  readonly metadata: CommandMetadata;
}

export interface CommandBus {
  /** Dispatches a command. Validation is performed inside the engine; rejection surfaces as a `dispatcher-error` record. */
  dispatch(envelope: CommandEnvelope): void;

  /** Subscribes to dispatcher-side events (rejections, applied confirmations). Returns an unsubscribe function. */
  onDispatcherEvent(handler: (event: unknown) => void): () => void;
}
