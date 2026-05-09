# Crypto Primitives Reference

Single canonical table for every cryptographic primitive used in
the repo. Closes PI-6 (Single crypto-primitives
reference). Each owner doc carries a top-of-file pointer back to
this table.

## Why one table?

Every primitive choice has a rationale (speed, RFC mandate,
non-cryptographic vs tamper-evident, key-rotation cadence). Before
this table, the rationale lived in seven different docs and a new
contributor reading any single doc could not tell whether the
primitive was a deliberate choice or an accident. This table is
the source of truth; owner docs reference it.

## Primitives

| Surface | Primitive | Why this primitive | Rotation | Owner doc |
|---|---|---|---|---|
| Asset bytes integrity | SHA-256 | Web Crypto–native, collision-resistant, content-addressable | n/a | [`pack-contract.md`](./pack-contract.md) |
| State hash | xxh64 | speed (per-frame budget); non-cryptographic — state hash is a desync detector, not tamper-evidence | n/a | [`determinism.md`](./determinism.md) |
| Save MAC | HMAC-SHA-256 | tamper-evident over the canonical save bytes; per-match key | per match | [`save-envelope-mac.md`](./save-envelope-mac.md) |
| TURN credentials | HMAC-SHA-1 | RFC 5766 mandate — TURN servers verify HMAC-SHA-1 by spec | 7 days | [`turn-credentials.md`](./turn-credentials.md) |
| Manifest digest | xxh64 over canonical-JSON | binds inner SHA-256 asset hashes cheaply; canonical JSON keeps the digest stable across formatters | n/a | [`pack-signing.md`](./pack-signing.md) |
| DTLS fingerprint | SHA-256 | RFC 8122 floor — minimum mandated by current WebRTC stacks | session | [`dtls-fingerprint-pinning.md`](./dtls-fingerprint-pinning.md) |
| Pack signature | Ed25519 | small, fast, well-supported by Web Crypto; deterministic signature output | per-key | [`pack-signing.md`](./pack-signing.md) |
| Lockstep MAC | HMAC-SHA-256 | tamper-evident over the canonical envelope bytes; per-match | per-match | [`lockstep-envelope.md`](./lockstep-envelope.md) |

## Discipline

- Adding a new cryptographic surface MUST add a row to this table
  and link the owner doc.
- Replacing a primitive MUST update the row, leave a one-line
  decision-log entry per
  [`docs/planning/decision-log.md`](../planning/decision-log.md),
  and update the owner doc's backlink.
- Mixing the surfaces is forbidden: state hash is xxh64 by design
  (speed) and SHA-256 is reserved for asset / DTLS bytes (collision
  resistance / RFC mandate); the primitive choice is part of the
  contract, not a matter of taste.

## Cross-link

- [`crypto-rules.md`](./crypto-rules.md) governs failure-collapse
  rules (every signature failure surfaces as `INVALID_SIGNATURE`)
  and the closed `signature-error.schema.json` taxonomy. Read it
  alongside this table when implementing a new comparison call
  site.
