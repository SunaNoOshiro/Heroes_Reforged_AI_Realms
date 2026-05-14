# Display-Name Policy

Canonical validator contract for any human-entered `displayName`
that crosses an M5 lobby surface — the multiplayer-setup form and
the network-lobby chat. The pure validator code is owned by
[Task 15](../../tasks/phase-3/01-multiplayer/15-display-name-validation.md);
this file owns the **rules**.

**Companion docs (read first):**
- [`chat-safety.md`](./chat-safety.md) — lobby-chat envelope, scope,
  and the reserved-but-unimplemented `ingame` value.
- [`signaling-payload-policy.md`](./signaling-payload-policy.md) —
  display names never traverse the signaling server.
- [`error-ux.md`](./error-ux.md) — surface mapping for rejection
  copy.
- [`dependency-policy.md`](./dependency-policy.md) — pinning rules
  for `unicode-confusables`.

**Schemas:**
- [`display-name.schema.json`](../../content-schema/schemas/display-name.schema.json)
  — local-profile field shape.
- [`chat-message.schema.json`](../../content-schema/schemas/chat-message.schema.json)
  — lobby-chat envelope (`senderId` only; carries no `displayName`).

---

## 1. Pipeline

```
input → NFC normalize → length-clamp → category-reject
      → reserved-name-reject → confusable-collision check (per room)
      → output | rejection reason
```

Each step is pure. Rejection reasons are stable strings (§ 7) that
the UI layer maps to localized copy via
[`error-ux.md`](./error-ux.md); no per-reason branching is allowed
inside the validator.

## 2. NFC normalization

`displayName.normalize("NFC")` is the canonical form. Inputs are
normalized before any further check; storage and on-the-wire
transmission also use the normalized form.

## 3. Length

| Bound | Value | Source |
|---|---|---|
| Minimum | 1 grapheme cluster | After NFC |
| Maximum | 24 grapheme clusters | After NFC; counted via `Intl.Segmenter` |

A single emoji ZWJ sequence (e.g. `👨‍👩‍👧‍👦`) is one grapheme
cluster, not four codepoints.

## 4. Category rejections

Reject if any character matches:

| Category | Range | Reason |
|---|---|---|
| Cf — format | (entire category) | Hides characters from rendering. |
| Cc — control | (entire category) | Same. |
| Co — private use | (entire category) | Unrenderable in standard fonts. |
| Zero-width | `U+200B`–`U+200D`, `U+FEFF` | Used for impersonation. |
| Bidi overrides | `U+202A`–`U+202E`, `U+2066`–`U+2069` | Reverse rendering. |

Rejection is **all-or-nothing**: any disallowed character fails the
entire input. There is no silent stripping.

## 5. Reserved names

After NFKC fold + lower-case, reject if the result equals any of:

```
host, system, server, admin, <empty>, [banned], [host], [system],
[server], moderator, mod, root, claude
```

The fold is **NFKC** so that confusable variants (e.g. fullwidth
`Ｈｏｓｔ`) collapse to the canonical form. A reserved-name match
returns the rejection reason `name.reserved`.

## 6. Confusable collision

Per room, after a candidate name passes §§ 2–5:

- Compute the UTS #39 confusable skeleton via the
  `unicode-confusables` table (CLDR-derived; pinned package version
  per [`dependency-policy.md`](./dependency-policy.md)).
- If the skeleton equals the skeleton of an existing peer in the
  same room, the client appends a `#NN` discriminator (`#01`–`#99`)
  until the result is unique. The discriminator is **client-side
  cosmetic**; the canonical record remains the pre-discriminator
  NFC form.
- If `#99` collides, return `name.collision_exhausted` and prompt
  the user to choose a different name.

The host's display name is the priority anchor — a peer joining a
room cannot displace the host's confusable bucket.

## 7. Rejection reasons

| Reason | Trigger | Localization key |
|---|---|---|
| `name.empty` | NFC length < 1 grapheme | `error.lobby.name.empty` |
| `name.too_long` | NFC length > 24 graphemes | `error.lobby.name.too_long` |
| `name.invalid_char` | § 4 category match | `error.lobby.name.invalid_char` |
| `name.reserved` | § 5 reserved-list match | `error.lobby.name.reserved` |
| `name.collision_exhausted` | § 6 `#99` exhausted | `error.lobby.name.collision_exhausted` |

## 8. Test vectors

| Input | Decision | Reason |
|---|---|---|
| `Alice` | accept | — |
| `` (empty) | reject | `name.empty` |
| `aaaaaaaaaaaaaaaaaaaaaaaaa` (25 chars) | reject | `name.too_long` |
| `Hidden​Text` | reject | `name.invalid_char` (zero-width) |
| `‮Alice` | reject | `name.invalid_char` (bidi) |
| `host` | reject | `name.reserved` |
| `Ｈｏｓｔ` (fullwidth) | reject | `name.reserved` (NFKC fold) |
| `Аlice` (Cyrillic А) when `Alice` exists in room | accept as `Аlice#01` | confusable, discriminator appended |
| `👨‍👩‍👧‍👦` | accept | one grapheme cluster |

## 9. Where the validator runs

The validator is a **pure function**; selectors call it from the UI
layer only. Every surface that carries a `displayName` or
`displayNameDraft` field invokes it before dispatch:

- **Multiplayer-setup form** ([screen 62](./wiki/screens/62-multiplayer-setup/))
  — on submit; rejection blocks the `CREATE_ROOM` / `JOIN_ROOM`
  signaling messages emitted by `HOST_MULTIPLAYER_SESSION` /
  `JOIN_MULTIPLAYER_SESSION`.
