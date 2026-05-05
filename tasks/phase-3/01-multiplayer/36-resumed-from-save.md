# Resumed-from-Save Multiplayer Handshake

Status: planned

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Extend the three-phase commit-reveal handshake (Plan 26 Critical
Fix 2) to support resuming a saved match into a fresh multiplayer
session. Both peers compute their loaded-from-disk `stateHash`
from the replayed `commandLog` *before* the first resumed turn
and exchange it via the REVEAL frame; mismatch refuses to start.
Plan 27 § Improvement: MP Load-Resume Protocol.

Read First:
- [`docs/architecture/match-handshake.md`](../../../docs/architecture/match-handshake.md)
- [`docs/architecture/security-model.md`](../../../docs/architecture/security-model.md)
- [`docs/architecture/save-migration.md`](../../../docs/architecture/save-migration.md)
- [`content-schema/schemas/match-handshake.schema.json`](../../../content-schema/schemas/match-handshake.schema.json)
- [`content-schema/schemas/save-envelope.schema.json`](../../../content-schema/schemas/save-envelope.schema.json)

Inputs:
- Save envelope agreed out-of-band (the handshake does not
  transport the body).
- Per-peer post-replay `stateHash`.

Outputs:
- Extended handshake schema with `resumedFromSave: { saveId, loadedStateHash } | null` on the reveal frame.
- New abort reasons (named `resumeStateHashMismatch` and
  `resumePackHashesMismatch`) added to the existing closed enum
  on the abort frame.
- `content-schema/examples/match-handshake/resumed-from-save-*.json`
  fixtures: `matching-state-hash`, `mismatching-state-hash`,
  `mismatching-pack-hashes`.
- Wired through the existing match-handshake validator.

Owned Paths:
- `content-schema/examples/match-handshake/resumed-from-save-matching-state-hash.match-handshake.json`
- `content-schema/examples/match-handshake/resumed-from-save-mismatching-state-hash.match-handshake.json`
- `content-schema/examples/match-handshake/resumed-from-save-mismatching-pack-hashes.match-handshake.json`

Owned Paths (shared):
- `docs/architecture/match-handshake.md` — adds the
  Resumed-from-Save Mode section (§ 7a) as an additive section;
  pre-existing sections must not be rewriting (no rewrite, no relax). The doc *file* is
  owned by [`tasks/phase-3/01-multiplayer/10-match-handshake-protocol.md`](./10-match-handshake-protocol.md);
  primary owner is task 10.
- `content-schema/schemas/match-handshake.schema.json` — adds
  `resumedFromSave` and the two new abort reasons as additive
  entries; pre-existing fields must not be rewriting (no rewrite, no relax). Owned by the
  same task 10.

Dependencies:
- phase-3.01-multiplayer.10-match-handshake-protocol
- mvp.08-persistence.18-save-envelope-and-intent

Acceptance Criteria:
- The handshake schema accepts a REVEAL with `resumedFromSave:
  null` (fresh match, unchanged behavior) and with
  `resumedFromSave: { saveId, loadedStateHash }` (resume mode).
- Mismatching `loadedStateHash` between peers produces an abort
  frame whose closed reason is `resumeStateHashMismatch`.
- Mismatching `contentPackHashes` between peers produces an abort
  frame whose closed reason is `resumePackHashesMismatch`.
- A peer's local save MAC (M5+) is **not** accepted as
  authentication between peers; each peer verifies its own copy
  locally, then proves agreement by exchanging the post-replay
  `stateHash`.
- The shared-ownership additions to `match-handshake.md` and
  `match-handshake.schema.json` are strictly additive; pre-existing
  fields and sections must not be rewriting (no rewrite, no relax). Primary owner of both
  artifacts is [`tasks/phase-3/01-multiplayer/10-match-handshake-protocol.md`](./10-match-handshake-protocol.md).
- `npm run validate:handshake` covers the three new fixtures and
  the new abort reasons.

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
