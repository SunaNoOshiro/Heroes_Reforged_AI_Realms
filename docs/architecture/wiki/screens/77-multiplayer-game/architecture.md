# Screen 77: Multiplayer Game Status
## Architecture

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`

### Telemetry Subscriptions

```mermaid
flowchart LR
  TT[src/net/lockstep/turn-timer.ts]
  ENV[src/net/lockstep/envelope.ts]
  BIS[src/net/lockstep/bisect.ts]
  ATT[src/net/lockstep/handshake.ts<br/>build-attestation check]
  TT  -- TURN_TIMER_*       --> SEL[selectors.net.lockstep.*]
  ENV -- LOCKSTEP_*         --> SEL
  BIS -- BISECT_*           --> SEL
  ATT -- BUILD_ATTESTATION_*--> SEL
  SEL --> UI[MultiplayerGameStatus<br/>screen 77]
```

### Component Composition

```mermaid
flowchart TB
  ROOT[MultiplayerGameStatus]
  ROOT --> OTI[OpponentTurnIndicator]
  ROOT --> BAB[BuildAttestationBanner]
  ROOT --> MIP[MatchInfoPanel]
  ROOT --> ESP[EnvelopeStatsPanel]
  ROOT --> DSB[DesyncBanner]
  DSB --> BRP[BisectReportPanel]
  ROOT --> MKD[MatchKeyDisplay<br/>developer-mode only]
  ROOT --> PMA[PostMatchAuditConsentPrompt<br/>post-match summary only]
```

### Stall Escalation Flow

```mermaid
sequenceDiagram
  participant Local as Local UI
  participant TT as turn-timer.ts
  participant Wire as Lockstep Transport
  participant Reducer as Engine Reducer

  Local->>TT: turn start
  TT->>Local: WAITING
  TT->>Local: STALLED (≥ 30s)
  TT->>Wire: wrap(END_DAY{source:'auto-timeout'})
  Wire->>Reducer: apply canonical envelope
  Reducer->>Local: turn ends; OpponentTurnIndicator → auto-ended
```

### Bisect / Desync Flow

```mermaid
sequenceDiagram
  participant Wire as Lockstep Transport
  participant Hash as per-turn hash exchange
  participant Bis as bisect.ts
  participant Tool as Phase-4 audit service (offline replay)
  participant UI as Screen 77

  Wire->>Hash: end-of-turn payload
  Hash--xWire: divergence detected
  Hash->>Bis: start bisect
  Bis->>Bis: BISECT_MIDPOINT exchanges (envelope-signed)
  Bis->>Tool: invoke local replay tiebreaker
  Tool->>Bis: canonicalReplayHash
  Bis->>UI: desyncReport { attributedAbortPeer, attributionConfidence }
  UI->>UI: BisectReportPanel renders red panel
```

### Module Graph Compliance
- Screen 77 lives entirely in `src/ui/multiplayer/`. It imports
  selectors from `src/net/lockstep/*` per the module-graph
  table in [`module-graph.md`](../../../module-graph.md): UI may
  import any module below it.
- Screen 77 MUST NOT import anything from `src/engine/` or
  `src/rules/` directly except for closed-form selector
  re-exports surfaced by `src/net/lockstep/`.

### Cross-Reference Index
- Turn timer: [`turn-timer.md`](../../../turn-timer.md)
- Envelope: [`lockstep-envelope.md`](../../../lockstep-envelope.md)
- Handshake: [`match-handshake.md`](../../../match-handshake.md)
- Bisect: [`bisect-protocol.md`](../../../bisect-protocol.md)
- Build attestation: [`build-attestation.md`](../../../build-attestation.md)
- Audit pipeline: [`replay-audit-pipeline.md`](../../../replay-audit-pipeline.md)
- Security model: [`security-model.md`](../../../security-model.md)
- Peer reputation: [`peer-reputation.md`](../../../peer-reputation.md)
