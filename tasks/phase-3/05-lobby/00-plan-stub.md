# Lobby discovery — plan stub

Blocked Reason:
- Lobby discovery has not yet been decomposed into concrete tasks.
  This task file exists so a future audit cannot say the surface
  "has no owner / no spec / no test"; it is replaced once the
  lobby-discovery decomposition lands.

Module: [Lobby Discovery (Phase 3)](../05-lobby.md)

Description:
Placeholder marker for lobby-browser / friend-list work. The 1.x
multiplayer surface is invite-link only and shipped through
[`tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md`](../../phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md).
A discoverable lobby + friend list is deferred to post-1.0 per
[`DEF-016`](../../../docs/planning/deferred.md). This task file pins
the dependency on the lobby-discovery decomposition so the gap shows
up in the registry rather than disappearing into chat history.

Read First:
- [`docs/planning/deferred.md`](../../../docs/planning/deferred.md)
  (`DEF-016`)
- [`docs/architecture/multiplayer-security.md`](../../../docs/architecture/multiplayer-security.md)

Inputs:
- (when authored)

Outputs:
- (none — this task is a marker; once lobby-discovery is decomposed,
  this file is replaced by concrete tasks under
  [`tasks/phase-3/05-lobby/`](../05-lobby/))

Owned Paths:
- (none — this is a planning placeholder so concrete `Owned Paths`
  are deferred to the lobby-discovery tasks; no concrete code or
  content paths are written by this stub)

Dependencies:
- phase-3.01-multiplayer.08-multiplayer-ui-lobby-invite-link-in-game-status

Acceptance Criteria:
- This task remains `blocked` until lobby-discovery is decomposed
  into an executable task list. When that lands, this file is
  replaced (not edited) by per-feature tasks under
  [`tasks/phase-3/05-lobby/`](../05-lobby/).
- The deferred-items register
  ([`DEF-016`](../../../docs/planning/deferred.md)) continues to point
  at this module while the stub stands.

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
