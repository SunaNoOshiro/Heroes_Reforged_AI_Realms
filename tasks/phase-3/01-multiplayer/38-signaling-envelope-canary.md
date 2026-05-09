# Signaling Envelope Canary

Module: [Multiplayer (M5)](../01-multiplayer.md)

Description:
Per-cluster canary task that **reserves the signaling-envelope
contract** and asserts the closed failure surface fires on each
malformed fixture. Closes PI-4 (Doctrine canary tasks
per cluster) for the signaling cluster.

The canary is intentionally tiny: parse one canonical
`signaling-message` example, dispatch it through a stub
`verifySignalingEnvelope`, and assert each malformed fixture
produces the matching closed refusal code. The point is to fail
loudly the moment a new schema change desyncs from its consumer
— before any runtime work has even started.

Read First:
- [`docs/architecture/signaling-envelope.md`](../../../docs/architecture/signaling-envelope.md)
- [`docs/architecture/signaling-message-schema.md`](../../../docs/architecture/signaling-message-schema.md)
- [`content-schema/schemas/signaling-message.schema.json`](../../../content-schema/schemas/signaling-message.schema.json)
- [`content-schema/schemas/signaling-envelope.schema.json`](../../../content-schema/schemas/signaling-envelope.schema.json)
  § PI-4

Inputs:
- Canonical examples under
  `content-schema/examples/signaling-message/`.
- Closed failure-code surface in
  [`content-schema/schemas/signaling-error.schema.json`](../../../content-schema/schemas/signaling-error.schema.json).

Outputs:
- A canary test under
  `services/signaling/__tests__/envelope-canary.test.mjs` (when
  the runtime lands) that round-trips canonical examples and
  asserts the malformed-fixture code map.
- Today: no runtime to exercise. The verify commands no-op (echo
  + exit 0) until the cluster's first runtime task lands; the
  acceptance is contract reservation, not execution.

Owned Paths:
- `services/signaling/__tests__/envelope-canary.test.mjs`
  (reserved path)

Owned Paths (shared):
- `content-schema/schemas/signaling-envelope.schema.json` and
  `content-schema/schemas/signaling-message.schema.json` —
  primary owners are the multiplayer schema tasks
  ([31-signaling-message-schema-and-validation.md](./31-signaling-message-schema-and-validation.md)
  and the envelope-owning task in the same module). This canary
  treats both as additive-extension points: any future schema
  change MUST keep the canary green; rewriting the schema in a
  way that breaks the canary fails CI.

Dependencies:
- phase-3.01-multiplayer.31-signaling-message-schema-and-validation

Acceptance Criteria:
- A canary test exists in this task's owned path (reserved today,
  populated when the runtime cluster lands).
- The canary parses each canonical example successfully and
  rejects each malformed fixture with the expected
  `signaling-error` code.
- `validate:tasks` passes; the task is registered in
  `tasks/task-registry.json`.
- When the schema is changed in a way that breaks the canary's
  cluster contract, this test must fail before any consumer is
  affected.

Owned Paths (shared) acceptance:
- The signaling envelope and message schemas are **owned by** the
  multiplayer schema task
  `phase-3.01-multiplayer.31-signaling-message-schema-and-validation`
  (the primary contract). This canary is **additive**: it
  reserves a contract reference; this task must not rewrite the
  schemas themselves.

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
