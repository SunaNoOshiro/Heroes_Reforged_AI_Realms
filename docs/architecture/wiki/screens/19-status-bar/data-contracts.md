# Screen 19: Status Bar
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `asset-index.schema.json` | Frame, panel, drawer, and icon sprites for the status strip and message drawer. | `content-schema/schemas/asset-index.schema.json` |
| `localization.schema.json` | Status text, disabled reasons, error messages, and modded-indicator labels. | `content-schema/schemas/localization.schema.json` |
| `resource-id.schema.json` | Canonical IDs for resource-delta badges (gold, wood, ore, mercury, sulfur, crystal, gems). | `content-schema/schemas/resource-id.schema.json` |

The status bar dispatches no reducer commands, so
`command.schema.json`, `ruleset.schema.json`, and entity registries
(hero, town, spell, artifact, …) are not consumed here. Messages
arrive as pre-formatted localized strings and resource deltas; see
[`error-formatter.md`](../../../error-formatter.md) for error
construction.

### Runtime State Selectors
| Binding | Selector | Notes |
| --- | --- | --- |
| `hoverContext` | `state.ui.adventure.hoverContext` | Localized hover/focus description from adventure map or right-chrome. |
| `latestMessage` | `state.ui.messages.latest` | Most recent localized status event; ticker source. |
| `messageHistory` | `state.ui.messages.history` | Client-side ring buffer of recent messages; not replay-authoritative. |
| `resourceDeltas` | `selectors.economy.lastVisibleDeltas` | Recent command-result deltas, keyed by `resource-id`. |
| `drawerOpen` | `state.ui.statusBar.drawerOpen` | Local expanded/collapsed state. |
| `pinnedMessageId` | `state.ui.statusBar.pinnedMessageId` | Local pin selection; persists only for the session. |
| `moddedIndicator` | `selectors.session.moddedIndicator` | `off \| trusted \| sandboxed \| mixed` per [`pack-trust.md` § Modded Indicator](../../../pack-trust.md#6-modded-indicator). |

### Commands And Events
All four are UI-local tokens (no reducer entry). Matched by the
`EXPAND_/PIN_/CLEAR_/COLLAPSE_` prefixes in
[`screen-command-coverage.json`](../../../screen-command-coverage.json).

| Token | Action ID | Effect |
| --- | --- | --- |
| `EXPAND_STATUS_HISTORY` | `status.expand` | Opens the message-history drawer. |
| `PIN_STATUS_MESSAGE` | `status.pinMessage` | Pins the selected visible message locally. |
| `CLEAR_STATUS_HISTORY` | `status.clear` | Clears the client-only message history. |
| `COLLAPSE_STATUS_HISTORY` | `status.collapse` | Returns to the single-line status strip. |

Inbound: reducer-produced events (movement, capture, combat
resolution, errors) populate `state.ui.messages.latest` via the
adventure event projector; this screen reads but does not mutate
that path.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`

### Localization Keys
- `ui.status-bar.title`
- `ui.status-bar.actions.expand`, `…actions.pin`, `…actions.clear`,
  `…actions.collapse`
- `ui.status-bar.status.*`
- `ui.status-bar.errors.*`
- `ui.status-bar.modded.off` / `.trusted` / `.sandboxed` / `.mixed`
- `ui.common.close`, `ui.common.clear`

### Asset, Sound, And VFX IDs
- `ui.status-bar.background`, `ui.status-bar.frame`,
  `ui.status-bar.drawer-panel`
- `ui.status-bar.icons.pin`, `…icons.clear`, `…icons.collapse`,
  `…icons.modded-badge`
- `audio.ui.hover`, `audio.ui.click`
- `vfx.status-bar.message-slide-in`, `vfx.status-bar.drawer-fold`,
  `vfx.status-bar.delta-glow`, `vfx.status-bar.pin-wax-seal`

### Save And Replay Fields
- Persisted: none. The status bar is pure presentation.
- Replay-authoritative: none. `state.ui.messages.*`,
  `state.ui.statusBar.*`, hover, focus, pin selection, and ticker
  animation frames are transient UI state per
  [`fail-loud.md`](../../../fail-loud.md) and the persistence
  exemption for `state.ui.*` in
  [`persistence.md`](../../../persistence.md).
- The modded badge in replays is derived from `packHashes` in the
  setup record, not from this screen's local selector.

### Validation And Fallback
- Status messages are presentation derived from hover context and
  reducer-emitted events; they never feed back into the reducer or
  alter replay state.
- Missing presentation assets fall back through the asset resolver.
- Missing localization keys surface the raw key (loud) per
  [`untrusted-strings.md`](../../../untrusted-strings.md), never a
  silent blank.
- Error text is produced exclusively by
  `formatUserError(err, locale)` from
  [`error-formatter.md`](../../../error-formatter.md); never
  constructed inline.

## 🔍 Sync Check
- Sibling `spec.md` § State Bindings — aligned; `pinnedMessageId`
  added here matches the pin affordance documented in
  `interactions.md`.
- Sibling `interactions.md` § Actions — all four tokens mapped to
  their local-ui prefixes; effect descriptions match.
- Sibling `architecture.md` § State Inputs — aligned (six
  bindings).
- `mockup.html` — drawer with CLEAR + CLOSE buttons,
  `data-action="status.clear"` and `"status.collapse"` present;
  expand/pin trigger from collapsed strip and message-row hit
  targets respectively.
- `pack-trust.md` § 6 — selector path correct.
- `screen-command-coverage.json` — `EXPAND_/PIN_/CLEAR_/COLLAPSE_`
  all in `localUiPrefixes`.
- `error-formatter.md`, `untrusted-strings.md`, `fail-loud.md`,
  `persistence.md` — all exist at the linked paths.

## ⚠ Issues
- `state.ui.statusBar.pinnedMessageId` is referenced here and in
  `interactions.md` but is not yet enumerated in a sibling arch
  doc. Owning task should add a one-line entry to the adventure
  UI-state inventory (in the adventure-map task spec, not this
  screen) when implementing.
- `vfx.status-bar.*` and `ui.status-bar.icons.*` IDs are proposed
  here for the runtime asset index; confirm exact slugs against
  the pack manifest when the implementing task lands.
