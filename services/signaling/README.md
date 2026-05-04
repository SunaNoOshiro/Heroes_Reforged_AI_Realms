# services/signaling

Optional multiplayer signaling service.

Runtime lockstep rules still belong to deterministic client or shared
simulation code. This service only helps peers discover each other and
exchange connection metadata.

## Operational contracts

- [`error-codes.md`](./error-codes.md) — closed wire-error vocabulary
  (`JOIN_FAILED` / `RATE_LIMITED` / `SERVER_ERROR`) and `OWNER_NOTICE`
  envelope.
- [`observability.md`](./observability.md) — log floor, retention TTLs,
  scrubbing rules for IPs / SDP / ICE / chat content.
