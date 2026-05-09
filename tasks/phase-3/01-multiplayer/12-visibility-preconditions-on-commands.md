# Visibility Preconditions on Commands

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Add the canonical-reducer-side visibility precondition that closes
the fog-bypass-via-crafted-command gap. Each command kind declares
a `visibility` precondition (`none | tile | object | hero |
battle-cell`); the reducer rejects any command whose target is not
in the issuing peer's `viewWorldVisibleObjects` projection at the
issuance turn.

Read First:
- [`docs/architecture/security-model.md`](../../../docs/architecture/security-model.md)
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)
- [`docs/architecture/visibility-policy.md`](../../../docs/architecture/visibility-policy.md)
- [`docs/architecture/wiki/screens/07-adventure-map/spec.md`](../../../docs/architecture/wiki/screens/07-adventure-map/spec.md)
- [`docs/architecture/wiki/screens/16-view-world/spec.md`](../../../docs/architecture/wiki/screens/16-view-world/spec.md)
- [`content-schema/schemas/command.schema.json`](../../../content-schema/schemas/command.schema.json)

Inputs:
- `viewWorldVisibleObjects` selector from the existing visibility
  policy.
- `command.schema.json` discriminated-union shape.
- Lockstep envelope's `turn` field from
  [Task 09](./09-lockstep-envelope-and-mac.md) for issuance-turn
  projection.

Outputs:
- `src/engine/visibility/precondition.ts` — pure function
  `checkVisibilityPrecondition(state, command, issuingPeer) →
  { ok } | { ok: false, reason }` re-using
  `viewWorldVisibleObjects`.
- `command.schema.json` extension: every command kind declares
  `visibility: 'none' | 'tile' | 'object' | 'hero' | 'battle-cell'`.
- Reducer entry-point wiring so every dispatch runs the
  precondition before any effect resolution; `ok: false`
  produces `COMMAND_REJECTED_PRECONDITION` telemetry.
- Screen 07 and 16 spec notes about two-layer enforcement (UI
  fog mask + reducer precondition).

Owned Paths:
- `src/engine/visibility/precondition.ts`
- `src/engine/visibility/`

Dependencies:
- phase-3.01-multiplayer.09-lockstep-envelope-and-mac
- phase-3.01-multiplayer.13-security-model-and-doctrine

Acceptance Criteria:
- Every command kind in `command.schema.json` carries a
  `visibility` declaration.
- `MOVE_HERO` to a fog-covered tile is rejected on both peers
  with `reason: 'TILE_NOT_VISIBLE'`; canonical state hash is
  unchanged.
- `MOVE_HERO` to a tile in `viewWorldVisibleObjects(turn)` is
  accepted.
- Hand-crafted `ATTACK` against an unrevealed enemy stack is
  rejected with `reason: 'OBJECT_NOT_VISIBLE'`; state hash
  unchanged on both peers.
- `END_DAY` and other `visibility: 'none'` commands skip the
  precondition.
- Issuance-turn projection: a command issued at turn N runs the
  precondition against the projection at turn N, not against
  the live state at apply time (so a freshly-revealed tile in
  turn N+1 does not retroactively validate a turn-N command
  that targeted a then-fog-covered tile).

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
