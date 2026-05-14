# Spectator Mode Requirements

Spectator mode is **out of M5 scope**. This file is the
*requirements doctrine* any future Phase-4 spectator implementation
must inherit, pinned now so the work picks up every multiplayer-
security protection rather than re-introducing the gaps.

Companion docs:
[`security-model.md`](./security-model.md),
[`lockstep-envelope.md`](./lockstep-envelope.md),
[`match-handshake.md`](./match-handshake.md),
[`command-schema.md`](./command-schema.md),
[`pack-contract.md`](./pack-contract.md),
[`build-attestation.md`](./build-attestation.md),
[`display-name-policy.md`](./display-name-policy.md),
[`chat-safety.md`](./chat-safety.md),
[`replay-audit-pipeline.md`](./replay-audit-pipeline.md).

Owning task (placeholder):
[`tasks/phase-4/spectator-mode/00-requirements.md`](../../tasks/phase-4/spectator-mode/00-requirements.md).

---

## 1. Shape

A spectator client receives the canonical command log + handshake
nonces from one of:

- **The host peer**, when both players consent to host-relayed
  spectating.
- **A relay service**, when a Phase-4 audit-pipeline back-end exists
  that fans out replays.

Either way the spectator runs the same deterministic reducer as the
players. The spectator's projection through `viewWorldVisibleObjects`
mirrors the perspective the spectator chose: Player A, Player B, or
"observer" (no fog).

---

## 2. Protections inherited from the multiplayer security model

Any spectator implementation MUST satisfy:

| Protection | Source | Why it applies to spectators |
| --- | --- | --- |
| Envelope MAC | [`lockstep-envelope.md`](./lockstep-envelope.md) | Spectators verify every envelope MAC against `matchKey`; a forged stream cannot pass the check. |
| Handshake binding | [`match-handshake.md`](./match-handshake.md) | Spectators receive the handshake nonces and re-derive `matchId`, `matchKey`, `seed` independently — they never trust the host's claim about these values. |
| Read-only mode | this doc | Spectator clients NEVER sign or send commands; the lockstep transport refuses to wrap spectator-side input. |
| Visibility precondition | [`command-schema.md`](./command-schema.md) § Visibility Precondition | Per-perspective projection respects the chosen player's visibility; "observer" mode (no fog) is opt-in by both players. |
| Pack signature + build attestation | [`pack-contract.md`](./pack-contract.md) § Signature Policy, [`build-attestation.md`](./build-attestation.md) | Spectators run the canonical engine bundle and load packs whose signatures match. |
| No information re-emission | this doc | Spectators MUST NOT re-broadcast hidden state to other spectators or to the players; their projection is local only. |

---

## 3. Protections specific to spectators

| Surface | Requirement |
| --- | --- |
| **Multi-recipient fan-out integrity** | When a relay distributes the stream to N spectators, each spectator independently verifies envelope MACs. The relay forwards messages as-is and MUST NOT re-sign them. |
| **Late-join replay** | A spectator joining mid-match receives the canonical command log from `seq=0` (including handshake nonces) and replays from the start. They never trust a "current state snapshot" from a peer. |
| **Spectator identity** | Spectator clients use a `peerId` separate from the player `peerId` set so the lockstep transport can refuse spectator-emitted commands by identity. |
| **Consent UX** | Each player must explicitly consent to spectator mode at lobby time. Default is "spectators not allowed". |
| **Fog mode** | Each player chooses whether spectators see their fog: "show my fog" (default) or "show no fog" (only when both players opt in for friendly matches). |
| **Identity disclosure** | Spectators see player display names per [`display-name-policy.md`](./display-name-policy.md); they do NOT see `peerId` or IP. |

---

## 4. Out-of-scope notes for future implementers

- **Spectator chat with players.** Out of M5 chat-safety scope; if
  introduced, must reuse the chat envelope from
  [`chat-safety.md`](./chat-safety.md) and the existing
  rate-limit / mute / block surfaces.
