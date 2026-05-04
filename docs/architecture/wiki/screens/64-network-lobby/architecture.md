# Screen 64 Architecture: Network Lobby

System: multiplayer
Screen ID: network-lobby
Visual Archetype: curated-network-lobby
Curation Status: curated-pass-6

## Purpose
Network lobby for hosted/joined multiplayer sessions, ready state, chat, content hash checks, slot assignment, and launch.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Network Lobby"]
  C0["SessionHeader"]
  Root --> C0
  C1["PlayerSlotList"]
  Root --> C1
  C2["ReadyStateSeals"]
  Root --> C2
  C3["ChatPanel"]
  Root --> C3
  C4["ContentCompatibilityPanel"]
  Root --> C4
  C5["LaunchLeaveButtons"]
  Root --> C5
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Session connection"] --> L1
  L1["Lobby snapshot"] --> L2
  L2["Content hashes"] --> L3
  L3["Ready states"] --> L4
  L4["Network lobby"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Ready/chat/launch input"] --> I1
  I1["Host/session guard"] --> I2
  I2["Network event"] --> I3
  I3["Snapshot update"] --> I4
  I4["Loading/leave route"]
```

## Animation Flow
```mermaid
sequenceDiagram
  participant UI
  participant Draft as UI Draft
  participant Guard
  participant Reducer
  participant VFX
  UI->>Draft: hover/select/preview
  Draft->>VFX: Rows slide
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Mismatch flash
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Network Lobby"]
  Current --> T0["59-loading-screen"]
  Current --> T1["62-multiplayer-setup"]
```

## Pending-Peer Flow
```mermaid
sequenceDiagram
  participant Joiner
  participant Signaling
  participant Host as Host (this screen)
  Joiner->>Signaling: JOIN_ROOM { peerPubKey, sig }
  Signaling->>Host: PEER_PENDING { peerPubKey, displayNameDraft }
  Note over Signaling,Host: ICE candidates from Joiner are buffered;<br/>only typ relay flows pre-consent
  Host->>Signaling: APPROVE_PEER | REJECT_PEER
  alt approved
    Signaling-->>Joiner: PEER_CONNECTED
    Note over Host,Joiner: Host renegotiates with iceRestart;<br/>full ICE candidate set flows
  else rejected
    Signaling-->>Joiner: PEER_REJECTED { reason }
  else timeout (30 s)
    Signaling-->>Joiner: PEER_REJECTED { reason: "timeout" }
  end
```

## Moderation Flow
```mermaid
flowchart TD
  M0["Host opens slot dots-menu"] --> M1{action}
  M1 -- kick --> M2["KICK_PEER"]
  M1 -- mute --> M3["MUTE_PEER (local)"]
  M1 -- report --> M4["REPORT_PEER (local audit)"]
  M2 --> M5["peerDenylist += peerPubKey"]
  M5 --> M6["PEER_KICKED → joiner; WS dropped"]
```

## State Inputs
- sessionId -> state.net.sessionId
- players -> state.net.lobby.players
- pendingPeers -> state.net.lobby.pendingPeers
- peerApproval -> state.net.lobby.peerApproval
- peerDenylist -> state.net.lobby.peerDenylist
- joinAttemptToast -> state.net.lobby.joinAttemptToast
- chatMessages -> state.net.lobby.chat
- compatibility -> selectors.net.lobbyCompatibility
- launchGuard -> selectors.net.canLaunchSession

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
