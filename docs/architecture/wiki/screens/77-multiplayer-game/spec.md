# Screen 77: Multiplayer Game Status

## Screen Package
- Mockup: `mockup.html`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

## 1. Description

In-match multiplayer trust-state overlay. Surfaces:

- opponent-turn state (`waiting | stalled | auto-ended | disconnected`),
- build attestation outcome,
- match identity + per-turn agreed hash,
- envelope statistics (MAC failures, sequence drops, precondition rejects),
- the desync banner / bisect report panel,
- the developer-mode `MatchKeyDisplay`,
- the post-match `PostMatchAuditConsentPrompt`.

It is the single UI home for the turn timer, the blame-attributed
bisect, build attestation, and peer-reputation surfaces.

## 2. Visual Contract

- Curation status: `curated-pass-1`.
- Compact overlay docked along the right edge of the adventure-map
  view; toggled by the multiplayer-status hotkey per
  [`ui-hotkeys.md`](../../../ui-hotkeys.md) — see ⚠ Issues.
- Reuses the blue-stone / gold frame of screen
  [`62-multiplayer-setup`](../62-multiplayer-setup/spec.md) for
  continuity.
- `mockup.html` carries visible UI only. Logic, transitions, and
  implementation notes live in the four sibling markdown files.
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as input.

## 3. Component Tree

- `MultiplayerGameStatus`
  - `OpponentTurnIndicator`
  - `BuildAttestationBanner`
  - `MatchInfoPanel`
  - `EnvelopeStatsPanel`
  - `DesyncBanner`
    - `BisectReportPanel` (renders only when `desyncReport != null`)
  - `MatchKeyDisplay` (developer-mode only)
  - `PostMatchAuditConsentPrompt` (post-match summary route only)

Gates:

- `MatchKeyDisplay` renders only when
  `state.developer.flags.showMatchKey === true`. In production
  builds the flag is `false` per
  [`developer-mode.md`](../../../developer-mode.md); the panel
  MUST NOT render raw `matchKey` bytes when the flag is off.
- `PostMatchAuditConsentPrompt` renders only on the post-match
  summary route, never in the in-match overlay.

## 4. State Bindings

| Element | Bound to | Notes |
| --- | --- | --- |
| `opponentTurnState` | `selectors.net.lockstep.opponentTurnState` | `waiting | stalled | auto-ended | disconnected` per [`turn-timer.md`](../../../turn-timer.md). |
| `msSinceLastInput` | `state.net.lockstep.opponent.msSinceLastInput` | Wall-clock-driven; presentation only. |
| `waitingThresholdMs` | `state.net.lockstep.thresholds.waitingThresholdMs` | From manifest `multiplayer.turnTimerMs.waitingThreshold` per [`turn-timer.md` § 3](../../../turn-timer.md). |
| `stallLimitMs` | `state.net.lockstep.thresholds.stallLimitMs` | From manifest `multiplayer.turnTimerMs.stallLimit`. |
| `buildAttestation` | `selectors.net.lockstep.buildAttestation` | `{ status: 'canonical' | 'mismatch' | 'unknown', signedBy, bundleSha256, validFrom, validUntil }` per [`build-attestation.md`](../../../build-attestation.md). |
| `packSignaturePolicy` | `state.net.handshake.signaturePolicy` | `optional | required-friendly | required-ranked` per [`pack-contract.md` § Signature Policy](../../../pack-contract.md). |
| `matchInfo` | `selectors.net.lockstep.matchInfo` | `{ matchId, matchEpoch, currentTurn, lastAgreedHash }` per [`lockstep-envelope.md`](../../../lockstep-envelope.md). |
| `envelopeStats` | `selectors.net.lockstep.envelopeStats` | `{ macFailureCount, duplicateSeqDrops, preconditionRejects, lastBisectOutcome }`. |
| `desyncReport` | `state.net.lockstep.desyncReport` | `null` while clean. Populated after bisect with `attributedPeer`, `attributionConfidence`, `divergentPrefixIndex`, `divergentCommand` per [`bisect-protocol.md` § 5](../../../bisect-protocol.md). |
| `developerModeFlag` | `state.developer.flags.showMatchKey` | Per [`developer-mode.md`](../../../developer-mode.md) — see ⚠ Issues. |
| `postMatchAuditConsent` | `state.profile.consent.replayAudit.state` | `unset | granted | denied` per [`replay-audit-pipeline.md`](../../../replay-audit-pipeline.md) — see ⚠ Issues. |
| `trustBanner` | `selectors.net.lockstep.trustBanner` | Friendly / closed-beta copy per [`security-model.md` § 4](../../../security-model.md). |

## 5. Mechanics Mapping

- Aggregates M5 multiplayer trust state (turn timer, build attestation,
  envelope MAC failures, desync attribution) into one overlay so
  contributors and players never have to read logs to triage a match.
