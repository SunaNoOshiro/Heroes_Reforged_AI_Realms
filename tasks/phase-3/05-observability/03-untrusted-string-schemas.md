# Untrusted-String Schemas (Display Name + Room Code + Case ID)

Module: [Observability & Trust Boundaries](../05-observability.md)

Description:
Wire the per-string schemas from
[`docs/architecture/untrusted-strings.md`](../../../docs/architecture/untrusted-strings.md)
into the runtime ingest paths. Validate
[`content-schema/schemas/display-name.schema.json`](../../../content-schema/schemas/display-name.schema.json)
on every save load and every profile-edit submit;
[`content-schema/schemas/room-code.schema.json`](../../../content-schema/schemas/room-code.schema.json)
on every join attempt;
[`content-schema/schemas/case-id.schema.json`](../../../content-schema/schemas/case-id.schema.json)
on every player-report submission.

Read First:
- [`docs/architecture/untrusted-strings.md`](../../../docs/architecture/untrusted-strings.md)
- [`docs/architecture/display-name-policy.md`](../../../docs/architecture/display-name-policy.md)
- [`docs/architecture/lobby-identifiers.md`](../../../docs/architecture/lobby-identifiers.md)
- [`docs/architecture/trust-boundaries.md`](../../../docs/architecture/trust-boundaries.md)
- [`docs/architecture/wiki/screens/62-multiplayer-setup/`](../../../docs/architecture/wiki/screens/62-multiplayer-setup/)
- [`docs/architecture/wiki/screens/64-network-lobby/`](../../../docs/architecture/wiki/screens/64-network-lobby/)
- [`docs/architecture/wiki/screens/75-content-report/`](../../../docs/architecture/wiki/screens/75-content-report/)

Inputs:
- [`content-schema/schemas/display-name.schema.json`](../../../content-schema/schemas/display-name.schema.json)
- [`content-schema/schemas/room-code.schema.json`](../../../content-schema/schemas/room-code.schema.json)
- [`content-schema/schemas/case-id.schema.json`](../../../content-schema/schemas/case-id.schema.json)
- [`src/ui/sanitize.ts`](../../../src/ui/sanitize.ts) NFC helper.

Outputs:
- `src/ui/profile/validate-display-name.ts` — pure helper that
  NFC-normalizes and validates; rejects with a typed error
  carrying the violated allow-list class.
- `src/net/lobby/validate-room-code.ts` — pure helper that
  validates the 8-char Crockford-Base32 pattern and rejects
  invalid codes before issuing a `JOIN_ROOM` envelope.
- `src/ui/report/validate-case-id.ts` — pure helper that
  validates the 64-char lowercase-hex pattern.
- Per-helper unit tests under
  `src/ui/profile/__tests__/`,
  `src/net/lobby/__tests__/`,
  `src/ui/report/__tests__/`.

Owned Paths:
- `src/ui/profile/validate-display-name.ts`
- `src/ui/profile/__tests__/validate-display-name.test.ts`
- `src/net/lobby/validate-room-code.ts`
- `src/net/lobby/__tests__/validate-room-code.test.ts`
- `src/ui/report/validate-case-id.ts`
- `src/ui/report/__tests__/validate-case-id.test.ts`
- `content-schema/schemas/display-name.schema.json`
- `content-schema/schemas/room-code.schema.json`
- `content-schema/schemas/case-id.schema.json`
- `src/ui/sanitize.ts`
- `docs/architecture/untrusted-strings.md`

Dependencies:
- None

Acceptance Criteria:
- `validate-display-name.ts` rejects strings that fail the NFC
  + 24-char + character-class allow-list per
  [`display-name.schema.json`](../../../content-schema/schemas/display-name.schema.json).
- `validate-room-code.ts` rejects strings that fail the
  8-char Crockford-Base32 pattern per
  [`room-code.schema.json`](../../../content-schema/schemas/room-code.schema.json).
- `validate-case-id.ts` rejects strings that fail the 64-char
  lowercase-hex pattern per
  [`case-id.schema.json`](../../../content-schema/schemas/case-id.schema.json).
- All three helpers are pure; no I/O, no DOM, no logger import.
- Lint refuses `dangerouslySetInnerHTML` under `src/` (covered
  by the Task 01 lint extension; this task's tests confirm the
  rule fires on a deliberate violation fixture).
- The display-name validator is wired to the
  [`docs/architecture/wiki/screens/62-multiplayer-setup/`](../../../docs/architecture/wiki/screens/62-multiplayer-setup/)
  profile-edit submit handler; the room-code validator is wired
  to the
  [`docs/architecture/wiki/screens/64-network-lobby/`](../../../docs/architecture/wiki/screens/64-network-lobby/)
  join-room handler; the case-id validator is wired to the
  [`docs/architecture/wiki/screens/75-content-report/`](../../../docs/architecture/wiki/screens/75-content-report/)
  submit handler.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