- **Public spectator URLs.** A public URL that joins as spectator
  MUST NOT carry `matchKey` or any handshake material. It carries
  only a relay endpoint + match identifier; the spectator client
  fetches the (public) handshake nonces from the relay over TLS.
- **Replay-after-match spectator.** Identical to the audit pipeline
  in [`replay-audit-pipeline.md`](./replay-audit-pipeline.md); the
  same upload payload doubles as the spectator load format.

---

## 5. Acceptance gate for the future task

[`tasks/phase-4/spectator-mode/00-requirements.md`](../../tasks/phase-4/spectator-mode/00-requirements.md)
is the placeholder. Any subsequent implementation task in the
`phase-4.spectator-mode` module MUST:

- cite this doctrine in its `Read First` block, and
- add one acceptance criterion per row of the tables in §§ 2–3.

---

## 🔍 Sync Check

- **UI: ✔** — No M5 UI surface ships for spectator mode (out of scope by design); the consent / fog-mode / identity-disclosure surfaces in §§ 2–3 are forward requirements for the future Phase-4 lobby and player perspective UI, not claims about an existing screen package.
- **Schema: ✔** — Inherited contracts ([`lockstep-envelope.schema.json`](../../content-schema/schemas/lockstep-envelope.schema.json), [`match-handshake.schema.json`](../../content-schema/schemas/match-handshake.schema.json), pack-contract trust fields, build-attestation allow-list) match the cited sibling docs; no spectator-specific schema is asserted, consistent with the placeholder status.
- **Tasks: ⚠** — Owning placeholder [`phase-4.spectator-mode.00-requirements`](../../tasks/phase-4/spectator-mode/00-requirements.md) reads-first this doc, depends on `phase-3.01-multiplayer.13-security-model-and-doctrine`, and registers in [`tasks/task-registry.json`](../../tasks/task-registry.json). Two link gaps remain (broken `command-schema.md` anchor, missing `INDEX.md` row); see ⚠ Issues.

## ⚠ Issues

- **Broken cross-reference `command-schema.md § Visibility Precondition`.** The § 2 table cites that anchor; the same anchor is referenced from [`security-model.md`](./security-model.md), [`lockstep-envelope.md`](./lockstep-envelope.md), and [`build-attestation.md`](./build-attestation.md). [`command-schema.md`](./command-schema.md) has no `## Visibility Precondition` heading — the closest existing material is `## Field Visibility (Desync Redaction)` (a redactor convention, not a runtime precondition). The runtime contract is owned by [`tasks/phase-3/01-multiplayer/12-visibility-preconditions-on-commands.md`](../../tasks/phase-3/01-multiplayer/12-visibility-preconditions-on-commands.md). Per CLAUDE.md root contract on canonical anchors, the fix is to add a `## Visibility Precondition` section to `command-schema.md` ("the issuing peer's projection at `turn` MUST permit observation of every tile / entity referenced by `command`; rejected commands canonically resolve to `COMMAND_REJECTED_PRECONDITION` on both peers"). Owner: task `phase-3.01-multiplayer.12`. Surfaced rather than rewritten because four arch docs share the broken anchor — unilateral rewriting in this file alone would split the canonical statement. Skill did not edit `command-schema.md` (Hard Prohibition D). Same gap was flagged by [`lockstep-envelope.md`'s audit](./lockstep-envelope.md).
- **Missing INDEX row.** [`docs/architecture/INDEX.md`](./INDEX.md) lists every other arch doc under its numbered map but has no row for `spectator-mode-requirements.md`; the only inbound mention there is the spectator gating bullet on `security-model.md`'s row. Per the INDEX-as-architecture-map convention used throughout the folder, an entry such as `[spectator-mode-requirements.md](spectator-mode-requirements.md) — out-of-M5 doctrine; requirements any future Phase-4 spectator implementation must inherit.` should be added. Owner: a follow-up doc-housekeeping pass on `INDEX.md` (no task in the registry currently owns generic INDEX upkeep). Skill did not edit `INDEX.md` (Hard Prohibition D).
