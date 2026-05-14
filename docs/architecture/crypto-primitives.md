# Crypto Primitives Reference

Single canonical table for every cryptographic primitive used in the
repo. Closes PI-6 (Single crypto-primitives reference). Each owner
doc carries a top-of-file pointer back to this table; this file is
the source of truth for **which** primitive is used **where** and
**why**, and never restates the per-surface protocol detail (that
lives in the owner doc).

## 1. Why one table

Every primitive choice has a rationale (speed, RFC mandate,
non-cryptographic vs tamper-evident, key-rotation cadence). Before
this table the rationale was scattered across seven owner docs, and
a contributor reading any one of them could not tell whether the
primitive was deliberate or accidental. Centralizing the rationale
here means each owner doc keeps the protocol detail and the table
keeps the algorithm choice — neither side restates the other.

## 2. Primitives

| Surface | Primitive | Why this primitive | Rotation | Owner doc |
|---|---|---|---|---|
| Asset bytes integrity | SHA-256 | Web Crypto–native, collision-resistant, content-addressable | n/a | [`pack-contract.md`](./pack-contract.md) |
| State hash | xxh64 | Per-frame budget; non-cryptographic — the state hash is a desync detector, not tamper-evidence | n/a | [`determinism.md`](./determinism.md) |
| Save MAC | HMAC-SHA-256 | Tamper-evident over the canonical save bytes | per-match | [`save-envelope-mac.md`](./save-envelope-mac.md) |
| TURN credentials | HMAC-SHA-1 | RFC 5766 mandate — TURN servers verify HMAC-SHA-1 by spec | 7 days | [`turn-credentials.md`](./turn-credentials.md) |
| Manifest digest | xxh64 over canonical-JSON | Binds inner SHA-256 asset hashes cheaply; canonical JSON keeps the digest stable across formatters | n/a | [`pack-signing.md`](./pack-signing.md) |
| DTLS fingerprint | SHA-256 | RFC 8122 floor — minimum mandated by current WebRTC stacks | session | [`dtls-fingerprint-pinning.md`](./dtls-fingerprint-pinning.md) |
| Pack signature | Ed25519 | Small, fast, well-supported by Web Crypto; deterministic signature output | per-key | [`pack-signing.md`](./pack-signing.md) |
| Lockstep MAC | HMAC-SHA-256 | Tamper-evident over the canonical envelope bytes | per-match | [`lockstep-envelope.md`](./lockstep-envelope.md) |

Rotation column legend:

- **n/a** — the primitive has no key (collision-resistant or
  non-cryptographic hash).
- **session** — rotates with each WebRTC session.
- **per-match** — keyed by a value derived during the match
  handshake, lifetime = match.
- **per-key** — rotates only when an operator issues a new key (no
  calendar cadence); see [`pack-signing.md` § 7](./pack-signing.md#7-key-rotation-policy).
- **7 days** — fixed calendar cadence; see
  [`turn-credentials.md` § 9](./turn-credentials.md#9-rotation)
  and
  [`services/multiplayer/turn-config.md`](../../services/multiplayer/turn-config.md#rotation-policy).

## 3. Discipline

- Adding a new cryptographic surface MUST add a row to this table
  and link the owner doc.
- Replacing a primitive MUST update the row, leave a one-line
  decision-log entry per
  [`docs/planning/decision-log.md`](../planning/decision-log.md),
  and update the owner doc's backlink.
- Mixing surfaces is forbidden: state hash is xxh64 by design (speed)
  and SHA-256 is reserved for asset / DTLS bytes (collision
  resistance / RFC mandate). The primitive choice is part of the
  contract, not a matter of taste.

## 4. Cross-link

- [`crypto-rules.md`](./crypto-rules.md) governs failure-collapse
  rules (every signature failure surfaces as `INVALID_SIGNATURE`)
  and the closed
  [`signature-error.schema.json`](../../content-schema/schemas/signature-error.schema.json)
  taxonomy. Read it alongside this table when implementing a new
  comparison call site.

---

## 🔍 Sync Check

- **UI: ✔** — Doc carries no UI surface; failure-collapse UI
  vocabulary is owned by
  [`crypto-rules.md` § 4](./crypto-rules.md#4-surfaces) and matches
  there.
- **Schema: ✔** — Only schema reference is
  [`signature-error.schema.json`](../../content-schema/schemas/signature-error.schema.json),
  cited indirectly via `crypto-rules.md`; row present in
  [`schema-matrix.md`](./schema-matrix.md) (`SignatureError`).
- **Tasks: ✔** — Task
  [`tasks/mvp/00-core-architecture/22-03-crypto-rules-and-signature-error.md`](../../tasks/mvp/00-core-architecture/22-03-crypto-rules-and-signature-error.md)
  owns the signature-error / comparison rules; no orphan tasks
  point at this table.

## ⚠ Issues

- **Backlink coverage is complete but not asserted by CI.** All
  eight owner docs (`pack-contract.md`, `determinism.md`,
  `save-envelope-mac.md`, `turn-credentials.md`, `pack-signing.md`,
  `dtls-fingerprint-pinning.md`, `lockstep-envelope.md`, plus
  `crypto-rules.md`) carry the prescribed top-of-file pointer back
  to this table. There is currently no CI gate that enforces this
  symmetry, so a future owner-doc rewrite could silently drop the
  backlink. Per the discipline rules in § 3, the gate would belong
  to a `validate:crypto-backlinks` script under `scripts/`. Skill
  did not add the gate (Hard Prohibition D — never edit
  cross-checked files).
