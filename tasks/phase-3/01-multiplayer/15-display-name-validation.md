# Display-Name Validation

Status: planned

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Pure validator for any human-entered `displayName` field that
crosses an M5 lobby surface (multiplayer setup, lobby chat,
in-game chat). NFC normalization, grapheme-cluster length bounds,
category rejection, reserved-name list, UTS #39 confusable
collision detection.

Read First:
- [`docs/architecture/display-name-policy.md`](../../../docs/architecture/display-name-policy.md)
- [`docs/architecture/wiki/screens/62-multiplayer-setup/data-contracts.md`](../../../docs/architecture/wiki/screens/62-multiplayer-setup/data-contracts.md)
- [`docs/architecture/wiki/screens/64-network-lobby/data-contracts.md`](../../../docs/architecture/wiki/screens/64-network-lobby/data-contracts.md)

Inputs:
- `Intl.Segmenter` for grapheme-cluster counting
- `unicode-confusables` package (UTS #39 data); pinned version
  per [`docs/architecture/dependency-policy.md`](../../../docs/architecture/dependency-policy.md)

Outputs:
- `src/profile/displayName.ts` — `validateDisplayName(input,
  { existingNames }): ValidationOutcome`. Pure; no I/O, no clock,
  no random.
- Unit tests under `src/profile/__tests__/displayName.test.ts`
  exercising every test vector in
  [`display-name-policy.md` § 8](../../../docs/architecture/display-name-policy.md#8-test-vectors).

Owned Paths:
- `src/profile/displayName.ts`

Owned Paths (shared):
- Task 08 ([`08-multiplayer-ui-lobby-invite-link-in-game-status.md`](./08-multiplayer-ui-lobby-invite-link-in-game-status.md))
  is the **primary owner** of the multiplayer-setup form
  (`src/ui/components/MultiplayerLobby.tsx`); this task contributes
  only the validator call site. The UI integration is **additive**:
  it does not rewrite the existing form layout or state shape.

Dependencies:
- None

Acceptance Criteria:
- Every test vector in
  [`display-name-policy.md` § 8](../../../docs/architecture/display-name-policy.md#8-test-vectors)
  passes — including the fullwidth `Ｈｏｓｔ` NFKC case and the
  Cyrillic-А confusable case.
- `validateDisplayName(input, { existingNames: [...] })` returns
  one of `{ ok: true, value }` or `{ ok: false, reason }` where
  `reason` is one of the stable strings in
  [`display-name-policy.md` § 7](../../../docs/architecture/display-name-policy.md#7-rejection-reasons).
- The validator is a **pure function**; the unit-test suite asserts
  no `Math.random()`, `Date.now()`, async, or I/O is invoked
  during validation.
- Length bound is **grapheme clusters**, not codepoints — the test
  suite includes `👨‍👩‍👧‍👦` (one grapheme cluster, multiple
  codepoints).
- Confusable check uses the same skeleton table on Chrome,
  Firefox, and Safari (Playwright cross-engine job).
- Multiplayer-setup form and lobby-chat send path both invoke the
  validator before dispatching `CREATE_ROOM`, `JOIN_ROOM`, or
  `SEND_LOBBY_CHAT`. Rejected input renders the localized error
  inline; no command is dispatched.
- **Screen package coverage**: validation call sites match the
  bindings declared in
  [`docs/architecture/wiki/screens/62-multiplayer-setup/data-contracts.md`](../../../docs/architecture/wiki/screens/62-multiplayer-setup/data-contracts.md)
  and
  [`docs/architecture/wiki/screens/64-network-lobby/data-contracts.md`](../../../docs/architecture/wiki/screens/64-network-lobby/data-contracts.md);
  no validator is invoked outside those packages.
- **Shared-ownership split with Task 08**: Task 08 is the
  **primary owner** of `src/ui/components/MultiplayerLobby.tsx`.
  This task's contribution is **additive**: it MUST NOT rewrite
  the existing form layout, slot list, or chat panel; only the
  validator-call site is added.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
