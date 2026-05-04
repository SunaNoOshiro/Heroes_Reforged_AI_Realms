// Net transport contract.
//
// Pinned by docs/architecture/net-transport.md. Both the production
// WebRTC transport and the deterministic test `NetSim` transport
// satisfy this interface.
//
// The contract is intentionally narrow: lockstep step exchange,
// bounded send queue, deterministic ordering, no wall-clock leaks.

export interface NetMessage {
  readonly fromPeerId: string;
  readonly step: number;
  readonly nonce: string;
  readonly payload: Uint8Array;
}

export interface NetTransport {
  /** Establishes a session with the named peer set. Resolves once all peers acknowledge. */
  connect(peers: readonly string[]): Promise<void>;

  /** Sends a payload tagged with the lockstep step counter. Bounded queue: throws if the queue would overflow. */
  send(step: number, nonce: string, payload: Uint8Array): void;

  /** Subscribes to inbound messages. Delivery is per-peer FIFO and per-step monotonic. */
  onMessage(handler: (message: NetMessage) => void): () => void;

  /** Cleanly tears down the session; resolves once all peers acknowledge. */
  disconnect(): Promise<void>;
}
