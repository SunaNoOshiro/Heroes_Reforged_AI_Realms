// Deny-list sync worker: subscribes to the signaling server's
// `(roomCode, peerId, expEpochSeconds)` revocation channel and
// pushes the revocation to the TURN provider so any in-flight
// allocation under the deny-listed credential is closed.
//
// Authoritative doctrine:
//   docs/architecture/turn-credentials.md § 7
//   services/turn/README.md § Deny-list flow
//
// Owning task:
//   tasks/phase-3/01-multiplayer/34-turn-server-hardening.md
//
// This file is the contract surface only. The actual `redis` /
// HTTP wiring is implemented by the owning task; runtime
// dependencies are declared in the task spec, not in this
// directory's package.json (none exists yet).

export interface DenyListEntry {
  /** Crockford-Base32 8-char room code. */
  readonly roomCode: string;
  /** UUID v4. */
  readonly peerId: string;
  /** Wall-clock epoch seconds at which the credential expires anyway. */
  readonly expEpochSeconds: number;
}

export interface DenyListProvider {
  /** Closes any active TURN allocation under the deny-listed credential. */
  revoke(entry: DenyListEntry): Promise<void>;
}

export interface DenyListSubscriber {
  /** Subscribes to the signaling deny-list channel; invokes `onEntry` per emission. */
  subscribe(onEntry: (entry: DenyListEntry) => Promise<void>): Promise<void>;
  /** Closes the subscription. Idempotent. */
  close(): Promise<void>;
}

/**
 * Wires a subscriber into a provider. The owning task implements
 * `RedisCotrunProvider` (self-hosted) and `CloudflareCallsProvider`
 * (managed); both conform to `DenyListProvider`.
 *
 * Failure semantics:
 * - Transient provider errors are retried with exponential
 *   back-off (1 s → 30 s, capped). The credential's TTL ceiling
 *   bounds the worst-case revocation lag at credential-TTL + 60 s.
 * - The subscriber is idempotent: re-subscribing re-issues all
 *   live entries; double-revocation is a no-op on both providers.
 */
export async function runDenyListSync(
  subscriber: DenyListSubscriber,
  provider: DenyListProvider
): Promise<void> {
  await subscriber.subscribe(async (entry) => {
    await provider.revoke(entry);
  });
}
