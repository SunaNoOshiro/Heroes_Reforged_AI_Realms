# Desync Redaction Acceptance

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Update tasks
[`04-per-turn-hash-exchange-plus-desync-detection.md`](./04-per-turn-hash-exchange-plus-desync-detection.md)
and
[`05-auto-bisect-on-hash-mismatch.md`](./05-auto-bisect-on-hash-mismatch.md)
with the redaction acceptance: every desync report and every
auto-bisect round routes through the redactor declared in
[`docs/architecture/desync-redaction.md`](../../../docs/architecture/desync-redaction.md)
**before** any UI / log / peer sink. Intermediate `expected: bigint`
hashes remain public; the underlying commands stay hidden.

3 — Edits to the desync tasks (consume the redaction
taxonomy without redesigning the multiplayer plan).

Read First:
- [`docs/architecture/desync-redaction.md`](../../../docs/architecture/desync-redaction.md)
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)

Inputs:
- The field-visibility tag added by
  `mvp.00-core-architecture.22-06-command-field-visibility-and-desync-redaction`.

Outputs:
- Acceptance-criterion edits on tasks 04 and 05 (multiplayer).

Owned Paths:
- _(additive task acceptance edits only)_

Owned Paths (shared):
- `tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md`
  and
  `tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md`
  are **primary owners** of the desync detection / auto-bisect
  pipelines; this task adds the redactor acceptance **additively**
  and does not rewrite the per-turn hash exchange or the bisect
  algorithm.

Dependencies:
- mvp.00-core-architecture.22-06-command-field-visibility-and-desync-redaction

Acceptance Criteria:
- Task 04 acceptance gains: "desync report passes through the
  redactor declared in `desync-redaction.md` before any UI / log /
  peer sink."
- Task 05 acceptance gains: "each bisect round re-runs the redactor;
  intermediate `expected: bigint` hashes are public but the
  underlying commands are not."

Owned Paths (shared) acceptance:
- Task 04 (per-turn hash exchange + desync detection) is **owned
  by** the multiplayer task family (the primary owner of the desync
  detection algorithm). This task is **additive**: one new
  acceptance criterion is appended naming the redactor; the
  existing per-turn hash schedule, the hash-mismatch handshake,
  and the recovery flow must not rewrite anything else.
- Task 05 (auto-bisect on hash mismatch) is **owned by** the same
  multiplayer task family (the primary owner of the bisect
  algorithm). This task is **additive**: one new acceptance
  criterion is appended naming the per-round redactor; the
  bisect algorithm, the round budget, and the snapshot-rebase
  fallback must not rewrite anything else.

Verify:
- npm run validate

Estimated Time:
- 2 hours
