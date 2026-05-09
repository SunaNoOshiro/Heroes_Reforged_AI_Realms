# Display-Name Policy

This file is the canonical validator contract for any
human-entered `displayName` field that crosses an M5 lobby
surface — the multiplayer-setup form, the network-lobby chat, and
the in-game chat.

The pure validator code is owned by Task 15
([`tasks/phase-3/01-multiplayer/15-display-name-validation.md`](../../tasks/phase-3/01-multiplayer/15-display-name-validation.md)).
This doc owns the **rules**.

---

## 1. Pipeline

```
input → NFC normalize → length-clamp → category-reject → reserved-name-reject
      → confusable-collision check (per room) → output (or rejection reason)
```

Each step is pure. Rejection reasons are stable strings (see § 6)
that the UI maps to localized error copy via `error-ux.md`.

## 2. NFC normalization

`displayName.normalize("NFC")` is the canonical form. Inputs are
always normalized before any further check; storage and on-the-wire
transmission use the normalized form.

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

Reject after NFKC fold + lower-case if the result equals any of:

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
  `unicode-confusables` table (CLDR-derived; pinned package
  version, see [`dependency-policy.md`](./dependency-policy.md)).
- If the skeleton equals the skeleton of an existing peer in the
  same room, the client appends a `#NN` discriminator
  (`#01..#99`) until the result is unique. The discriminator is
  **client-side cosmetic**; the canonical record remains the
  pre-discriminator NFC form.
- If `#99` collides, return `name.collision_exhausted` and the
  user is prompted to choose a different name.

The host's display name is the priority anchor — a peer joining a
room cannot displace the host's confusable bucket.

## 7. Rejection reasons

| Reason | Trigger | Localization key |
|---|---|---|
| `name.empty` | NFC length < 1 grapheme | `error.lobby.name.empty` |
| `name.too_long` | NFC length > 24 graphemes | `error.lobby.name.too_long` |
| `name.invalid_char` | § 4 category match | `error.lobby.name.invalid_char` |
| `name.reserved` | § 5 reserved list match | `error.lobby.name.reserved` |
| `name.collision_exhausted` | § 6 `#99` exhausted | `error.lobby.name.collision_exhausted` |

The UI surface maps each reason via the existing localization
pipeline; no per-reason branching is allowed inside the validator.

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

- **Multiplayer-setup form** (screen 62): on submit; rejection
  blocks `CREATE_ROOM` / `JOIN_ROOM`.
- **Network lobby chat** (screen 64): on send; rejection drops
  the chat draft locally with a localized inline error.
- **In-game chat** (screen 65): on send; same as lobby chat.
- The validator is a **pure function**; selectors call it from
  the UI layer only. The signaling server **never** sees a
  display name (see
  [`signaling-payload-policy.md`](./signaling-payload-policy.md));
  the host validates joiner names on the WebRTC DataChannel after
  approval.
