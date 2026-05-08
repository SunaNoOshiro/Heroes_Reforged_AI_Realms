# Peer-Failure UI Contract

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Add the peer-failure error contract to screen
[`64-network-lobby`](../../../docs/architecture/wiki/screens/64-network-lobby/):
the only fields rendered to UI on a peer-connection failure are
`peerLabel` (the display name the user already saw) and a closed
`peerFailureReason: 'TIMEOUT' | 'REFUSED' | 'NETWORK_ERROR' |
'PROTOCOL_MISMATCH'`. Peer IPs and ICE candidate addresses never
appear in any user-visible string and never appear in the on-device
crash log; the formatter's IP-pattern allowlist strips them. A
`__DEV__`-gated debug surface MAY render the raw candidate list.

Plan 22 § 3 — Peer-failure UI contract on network lobby.

Read First:
- [`docs/implementation-plans/22-privacy-retention-and-error-leaks-plan.md`](../../../docs/implementation-plans/22-privacy-retention-and-error-leaks-plan.md)
- [`docs/architecture/error-formatter.md`](../../../docs/architecture/error-formatter.md)
- [`docs/architecture/wiki/screens/64-network-lobby/`](../../../docs/architecture/wiki/screens/64-network-lobby/)
- [`docs/architecture/ice-disclosure-policy.md`](../../../docs/architecture/ice-disclosure-policy.md)

Inputs:
- The closed four-value `peerFailureReason` enum.
- Plan 22's redaction allowlist on `error-formatter.md`.

Outputs:
- Updates to the screen-64 package: `spec.md` (Peer-Failure Error
  Contract section), `interactions.md`, `data-contracts.md`.
- Acceptance criterion appended to
  [`tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md`](./02-webrtc-peer-connection-plus-datachannel-setup.md):
  "peer connection failures throw a structured error tagged
  `redact: true` carrying only `{ peerLabel, peerFailureReason }`."

Owned Paths:
- _(additive screen edits + dependent task acceptance edit only)_

Owned Paths (shared):
- `docs/architecture/wiki/screens/64-network-lobby/` is the
  **primary package** of the multiplayer task family; this task
  adds the peer-failure contract **additively** and does not
  rewrite the chat / lobby / ready-state rows.
- `tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md`
  is the **primary owner** of the peer-connection task; this task
  adds the redaction acceptance criterion **additively**.

Dependencies:
- mvp.00-core-architecture.22-01-error-formatter-contract
- phase-3.01-multiplayer.20-signaling-observability-and-error-vocabulary

Acceptance Criteria:
- The screen-64 spec declares the closed `peerFailureReason` enum
  and the IP-pattern redaction rule.
- The interactions doc adds the rule "peer-connection failures
  render only `peerLabel` and the closed reason; raw IPs / ICE
  addresses never reach UI or the on-device crash log."
- `npm run validate` passes.

Owned Paths (shared) acceptance:
- `docs/architecture/wiki/screens/64-network-lobby/` is **owned by**
  the multiplayer task family (the primary owner of the network
  lobby package). This task is **additive**: one new
  "Peer-Failure Error Contract" subsection is added to `spec.md`
  plus matching error-handling lines in `interactions.md` and
  `data-contracts.md`; the existing chat, ready-state, slot-list,
  approval-modal, and content-compatibility rules must not be
  rewritten.
- `tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md`
  is **owned by** task 02 (the primary owner of the WebRTC peer
  connection). This task is **additive**: one new acceptance
  criterion is appended requiring the structured-error tag; the
  existing data-channel setup, ICE-candidate handling, and
  connection-state-machine rules must not rewrite anything else.

Verify:
- npm run validate

Estimated Time:
- 3 hours
