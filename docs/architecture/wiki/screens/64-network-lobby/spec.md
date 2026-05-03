# Screen 64: Network Lobby

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Network lobby for hosted/joined multiplayer sessions, ready state, chat, content hash checks, slot assignment, and launch. Capped at 2 peers per room (M5); the host's invite copy reads "share invite link with secret embedded" so the room-secret in the URL fragment is preserved end-to-end.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-6`.
- Lobby table with player list, color/team slots, ready seals, chat parchment, content compatibility panel, and Launch/Leave buttons.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- NetworkLobby
  - SessionHeader
  - PlayerSlotList
  - ReadyStateSeals
  - ChatPanel
  - ContentCompatibilityPanel
  - LaunchLeaveButtons

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| sessionId | state.net.sessionId | Network session identifier. |
| players | state.net.lobby.players | Connected players and slot assignment. |
| chatMessages | state.net.lobby.chat | Lobby chat log. |
| compatibility | selectors.net.lobbyCompatibility | Hash/version/ruleset match result. |
| launchGuard | selectors.net.canLaunchSession | All ready and compatible. |

### Mechanics Mapping
- Lobby state mirrors authoritative host/session messages. Launch is enabled only when content hashes, slots, scenario, teams, and ready state all match.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Player rows slide in/out, ready seals stamp, chat messages scroll, hash mismatch flashes red, and launch fades to loading.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `network-lobby`; system group: `multiplayer`; curation marker: `curated-pass-6`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