- The auto-`END_DAY { source: 'auto-timeout' }` envelope is emitted by
  [`turn-timer.md`](../../../turn-timer.md). This screen displays the
  resulting state; it does not own the dispatch path.
- Every `attributedPeer` rendering uses a 16-char peer-hash digest per
  [`peer-reputation.md` § 2](../../../peer-reputation.md). Raw
  `peerId` is never rendered on screen.

## 6. Animation Contract

- `OpponentTurnIndicator` transitions `waiting → stalled → auto-ended`
  with a soft amber pulse starting at `waitingThresholdMs`.
- `BisectReportPanel` fades in once `desyncReport` becomes non-null.
- Reduced-motion mode replaces every pulse with a static color change
  per [`ui-input-arbitration.md`](../../../ui-input-arbitration.md).

## 7. Trust Banner Copy

Per [`security-model.md` § 4](../../../security-model.md):

- **Friendly mode**: "Friendly match — no ladder consequence. Engine
  attestation: ✓ canonical. Pack signature: optional."
- **Closed beta**: "Closed beta match — ranked-style protections.
  Engine attestation required, pack signature required, opt-in
  replay-audit available at end of match."
- **Public ranked**: not delivered by M5 — the banner state is
  unreachable in the current build per
  [`security-model.md` § 4](../../../security-model.md).

## 8. Acceptance Criteria

- Mockup is visually distinct from other screens and follows this
  package's internal visual direction.
- All visible regions and authoritative state bindings are pinned in
  this file.
- `interactions.md` covers every primary control (hotkey, click,
  developer-mode toggle), next screen (post-match summary), state
  update (consent submission), animation, disabled case, and error
  path.
- `architecture.md` carries screen-specific diagrams: telemetry
  consumption from [`turn-timer.md`](../../../turn-timer.md),
  [`bisect-protocol.md`](../../../bisect-protocol.md), and
  [`lockstep-envelope.md`](../../../lockstep-envelope.md).
- `data-contracts.md` identifies every schema, config key, locale
  key, asset, and save/replay field required, including
  [`lockstep-envelope.schema.json`](../../../../../content-schema/schemas/lockstep-envelope.schema.json)
  and
  [`match-handshake.schema.json`](../../../../../content-schema/schemas/match-handshake.schema.json).
- Smoke-tested by
  [`tasks/phase-3/01-multiplayer/14-screen-multiplayer-game-status.md`](../../../../../tasks/phase-3/01-multiplayer/14-screen-multiplayer-game-status.md).

## 9. AI Implementation Notes

- Slug: `multiplayer-game`; group: `multiplayer`; curation:
  `curated-pass-1`.
- Build runtime components from this package contract — never from
  third-party captures.
- Resolve presentation through asset IDs / manifests; deterministic
  gameplay uses stable IDs and scalar values.
- `MatchKeyDisplay` is gated by `state.developer.flags.showMatchKey`;
  the production build sets the flag to `false`.

---

## 🔍 Sync Check

- **UI: ✔** — Sibling [`interactions.md`](./interactions.md),
  [`data-contracts.md`](./data-contracts.md), and
  [`architecture.md`](./architecture.md) cover every component, copy
  string, and state binding listed here.
- **Schema: ⚠** — `state.profile.consent.replayAudit.state` binds an
  enum value (`replayAudit`) not present in
  [`consent.schema.json`](../../../../../content-schema/schemas/consent.schema.json)
  `ConsentScope`. Build-attestation, lockstep-envelope, match-handshake,
  and command schemas all match. Detail in ⚠ Issues.
- **Tasks: ⚠** — Owning task
  [`phase-3.01-multiplayer.14-screen-multiplayer-game-status`](../../../../../tasks/phase-3/01-multiplayer/14-screen-multiplayer-game-status.md)
  reads-first this file; registered under `multiplayer` group in
  [`docs/architecture/wiki/screens/index.json`](../index.json). The
  three dispatched commands (`LEAVE_MATCH`, `TOGGLE_MATCH_KEY_DISPLAY`,
  `SUBMIT_REPLAY_AUDIT`) are not yet defined in
  [`command-schema.md`](../../../command-schema.md). Detail in ⚠ Issues.

## ⚠ Issues

- **`attributedPeer` aligned to canonical doctrine.** Prior revisions
  named the `desyncReport` binding `attributedAbortPeer`. Every other
  canonical site
  ([`bisect-protocol.md` § 5](../../../bisect-protocol.md),
  [`replay-audit-pipeline.md` § 2](../../../replay-audit-pipeline.md),
  [`peer-reputation.md`](../../../peer-reputation.md)) calls the field
  `attributedPeer`, and this file's own § 5 already used the canonical
  name. Rewrote the binding row to match. No code change implied;
  flagged by [`bisect-protocol.md` ⚠ Issues](../../../bisect-protocol.md)
  before this audit.
