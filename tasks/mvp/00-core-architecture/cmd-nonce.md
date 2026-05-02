# Command nonce + deduplication contract

Status: done

Module: [Core Architecture Contracts (M0)](../00-core-architecture.md)

Description:
Commands are intentionally non-idempotent — each application mutates
state. Without an at-most-once delivery key, a UI double-click or a
network retry corrupts the log and breaks replays. This task adds a
required `nonce` to every command's dispatcher-added metadata and
formalizes the dedup rule.

Nonce format: `<actorId>:<turn>:<sequence>`, with `sequence` a
per-actor, per-turn monotonic counter starting at 0. The dispatcher
rejects any command whose nonce already appears in the current turn's
log slice with the structured error
`{ kind: 'duplicate_nonce', nonce }`.

The closed schema at
`content-schema/schemas/command.schema.json` requires `metadata` with
a pattern-checked `nonce` on every command kind.

Source audit:
[`docs/readiness-audit/01-core-architecture.md`](../../../docs/readiness-audit/01-core-architecture.md)
(Q16, Issue 3.B-1).

Read First:
- [`docs/implementation-plans/01-core-architecture-plan.md`](../../../docs/implementation-plans/01-core-architecture-plan.md)
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)

Inputs:
- Audit Q16 in
  [`docs/readiness-audit/01-core-architecture.md`](../../../docs/readiness-audit/01-core-architecture.md)
- Existing command schema at `content-schema/schemas/command.schema.json`

Outputs:
- New "Deduplication" section in
  [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- `content-schema/schemas/command.schema.json` extended so every
  command def requires `metadata` with a `nonce` matching
  `^[A-Za-z0-9_-]+:[0-9]+:[0-9]+$`
- "command nonce" entry in
  [`docs/architecture/glossary.md`](../../../docs/architecture/glossary.md)

Owned Paths:
- `content-schema/schemas/command.schema.json`

Dependencies:
- mvp.00-core-architecture.det-rng-streams

Acceptance Criteria:
- `content-schema/schemas/command.schema.json` requires `metadata`
  with `turn`, `playerId`, `nonce` on every command def.
- `nonce` is pattern-checked with `^[A-Za-z0-9_-]+:[0-9]+:[0-9]+$`.
- `command-schema.md` documents the nonce format, dedup window
  (current turn slice), and rejection error shape.
- `command-schema.md` "Command Envelope" preamble shows that
  individual examples below it omit `metadata` for brevity but the
  schema still requires it.
- `glossary.md` has a "command nonce" entry.

Verify:
- npm run validate

Estimated Time:
- 3 hours
