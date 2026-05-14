# Screen 77: Multiplayer Game Status — Interactions

## Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

## 1. Overlay Visibility

- Hotkey `M` (or click the multiplayer-status badge in the
  adventure-map status bar) toggles the overlay open / closed per
  [`ui-hotkeys.md`](../../../ui-hotkeys.md) — see ⚠ Issues.
- Closing the overlay does NOT silence the underlying telemetry.
  The desync banner re-opens automatically when `desyncReport`
  becomes non-null.

## 2. Per-Control Behavior

### 2.1 `OpponentTurnIndicator`

| `opponentTurnState` | Visual / copy |
| --- | --- |
| `waiting` | Neutral spinner — "Waiting on opponent…". |
| `stalled` (≥ `waitingThresholdMs`) | Amber pulse — "Opponent is taking longer than usual." |
| `auto-ended` (≥ `stallLimitMs`) | "Day auto-ended." Canonical envelope is emitted by [`turn-timer.md`](../../../turn-timer.md); no user action required. |
| `disconnected` | Static "Disconnected" badge; yields to the disconnect-forfeit flow per [`06-reconnection-log-range-request-plus-replay.md`](../../../../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md). |

### 2.2 `BuildAttestationBanner`

| `buildAttestation.status` | Visual / behavior |
| --- | --- |
| `canonical` | Green check — "Opponent bundle verified." |
| `mismatch` in friendly | Amber warning per [`build-attestation.md` § 5](../../../build-attestation.md); match continues. |
| `mismatch` in ranked | Red badge "Match aborted: build attestation mismatch." Routes to the post-match summary; in-match overlay shows no actionable control. |

Click opens a side panel listing `bundleSha256`, `signedBy`,
`validFrom`, `validUntil`.

### 2.3 `MatchInfoPanel`

- Read-only. Clicking `matchId` copies it to the clipboard and
  briefly shows a "Copied" toast.
- The `matchId` is safe to share for support; per
  [`security-model.md`](../../../security-model.md) it exposes no
  peer identity.

### 2.4 `EnvelopeStatsPanel`

- Read-only. Hovering each row shows a tooltip with the source
  doctrine link
  ([`lockstep-envelope.md`](../../../lockstep-envelope.md),
  [`command-stream-integrity.md`](../../../command-stream-integrity.md),
  [`bisect-protocol.md`](../../../bisect-protocol.md)).
- `macFailureCount > 0` escalates immediately to the desync-banner
  state and triggers the bisect.

### 2.5 `DesyncBanner` / `BisectReportPanel`

| State | Behavior |
| --- | --- |
| Clean (`desyncReport == null`) | Collapsed banner — "No divergence detected this match. Hash exchange OK at every turn." |
| Detected, bisect in progress | Amber spinner — "Verifying state divergence…"; not interactive. |
| Detected, bisect complete | Red panel showing `divergentPrefixIndex`, `divergentCommand.kind`, `attributedPeer` (16-char peer-hash digest, never raw `peerId`), `attributionConfidence`. "View report" opens a modal with the full shape from [`bisect-protocol.md` § 5](../../../bisect-protocol.md). |

Buttons:

- **Quit Match** — dispatches `LEAVE_MATCH` and routes to the
  post-match summary. Allowed only after the bisect completes
  (otherwise the offline tiebreaker is unavailable).
- **Continue** — present only when divergence is attributed to
  transient packet loss or a recoverable desync per
  [`06-reconnection-log-range-request-plus-replay.md`](../../../../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md);
  otherwise hidden.

### 2.6 `MatchKeyDisplay` (developer-mode only)

- Visible only when `state.developer.flags.showMatchKey === true`.
- "Reveal" button toggles the displayed `matchKey` and
  `handshakeNonces`; both default to obscured.
- Per [`developer-mode.md`](../../../developer-mode.md) the
  developer-mode flag is `false` in production builds, so the panel
  never renders for end users.

### 2.7 `PostMatchAuditConsentPrompt`

- Renders only on the post-match summary route, never on the
  in-match overlay.
- Two options — "Submit replay" / "No thanks" — per
  [`replay-audit-pipeline.md` § 1](../../../replay-audit-pipeline.md).
- Submit dispatches `SUBMIT_REPLAY_AUDIT` with the
  [§ 2 upload payload](../../../replay-audit-pipeline.md).
