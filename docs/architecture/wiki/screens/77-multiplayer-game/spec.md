# Screen 77: Multiplayer Game Status

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
In-match multiplayer status surface. Hosts the opponent-turn
indicator (waiting / stalled / auto-ended), the build-attestation
banner, the desync detection / bisect report panel, the envelope
statistics, and the developer-mode match-key display. Gives the
turn timer, the blame-attributed bisect, build attestation, and
peer reputation surfaces a UI home that previously did not exist
as a numbered screen package.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as
  implementation input.

### Visual Contract
- Curation status: `curated-pass-1`.
- Compact in-match overlay docked along the right edge of the
  adventure-map view; toggled by hotkey `M` (multiplayer status)
  per [`ui-hotkeys.md`](../../../ui-hotkeys.md).
- Uses the same blue-stone / gold frame as screen
  [`62-multiplayer-setup`](../62-multiplayer-setup/spec.md) for
  visual continuity.
- `mockup.html` contains visible UI only. Logic, transitions, and
  implementation notes live in Markdown package files.

### Component Tree
- MultiplayerGameStatus
  - OpponentTurnIndicator
  - BuildAttestationBanner
  - MatchInfoPanel
  - EnvelopeStatsPanel
  - DesyncBanner
  - BisectReportPanel
  - MatchKeyDisplay
  - PostMatchAuditConsentPrompt

The `MatchKeyDisplay` component renders only when
`state.developer.flags.showMatchKey` is true; the
`PostMatchAuditConsentPrompt` component renders only on the
post-match summary route.

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| opponentTurnState | `selectors.net.lockstep.opponentTurnState` | One of `waiting | stalled | auto-ended | disconnected`. Source: [`turn-timer.md`](../../../turn-timer.md). |
| msSinceLastInput | `state.net.lockstep.opponent.msSinceLastInput` | Wall-clock-driven; presentation only. |
| stallThresholdMs | `state.net.lockstep.thresholds.waitingThresholdMs` | From manifest `multiplayer.turnTimerMs.waitingThreshold`. |
| stallLimitMs | `state.net.lockstep.thresholds.stallLimitMs` | From manifest `multiplayer.turnTimerMs.stallLimit`. |
| buildAttestation | `selectors.net.lockstep.buildAttestation` | `{ status: 'canonical' | 'mismatch' | 'unknown', signedBy }`. Per [`build-attestation.md`](../../../build-attestation.md). |
| packSignaturePolicy | `state.net.handshake.signaturePolicy` | `optional | required-friendly | required-ranked` per [`pack-contract.md`](../../../pack-contract.md). |
| matchInfo | `selectors.net.lockstep.matchInfo` | `{ matchId, matchEpoch, currentTurn, lastAgreedHash }`. |
| envelopeStats | `selectors.net.lockstep.envelopeStats` | `{ macFailureCount, duplicateSeqDrops, preconditionRejects, lastBisectOutcome }`. Per [`lockstep-envelope.md`](../../../lockstep-envelope.md). |
| desyncReport | `state.net.lockstep.desyncReport` | Null while clean. Populated after bisect; carries `attributedAbortPeer`, `attributionConfidence`. Per [`bisect-protocol.md`](../../../bisect-protocol.md). |
| developerModeFlag | `state.developer.flags.showMatchKey` | Per [`developer-mode.md`](../../../developer-mode.md); developer-mode-only flag. |
| postMatchAuditConsent | `state.profile.consent.replayAudit.state` | Per the consent UX; `unset | granted | denied`. Source: [`replay-audit-pipeline.md`](../../../replay-audit-pipeline.md). |
| trustBanner | `selectors.net.lockstep.trustBanner` | Friendly / closed-beta gating copy per [`security-model.md`](../../../security-model.md) § 4. |

### Mechanics Mapping
- Surfaces M5 multiplayer trust state (turn timer, build
  attestation, envelope MAC failures, desync attribution) in a
  single overlay so contributors and players do not have to
  consult logs.
- Auto-`END_DAY { source: 'auto-timeout' }` is emitted by
  [`turn-timer.md`](../../../turn-timer.md); this screen displays
  the resulting state but does not own the dispatch path.
- All `attributedPeer` rendering uses peer-hash digests (16
  chars) per [`peer-reputation.md`](../../../peer-reputation.md);
  raw `peerId` is never rendered on screen.

### Animation Contract
- The opponent-turn indicator transitions
  `waiting → stalled → auto-ended` with a soft amber pulse
  starting at `WAITING_THRESHOLD_MS`.
- The bisect-report panel appears with a fade-in once `desyncReport`
  becomes non-null.
- Reduced-motion mode replaces pulses with static color changes.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control (hotkey, click,
  developer-mode toggle), next screen (post-match summary), state
  update (consent submission), animation, disabled case, and error
  path.
- Architecture file contains screen-specific diagrams: how the UI
  consumes telemetry from
  [`turn-timer.md`](../../../turn-timer.md),
  [`bisect-protocol.md`](../../../bisect-protocol.md), and
  [`lockstep-envelope.md`](../../../lockstep-envelope.md).
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay
  fields required to implement the screen, including the
  [`lockstep-envelope.schema.json`](../../../../../content-schema/schemas/lockstep-envelope.schema.json)
  and
  [`match-handshake.schema.json`](../../../../../content-schema/schemas/match-handshake.schema.json)
  references.
- Acceptance test:
  [`docs/architecture/wiki/screens/77-multiplayer-game/`](.) is
  exercised by the multiplayer in-match smoke test in
  [`tasks/phase-3/01-multiplayer/14-screen-multiplayer-game-status.md`](../../../../../tasks/phase-3/01-multiplayer/14-screen-multiplayer-game-status.md)
  acceptance criteria.

### Trust Banner Copy
Per [`security-model.md`](../../../security-model.md) § 4
product gating, the trust banner reads:

- **Friendly mode**: "Friendly match — no ladder consequence.
  Engine attestation: ✓ canonical. Pack signature: optional."
- **Closed beta**: "Closed beta match — ranked-style protections.
  Engine attestation required, pack signature required, opt-in
  replay-audit available at end of match."
- **Public ranked**: NOT delivered by M5 — this banner state is
  unreachable in the current build per
  [`security-model.md`](../../../security-model.md) § 4.

### AI Implementation Notes
- Screen slug: `multiplayer-game`; system group: `multiplayer`;
  curation marker: `curated-pass-1`.
- Build runtime components from the package contract, not from
  third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs /
  manifests; deterministic gameplay commands use stable IDs and
  scalar values.
- The `MatchKeyDisplay` component is gated by
  `state.developer.flags.showMatchKey` and MUST NOT render any
  raw `matchKey` bytes when the flag is off; the production
  build sets this flag to `false` by default per
  [`developer-mode.md`](../../../developer-mode.md).
