# Screen 62: Multiplayer Setup

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Multiplayer setup for hotseat, LAN/online lobby, player colors, teams, timers, map/scenario, and deterministic content lock.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-6`.
- Blue-stone lobby setup table with player color banners, connection type tabs, map preview, timer options, and Host/Join/Back buttons.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- MultiplayerSetup
  - ConnectionTypeTabs
  - PlayerSlotTable
  - MapPreview
  - TimerOptions
  - ContentHashLock
  - HostJoinButtons

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| connectionType | state.ui.multiplayer.connectionType | Hotseat, LAN, online, or direct. |
| playerSlots | state.ui.multiplayer.playerSlots | Player colors, teams, control type, ready flags. Capped at 2 for online (M5); N-peer mesh deferred to M7. |
| selectedScenario | state.ui.multiplayer.scenarioId | Scenario/map draft. |
| timerConfig | state.ui.multiplayer.timer | Turn timer draft. |
| contentHash | selectors.multiplayer.contentCompatibilityHash | Pack/ruleset compatibility hash. |
| statusThresholds | state.net.statusThresholds | Stall budgets — `{ softMs: 2000, hardMs: 10000, forfeitMs: 120000 }` — sourced from `INPUT_DELAY_BUDGETS` (`src/net/webrtc/constants.ts`). Drives Task 8's status indicator state machine. |
| inviteUrl | selectors.multiplayer.inviteUrl | Join URL of shape `https://<origin>/lobby#r=<code>&s=<secret>`. The code per [`lobby-identifiers.md`](../../../lobby-identifiers.md) and the secret per [`multiplayer-security.md` § Room Secret + Handshake](../../../multiplayer-security.md#room-secret--handshake) both ride the URL **fragment** to avoid `Referer`, browser history, and OS clipboard sync surfaces. The lobby page response sets `Referrer-Policy: no-referrer`; after the fragment is consumed, the client calls `history.replaceState(null, "", location.pathname)`. |
| contentCompatibilityHash | selectors.multiplayer.contentCompatibilityHash | Pack/ruleset compatibility hash. Exchanged on the WebRTC DataChannel **after** host approval; never traverses the signaling server (see [`signaling-payload-policy.md`](../../../signaling-payload-policy.md)). |

### Mechanics Mapping
- Creates a multiplayer setup draft, validates identical content hashes/ruleset, assigns player slots, and routes to hotseat handoff or network lobby.
- **Consent precondition.** `Host` and `Join` are blocked until
  `state.profile.consent.multiplayer.state === 'granted'` per
  [`onboarding.md`](../../../onboarding.md) and the
  [`MultiplayerConsentGate`](./interactions.md#multiplayer-consent-gate).
  The IP-exposure disclosure copy is `consent.multiplayer.ipDisclosure`
  in [`localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json).
  No `RTCPeerConnection` may be instantiated and no signaling WebSocket
  may be opened before the gate is satisfied.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Player banners flip, ready seals stamp, content hash lock glows, and Host/Join opens the correct lobby route.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### Share Dialog
- The host's "copy invite" affordance opens a share dialog that:
  1. Renders the URL exactly as built by `selectors.multiplayer.inviteUrl` (fragment-bearing).
  2. Renders a QR code that encodes the **full** URL including the fragment. QR is not subject to `Referer`, so this is the documented divergence from the fragment-only rule.
  3. Renders a one-line localized clipboard warning (`ui.network-lobby.copy.clipboardWarning`) noting the code may sync via OS clipboard surfaces (iCloud, KDE Connect, Google clipboard).

### AI Implementation Notes
- Screen slug: `multiplayer-setup`; system group: `multiplayer`; curation marker: `curated-pass-6`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