- **Network-lobby chat** ([screen 64](./wiki/screens/64-network-lobby/))
  — on send; rejection drops the draft locally with a localized
  inline error. Bound by
  [`64-network-lobby/data-contracts.md` § Display Name Validation](./wiki/screens/64-network-lobby/data-contracts.md).
- **In-game chat** — reserved post-M5 per
  [`chat-safety.md` § 1](./chat-safety.md#1-scope) and the
  `chat-message.schema.json` `scope` enum (`lobby` only in MVP).
  When the surface lands, it MUST invoke the same validator.

The signaling server **never** sees a display name (per
[`signaling-payload-policy.md` § 2](./signaling-payload-policy.md#2-denylist-never-traverses-signaling));
names are exchanged on the WebRTC DataChannel after host approval,
and the host validates joiner names there.

---

## 🔍 Sync Check

- **UI: ⚠** — [`64-network-lobby/data-contracts.md`](./wiki/screens/64-network-lobby/data-contracts.md) binds `validateDisplayName` correctly. [`62-multiplayer-setup`](./wiki/screens/62-multiplayer-setup/) does not document a `displayName` input field anywhere in its `spec.md`, `interactions.md`, or `data-contracts.md`, even though Task 15 and this policy treat the form as a validator call site.
- **Schema: ❌** — [`display-name.schema.json`](../../content-schema/schemas/display-name.schema.json) and this policy disagree on both length unit and allowed character set; the schema also lacks a row in [`schema-matrix.md`](./schema-matrix.md). Detail in `## ⚠ Issues`.
- **Tasks: ✔** — [Task 15](../../tasks/phase-3/01-multiplayer/15-display-name-validation.md) reads this doc First, references §§ 7–8 by anchor, and `tasks/task-registry.json` carries the entry. No orphan tasks point at this policy.

## ⚠ Issues

- **Schema vs policy contradiction (length unit + character set).** [`display-name.schema.json`](../../content-schema/schemas/display-name.schema.json) declares `maxLength: 24` (UTF-16 code units) and `pattern: "^[\\p{L}\\p{N}\\p{Zs}._\\-]+$"`, but this doc declares 24 **grapheme clusters** and an open Unicode set restricted only by the § 4 category deny-list. The two contracts disagree: the test vector `👨‍👩‍👧‍👦` (accept here) fails the schema pattern (emoji are `\p{So}`, not `\p{L}`), and any non-ASCII name long enough to exceed the schema's 24 code-unit cap while still ≤ 24 graphemes (e.g. ZWJ-rich emoji combos) is rejected by the schema but accepted by this policy. Per CLAUDE.md root contracts ("Schema evolution is additive-first; alias before remove") and [`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md), one of the two must be authoritative — recommend the schema be relaxed to match the policy (it is the validator contract owner) or, if the schema is authoritative, the policy and Task 15 test vectors must be tightened. Suggested resolution: update the schema's `maxLength` to align with the grapheme bound and broaden `pattern` to a category deny-list; owning task should be a new mvp-class entry under `mvp.08-persistence` or an extension of [Task 15](../../tasks/phase-3/01-multiplayer/15-display-name-validation.md). Skill did not edit the schema (Hard Prohibition D — never edit cross-checked files).
- **Missing schema-matrix row for `display-name.schema.json`.** The schema is not listed in [`schema-matrix.md`](./schema-matrix.md); only the `PrivacyOptions` row mentions `displayNameMode` indirectly. Per CLAUDE.md ("schemas in `src/content-schema/`") and the schema-matrix file's own role as the registry, every schema in `content-schema/schemas/` should appear there. Suggested values: title=`DisplayName`, registration=`local profile + lobby surfaces`, schema link, example link if available. Owning task: add to the same change that closes the schema/policy mismatch above.
- **Multiplayer-setup form is missing a documented `displayName` binding.** This policy and [Task 15 § Acceptance Criteria](../../tasks/phase-3/01-multiplayer/15-display-name-validation.md) both state the validator runs on the screen-62 submit path before `CREATE_ROOM` / `JOIN_ROOM`, but [`screens/62-multiplayer-setup/data-contracts.md`](./wiki/screens/62-multiplayer-setup/data-contracts.md), [`spec.md`](./wiki/screens/62-multiplayer-setup/spec.md), and [`interactions.md`](./wiki/screens/62-multiplayer-setup/interactions.md) document no `displayName` input or state binding for that screen. Per the wiki-screen contract (UI specs are SSOT for what the screen renders), screen 62 must declare the input, the state path it writes to, and the rejection-toast surface. Owning task: extend [Task 08 (`08-multiplayer-ui-lobby-invite-link-in-game-status`)](../../tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md) (primary owner of `MultiplayerLobby.tsx`) or amend [Task 15](../../tasks/phase-3/01-multiplayer/15-display-name-validation.md) to update the screen-62 package alongside the validator wiring. Skill did not edit either file (Hard Prohibition D).
- **In-game chat surface previously named the wrong screen.** The pre-rewrite text said "In-game chat (screen 65)"; screen 65 is [`map-editor`](./wiki/screens/65-map-editor/). [`chat-safety.md` § 1](./chat-safety.md#1-scope) marks in-game chat as reserved/not implemented in MVP, and [`chat-message.schema.json`](../../content-schema/schemas/chat-message.schema.json) restricts `scope` to `lobby`. Rewrote § 9 to mark the in-game-chat surface as reserved post-M5 with a forward-pointer to `chat-safety.md`; no new feature was added.
