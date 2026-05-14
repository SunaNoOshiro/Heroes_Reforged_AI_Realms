# Revocation (post-publication takedown of distributed packs)

How a pack that is later found to violate IP or safety is removed
from clients **after** distribution. Pre-publication moderation —
text moderation, hard caps, and `sandboxed: true` — already runs at
authoring time per
[`pack-contract.md`](./pack-contract.md) and
[`ai-generation-pipeline.md`](./ai-generation-pipeline.md). Once a
pack ships (export, forum post, eventual marketplace), the
maintainer needs a takedown path; this file pins three components:

1. a maintainer-signed registry,
2. a client-side check at pack load,
3. a replay-fallback rule.

> **Orthogonal sibling.** The client-local **user-decision**
> revocation surface (a user revoking trust for a pack they
> personally installed) lives in
> [`pack-revocation-list.schema.json`](../../content-schema/schemas/pack-revocation-list.schema.json)
> per [`pack-trust.md` § Trust Anchors](./pack-trust.md#4-trust-anchors).
> This file is the **maintainer-signed** side only; the two surfaces
> never alias each other.

## 1. Signed Revocation Registry

The maintainer publishes a
[`revocation-registry`](../../content-schema/schemas/revocation-registry.schema.json)
signed with the maintainer key. Each row is a
[`revocation-entry`](../../content-schema/schemas/revocation-entry.schema.json):

- `contentHash` — same value the pack itself writes into
  `manifest.contentHash` per
  [`pack-contract.md` § Manifest v1](./pack-contract.md#manifest-v1).
- `reasonCode` — stable namespaced id (e.g.
  `revocation.ip.likeness`, `revocation.safety.nsfw`).
- `revokedAt` — ISO-8601 timestamp.
- `signature` — Ed25519 over the canonical-JSON serialization of
  the entry; comparison rules per
  [`crypto-rules.md`](./crypto-rules.md).

Envelope rules:

- The envelope carries a monotonic integer `version` and an outer
  `signature` over `version` + `entries`.
- Clients refuse a registry whose `version` is **lower** than the
  cached one (rollback defeat).
- Clients refuse a registry whose outer signature does not verify
  against the maintainer key referenced from
  [`resources/canonical-packs.json`](../../resources/canonical-packs.json).

The maintainer-side signing-key operationalization (key custody,
rotation, publication endpoint) is **deferred** until a sharing
layer is actually being built.

## 2. Client-Side Check

The launcher and `src/content-runtime/` fetch the registry on launch
and **cache the last-known copy** so offline clients keep working
with the most recent registry they saw.

At pack load:

- If `manifest.contentHash` matches a registry entry, the pack is
  **rejected from canonical contexts** (ranked matchmaker, signed
  marketplace listing) and the mod manager surfaces a
  `pack.error.revoked` warning carrying the matched `reasonCode`.
- A user MAY explicitly re-enable a revoked pack from the "Revoked
  content" review surface, but only in **sandbox contexts** per
  [`pack-contract.md` § Sandbox enforcement](./pack-contract.md#sandbox-enforcement).

## 3. Replay Fallback

Replays referencing a revoked pack remain **playable** in a
"revoked content present" mode so old replays do not silently break
when a pack is revoked years later. The replay surface flags the
revoked pack alongside its `reasonCode` so reviewers can decide
case-by-case whether the recorded outcome is canonical.

A **canonical** replay (multiplayer or trusted leaderboard)
**rejects** revoked packs at session-creation time, mirroring the
ranked-matchmaker rule in § 2.

---

## 🔍 Sync Check

- **UI: ⚠** — Mod-manager warning `pack.error.revoked` is named
  here but does not appear in
  [`wiki/screens/71-pack-manager/data-contracts.md`](./wiki/screens/71-pack-manager/data-contracts.md)
  (which lists `ui.pack-trust.error.revoked` for the orthogonal
  user-decision surface). Maintainer-side warning string is not yet
  pinned to a screen package. See `## ⚠ Issues`.
- **Schema: ✔** —
  [`revocation-registry.schema.json`](../../content-schema/schemas/revocation-registry.schema.json)
  and
  [`revocation-entry.schema.json`](../../content-schema/schemas/revocation-entry.schema.json)
  match this doc's field set (`contentHash`, `reasonCode`,
  `revokedAt`, `signature`, plus envelope `version` / `signature`);
  rows for both `RevocationRegistry` and `RevocationEntry` exist in
  [`schema-matrix.md`](./schema-matrix.md).
- **Tasks: ✔** — Owning task
  [`phase-2.05-mod-system.11-revocation-registry`](../../tasks/phase-2/05-mod-system/11-revocation-registry.md)
  references this doc as Owned Path; the cross-references in
  [`pack-contract.md` § Revocation](./pack-contract.md#revocation)
  and [`content-platform.md`](./content-platform.md) both resolve.

## ⚠ Issues

- **Mod-manager warning string `pack.error.revoked` is not pinned
  to a screen package.** This doc references it as the warning
  surfaced by the mod manager when a pack matches the maintainer-
  signed registry, but
  [`wiki/screens/71-pack-manager/`](./wiki/screens/71-pack-manager/)
  only declares `ui.pack-trust.error.revoked` for the user-decision
  list. Per
  [`pack-trust.md` § Trust Anchors](./pack-trust.md#4-trust-anchors),
  these are two distinct surfaces; the screen-71 strings table
  should add the maintainer-side row. Owner:
  [`phase-2.05-mod-system.11-revocation-registry`](../../tasks/phase-2/05-mod-system/11-revocation-registry.md)
  (the registry task) co-owning with the screen-71 implementation
  task. Suggested key: `ui.pack-manager.error.revoked-by-maintainer`
  (or keep `pack.error.revoked` and register it in screen-71's
  strings table). Skill did not edit either file (Hard
  Prohibition D).
- **Cached revocation registry is not registered in
  `data-inventory.md`.** This doc states "clients cache the last-
  known copy so offline clients keep working with the most recent
  registry they saw". Per CLAUDE.md root contract ("every persisted
  field is registered in `data-inventory.md`") and
  [`persistence.md`](./persistence.md), persisting the registry
  across launches requires an inventory row. Today
  [`data-inventory.md`](./data-inventory.md) only has the trust-
  store row. Owner:
  [`phase-2.05-mod-system.11-revocation-registry`](../../tasks/phase-2/05-mod-system/11-revocation-registry.md)
  must add the row before this slice can ship. Suggested values:
  domain=`pack-runtime`, owner=
  `phase-2.05-mod-system.11-revocation-registry`,
  store=`hr-revocation.registry`, persistence=`indexeddb`,
  retention=`until next successful refresh`, wipe-scope=
  `WIPE_LOCAL_DATA scope=all`.
- **Maintainer revocation key is not present in
  `resources/canonical-packs.json`.** This doc says clients verify
  the outer signature "against the maintainer key referenced from
  `resources/canonical-packs.json`", but
  [`canonical-packs.json`](../../resources/canonical-packs.json)
  currently lists only per-pack `signatureKeyId` values
  (`hr-official-2026`); no maintainer-revocation key is broken out.
  This is consistent with the doc's explicit statement that
  maintainer-side key custody is **deferred**, but the gap should
  be tracked. Owner: deferred — closes when the sharing layer is
  scheduled. Skill did not edit either file (Hard Prohibition D
  plus restricted-list precaution on canonical resource registries).
