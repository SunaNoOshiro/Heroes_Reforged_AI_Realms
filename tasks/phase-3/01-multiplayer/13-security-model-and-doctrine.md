# Security Model and Doctrine

Status: planned

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Author and maintain the canonical security-model doctrine for the
M5 multiplayer module: the closed list of what symmetric input-only
lockstep protects, what it does not, the inherent limits of the
chosen netcode, the threat-model summary, and the product gating
that follows. Cross-link from [`CLAUDE.md`](../../../CLAUDE.md) so
new contributors and AI agents encounter the doctrine before
designing downstream features. Plan 26 § Critical Fix 5.

Read First:
- [`docs/architecture/security-model.md`](../../../docs/architecture/security-model.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/multiplayer-security.md`](../../../docs/architecture/multiplayer-security.md)
- [`docs/architecture/wiki/screens/77-multiplayer-game/spec.md`](../../../docs/architecture/wiki/screens/77-multiplayer-game/spec.md)

Inputs:
- Audit findings from
  `docs/readiness-audit/26-replay-tampering-and-simulation-cheating.md`.
- Existing multiplayer-security doctrine for cross-references.

Outputs:
- `docs/architecture/security-model.md` — canonical doctrine.
- `CLAUDE.md` cross-link in **Read first** and **Protect These
  Rules** sections.
- Cross-links from
  [`determinism.md`](../../../docs/architecture/determinism.md),
  [`pack-contract.md`](../../../docs/architecture/pack-contract.md),
  [`command-schema.md`](../../../docs/architecture/command-schema.md),
  and
  [`master-plan.md`](../../../docs/architecture/master-plan.md).
- Trust-banner copy on screen 77.

Owned Paths:
- `docs/architecture/security-model.md`

Dependencies:
- None

Acceptance Criteria:
- `security-model.md` enumerates the protections from § 1 and the
  inherent limits from § 2 of
  [`docs/architecture/security-model.md`](../../../docs/architecture/security-model.md)
  and matches every Plan 26 Critical Fix and Improvement to a row
  in § 3 (Mitigations).
- `CLAUDE.md` lists `security-model.md` in the **Read first**
  table and adds the "information secrecy is not provided by
  symmetric lockstep" rule to **Protect These Rules**.
- Every doctrine doc that touches the lockstep boundary
  (`lockstep-envelope.md`, `match-handshake.md`,
  `bisect-protocol.md`, `turn-timer.md`, `peer-reputation.md`,
  `replay-audit-pipeline.md`, `draft-preview-policy.md`,
  `build-attestation.md`, `spectator-mode-requirements.md`)
  cross-links back to `security-model.md`.
- The product-gating section (§ 4) explicitly names ranked /
  tournament / spectator / public-ladder modes as out of M5
  scope and points to the closed-beta surface as the M5 ceiling.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
