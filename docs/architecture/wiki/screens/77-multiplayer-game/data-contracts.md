# Screen 77: Multiplayer Game Status — Data Contracts

## Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

## 1. Schemas And Registries

| Schema / Registry | Used For |
| --- | --- |
| [`lockstep-envelope.schema.json`](../../../../../content-schema/schemas/lockstep-envelope.schema.json) | Wire envelope shape; `EnvelopeStatsPanel` reads `macFailureCount`, `duplicateSeqDrops`. |
| [`match-handshake.schema.json`](../../../../../content-schema/schemas/match-handshake.schema.json) | Handshake phases; `BuildAttestationBanner` reads the agreed `bundleSha256` / `signedBy`. |
| [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) | Inner command shapes inside envelopes; `BisectReportPanel` renders `divergentCommand.kind`. |
| [`localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) | All UI strings (§ 5). |
| [`asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) | Frame, badge, spinner, and pulse atlases per [`atlas-pipeline.md`](../../../atlas-pipeline.md). |
| [`consent.schema.json`](../../../../../content-schema/schemas/consent.schema.json) | Replay-audit consent record per [`replay-audit-pipeline.md`](../../../replay-audit-pipeline.md) — see ⚠ Issues. |
| [`telemetry-event.schema.json`](../../../../../content-schema/schemas/telemetry-event.schema.json) | `TURN_TIMER_*`, `LOCKSTEP_*`, `BISECT_*`, `BUILD_ATTESTATION_*` events — see ⚠ Issues. |

## 2. Runtime State Selectors

| UI element | Selector / state path | Notes |
| --- | --- | --- |
| `opponentTurnState` | `selectors.net.lockstep.opponentTurnState` | `waiting | stalled | auto-ended | disconnected` per [`turn-timer.md`](../../../turn-timer.md). |
| `msSinceLastInput` | `state.net.lockstep.opponent.msSinceLastInput` | Wall-clock-driven; presentation only. |
| `buildAttestation` | `selectors.net.lockstep.buildAttestation` | `{ status, signedBy, bundleSha256, validFrom, validUntil }` per [`build-attestation.md`](../../../build-attestation.md). |
| `matchInfo` | `selectors.net.lockstep.matchInfo` | `{ matchId, matchEpoch, currentTurn, lastAgreedHash }` per [`lockstep-envelope.md`](../../../lockstep-envelope.md). |
| `envelopeStats` | `selectors.net.lockstep.envelopeStats` | `{ macFailureCount, duplicateSeqDrops, preconditionRejects, lastBisectOutcome }`. |
| `desyncReport` | `state.net.lockstep.desyncReport` | Carries `attributedPeer`, `attributionConfidence`, `divergentPrefixIndex`, `divergentCommand` per [`bisect-protocol.md` § 5](../../../bisect-protocol.md). |
| `developerModeFlag` | `state.developer.flags.showMatchKey` | Per [`developer-mode.md`](../../../developer-mode.md) — see ⚠ Issues. |
| `auditConsent` | `state.profile.consent.replayAudit.state` | Drives the post-match prompt — see ⚠ Issues. |
| `trustBanner` | `selectors.net.lockstep.trustBanner` | Friendly / closed-beta gating copy per [`security-model.md` § 4](../../../security-model.md). |

## 3. Commands And Events

Dispatched commands:

| Command | Dispatched from | Notes |
| --- | --- | --- |
| `LEAVE_MATCH` | `multiplayerGame.bisectReport.quit` | Post-match exit. |
| `TOGGLE_MATCH_KEY_DISPLAY` | `multiplayerGame.developerToggle` | Developer-mode only; local-UI toggle. |
| `SUBMIT_REPLAY_AUDIT` | `multiplayerGame.auditConsent.submit` | Post-match summary only; payload per [`replay-audit-pipeline.md` § 2](../../../replay-audit-pipeline.md). |

None of these are defined in
[`command-schema.md`](../../../command-schema.md) — see ⚠ Issues.

Telemetry events surfaced (read-only):

- Turn timer: `TURN_TIMER_WAITING`, `TURN_TIMER_STALLED`,
  `TURN_TIMER_AUTO_END_DAY` per [`turn-timer.md` § 5](../../../turn-timer.md).
