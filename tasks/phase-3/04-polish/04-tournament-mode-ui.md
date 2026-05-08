# Tournament Mode UI

Module: [Polish (M7)](../04-polish.md)

Description:
In-game tournament bracket: 4 or 8 players, single-elimination. Host creates bracket, shares code. Players join, play matches, winner advances.

Read First:
- [`docs/architecture/overview.md`](../../../docs/architecture/overview.md)
- `docs/architecture/wiki/screens/64-network-lobby/spec.md`
- `docs/architecture/wiki/screens/64-network-lobby/interactions.md`
- `docs/architecture/wiki/screens/64-network-lobby/data-contracts.md`
- `docs/architecture/wiki/screens/64-network-lobby/architecture.md`
- `docs/architecture/wiki/screens/64-network-lobby/mockup.html`

Inputs:
- Multiplayer (`01-multiplayer.md`), ranked system (Task 3)
- Screen package `docs/architecture/wiki/screens/64-network-lobby/`

Outputs:
- `src/ui/components/TournamentBracket.tsx`
- Create tournament: choose 4 or 8 players, invite by code
- Bracket view: visual bracket with match scores
- Auto-advance: winner of each match advances to next round
- Final winner: announcement screen + ELO bonus

Owned Paths:
- `src/ui/components/TournamentBracket.tsx`

Dependencies:
- phase-3.01-multiplayer.08-multiplayer-ui-lobby-invite-link-in-game-status
- phase-3.04-polish.03-ranked-play-elo-ladder-plus-ai-pack-sandbox

Acceptance Criteria:
- 4-player bracket completes correctly (2 semis + 1 final)
- Disconnection during tournament match treated as forfeit
- Bracket state persists if host refreshes (saved to signaling server)
- Layout, bindings, and commands match `docs/architecture/wiki/screens/64-network-lobby/mockup.html`, `docs/architecture/wiki/screens/64-network-lobby/interactions.md`, and `docs/architecture/wiki/screens/64-network-lobby/data-contracts.md`.
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
