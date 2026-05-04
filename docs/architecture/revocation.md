# Revocation (post-publication takedown of distributed packs)

How a pack that is later found to violate IP or safety is removed
from clients.

Pre-publication moderation already exists: text moderation, hard
caps, and `sandboxed: true` (see
[`pack-contract.md`](./pack-contract.md) and
[`ai-generation-pipeline.md`](./ai-generation-pipeline.md)). After
a pack is shared (exported, posted to a forum, eventually a
marketplace), there must be a path to revoke it. This file pins the
three components: a signed list, a client-side check, and a
replay-fallback rule.

## 1. Signed Revocation List

The maintainer publishes
[`content-schema/schemas/revocation-registry.schema.json`](../../content-schema/schemas/revocation-registry.schema.json)
records signed with the maintainer key. Each row is a
[`revocation-entry.schema.json`](../../content-schema/schemas/revocation-entry.schema.json)
carrying:

- `contentHash` — same value the pack itself writes into
  `manifest.contentHash`.
- `reasonCode` — stable namespaced id such as
  `revocation.ip.likeness` or `revocation.safety.nsfw`.
- `revokedAt` — ISO-8601 timestamp.
- `signature` — ed25519 over the canonical-JSON serialization of
  the entry.

The registry envelope itself carries a monotonic `version` and an
outer `signature`. Clients refuse a registry with a lower `version`
than the cached one (rollback defeat) and refuse a registry whose
outer signature does not verify against the maintainer key in
[`resources/canonical-packs.json`](../../resources/canonical-packs.json).

## 2. Client-Side Check

The client (launcher + content-runtime) fetches the registry on
launch and caches it. At pack load:

- If `manifest.contentHash` matches a registry entry, the pack is
  rejected from canonical contexts (ranked matchmaker, signed
  marketplace listing) and surfaces a `pack.error.revoked` warning
  in the mod manager.
- A user can still explicitly enable a revoked pack from a
  "Revoked content" review surface — but only in sandbox contexts
  per [`pack-contract.md` § Sandbox Enforcement`](./pack-contract.md#sandbox-enforcement).

The cache refreshes on launch; offline clients keep working with
the last-known registry.

## 3. Replay Fallback

Replays referencing a revoked pack remain **playable** in a
"revoked content present" mode so old replays do not silently break
when a pack is revoked years later. The replay surface flags the
revoked pack alongside its `reasonCode` so reviewers can decide
case-by-case whether the recorded outcome is canonical.

A canonical replay (multiplayer or trusted leaderboard) **rejects**
revoked packs at session-creation time, mirroring the ranked
matchmaker rule.

## Why This Matters

- A marketplace or sharing layer cannot ship safely without a
  takedown story.
- A pack that turns out to violate IP or safety after distribution
  is otherwise unreachable from the maintainer side.
- Replays referencing revoked packs would have undefined behavior
  without an explicit rule.

This file is the contract; the maintainer-side signing key
operationalization (key custody, rotation, publication endpoint) is
deferred until a sharing layer is actually being built.
