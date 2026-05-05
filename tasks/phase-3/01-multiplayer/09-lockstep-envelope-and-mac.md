# Lockstep Envelope and Per-Match MAC

Status: planned

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Author the canonical wire-envelope contract used by every M5
lockstep DataChannel payload (in-game commands, bisect midpoints,
per-turn hash exchanges). The envelope wraps each payload with
`{ matchId, matchEpoch, seq, playerId, turn, command, mac }` and
authenticates it with HMAC-SHA-256 keyed by the per-match
`matchKey` derived in
[`match-handshake.md`](../../../docs/architecture/match-handshake.md).
Plan 26 § Critical Fix 1.

Read First:
- [`docs/architecture/lockstep-envelope.md`](../../../docs/architecture/lockstep-envelope.md)
- [`docs/architecture/security-model.md`](../../../docs/architecture/security-model.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/command-stream-integrity.md`](../../../docs/architecture/command-stream-integrity.md)
- [`content-schema/schemas/lockstep-envelope.schema.json`](../../../content-schema/schemas/lockstep-envelope.schema.json)

Inputs:
- `matchKey` from the match handshake (Task 10).
- `command.schema.json` for inner-record validation.

Outputs:
- `content-schema/schemas/lockstep-envelope.schema.json` —
  authoritative wire-shape with strict `additionalProperties: false`.
- `content-schema/examples/lockstep-envelope/*.json` — canonical
  example fixtures (move-hero, end-day, cast-spell, bisect-midpoint).
- `src/net/lockstep/envelope.ts` — `wrap(matchKey, inner) → Envelope`,
  `unwrap(matchKey, raw) → { ok, inner } | { ok: false, reason }`.
- `src/net/lockstep/mac.ts` — HMAC-SHA-256 sign / verify primitive
  using `globalThis.crypto.subtle.sign('HMAC', …)` only; constant-time
  comparison.
- Schema-shape validation of every example fixture is provided by
  the existing repo-contracts gate (`npm run validate:contracts`)
  via the `.lockstep-envelope.json` suffix mapping in
  `scripts/check-repo-contracts.mjs`. The owning task adds
  per-implementation golden tests under `src/net/lockstep/__tests__/`
  for the canonical-JSON round-trip and the positive / negative
  MAC cases.

Owned Paths:
- `content-schema/schemas/lockstep-envelope.schema.json`
- `content-schema/examples/lockstep-envelope/`
- `src/net/lockstep/envelope.ts`
- `src/net/lockstep/mac.ts`
- `docs/architecture/lockstep-envelope.md`

Dependencies:
- phase-3.01-multiplayer.10-match-handshake-protocol
- phase-3.01-multiplayer.13-security-model-and-doctrine

Acceptance Criteria:
- `lockstep-envelope.schema.json` schema-validates every example
  fixture under `content-schema/examples/lockstep-envelope/`.
- Canonical-JSON round-trip test: `wrap(unwrap(payload))` is
  byte-identical to the original payload, with `mac` excluded
  from the canonical-JSON input.
- Positive MAC golden test: a known `(matchKey, payload)` pair
  produces a known MAC byte string.
- Negative MAC golden test: tampering with any field in the
  envelope (`matchId`, `matchEpoch`, `seq`, `playerId`, `turn`,
  `command`) causes `unwrap` to return `{ ok: false, reason:
  'mac' }`.
- Cross-`matchKey` isolation test: a MAC produced under
  `matchKey_A` is rejected when verified with `matchKey_B`.
- `npm run validate:lockstep` runs all four golden classes and
  exits non-zero on any failure.

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