- Disabled when no audit-pipeline endpoint is configured (M5
  default — the hosted service is Phase 4); copy reads "Replay
  audit not available in this build."

## 3. Error Paths

- **Envelope MAC failure** → `TRUST_VIOLATION_DETECTED` per
  [`command-stream-integrity.md` § 6](../../../command-stream-integrity.md)
  → desync banner turns red — "Match aborted: envelope tampering
  detected." Quit-match is the only control.
- **Handshake abort** (any reason from
  [`match-handshake.md` § 5](../../../match-handshake.md)) — the
  in-match overlay does not render; user is routed back to the
  lobby with the abort reason surfaced via the trust banner.
- **Build-attestation mismatch in ranked** — the match never starts;
  this overlay is unreachable.

## 4. Animation Gates

- Every transition respects the global reduced-motion preference per
  [`ui-input-arbitration.md`](../../../ui-input-arbitration.md).
- The amber stall pulse is suppressed in reduced-motion mode and
  replaced with a static color change.

---

## 🔍 Sync Check

- **UI: ✔** — Behaviors, copy strings, and `attributedPeer`
  references align with sibling [`spec.md`](./spec.md) and
  [`data-contracts.md`](./data-contracts.md). State enum
  (`waiting | stalled | auto-ended | disconnected`) matches
  [`turn-timer.md`](../../../turn-timer.md).
- **Schema: ✔** — Every referenced canonical doctrine
  ([`turn-timer.md`](../../../turn-timer.md),
  [`bisect-protocol.md`](../../../bisect-protocol.md),
  [`build-attestation.md`](../../../build-attestation.md),
  [`replay-audit-pipeline.md`](../../../replay-audit-pipeline.md))
  resolves, and the underlying schemas exist.
- **Tasks: ⚠** — Owning task
  [`phase-3.01-multiplayer.14-screen-multiplayer-game-status`](../../../../../tasks/phase-3/01-multiplayer/14-screen-multiplayer-game-status.md)
  reads-first this file. The dispatched commands (`LEAVE_MATCH`,
  `TOGGLE_MATCH_KEY_DISPLAY`, `SUBMIT_REPLAY_AUDIT`) are not declared
  in [`command-schema.md`](../../../command-schema.md). Detail in
  ⚠ Issues.

## ⚠ Issues

- **Hotkey `M` referenced but not registered.** § 1 gates the
  overlay on hotkey `M` per
  [`ui-hotkeys.md`](../../../ui-hotkeys.md), but
  [`hotkey/global-default.hotkey.json`](../../../../../content-schema/examples/records/hotkey/global-default.hotkey.json)
  has no `screen.multiplayer-game.*` entry. Per CLAUDE.md root
  contract on stable IDs, the owning task
  [`14-screen-multiplayer-game-status`](../../../../../tasks/phase-3/01-multiplayer/14-screen-multiplayer-game-status.md)
  must add the entry (see sibling [`spec.md` ⚠ Issues](./spec.md)
  for suggested values). Skill did not edit the hotkey record (Hard
  Prohibition D).
- **Dispatched commands undeclared in `command-schema.md`.**
  `LEAVE_MATCH` (§ 2.5), `SUBMIT_REPLAY_AUDIT` (§ 2.7), and the
  implicit `TOGGLE_MATCH_KEY_DISPLAY` (§ 2.6) are dispatched by this
  screen but have no entry in
  [`command-schema.md`](../../../command-schema.md). Already raised
  by sibling [`spec.md`](./spec.md) and
  [`data-contracts.md`](./data-contracts.md). Owners: tasks 14 and
  17. Skill did not edit `command-schema.md` (Hard Prohibition D).
- **Continue-button condition leans on a downstream task contract.**
  § 2.5 names
  [`06-reconnection-log-range-request-plus-replay`](../../../../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md)
  as the source of "transient packet loss / recoverable desync"
  classification, but the canonical taxonomy lives in
  [`bisect-protocol.md`](../../../bisect-protocol.md) §§ 4–5 (which
  only declares `high | low | ambiguous` attributionConfidence and
  the `unverifiable` outcome). Task 06 must pin a precise
  classification before this control can ship without ambiguity.
  Suggested values: surface Continue only when
  `attributionConfidence === 'low'` AND `outcome ===
  'recoverable'`, where `recoverable` is added to the bisect-report
  enum. Owner: tasks 05 / 06 jointly. Skill did not edit
  `bisect-protocol.md` (Hard Prohibition D).
