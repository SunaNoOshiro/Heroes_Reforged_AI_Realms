# Implementation Report: 18 — Room Codes & Lobby Discovery

> Plan: [`18-room-codes-and-lobby-discovery-plan.md`](./18-room-codes-and-lobby-discovery-plan.md).
> Audit: [`docs/readiness-audit/18-room-codes-and-lobby-discovery.md`](../readiness-audit/18-room-codes-and-lobby-discovery.md).

## Summary

This change converts every ❌ / ⚠ item under Q301–Q332 of the
audit into a contract document, a screen-package extension, or a
new task file. The signaling server now has a pinned room-code
contract, a CSPRNG mandate, three-tier rate limiting, a host
approval gate, a TURN-relay-only pre-consent ICE filter, a
peer-Ed25519 keypair model, a per-room kick denylist, a
display-name validator with NFC + reserved-name + UTS #39
confusable rules, an invite-URL fragment hygiene rule, a room
TTL + cool-down + `CLOSE_ROOM` lifecycle, and an audit-log policy
with PII redaction. Four new M5 tasks (13–16) carry the
implementation surface; the lobby screen package gains
`APPROVE_PEER` / `REJECT_PEER` / `KICK_PEER` / `MUTE_PEER` /
`REPORT_PEER` / `CLOSE_ROOM` actions plus the pending-peer modal
and the join-attempt toast.

## Updated files

