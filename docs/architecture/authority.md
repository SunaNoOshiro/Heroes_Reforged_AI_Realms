# Authority

> Cross-link: [`trust-boundaries.md`](./trust-boundaries.md),
> [`determinism.md`](./determinism.md),
> [`security-model.md`](./security-model.md),
> [`pack-contract.md`](./pack-contract.md).

Single consolidated table for **who decides what**. Each row names
one decision, the authority for it, the owning module, and the
evidence file. Implementers reach for this file before picking an
authority for a new decision.

The identity row is a **GAP** today: no peer / session identity
authority exists in the repo. Closing the gap is owned by the
peer-identity surface (deferred).

---

## 1. Decision table

| Decision | Authority | Owning module | Evidence | Identity-gap? |
|---|---|---|---|---|
| Command legality | Deterministic reducer | `src/engine/` | [`determinism.md`](./determinism.md), [`command-schema.md`](./command-schema.md) | no |
| RNG | PCG32 seeded by `match-handshake` commit-reveal | `src/engine/rng/` | [`rng-streams.md`](./rng-streams.md), [`match-handshake.md`](./match-handshake.md) | no |
| Content (units, heroes, spells, …) | Pack manifest + `content-runtime` registries | `src/content-runtime/` | [`pack-contract.md`](./pack-contract.md), [`pack-resolver.md`](./pack-resolver.md) | no |
| Sandbox policy | Pack `sandboxed` flag + capability allow-list | `src/content-runtime/` | [`pack-contract.md`](./pack-contract.md), [`sandbox-model.md`](./sandbox-model.md) | no |
| Lockstep ordering | Per-peer consensus on the canonical command stream | `src/net/lockstep/` | [`lockstep-envelope.md`](./lockstep-envelope.md), [`security-model.md`](./security-model.md) | no |
| Host migration | Heartbeat election among peers | `src/net/lobby/` | [`tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md`](../../tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md) | no |
| Pack signature | Ed25519 verification against [`canonical-packs.schema.json`](../../content-schema/schemas/canonical-packs.schema.json) + [`pack-revocation-list.schema.json`](../../content-schema/schemas/pack-revocation-list.schema.json) | `src/content-runtime/` | [`pack-signing.md`](./pack-signing.md) | no |
| Output moderation | Closed `ModerationProvider` interface (gateway-side) | `services/ai-gateway/` | [`ai-moderation-contract.md`](./ai-moderation-contract.md) | no |
| Prompt hygiene | Stage 1.5 of the AI generation pipeline | `services/ai-gateway/` | [`ai-generation-pipeline.md`](./ai-generation-pipeline.md) | no |
| Save / replay validity | `save.schema.json` + envelope MAC | `src/persistence/` | [`save-envelope-mac.md`](./save-envelope-mac.md), [`save-migration.md`](./save-migration.md) | no |
| Peer / session identity | **GAP** — no application-layer authority today | n/a | n/a | **yes** — peer-identity surface |
| Ban / refund | Maintainer | maintainer | git history of revocation-list updates per [`docs/operations/pack-signing-key.md`](../operations/pack-signing-key.md) | depends on identity gap |

---

## 2. Identity gap

The repo today provides:
- **Transport-layer integrity** via DTLS fingerprint pinning
  ([`dtls-fingerprint-pinning.md`](./dtls-fingerprint-pinning.md))
  — guarantees the channel is not MITMed, but not who the peer is.
- **Session-scoped consistency** via per-match HMAC keyed by the
  derived `matchKey`
  ([`lockstep-envelope.md`](./lockstep-envelope.md)) — guarantees
  the wire envelopes within one match are not forged, but not
  that the same identity ran them.
- **Local pseudonymity** via `metadata.playerName`
  ([`display-name-policy.md`](./display-name-policy.md)) —
  player-readable label only.

The repo today does **not** provide:
- A persistent peer identity that survives reconnect.
- An attribution from `playerName` to a verifiable key.
- A maintainer-issued ban that survives a `playerName` change.

Closing the gap is owned by the peer-identity surface (deferred).
Until it lands, every "identity-derived" decision (ban, refund,
peer reputation) MUST treat `playerName` as untrusted and MUST
NOT be the sole basis for a moderation action.

---

## 3. TURN authority

The TURN service does not exist (deferred to a TURN-credentials
surface). Per-TURN authority rows in
[`trust-boundaries.md`](./trust-boundaries.md) § 3 are
placeholders; closing them depends on TURN being scoped.

---

## 4. Adding a decision

A new authoritative decision (e.g., a new moderation surface)
requires:
1. Append a row to § 1 with all five columns filled.
2. Cross-link the owning module from
   [`trust-boundaries.md`](./trust-boundaries.md) § 3.
3. If the decision is identity-derived, gate it on the
   identity-authority surface landing first.
