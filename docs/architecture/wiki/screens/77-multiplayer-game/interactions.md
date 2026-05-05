# Screen 77: Multiplayer Game Status
## Interactions

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Toggle Visibility
- Hotkey `M` (or click the multiplayer-status badge in the
  adventure-map status bar) toggles the overlay open / closed per
  [`ui-hotkeys.md`](../../../ui-hotkeys.md).
- Closing the overlay does NOT silence the underlying telemetry;
  the desync banner re-opens automatically when `desyncReport`
  becomes non-null.

### Per-Control Behavior

#### OpponentTurnIndicator
- **Default visual**: neutral spinner with copy "Waiting on
  opponent…".
- **Disabled**: when `opponentTurnState === 'disconnected'`, the
  spinner becomes a static "Disconnected" badge and yields to
  the disconnect-forfeit flow per
  [`06-...md`](../../../../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md).
- **Stalled (≥ `WAITING_THRESHOLD_MS`)**: amber pulse, copy
  "Opponent is taking longer than usual."
- **Auto-ended (≥ `STALL_LIMIT_MS`)**: copy "Day auto-ended."
  followed by the canonical envelope sequence; no user action
  required.

#### BuildAttestationBanner
- **Canonical**: green check, copy "Opponent bundle verified."
- **Mismatch (friendly)**: amber warning per
  [`build-attestation.md`](../../../build-attestation.md) § 5
  warning copy; the match continues.
- **Mismatch (ranked)**: red badge "Match aborted: build
  attestation mismatch." routes to the post-match summary; no
  user action required at the in-match overlay.
- **Click**: opens a side panel listing
  `bundleSha256`, `signedBy`, `validFrom`, `validUntil`.

#### MatchInfoPanel
- Read-only. Click on `matchId` copies it to the clipboard and
  displays a brief "Copied" toast.
- The `matchId` is safe to share for support purposes; per
  [`security-model.md`](../../../security-model.md), it does not
  expose any peer identity.

#### EnvelopeStatsPanel
- Read-only. Hovering each row shows a tooltip with the source
  doctrine link (`lockstep-envelope.md`,
  `command-stream-integrity.md`, `bisect-protocol.md`).
- A `macFailureCount > 0` immediately escalates to the
  desync-banner state and triggers the bisect.

#### DesyncBanner / BisectReportPanel
- **Clean**: collapsed banner reads "No divergence detected this
  match. Hash exchange OK at every turn."
- **Detected, bisect in progress**: amber spinner with copy
  "Verifying state divergence…"; not interactive.
- **Detected, bisect complete**: red panel showing
  `divergentPrefixIndex`, `divergentCommand.kind`,
  `attributedAbortPeer` (peer-hash digest, never raw `peerId`),
  `attributionConfidence`. The "View report" button opens a
  modal with the full report shape from
  [`bisect-protocol.md`](../../../bisect-protocol.md) § 5.
- **Quit Match button**: dispatches `LEAVE_MATCH` and routes to
  the post-match summary. Allowed only after the bisect
  completes (otherwise the bisect tool's offline tiebreaker is
  unavailable).
- **Continue button**: present only when the divergence is
  attributed to a transient packet-loss or a recoverable
  desync per
  [`06-...md`](../../../../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md);
  otherwise hidden.

#### MatchKeyDisplay (developer-mode only)
- Visible **only** when
  `state.developer.flags.showMatchKey === true`.
- "Reveal" button toggles the displayed `matchKey` and
  `handshakeNonces`. Both default to obscured.
- Per [`developer-mode.md`](../../../developer-mode.md), the
  developer-mode flag is `false` in production builds; the
  panel never renders for end users.

#### PostMatchAuditConsentPrompt
- Renders only on the post-match summary route, not in the
  in-match overlay.
- Two options: "Submit replay" / "No thanks" per
  [`replay-audit-pipeline.md`](../../../replay-audit-pipeline.md)
  § 1.
- Submission dispatches `SUBMIT_REPLAY_AUDIT` with the upload
  payload from the audit-pipeline contract.
- Disabled when no audit-pipeline endpoint is configured (M5
  default — the hosted service is Phase 4); copy reads "Replay
  audit not available in this build."

### Error Paths
- **Envelope MAC failure** (any one) → `TRUST_VIOLATION_DETECTED`
  per
  [`command-stream-integrity.md`](../../../command-stream-integrity.md)
  § 6 → desync banner shows red with copy "Match aborted:
  envelope tampering detected." Quit-match button is the only
  control.
- **Handshake abort** (any reason from
  [`match-handshake.md`](../../../match-handshake.md) § 5) →
  in-match overlay does not render; the user is routed back to
  the lobby with the abort reason surfaced via the trust banner.
- **Build-attestation mismatch in ranked** → the match never
  starts; this overlay is unreachable.

### Animation Gates
- All transitions respect the global reduced-motion preference
  per
  [`ui-input-arbitration.md`](../../../ui-input-arbitration.md).
- The amber stall pulse is suppressed in reduced-motion mode and
  replaced with a static color change.