- [`tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
  — replaced the "6-character alphanumeric" code description with
  a reference to `lobby-identifiers.md`; added the rate-limit,
  ICE-filter, TTL, cool-down, audit-log, and shared-ownership
  acceptance clauses; expanded the protocol-message list with
  `PEER_PENDING`, `APPROVE_PEER`, `REJECT_PEER`, `PEER_REJECTED`,
  `KICK_PEER`, `PEER_KICKED`, `JOIN_ATTEMPT_REJECTED`,
  `CLOSE_ROOM`, `ROOM_EXPIRED`, `ROOM_CLOSED`, `RATE_LIMITED`.
- [`tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md`](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md)
  — added the pre-consent `iceTransportPolicy: 'relay'` clause
  and the per-browser mDNS expectation reference.
- [`tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md`](../../tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md)
  — pinned the invite-URL fragment shape, the
  `Referrer-Policy: no-referrer` header, the `history.replaceState`
  scrub step, and the share-dialog clipboard-warning copy.
- [`tasks/phase-3/01-multiplayer.md`](../../tasks/phase-3/01-multiplayer.md)
  — registered Tasks 13–16; added the spectator-deferral
  cross-link to the network-lobby screen package and `DEF-002`.
- [`docs/architecture/determinism.md`](../architecture/determinism.md)
  — added the "Signaling and lobby identifiers — CSPRNG mandate"
  carve-out under "Forbidden In Deterministic Paths".
- [`docs/architecture/wiki/screens/64-network-lobby/spec.md`](../architecture/wiki/screens/64-network-lobby/spec.md)
  — added `PendingPeerModal`, `JoinAttemptToast`,
  `HostCloseRoomButton`, `PlayerSlotRowDotsMenu` to the component
  tree; added pending-peer / approval / denylist state bindings;
  added the "Out of M5 Scope" block.
- [`docs/architecture/wiki/screens/64-network-lobby/interactions.md`](../architecture/wiki/screens/64-network-lobby/interactions.md)
  — added approve / reject / kick / mute / report / close-room
  actions; pending-peer flow; join-attempt toast section; updated
  the error-surface table with the new actions and overrides.
- [`docs/architecture/wiki/screens/64-network-lobby/data-contracts.md`](../architecture/wiki/screens/64-network-lobby/data-contracts.md)
  — added `pendingPeers`, `peerApproval`, `peerDenylist`,
  `joinAttemptToast` selectors; added the display-name validator
  reference; added the server-side notification table.
- [`docs/architecture/wiki/screens/64-network-lobby/architecture.md`](../architecture/wiki/screens/64-network-lobby/architecture.md)
  — added the pending-peer sequence diagram and the moderation
  flow diagram.
- [`docs/architecture/wiki/screens/64-network-lobby/mockup.html`](../architecture/wiki/screens/64-network-lobby/mockup.html)
  — added the per-row dots affordance.
- [`docs/architecture/wiki/screens/62-multiplayer-setup/spec.md`](../architecture/wiki/screens/62-multiplayer-setup/spec.md)
  — pinned the `inviteUrl` fragment shape, `Referrer-Policy`,
  `history.replaceState`, and the share-dialog QR + clipboard
  warning rule; added the `contentCompatibilityHash` "never via
  signaling" note.
- [`docs/architecture/screen-command-coverage.json`](../architecture/screen-command-coverage.json)
  — registered the new lobby commands and signaling events under
  `outOfScope`.
- [`docs/architecture/task-command-token-coverage.json`](../architecture/task-command-token-coverage.json)
  — registered the new signaling event tokens under
  `eventOnlyTokens` and the lobby command tokens under
  `documentedNonCommandTokens`.
- [`content-schema/examples/ui-component-registry.example.json`](../../content-schema/examples/ui-component-registry.example.json)
  — registered `HostCloseRoomButton`, `JoinAttemptToast`,
  `PendingPeerModal`, `PlayerSlotRowDotsMenu`.

## New files

### Architecture contracts

- [`docs/architecture/lobby-identifiers.md`](../architecture/lobby-identifiers.md)
  — canonical room-code contract: 8-character Crockford-Base32
  alphabet (30 symbols), CSPRNG mandate, NFC + uppercase
  normalization, 5-retry collision policy, 10-minute reuse
  cool-down, idle / max-lifetime TTL bounds, host-initiated
  `CLOSE_ROOM`.
- [`docs/architecture/signaling-rate-limits.md`](../architecture/signaling-rate-limits.md)
  — token-bucket table for per-IP `JOIN_ROOM`, per-IP
  `CREATE_ROOM`, per-code failed `JOIN_ROOM`, and the global
  rolling-window failure counter; `RATE_LIMITED` reply shape;
  `/healthz` counter shape.
- [`docs/architecture/signaling-payload-policy.md`](../architecture/signaling-payload-policy.md)
  — allow / deny list for signaling-server payloads; lint-rule
  pointer that rejects display-name / chat / content-hash
  references in `services/signaling/`.
- [`docs/architecture/signaling-audit-log.md`](../architecture/signaling-audit-log.md)
  — always-logged events, never-logged values, `/24` + sha256 +
  daily-salt IP redaction rule, 7-day retention, sample log
  lines, escalation thresholds, local `REPORT_PEER` log shape.
- [`docs/architecture/ice-disclosure-policy.md`](../architecture/ice-disclosure-policy.md)
  — pre-consent vs. post-consent ICE candidate matrix;
  server-side `typ relay`-only filter; client-side
  `iceTransportPolicy: 'relay'` belt-and-braces rule; per-browser
  mDNS expectation table.
- [`docs/architecture/peer-identity.md`](../architecture/peer-identity.md)
  — Ed25519 keypair lifecycle; profile schema integration;
  `JOIN_ROOM` envelope with signature; per-room `peerDenylist`
  shape; M5 no-rotation rule.
- [`docs/architecture/display-name-policy.md`](../architecture/display-name-policy.md)
  — NFC pipeline; 1–24 grapheme bound; Cf / Cc / Co / zero-width
  / bidi rejection; reserved-name list; UTS #39 confusable
  collision check; rejection reasons with localization keys;
  test vectors.

### Tasks

- [`tasks/phase-3/01-multiplayer/13-signaling-rate-limiting.md`](../../tasks/phase-3/01-multiplayer/13-signaling-rate-limiting.md)
  — implements the three-tier token-bucket throttle; shares
  `services/signaling/src/server.ts` with Task 01 additively.
- [`tasks/phase-3/01-multiplayer/14-host-approval-and-moderation.md`](../../tasks/phase-3/01-multiplayer/14-host-approval-and-moderation.md)
  — implements the pending-peer queue, host approval, kick,
  pre-consent ICE filter, and the lobby's `PendingPeerModal`.
- [`tasks/phase-3/01-multiplayer/15-display-name-validation.md`](../../tasks/phase-3/01-multiplayer/15-display-name-validation.md)
  — implements the pure `validateDisplayName(...)` helper and
  wires it into the multiplayer-setup form and lobby chat send
  path.
- [`tasks/phase-3/01-multiplayer/16-peer-keypair-and-denylist.md`](../../tasks/phase-3/01-multiplayer/16-peer-keypair-and-denylist.md)
  — implements the Ed25519 keypair mint / load / sign / verify
  flow and the `PeerDenylist` class.

## Assumptions

- ⚠ Assumption: the plan calls for new tasks numbered `09`–`12`,
  but those filenames are already used by existing tasks
  (`09-snapshot-resync-fallback.md` …
  `12-network-chaos-harness.md`). The simplest non-destructive
  option is to keep the plan's intent (new tasks come after the
  existing 12) and renumber the four new files to `13`–`16`.
  All cross-references in this change use the renumbered IDs;
  the source plan file is unmodified per the rules.

## Blockers

None.

## Validation

- `npm run validate` — all gates pass (links, contracts,
  cross-refs, commands, tasks, arch, ui-components,
  animation-budgets, enums, balance, error-codes, provenance,
  runtime-requirements, deferred, diagram-task-parity, error-ux,
  asset-index drift).
- `npm run all` — additionally regenerates the architecture
  wiki (now lists the seven new contract docs in the sidebar)
  and the task-system report.
- `npm test` — 32 / 32 pass.

## Commit message

```
docs: lobby-discovery contracts (plan 18) — codes, ICE, identity, moderation

Convert the 18 room-codes-and-lobby-discovery plan into seven new
docs/architecture/ contracts (lobby-identifiers, signaling-rate-limits,
signaling-payload-policy, signaling-audit-log, ice-disclosure-policy,
peer-identity, display-name-policy), four new M5 tasks (13-16) for rate
limiting / host approval + moderation / display-name validation /
Ed25519 peer keypair, and a network-lobby screen-package extension
adding APPROVE_PEER / REJECT_PEER / KICK_PEER / MUTE_PEER / REPORT_PEER /
CLOSE_ROOM actions plus the pending-peer modal and join-attempt toast.
Pins invite-URL fragment shape and Referrer-Policy: no-referrer in
Task 08, registers the four new lobby UI components, and adds a
CSPRNG carve-out to determinism.md so signaling identifiers are
explicitly outside the engine PRNG.
```