- Envelope: `LOCKSTEP_ENVELOPE_REJECTED`, `LOCKSTEP_MAC_REJECTED`,
  `LOCKSTEP_SEQ_REJECTED`, `COMMAND_REJECTED_PRECONDITION` per
  [`lockstep-envelope.md` § 5](../../../lockstep-envelope.md).
- Bisect: `BISECT_STARTED`, `BISECT_STEP`, `BISECT_COMPLETED`,
  `LOCKSTEP_BISECT_TIMEOUT` per
  [`bisect-protocol.md` § 4](../../../bisect-protocol.md).
- Build attestation: `BUILD_ATTESTATION_VERIFIED`,
  `BUILD_ATTESTATION_MISMATCH` per
  [`build-attestation.md` § 4](../../../build-attestation.md).

## 4. Config Keys

- `config.ui.locale`
- `config.developer.flags.showMatchKey` per
  [`developer-mode.md`](../../../developer-mode.md) — see ⚠ Issues.
- `config.multiplayer.attestationAllowListPath` per
  [`build-attestation.md`](../../../build-attestation.md).

## 5. Localization Keys

Opponent turn:
`multiplayer.opponentTurn.waiting`,
`multiplayer.opponentTurn.stalled`,
`multiplayer.opponentTurn.autoEnded`,
`multiplayer.opponentTurn.disconnected`.

Build attestation:
`multiplayer.buildAttestation.canonical`,
`multiplayer.buildAttestation.friendlyWarning`,
`multiplayer.buildAttestation.rankedReject`.

Bisect / desync:
`multiplayer.bisect.clean`,
`multiplayer.bisect.inProgress`,
`multiplayer.bisect.complete`,
`multiplayer.bisect.attributionHigh`,
`multiplayer.bisect.attributionLow`,
`multiplayer.bisect.attributionAmbiguous`.

Envelope: `multiplayer.envelope.macInvalid`.

Replay audit:
`multiplayer.audit.consentPrompt`,
`multiplayer.audit.consentSubmit`,
`multiplayer.audit.consentDecline`,
`multiplayer.audit.unavailable`.

Trust banner:
`multiplayer.trustBanner.friendly`,
`multiplayer.trustBanner.closedBeta`.

## 6. Save / Replay Fields

- The screen reads live-match selectors only; no save record is
  written by this screen.
- Replay-audit consent is persisted to IndexedDB `hr-profile.consent`
  per
  [`consent.schema.json`](../../../../../content-schema/schemas/consent.schema.json);
  per-match opt-in is **not** remembered across matches per
  [`replay-audit-pipeline.md` § 1](../../../replay-audit-pipeline.md).

---

## 🔍 Sync Check

- **UI: ✔** — Every binding, command, and locale key listed here
  also appears in sibling [`spec.md`](./spec.md) and
  [`interactions.md`](./interactions.md). `attributedPeer` is now
  uniform across the package.
- **Schema: ⚠** — All seven referenced schemas exist. `ConsentScope`
  in
  [`consent.schema.json`](../../../../../content-schema/schemas/consent.schema.json)
  has no `replayAudit` value (binding § 2 / § 6 expects it).
  Telemetry-event `kind` strings (`TURN_TIMER_*`, `LOCKSTEP_*`,
  `BISECT_*`, `BUILD_ATTESTATION_*`) drift from the dotted-domain
  pattern enforced by
  [`telemetry-event.schema.json`](../../../../../content-schema/schemas/telemetry-event.schema.json).
- **Tasks: ⚠** — Owning task
  [`phase-3.01-multiplayer.14-screen-multiplayer-game-status`](../../../../../tasks/phase-3/01-multiplayer/14-screen-multiplayer-game-status.md)
  reads-first this file. The three dispatched commands are not
  declared in [`command-schema.md`](../../../command-schema.md);
  `TOGGLE_MATCH_KEY_DISPLAY` is absent from
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  altogether.

## ⚠ Issues

