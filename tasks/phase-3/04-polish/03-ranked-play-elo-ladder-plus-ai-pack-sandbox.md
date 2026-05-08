# Ranked Play — ELO Ladder + AI-Pack Sandbox

Module: [Polish (M7)](../04-polish.md)

Description:
Ranked multiplayer with ELO rating. AI-generated and unsigned packs are banned from ranked play. Rating tracked server-side (signaling server extended) or client-side (trust-honor for MVP).

Read First:
- [`docs/architecture/overview.md`](../../../docs/architecture/overview.md)

Inputs:
- Multiplayer (`01-multiplayer.md`), mod system (`phase-2/05-mod-system.md`)

Outputs:
- `src/net/webrtc/ranked.ts`
- `RankedSession`: validates both players have no sandboxed packs enabled before match starts
- ELO calculation: `newRating = oldRating + K × (outcome - expected)`; K=32 for < 30 games, K=16 after
- Rating stored in IndexedDB + synced via signaling server at match end
- Ranked badge shown on player profile

Owned Paths:
- `src/net/webrtc/ranked.ts`

Dependencies:
- module:phase-3.01-multiplayer
- module:phase-2.05-mod-system

Acceptance Criteria:
- Players with sandboxed packs enabled cannot enter ranked queue (with explanation)
- ELO updates correctly after win and loss
- Leaderboard shows top 10 ratings (fetched from signaling server)

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
