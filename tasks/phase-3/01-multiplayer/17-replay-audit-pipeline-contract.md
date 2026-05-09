# Replay Audit Pipeline Contract

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Pin the canonical contract for the post-match audit pipeline:
opt-in upload payload shape, retention semantics, anomaly
detection list, and the post-match consent prompt on screen 77.
The hosted ingestion service that consumes the upload is a
Phase-4 follow-up; M5 ships only the contract + the UI consent
surface, since no human will run the audit from a terminal —
the consumer is the future hosted service plus its admin UI.
System Improvements / Architecture / Post-match audit
pipeline.

Read First:
- [`docs/architecture/replay-audit-pipeline.md`](../../../docs/architecture/replay-audit-pipeline.md)
- [`docs/architecture/security-model.md`](../../../docs/architecture/security-model.md)
- [`docs/architecture/lockstep-envelope.md`](../../../docs/architecture/lockstep-envelope.md)
- [`docs/architecture/match-handshake.md`](../../../docs/architecture/match-handshake.md)

Inputs:
- Lockstep envelope MAC self-authentication from
  [Task 09](./09-lockstep-envelope-and-mac.md).
- Handshake nonce + matchKey derivation from
  [Task 10](./10-match-handshake-protocol.md).
- Post-match summary surface on screen 77.
- the retention semantics; the consent UX.

Outputs:
- `docs/architecture/replay-audit-pipeline.md` — canonical
  contract: upload payload shape, retention rules, anomaly list,
  Phase-4 hand-off statement.
- Post-match consent prompt on screen 77 per
  [`docs/architecture/wiki/screens/77-multiplayer-game/spec.md`](../../../docs/architecture/wiki/screens/77-multiplayer-game/spec.md)
  `PostMatchAuditConsentPrompt`.

Owned Paths:
- `docs/architecture/replay-audit-pipeline.md`

Dependencies:
- phase-3.01-multiplayer.13-security-model-and-doctrine
- phase-3.01-multiplayer.09-lockstep-envelope-and-mac
- phase-3.01-multiplayer.10-match-handshake-protocol

Acceptance Criteria:
- `replay-audit-pipeline.md` defines the upload payload shape
  with the privacy invariants from § 2 (no raw `peerId`, no
  `displayName`, no IP, no chat).
- The post-match opt-in prompt on screen 77 records consent and emits `SUBMIT_REPLAY_AUDIT` only when the prompt
  is accepted.
- The doctrine explicitly defers the consumer (hosted ingestion
  service + admin review UI) to Phase 4 and names no terminal /
  CLI surface in M5.
- Because the upload payload is self-authenticating via per-match
  HMAC, the future hosted service can re-verify any envelope
  offline without trusting the uploader.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
