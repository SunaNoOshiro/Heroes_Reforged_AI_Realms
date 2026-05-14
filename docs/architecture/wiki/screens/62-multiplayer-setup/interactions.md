# Screen 62: Multiplayer Setup
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Owns per-control behavior, command routing, guard preconditions,
disabled states, and error feedback for the multiplayer setup
screen.

### Animation Baseline
Every action below produces the same baseline feedback unless
explicitly overridden: player banners flip, ready seals stamp, the
content-hash lock glows on a successful guard, and Host / Join
opens the correct lobby route. The animation column is omitted
from the action table to avoid restating this on every row.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated |
| --- | --- | --- | --- | --- | --- |
| Set connection type | `mpSetup.connectionType` | local-ui | Current | `SET_MULTIPLAYER_CONNECTION_TYPE` | Sets `state.ui.multiplayer.connectionType`. |
| Edit slot | `mpSetup.editSlot` | local-ui | Current | `EDIT_MULTIPLAYER_SLOT` | Mutates one entry of `state.ui.multiplayer.playerSlots`. |
| Host | `mpSetup.host` | navigation | `64-network-lobby` or `63-hotseat-turn-handoff` | `HOST_MULTIPLAYER_SESSION` | Creates a session or hotseat game draft. Gated by [`MultiplayerConsentGate`](#multiplayer-consent-gate); blocked until `state.profile.consent.multiplayer.state === 'granted'`. |
| Join | `mpSetup.join` | navigation | `64-network-lobby` | `JOIN_MULTIPLAYER_SESSION` | Routes to the network lobby. Same `MultiplayerConsentGate` precondition as `Host`. |
| Back | `mpSetup.back` | navigation | `02-new-game-setup` | `CLOSE_MULTIPLAYER_SETUP` | Discards the draft. |

Token classification per
[`screen-command-coverage.json`](../../../screen-command-coverage.json):
`HOST_MULTIPLAYER_SESSION`, `JOIN_MULTIPLAYER_SESSION`, and
`SET_MULTIPLAYER_CONNECTION_TYPE` are out-of-scope tokens owned by
`phase-3.01-multiplayer`; `EDIT_MULTIPLAYER_SLOT` and
`CLOSE_MULTIPLAYER_SETUP` match the `EDIT_` / `CLOSE_` local-UI
prefixes.

### State Changes
- `state.ui.multiplayer.connectionType` updates on
  `SET_MULTIPLAYER_CONNECTION_TYPE` or local UI draft.
- `state.ui.multiplayer.playerSlots` updates on
  `EDIT_MULTIPLAYER_SLOT` or local UI draft.
- `state.ui.multiplayer.scenarioId` updates on the scenario-pick
  local UI draft.
- `state.ui.multiplayer.timer` updates on the timer-edit local UI
  draft.
- `selectors.multiplayer.contentCompatibilityHash` recomputes when
  the pack / ruleset set changes; exchanged over the WebRTC
  DataChannel after host approval per
  [`signaling-payload-policy.md`](../../../signaling-payload-policy.md).
- `state.net.statusThresholds` drives the Task 8 status-indicator
  state machine (thresholds in
  [Stall Threshold Behavior](#stall-threshold-behavior)).
- Hover, focus, selected row, open tab, target cursor, drag ghost,
  and animation frame stay outside deterministic gameplay state.

### Multiplayer Consent Gate
Per [`onboarding.md` § 2 Consent Scopes](../../../onboarding.md),
`Host` and `Join` are blocked until
`state.profile.consent.multiplayer.state === 'granted'`. Behavior:

1. `state === 'granted'` **and** `policyVersion` matches
   `onboarding.policyVersion` → proceed to the lobby route.
2. `state === 'unset'` → dispatch
   `REQUEST_CONSENT_PROMPT('multiplayer')` and route through
   [`76-onboarding-consent`](../76-onboarding-consent/). On grant
   the user must re-trigger the original action; the runtime does
   **not** auto-retry.
3. `state === 'denied'` (e.g. `under13` profile) → `Host` / `Join`
   render disabled with localized reason
   `consent.multiplayer.denied.body`. The user can change the age
   gate from the Privacy tab in [`56-options`](../56-options/).
4. `state === 'revoked'` **or** stale `policyVersion` → re-prompt
   via the same path as `unset`.

Disclosure copy lives under `consent.multiplayer.ipDisclosure` in
[`localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json).
The runtime **must not** instantiate `RTCPeerConnection` or open
the WebSocket signaling channel before the gate is satisfied. The
gate is implemented by
[`phase-3.01-multiplayer.23-multiplayer-consent-and-trust-display`](../../../../../tasks/phase-3/01-multiplayer/23-multiplayer-consent-and-trust-display.md).

### Stall Threshold Behavior
Driven by `state.net.statusThresholds` (Task 8) and the same
`INPUT_DELAY_BUDGETS` constants the lobby consumes:

| Elapsed since expected response | Indicator | UI |
| --- | --- | --- |
| 0 – 2 s | green | "your turn" badge unchanged. |
| 2 – 10 s | yellow | badge swaps to "waiting on opponent". |
| 10 – 30 s | red | overlay shows last-seen turn. |
| 30 s+ | red | overlay reveals "wait" / "request resync" buttons. |
| 120 s+ | red | overlay reveals "forfeit" button (reconnect window per [Task 6](../../../../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md)). |

### Navigation Outcomes
- `Host` → `64-network-lobby` (online / LAN / direct) or
  `63-hotseat-turn-handoff` (hotseat), after guard approval and
  exit animation.
- `Join` → `64-network-lobby`, after guard approval and exit
  animation.
- `Back` → `02-new-game-setup`, after guard approval and exit
  animation.

### Disabled And Error Cases
- Controls disable when required selectors, registry records,
  resource costs, target legality, ownership, phase, or route
  guards fail.
- Missing presentation assets may use resolver fallback. Missing
  gameplay records, invalid content IDs, or rejected commands
  fail loudly per
  [`fail-loud.md`](../../../fail-loud.md).
- On rejection: keep the screen open, preserve a useful local
  draft, show localized error text, play failure feedback.
- All error toast text is produced by `formatUserError(err, locale)`
  declared in [`error-formatter.md`](../../../error-formatter.md);
  never construct error text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- [`spec.md`](./spec.md) owns static regions and state bindings.
- [`architecture.md`](./architecture.md) diagrams mirror these
  interactions — they never introduce new behavior.

---

## 🔍 Sync Check

- **UI: ✔** — Action IDs `mpSetup.host` and `mpSetup.join` match the `data-action` attributes in `mockup.html`; share / invite-URL shape and clipboard-warning key match [`spec.md` § Share Dialog](./spec.md#share-dialog) and the owning task [`phase-3.01-multiplayer.08-multiplayer-ui-lobby-invite-link-in-game-status`](../../../../../tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md).
- **Schema: ✔** — Every command token resolves: `HOST_MULTIPLAYER_SESSION`, `JOIN_MULTIPLAYER_SESSION`, `SET_MULTIPLAYER_CONNECTION_TYPE` are explicit out-of-scope in [`screen-command-coverage.json`](../../../screen-command-coverage.json) (owned by `phase-3.01-multiplayer`); `EDIT_MULTIPLAYER_SLOT` and `CLOSE_MULTIPLAYER_SETUP` ride the `EDIT_` / `CLOSE_` local-UI prefixes; `REQUEST_CONSENT_PROMPT` is enumerated in [`command-schema.md` § Consent, Onboarding & Destructive-UX Commands](../../../command-schema.md#consent-onboarding--destructive-ux-commands).
- **Tasks: ✔** — Stall-threshold table matches the [Task 8](../../../../../tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md) "Stall Thresholds" block; consent gate is owned by [Task 23](../../../../../tasks/phase-3/01-multiplayer/23-multiplayer-consent-and-trust-display.md); sibling [`spec.md`](./spec.md), [`data-contracts.md`](./data-contracts.md), and [`architecture.md`](./architecture.md) — aligned.

## ⚠ Issues

_None._