- **`replayAudit` not in `ConsentScope` enum.** § 2 binds
  `state.profile.consent.replayAudit.state`, but
  [`consent.schema.json`](../../../../../content-schema/schemas/consent.schema.json)
  defines `ConsentScope` as `storage | multiplayer | aiGeneration |
  telemetry | crashReports | analytics | unsignedPacks` — closed.
  Per [`enum-lifecycle-policy.md`](../../../enum-lifecycle-policy.md)
  the additive extension is owned by
  [`tasks/phase-3/01-multiplayer/17-replay-audit-pipeline-contract.md`](../../../../../tasks/phase-3/01-multiplayer/17-replay-audit-pipeline-contract.md);
  the row must land alongside an `enums.snapshot.json` regen. Skill
  did not edit the schema (Hard Prohibition D).
- **Three dispatched commands undeclared in `command-schema.md`.**
  `LEAVE_MATCH`, `TOGGLE_MATCH_KEY_DISPLAY`, and
  `SUBMIT_REPLAY_AUDIT` are dispatched by this screen but have no
  entry in [`command-schema.md`](../../../command-schema.md).
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  names tasks 14 (`LEAVE_MATCH`) and 17 (`SUBMIT_REPLAY_AUDIT`) as
  owners and omits `TOGGLE_MATCH_KEY_DISPLAY` entirely. Per
  CLAUDE.md root contract (every dispatched command must be defined
  or marked `runtime-only` / `local-ui`), all three need rows.
  Suggested classifications: `LEAVE_MATCH` → canonical;
  `TOGGLE_MATCH_KEY_DISPLAY` → `local-ui`; `SUBMIT_REPLAY_AUDIT` →
  `local-ui` (post-match dispatch). Skill did not edit
  `command-schema.md` (Hard Prohibition D).
- **Telemetry `kind` strings drift from the dotted-domain pattern.**
  [`telemetry-event.schema.json`](../../../../../content-schema/schemas/telemetry-event.schema.json)
  constrains `kind` to `^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$`. The
  uppercase + underscore labels listed in § 3 (`TURN_TIMER_*`,
  `LOCKSTEP_*`, `BISECT_*`, `BUILD_ATTESTATION_*`) violate that
  pattern, but the same labels are pinned by the canonical sibling
  docs (`turn-timer.md`, `lockstep-envelope.md`, `bisect-protocol.md`,
  `build-attestation.md`). Unilaterally rewriting only this file
  would split the canonical list. Owner:
  [`tasks/phase-2/11-observability/02-required-emissions-catalogue.md`](../../../../../tasks/phase-2/11-observability/02-required-emissions-catalogue.md)
  should pin a translation pass. Already raised by
  [`turn-timer.md` ⚠ Issues](../../../turn-timer.md). Suggested
  values: `multiplayer.turn_timer.waiting`,
  `multiplayer.lockstep.envelope_rejected`,
  `multiplayer.bisect.started`,
  `multiplayer.build_attestation.verified`. Skill kept the labels
  as-is (Hard Prohibition A).
- **`state.developer.flags.showMatchKey` and
  `config.developer.flags.showMatchKey` not declared in
  `developer-mode.md`.**
  [`developer-mode.md`](../../../developer-mode.md) owns `config.dev.*`
  only. Already raised by
  [`developer-mode.md` ⚠ Issues](../../../developer-mode.md). Owner:
  [`tasks/phase-3/01-multiplayer/14-screen-multiplayer-game-status.md`](../../../../../tasks/phase-3/01-multiplayer/14-screen-multiplayer-game-status.md)
  or a paired developer-mode amendment. Skill did not edit
  `developer-mode.md` (Hard Prohibition D).
- **Missing `data-inventory.md` row for
  `state.profile.consent.replayAudit`.**
  [`data-inventory.md`](../../../data-inventory.md) has no row for
  the replay-audit consent slice; per CLAUDE.md ("every persisted
  field is registered in `data-inventory.md`") the row must land
  before § 6 can ship. Suggested values: Field=`replay-audit
  consent`, State path=`state.profile.consent.replayAudit`,
  Medium=`IndexedDB (hr-profile.consent)`, Sensitivity=`low`,
  Retention=`until user-deleted`, Wipe scope=`WIPE_LOCAL_DATA
  scope=profile|all`. Owner: task 17. Skill did not edit
  `data-inventory.md` (Hard Prohibition D).
