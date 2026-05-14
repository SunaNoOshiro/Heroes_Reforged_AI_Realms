# Screen 62: Multiplayer Setup

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Pre-lobby setup for hotseat, LAN, online, and direct-connect games:
connection type, player slots (color, team, control, ready), turn
timer, scenario / map pick, and deterministic content-hash lock.
Resolves to `63-hotseat-turn-handoff` or `64-network-lobby` after
the guards in `interactions.md` accept.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as
  implementation input.

### Visual Contract
- Curation status: `curated-pass-6`.
- Blue-stone lobby table — player color banners, connection-type
  tabs, map preview, timer options, content-hash lock, Host / Join /
  Back.
- Dense classic fantasy strategy UI: fixed 800×600 layout, ornate
  gold frame, red / brown / stone panels, compact icon slots,
  right-click detail affordances, bottom status / resource feedback.
- `mockup.html` carries visible UI only. Logic, transitions, and
  implementation notes live in the Markdown package files.

### Component Tree
- `MultiplayerSetup`
  - `ConnectionTypeTabs`
  - `PlayerSlotTable`
  - `MapPreview`
  - `TimerOptions`
  - `ContentHashLock`
  - `HostJoinButtons`

### State Bindings
| Element | Bound to | Notes |
| --- | --- | --- |
| `connectionType` | `state.ui.multiplayer.connectionType` | `hotseat \| lan \| online \| direct`. |
| `playerSlots` | `state.ui.multiplayer.playerSlots` | Player color, team, control type, ready flag. Capped at 2 for online (M5); N-peer mesh deferred to M7 per `signaling-payload-policy.md` per-room cap. |
| `selectedScenario` | `state.ui.multiplayer.scenarioId` | Scenario / map draft. |
| `timerConfig` | `state.ui.multiplayer.timer` | Turn-timer draft. |
| `contentHash` | `selectors.multiplayer.contentCompatibilityHash` | Pack / ruleset compatibility hash. Exchanged on the WebRTC DataChannel **after** host approval; never traverses the signaling server (see [`signaling-payload-policy.md`](../../../signaling-payload-policy.md)). |
| `inviteUrl` | `selectors.multiplayer.inviteUrl` | `https://<origin>/lobby#r=<code>&s=<secret>`. Code per [`lobby-identifiers.md`](../../../lobby-identifiers.md); secret per [`multiplayer-security.md` § Room Secret + Handshake](../../../multiplayer-security.md#room-secret--handshake). Both ride the URL **fragment** to avoid `Referer`, browser history, and OS clipboard sync surfaces. Lobby page sets `Referrer-Policy: no-referrer`; after consumption the client calls `history.replaceState(null, "", location.pathname)`. |
| `statusThresholds` | `state.net.statusThresholds` | `{ softMs: 2000, hardMs: 10000, forfeitMs: 120000 }` from `INPUT_DELAY_BUDGETS` (`src/net/webrtc/constants.ts`). Drives the Task 8 status-indicator state machine. |

### Mechanics Mapping
- Builds a multiplayer setup draft, validates identical content
  hashes / rulesets, assigns player slots, and routes to
  `63-hotseat-turn-handoff` or `64-network-lobby`.
- **Consent precondition.** `Host` and `Join` are blocked until
  `state.profile.consent.multiplayer.state === 'granted'` per
  [`onboarding.md` § 2 Consent Scopes](../../../onboarding.md) and
  the [`MultiplayerConsentGate`](./interactions.md#multiplayer-consent-gate).
  The IP-exposure disclosure copy is `consent.multiplayer.ipDisclosure`
  in [`localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json).
  No `RTCPeerConnection` may be instantiated and no signaling
  WebSocket may be opened before the gate is satisfied.
- UI previews stay local until a listed command or route guard
  accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and
  objects resolve through registries / content schemas, not
  hardcoded view logic.

### Animation Contract
- Player banners flip, ready seals stamp, content-hash lock glows,
  Host / Join opens the correct lobby route.
- Animation consumes reducer or route results; it never decides
  gameplay outcomes.
- Reduced-motion preserves visible state changes with static
  highlights and localized feedback.

### Share Dialog
The host's "copy invite" affordance opens a share dialog that:

1. Renders the URL exactly as built by
   `selectors.multiplayer.inviteUrl` (fragment-bearing).
2. Renders a QR code that encodes the **full** URL including the
   fragment. QR is not subject to `Referer`, so this is the
   documented divergence from the fragment-only rule.
3. Renders a one-line localized clipboard warning
   (`ui.network-lobby.copy.clipboardWarning`) noting the code may
   sync via OS clipboard surfaces (iCloud, KDE Connect, Google
   clipboard).

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- Spec lists every visible region and authoritative state binding.
- `interactions.md` covers every primary control, next screen,
  state update, animation, disabled case, and error path.
- `architecture.md` carries screen-specific diagrams (not copied
  archetype diagrams).
- `data-contracts.md` identifies the schema, config, localization,
  asset, sound, VFX, save, and replay fields required to implement
  the screen.

### AI Implementation Notes
- Screen slug: `multiplayer-setup`; system group: `multiplayer`;
  curation marker: `curated-pass-6`.
- Build runtime components from this package contract — not from
  third-party captures or external product pixels.
- Runtime code resolves presentation through asset IDs / manifests;
  deterministic gameplay commands use stable IDs and scalar values.
- File roles inside this package: `spec.md` owns regions and state
  bindings; `interactions.md` owns behavior and timing;
  `data-contracts.md` owns schemas, config, localization, and
  asset / save / replay references; `architecture.md` owns
  screen-specific diagrams. Diagrams must mirror the contract — not
  introduce hidden behavior.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree (`ConnectionTypeTabs`, `PlayerSlotTable`, `MapPreview`, `TimerOptions`, `ContentHashLock`, `HostJoinButtons`) matches the visible regions in `mockup.html`; share-dialog URL shape matches the canonical fragment grammar in [`multiplayer-security.md` § Room Secret + Handshake](../../../multiplayer-security.md#room-secret--handshake) and [`08-multiplayer-ui-lobby-invite-link-in-game-status`](../../../../../tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md).
- **Schema: ✔** — `consent.multiplayer.ipDisclosure` and the disabled-reason key `consent.multiplayer.denied.body` resolve in [`localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json); `selectors.multiplayer.contentCompatibilityHash` matches the DataChannel-only routing pinned by [`signaling-payload-policy.md`](../../../signaling-payload-policy.md).
- **Tasks: ✔** — Owning task [`phase-3.01-multiplayer.08-multiplayer-ui-lobby-invite-link-in-game-status`](../../../../../tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md) reads this file First; the consent additions are owned by [`phase-3.01-multiplayer.23-multiplayer-consent-and-trust-display`](../../../../../tasks/phase-3/01-multiplayer/23-multiplayer-consent-and-trust-display.md). Sibling [`interactions.md`](./interactions.md), [`data-contracts.md`](./data-contracts.md), and [`architecture.md`](./architecture.md) — aligned (see their § 🔍 Sync Check).

## ⚠ Issues

- **`state.ui.multiplayer.*` and `state.net.statusThresholds` are transient runtime slices, not persisted.** Each is consumed by this screen but never enters IndexedDB, so neither requires a row in [`data-inventory.md`](../../../data-inventory.md). Surfaced here only so a future reviewer does not file the absence as a gap.
- **`state.profile.consent.multiplayer` row depends on the unrelated consent / persistence chain.** This screen is a consumer; the row registration is owned by [`onboarding.md`](../../../onboarding.md) and the consent-records row already present in [`data-inventory.md`](../../../data-inventory.md). No action here.
