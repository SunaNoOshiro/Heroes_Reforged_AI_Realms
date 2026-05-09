# Screen 77: Multiplayer Game Status
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `lockstep-envelope.schema.json` | Wire envelope shape; envelope-stats panel reads `macFailureCount`, `duplicateSeqDrops`. | `content-schema/schemas/lockstep-envelope.schema.json` |
| `match-handshake.schema.json` | Handshake phases; build-attestation banner reads the agreed `bundleSha256` / `signedBy`. | `content-schema/schemas/match-handshake.schema.json` |
| `command.schema.json` | Inner command shapes inside envelopes; bisect-report panel renders `divergentCommand.kind`. | `content-schema/schemas/command.schema.json` |
| `localization.schema.json` | UI labels: stall states, attestation banner copy, bisect report copy, trust-banner gating per [`security-model.md`](../../../security-model.md). | `content-schema/schemas/localization.schema.json` |
| `asset-index.schema.json` | Frame, badge, spinner, and pulse-animation atlases per [`atlas-pipeline.md`](../../../atlas-pipeline.md). | `content-schema/schemas/asset-index.schema.json` |
| `consent.schema.json` | Replay-audit consent record per [`replay-audit-pipeline.md`](../../../replay-audit-pipeline.md). | `content-schema/schemas/consent.schema.json` |
| `telemetry-event.schema.json` | `TURN_TIMER_*`, `LOCKSTEP_*`, `BISECT_*`, `BUILD_ATTESTATION_*` events. | `content-schema/schemas/telemetry-event.schema.json` |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `opponentTurnState` | `selectors.net.lockstep.opponentTurnState` | One of `waiting | stalled | auto-ended | disconnected` per [`turn-timer.md`](../../../turn-timer.md). |
| `msSinceLastInput` | `state.net.lockstep.opponent.msSinceLastInput` | Wall-clock-driven; presentation only. |
| `buildAttestation` | `selectors.net.lockstep.buildAttestation` | `{ status, signedBy, bundleSha256, validFrom, validUntil }` per [`build-attestation.md`](../../../build-attestation.md). |
| `matchInfo` | `selectors.net.lockstep.matchInfo` | `{ matchId, matchEpoch, currentTurn, lastAgreedHash }` per [`lockstep-envelope.md`](../../../lockstep-envelope.md). |
| `envelopeStats` | `selectors.net.lockstep.envelopeStats` | `{ macFailureCount, duplicateSeqDrops, preconditionRejects, lastBisectOutcome }`. |
| `desyncReport` | `state.net.lockstep.desyncReport` | Carries `attributedAbortPeer`, `attributionConfidence` per [`bisect-protocol.md`](../../../bisect-protocol.md). |
| `developerModeFlag` | `state.developer.flags.showMatchKey` | Per [`developer-mode.md`](../../../developer-mode.md). |
| `auditConsent` | `state.profile.consent.replayAudit.state` | Per the consent UX; informs the post-match prompt. |
| `trustBanner` | `selectors.net.lockstep.trustBanner` | Friendly / closed-beta gating copy per [`security-model.md`](../../../security-model.md) § 4. |

### Commands And Events
- `LEAVE_MATCH` from `multiplayerGame.bisectReport.quit`: dispatches the post-match exit.
- `TOGGLE_MATCH_KEY_DISPLAY` from `multiplayerGame.developerToggle`: developer-mode only.
- `SUBMIT_REPLAY_AUDIT` from `multiplayerGame.auditConsent.submit`: post-match summary; payload per [`replay-audit-pipeline.md`](../../../replay-audit-pipeline.md) § 2.
- Telemetry events surfaced (read-only):
  - `TURN_TIMER_WAITING`, `TURN_TIMER_STALLED`, `TURN_TIMER_AUTO_END_DAY`
  - `LOCKSTEP_ENVELOPE_REJECTED`, `LOCKSTEP_MAC_REJECTED`, `LOCKSTEP_SEQ_REJECTED`
  - `COMMAND_REJECTED_PRECONDITION`
  - `BISECT_STARTED`, `BISECT_STEP`, `BISECT_COMPLETED`, `LOCKSTEP_BISECT_TIMEOUT`
  - `BUILD_ATTESTATION_VERIFIED`, `BUILD_ATTESTATION_MISMATCH`

### Config Keys
- `config.ui.locale`
- `config.developer.flags.showMatchKey` — per [`developer-mode.md`](../../../developer-mode.md)
- `config.multiplayer.attestationAllowListPath` — per [`build-attestation.md`](../../../build-attestation.md)

### Localization Keys
- `multiplayer.opponentTurn.waiting`
- `multiplayer.opponentTurn.stalled`
- `multiplayer.opponentTurn.autoEnded`
- `multiplayer.opponentTurn.disconnected`
- `multiplayer.buildAttestation.canonical`
- `multiplayer.buildAttestation.friendlyWarning`
- `multiplayer.buildAttestation.rankedReject`
- `multiplayer.bisect.clean`
- `multiplayer.bisect.inProgress`
- `multiplayer.bisect.complete`
- `multiplayer.bisect.attributionHigh`
- `multiplayer.bisect.attributionLow`
- `multiplayer.bisect.attributionAmbiguous`
- `multiplayer.envelope.macInvalid`
- `multiplayer.audit.consentPrompt`
- `multiplayer.audit.consentSubmit`
- `multiplayer.audit.consentDecline`
- `multiplayer.audit.unavailable`
- `multiplayer.trustBanner.friendly`
- `multiplayer.trustBanner.closedBeta`

### Save / Replay Fields
- The screen reads from the live-match selectors only; nothing
  is persisted into save records by this screen.
- Replay-audit consent is persisted; per-match
  consent is not remembered across matches.
