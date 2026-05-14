# Screen 62: Multiplayer Setup
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used for | Canonical source |
| --- | --- | --- |
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |
| `ruleset.schema.json` | Deterministic constants, formulas, and guard rules consumed by commands. | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |
| `scenario.schema.json` | Scenario setup, starting state, victory / loss conditions, save / load metadata. | [`content-schema/schemas/scenario.schema.json`](../../../../../content-schema/schemas/scenario.schema.json) |
| `world.schema.json` | World terrain, biome, underground, generator, and map setup records. | [`content-schema/schemas/world.schema.json`](../../../../../content-schema/schemas/world.schema.json) |
| `faction.schema.json` | Faction identity, town roster, hero / unit references, and player-facing metadata. | [`content-schema/schemas/faction.schema.json`](../../../../../content-schema/schemas/faction.schema.json) |
| Loaded content / runtime registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, and shell state. | Pack runtime + selectors. |

### Runtime State Selectors
| UI element | Selector | Notes |
| --- | --- | --- |
| `connectionType` | `state.ui.multiplayer.connectionType` | `hotseat \| lan \| online \| direct`. |
| `playerSlots` | `state.ui.multiplayer.playerSlots` | Player color, team, control type, ready flag. Capped at 2 for online (M5); N-peer mesh deferred to M7. |
| `selectedScenario` | `state.ui.multiplayer.scenarioId` | Scenario / map draft. |
| `timerConfig` | `state.ui.multiplayer.timer` | Turn-timer draft. |
| `contentHash` | `selectors.multiplayer.contentCompatibilityHash` | Pack / ruleset compatibility hash; exchanged on the WebRTC DataChannel after host approval per [`signaling-payload-policy.md`](../../../signaling-payload-policy.md). |
| `inviteUrl` | `selectors.multiplayer.inviteUrl` | Join URL; embeds `roomId` and `roomSecret` in the URL **fragment** so the secret never reaches server logs (see [`multiplayer-security.md` § Room Secret + Handshake](../../../multiplayer-security.md#room-secret--handshake)). |
| `statusThresholds` | `state.net.statusThresholds` | Stall budgets `{ softMs: 2000, hardMs: 10000, forfeitMs: 120000 }`, sourced from `INPUT_DELAY_BUDGETS` in `src/net/webrtc/constants.ts` (Task 8). |

### Commands And Events
Token classification per
[`screen-command-coverage.json`](../../../screen-command-coverage.json):

| Token | Classification | Notes |
| --- | --- | --- |
| `SET_MULTIPLAYER_CONNECTION_TYPE` | Out-of-scope (owned by `phase-3.01-multiplayer`) | Mutates the connection-type draft. |
| `EDIT_MULTIPLAYER_SLOT` | local-ui (`EDIT_` prefix) | Mutates the player-slot draft. |
| `HOST_MULTIPLAYER_SESSION` | Out-of-scope (owned by `phase-3.01-multiplayer`) | Creates a session or hotseat draft. |
| `JOIN_MULTIPLAYER_SESSION` | Out-of-scope (owned by `phase-3.01-multiplayer`) | Routes to the network lobby. |
| `CLOSE_MULTIPLAYER_SETUP` | local-ui (`CLOSE_` prefix) | Discards the draft. |
| `REQUEST_CONSENT_PROMPT` | Cross-screen | Routes to [`76-onboarding-consent`](../76-onboarding-consent/); defined in [`command-schema.md` § Consent, Onboarding & Destructive-UX Commands](../../../command-schema.md#consent-onboarding--destructive-ux-commands). |

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.multiplayer-setup.title`
- `ui.multiplayer-setup.actions.*`
- `ui.multiplayer-setup.status.*`
- `ui.multiplayer-setup.errors.*`
- `ui.network-lobby.copy.clipboardWarning` (share dialog)
- `ui.network-lobby.invite.insecureScheme` (paste-join validator)
- `consent.multiplayer.ipDisclosure` (gate disclosure)
- `consent.multiplayer.denied.body` (disabled-reason for `Host` / `Join` when `state === 'denied'`)
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`,
  `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.multiplayer-setup.background`
- `ui.multiplayer-setup.frame`
- `ui.multiplayer-setup.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.multiplayer.*`
- `vfx.multiplayer-setup.*`

### Save And Replay Fields
- Persist only reducer-approved gameplay state, setup records,
  content hashes, command inputs, and explicit draft records
  named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor
  blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs — never raw
  paths, localized labels, rendered positions, or wall-clock
  timestamps.

### Validation And Fallback
- Builds a multiplayer setup draft, validates identical content
  hashes / ruleset, assigns player slots, and routes to
  `63-hotseat-turn-handoff` or `64-network-lobby`.
- Missing presentation may fall back through the asset resolver.
- Missing gameplay records, invalid commands, and unresolved
  content IDs fail loudly per
  [`fail-loud.md`](../../../fail-loud.md) before controls become
  enabled.

---

## 🔍 Sync Check

- **UI: ✔** — Selectors and localization keys (`consent.multiplayer.ipDisclosure`, `consent.multiplayer.denied.body`, `ui.network-lobby.copy.clipboardWarning`, `ui.network-lobby.invite.insecureScheme`) match the bindings and copy in sibling [`spec.md`](./spec.md) and [`interactions.md`](./interactions.md), and the owning task [`phase-3.01-multiplayer.08-multiplayer-ui-lobby-invite-link-in-game-status`](../../../../../tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md).
- **Schema: ✔** — Every cited schema is present in [`content-schema/schemas/`](../../../../../content-schema/schemas/) and has a row in [`schema-matrix.md`](../../../schema-matrix.md); the content-hash routing matches [`signaling-payload-policy.md` § 1 Allowlist](../../../signaling-payload-policy.md#1-allowlist-signaling-server-payloads) (no signaling-server hop).
- **Tasks: ✔** — Command classification matches [`screen-command-coverage.json`](../../../screen-command-coverage.json); `REQUEST_CONSENT_PROMPT` enumerated in [`command-schema.md`](../../../command-schema.md) and owned by [`mvp.07-ui-shell.27-onboarding-consent-screen`](../../../../../tasks/mvp/07-ui-shell/27-onboarding-consent-screen.md). Sibling [`spec.md`](./spec.md), [`interactions.md`](./interactions.md), and [`architecture.md`](./architecture.md) — aligned.

## ⚠ Issues

_None._