- **Hotkey `M` is referenced but not registered.** § 2 and
  [`interactions.md`](./interactions.md) gate the overlay on a
  multiplayer-status hotkey "per
  [`ui-hotkeys.md`](../../../ui-hotkeys.md)", but
  [`hotkey/global-default.hotkey.json`](../../../../../content-schema/examples/records/hotkey/global-default.hotkey.json)
  has no `screen.multiplayer-game.toggle-overlay` entry. Per
  CLAUDE.md root contract on stable IDs, the owning task
  [`14-screen-multiplayer-game-status`](../../../../../tasks/phase-3/01-multiplayer/14-screen-multiplayer-game-status.md)
  must add the entry (suggested values:
  `id="screen.multiplayer-game.toggle-overlay"`,
  `defaultBinding="KeyM"`, `scope="screen"`,
  `screenId="77-multiplayer-game"`,
  `labelKey="ui.hotkeys.multiplayer.toggleOverlay"`,
  `rebindable=true`). Skill did not edit the hotkey record (Hard
  Prohibition D).
- **`state.developer.flags.showMatchKey` is not declared in
  `developer-mode.md`.** [`developer-mode.md`](../../../developer-mode.md)
  owns `config.dev.*` and does not yet describe a `state.developer.*`
  namespace, but this file (and sibling tasks 14 / 17 / interactions /
  data-contracts) gate `MatchKeyDisplay` on
  `state.developer.flags.showMatchKey`. Already raised by
  [`developer-mode.md` ⚠ Issues](../../../developer-mode.md). Owner:
  same task (or a paired developer-mode amendment). Skill did not
  edit `developer-mode.md` (Hard Prohibition D).
- **`replayAudit` not in `ConsentScope` enum.** § 4 binds
  `state.profile.consent.replayAudit.state`, but
  [`consent.schema.json`](../../../../../content-schema/schemas/consent.schema.json)
  defines `ConsentScope` as a closed enum of seven values without
  `replayAudit`. Per CLAUDE.md root contract on additive schema
  evolution (see
  [`enum-lifecycle-policy.md`](../../../enum-lifecycle-policy.md)),
  the value must be added by
  [`tasks/phase-3/01-multiplayer/17-replay-audit-pipeline-contract.md`](../../../../../tasks/phase-3/01-multiplayer/17-replay-audit-pipeline-contract.md)
  along with an `enums.snapshot.json` regen. Already raised by
  [`replay-audit-pipeline.md` ⚠ Issues](../../../replay-audit-pipeline.md);
  surfaced here because this screen is the consumer. Skill did not
  edit the schema (Hard Prohibition D).
- **Dispatched commands not declared in `command-schema.md`.** The
  sibling [`data-contracts.md`](./data-contracts.md) names
  `LEAVE_MATCH`, `TOGGLE_MATCH_KEY_DISPLAY`, and
  `SUBMIT_REPLAY_AUDIT` as dispatched from this screen.
  [`command-schema.md`](../../../command-schema.md) carries no entry
  for any of them.
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  names tasks 14 (`LEAVE_MATCH`) and 17 (`SUBMIT_REPLAY_AUDIT`) as
  owners but does not list `TOGGLE_MATCH_KEY_DISPLAY` at all. Per
  CLAUDE.md root contract (every dispatched command must be defined
  or correctly marked `runtime-only` / `local-ui`), all three need a
  command-schema row. Suggested classifications: `LEAVE_MATCH` →
  canonical (enters command log, ends match deterministically);
  `TOGGLE_MATCH_KEY_DISPLAY` → `local-ui` (developer-mode UI flag
  toggle, never wired);  `SUBMIT_REPLAY_AUDIT` → `local-ui`
  (post-match upload dispatch, fires after the match has ended).
  Owners: tasks 14 (`LEAVE_MATCH`, `TOGGLE_MATCH_KEY_DISPLAY`) and 17
  (`SUBMIT_REPLAY_AUDIT`). Skill did not edit `command-schema.md`
  (Hard Prohibition D).
- **No `data-inventory.md` row for
  `state.profile.consent.replayAudit`.** The consent record persists
  to IndexedDB `hr-profile.consent` per
  [`consent.schema.json`](../../../../../content-schema/schemas/consent.schema.json).
  Per CLAUDE.md root contract ("every persisted field is registered
  in `data-inventory.md`"), the row must land before this binding can
  ship. Owner: task 17. Already raised by
  [`replay-audit-pipeline.md` ⚠ Issues](../../../replay-audit-pipeline.md).
  Skill did not edit `data-inventory.md` (Hard Prohibition D).
