# Spectator Mode Requirements

Spectator mode is **out of M5 scope**. This file is the
*requirements doctrine* for any future Phase-4 spectator
implementation, pinned now so when the work lands it inherits
all of the multiplayer-security protections rather than
re-introducing the gaps.

Companion docs:
[`security-model.md`](./security-model.md),
[`lockstep-envelope.md`](./lockstep-envelope.md),
[`match-handshake.md`](./match-handshake.md).

Owning task (placeholder):
[`tasks/phase-4/spectator-mode/00-requirements.md`](../../tasks/phase-4/spectator-mode/00-requirements.md).

---

## 1. The shape

A spectator client receives the canonical command log + handshake
nonces from one of:

- **The host peer**, if both players consent to a host-relayed
  spectator mode.
- **A relay service**, if a Phase-4 audit-pipeline back-end exists
  that fans out replays.

Either way the spectator runs the same deterministic reducer as
the players. The spectator's projection of state through
`viewWorldVisibleObjects` mirrors the player perspective the
spectator chooses (Player A perspective, Player B perspective, or
"observer" with no fog).

---

## 2. Required protections inherited from the multiplayer security model

Any spectator implementation MUST satisfy:

| Protection | Source | Why it applies to spectators |
| --- | --- | --- |
| Envelope MAC | [`lockstep-envelope.md`](./lockstep-envelope.md) | Spectators verify every envelope MAC against the published `matchKey`; a forged stream cannot pass the MAC check. |
| Handshake binding | [`match-handshake.md`](./match-handshake.md) | Spectators receive the handshake nonces and re-derive `matchId`, `matchKey`, `seed` independently. They do NOT trust the host's claim about these values. |
| Read-only mode | this doc | Spectator clients NEVER sign or send their own commands. The lockstep transport refuses to wrap spectator-side input. |
| Visibility precondition | [`command-schema.md`](./command-schema.md) § Visibility Precondition | Per-perspective projection respects the chosen player's visibility; "observer" mode with no fog is opt-in by the players. |
| Pack signature + build attestation | [`pack-contract.md`](./pack-contract.md), [`build-attestation.md`](./build-attestation.md) | Spectators run the canonical engine bundle and load packs whose signatures match. |
| No information re-emission | this doc | Spectators MUST NOT re-broadcast hidden state to other spectators or to the players; their projection is local only. |

---

## 3. Required protections specific to spectators

| Surface | Requirement |
| --- | --- |
| **Multi-recipient fan-out integrity** | If a relay distributes the stream to N spectators, each spectator independently verifies envelope MACs. The relay does NOT re-sign messages; it forwards them as-is. |
| **Late-join replay** | A spectator joining mid-match receives the canonical command log from the start of the match (including handshake nonces) and replays from `seq=0`. They never trust a "current state snapshot" from a peer. |
| **Spectator identity** | Spectator clients have their own `peerId` separate from player `peerId` so the lockstep transport can refuse spectator-emitted commands by identity. |
| **Consent UX** | Each player must explicitly consent to spectator mode at lobby time. Default is "spectators not allowed". |
| **Fog mode** | Each player chooses whether spectators see their fog: "show my fog" (default) or "show no fog" (only for friendly matches that opt in). |
| **Identity disclosure to spectators** | Spectators see player display names per the lobby's display-name policy ([`display-name-policy.md`](./display-name-policy.md)); they do NOT see `peerId` or IP. |

---

## 4. Out-of-scope notes for future implementers

- **Spectator chat with players**: out of M5 chat-safety scope; if
  introduced, must reuse the chat envelope from
  [`chat-safety.md`](./chat-safety.md) and the
  rate-limit / mute / block surfaces.
- **Public spectator URLs**: a public URL that joins as spectator
  must NOT carry `matchKey` or any handshake material; it must
  carry only a relay endpoint + match identifier, and the
  spectator client must fetch the (public) handshake nonces from
  the relay over TLS.
- **Replay-after-match spectator**: identical to the audit pipeline
  in [`replay-audit-pipeline.md`](./replay-audit-pipeline.md);
  the same upload payload structure works as the spectator load
  format.

---

## 5. Acceptance gate for the future task

`tasks/phase-4/spectator-mode/00-requirements.md` is the
placeholder. Any subsequent implementation task must cite this
doctrine in its `Read First` section and add one acceptance
criterion per row of the tables in §§ 2–3.
