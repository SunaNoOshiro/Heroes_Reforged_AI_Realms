# Authority

> Cross-link: [`trust-boundaries.md`](./trust-boundaries.md),
> [`determinism.md`](./determinism.md),
> [`security-model.md`](./security-model.md),
> [`pack-contract.md`](./pack-contract.md),
> [`peer-identity.md`](./peer-identity.md),
> [`turn-credentials.md`](./turn-credentials.md).

Single consolidated table for **who decides what**. Each row names
one decision, the authority for it, the owning module, and the
evidence file. Implementers reach for this file before picking an
authority for a new decision.

The identity row is a **runtime GAP** today — no peer / session
identity is enforced at runtime. The closing surface is scoped in
[`peer-identity.md`](./peer-identity.md) and tracked by tasks
[16](../../tasks/phase-3/01-multiplayer/16-peer-keypair-and-denylist.md),
[25](../../tasks/phase-3/01-multiplayer/25-peer-keypair-and-session-token.md),
[26](../../tasks/phase-3/01-multiplayer/26-signed-signaling-envelope.md),
and [27](../../tasks/phase-3/01-multiplayer/27-dtls-fingerprint-pinning.md);
all four are `planned` in the ledger.

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
| Peer / session identity | **Runtime GAP** — scoped only | `src/net/identity/` (planned) | [`peer-identity.md`](./peer-identity.md), [`peer-identity.schema.json`](../../content-schema/schemas/peer-identity.schema.json) | **yes** — peer-identity surface |
| Ban / refund | Maintainer | maintainer | git history of revocation-list updates per [`docs/operations/pack-signing-key.md`](../operations/pack-signing-key.md) | depends on identity gap |

---

## 2. Identity gap

What the runtime ships today:

- **Transport-layer integrity** via DTLS fingerprint pinning
  ([`dtls-fingerprint-pinning.md`](./dtls-fingerprint-pinning.md))
  — the channel is not MITMed, but it does not say *who* the peer is.
- **Session-scoped consistency** via per-match HMAC keyed by the
  derived `matchKey`
  ([`lockstep-envelope.md`](./lockstep-envelope.md)) — envelopes
  within one match are not forged, but cross-session continuity is
  not asserted.
- **Local pseudonymity** via `metadata.playerName`
  ([`display-name-policy.md`](./display-name-policy.md)) — a
  player-readable label only.

What the runtime does **not** ship today — closed by
[`peer-identity.md`](./peer-identity.md) once its tasks land:

- A persistent peer identity that survives reconnect.
- An attribution from `playerName` to a verifiable key.
- A maintainer-issued ban that survives a `playerName` change.

Until tasks
[16](../../tasks/phase-3/01-multiplayer/16-peer-keypair-and-denylist.md),
[25](../../tasks/phase-3/01-multiplayer/25-peer-keypair-and-session-token.md),
[26](../../tasks/phase-3/01-multiplayer/26-signed-signaling-envelope.md),
and
[27](../../tasks/phase-3/01-multiplayer/27-dtls-fingerprint-pinning.md)
ship, every identity-derived decision (ban, refund, peer reputation)
MUST treat `playerName` as untrusted and MUST NOT be the sole basis
for a moderation action.

---

## 3. TURN authority

TURN credential issuance is **scoped, not yet running**. The
credential contract is pinned in
[`turn-credentials.md`](./turn-credentials.md) (HMAC-SHA1
long-term-credential mechanism, 300 s TTL) and is owned by tasks
[33](../../tasks/phase-3/01-multiplayer/33-turn-credentials-doctrine-issuance.md)
and
[34](../../tasks/phase-3/01-multiplayer/34-turn-server-hardening.md);
both are `planned`. Until they ship, per-TURN authority rows in
[`trust-boundaries.md`](./trust-boundaries.md) § 3 remain
placeholders.

---

## 4. Adding a decision

A new authoritative decision (e.g., a new moderation surface)
requires:

1. Append a row to § 1 with all five columns filled.
2. Cross-link the owning module from
   [`trust-boundaries.md`](./trust-boundaries.md) § 3.
3. If the decision is identity-derived, gate it on the
   peer-identity surface landing first
   ([`peer-identity.md`](./peer-identity.md)).

---

## 🔍 Sync Check

- **UI: ✔** — No UI surface is claimed; the file is a registry of authorities and routes UI-affecting concerns to their evidence docs.
- **Schema: ✔** — [`canonical-packs.schema.json`](../../content-schema/schemas/canonical-packs.schema.json), [`pack-revocation-list.schema.json`](../../content-schema/schemas/pack-revocation-list.schema.json), [`save.schema.json`](../../content-schema/schemas/save.schema.json), and [`peer-identity.schema.json`](../../content-schema/schemas/peer-identity.schema.json) all exist on disk and match the authorities they back.
- **Tasks: ⚠** — Identity / TURN rows now reference real `planned` tasks (`phase-3.01-multiplayer.16/25/26/27`, `33`, `34`); the prior "deferred — surface does not exist" framing was stale. Sibling [`trust-boundaries.md` § 6](./trust-boundaries.md) still calls the closing surface "deferred" and points at `authority.md § GAP`; resolving the wording is owned by the trust-boundaries doc and is non-blocking.

## ⚠ Issues

- **Stale "deferred" framing in `trust-boundaries.md` § 6.** The sibling doc says the peer-identity surface is "deferred" and links to `authority.md § GAP`. With [`peer-identity.md`](./peer-identity.md), [`peer-identity.schema.json`](../../content-schema/schemas/peer-identity.schema.json), and tasks 16/25/26/27 in place, the accurate phrasing is "scoped, planned." Per Hard Prohibition D, this audit did not edit `trust-boundaries.md`. Suggested wording: "Closing the gap is scoped in [`peer-identity.md`](./peer-identity.md); see [`authority.md` § 2](./authority.md#2-identity-gap)."
- **Anchor reference `authority.md § GAP` does not resolve.** [`trust-boundaries.md`](./trust-boundaries.md) line 151 references `§ GAP`, but this file's heading is `## 2. Identity gap`. The audit kept the heading text stable to preserve any inbound `#2-identity-gap` link; the trust-boundaries reference is still a colloquial pointer rather than a strict anchor. The trust-boundaries doc should update to `§ 2 Identity gap` next time it is touched.
- **Pack-signature `keyId` registry pointer.** Row "Pack signature" lists `canonical-packs.schema.json` as the registry. The actual canonical first-party-key registry is `resources/canonical-packs.json` (the schema only validates its shape). The current row is technically correct (the schema is the contract), but a reader skimming for the data file may miss it. Surfaced for owner judgment; not changed here because the row already cross-links to [`pack-signing.md`](./pack-signing.md), which names both.
