# Sandbox Model — Trust Tiers and Capability Matrix

> Source plan:
> [`docs/implementation-plans/28-asset-loading-and-sandboxing-plan.md`](../implementation-plans/28-asset-loading-and-sandboxing-plan.md)
> § Architecture — `sandbox-model.md`.

`manifest.sandboxed: boolean` is a one-bit declaration; this doc
turns it into a **capability matrix** keyed on a closed
`trustTier` enum. Every loader, registry, override-resolver, and
storage / network surface that touches a pack consults the matrix
before granting the corresponding capability.

Companion docs:
- [`asset-loading.md`](./asset-loading.md) — per-pack budgets that
  the matrix scales by tier.
- [`asset-policy.md`](./asset-policy.md) — closed kind enum.
- [`pack-contract.md`](./pack-contract.md) — Sandbox enforcement
  table consumes the predicate defined here.
- [`pack-signing.md`](./pack-signing.md) — Ed25519 signature gate
  and trust-tier derivation.
- [`worker-csp.md`](./worker-csp.md) — Worker security profile.
- [`security-model.md`](./security-model.md) — multiplayer threat
  model that ranked / closed-beta gating consumes.

---

## 1. Trust tiers

The closed `trustTier` enum:

| Tier | How it is established |
|---|---|
| `canonical` | Listed in the canonical-packs registry per [`content-system-policy.md` § 9](./content-system-policy.md#9-canonical-pack-registry); signature verifies under the publisher root. |
| `community-signed` | Signature verifies under a community publisher key registered in [`publisher-registry.schema.json`](../../content-schema/schemas/publisher-registry.schema.json); not on the canonical list. |
| `sandboxed` | Either unsigned, or signed under an unknown / revoked key, or `manifest.sandboxed === true`. Default for every pack that has not yet cleared the canonical / community gates. |

`manifest.sandboxed: boolean` is preserved for back-compat and
becomes a **derived signal**: `sandboxed === (trustTier === "sandboxed")`.
Packs MAY set `sandboxed: true` explicitly to opt in to the
sandboxed tier even when their signature would otherwise place
them higher (e.g. AI-generated content at Stage 6 pack
materialize). The `manifest.sandboxedReason` enum
(`ai-generated | user-edited | unsigned`) continues to carry the
human-readable cause.

Tier derivation order:

1. Manifest sets `sandboxed: true` ⇒ `sandboxed`.
2. Signature missing or fails verification ⇒ `sandboxed`.
3. `keyId` resolves to a canonical-publisher key and pack is on
   the canonical-packs registry ⇒ `canonical`.
4. `keyId` resolves to a community-publisher key ⇒ `community-signed`.
5. Otherwise ⇒ `sandboxed`.

The Ed25519 verification ordering is pinned in
[`pack-signing.md` § 2](./pack-signing.md). Tier derivation is the
**output** of that ordering, not a re-implementation of it.

---

## 2. Capability matrix

Rows = capabilities; columns = trust tiers. `✓` = granted,
`refuse` = refused unconditionally, `cap-X` = granted under the
named cap from [`asset-loading.md`](./asset-loading.md). Default
deny: any capability not listed below is refused for every tier
until this matrix is amended.

| Capability | `canonical` | `community-signed` | `sandboxed` |
|---|---|---|---|
| Asset decode (image / audio / JSON) | ✓ (cap-table § 1.1) | ✓ (cap-table § 1.1) | ✓ (cap-table § 1.1, hard refuse on overage) |
| Override canonical record | ✓ | refuse (must declare explicit `overrides[]` in canonical-pack-only chain) | **refuse** |
| Override community-signed record | ✓ | ✓ (with explicit `overrides[]`) | **refuse** |
| Override sandboxed record | ✓ | ✓ | ✓ (load order; `sandboxed` cannot shadow higher tier) |
| Register custom kind in `AssetRegistry` | ✓ | ✓ | refuse (custom kinds bypass kind enum) |
| `pack://` virtual fetch (own assets) | ✓ | ✓ | ✓ |
| Same-origin fetch | ✓ | refuse | refuse |
| `blob:` fetch | ✓ | ✓ | ✓ |
| Any other URL scheme | refuse | refuse | refuse |
| `IndexedDB` write | ✓ (`pack:<id>:` prefix) | ✓ (`pack:<id>:` prefix) | ✓ (`pack:<id>:` prefix) |
| Cross-prefix `IndexedDB` read | refuse | refuse | refuse |
| Per-pack fetch concurrency | `maxConcurrentFetches` (8) | `maxConcurrentFetches` (8) | `maxConcurrentFetches` (8) |
| Per-pack fetch rate | `maxFetchesPerSecondPerPack` (32) | `maxFetchesPerSecondPerPack` (32) | `maxFetchesPerSecondPerPack` (16) |
| Per-pack residency | `maxResidentBytesPerPack` (64 MB) | `maxResidentBytesPerPack` (64 MB) | `maxResidentBytesPerPack` (32 MB) |
| Ranked-multiplayer participation | ✓ | refuse | refuse |
| Closed-beta-multiplayer participation | ✓ | ✓ (per-lobby opt-in) | refuse |
| Replay validator (canonical) | ✓ | refuse | refuse |
| Editor (with badge) | ✓ | ✓ | ✓ (`SANDBOX` badge) |
| `scripts.*` capability beyond `scripts.none` | refuse (until [`pack-scripting.md`](./pack-scripting.md) amends) | refuse | refuse |

The shared predicate `isSandboxAllowed(context, manifest)` named
by [`pack-contract.md` § Sandbox enforcement](./pack-contract.md#sandbox-enforcement)
is implemented as a lookup against this matrix; do not duplicate
the table elsewhere.

---

## 3. Override-precedence trust rule

Cross-tier overrides are governed by **two stacked rules**:

1. The existing load-order rule from
   [`pack-contract.md` § Override Precedence](./pack-contract.md#override-precedence).
2. A **trust-floor rule** that strictly dominates load order: a
   pack at tier *T* MAY NEVER override a record whose owning pack
   is at tier *T* or higher unless the override is declared in
   `overrides[]` AND both packs sit at the same tier or higher.

In particular:

- A `sandboxed` pack cannot shadow a `canonical` or
  `community-signed` record by load order.
- A `community-signed` pack cannot silently shadow a `canonical`
  record without an explicit `overrides[]` entry that survives
  signature verification.
- An attempt to violate the rule is refused at registry-assembly
  time with `override.sandboxed-shadow-canonical` (existing) or
  `override.community-shadow-canonical` (new — registered in
  [`pack-error-codes.md`](./pack-error-codes.md)).

The trust-floor rule is enforced **before** the load-order rule;
it catches malicious load-order rearrangements and tier-downgrade
attempts that would otherwise pass the existing override
checker.

---

## 4. Tier inheritance through dependencies

A pack's effective tier is the **minimum** of its own tier and
every transitive dependency's tier. The rule is pinned by
[`pack-signing.md` § 9 Dependency Trust Propagation](./pack-signing.md);
this doc consumes it without re-stating the algorithm.

Worked example: a `canonical` faction pack that depends on a
`sandboxed` library pack runs as `sandboxed`. The faction pack's
record IDs become unavailable to canonical contexts (ranked
multiplayer, trusted replay) until the dependency is upgraded or
removed.

---

## 5. Schema seam

`manifest.schema.json` carries an optional `trustTier` enum with
values `canonical | community-signed | sandboxed`. The field is:

- **Optional on read** — packs authored before this seam landed
  do not need to populate it; the loader derives the tier per § 1.
- **Required on the loader's resolved manifest** — the in-memory
  manifest the registry stores has `trustTier` set to the derived
  value.
- **Authoritative when present and signature-verified** — a pack
  that explicitly declares `trustTier` MUST sign the canonical
  signed message including that field; a verified manifest with
  `trustTier: "canonical"` and a non-canonical-publisher key is
  refused with `pack.error.signing.tier-mismatch`.

The signature gate refuses any tier upgrade not covered by the
publisher registry.

---

## 6. Cross-references

- `manifest.schema.json` — `trustTier` enum + `sandboxed` derived
  flag.
- [`pack-contract.md`](./pack-contract.md) — Sandbox enforcement
  table consumes § 2 above.
- [`asset-loading.md`](./asset-loading.md) § 1.3 — tier hooks on
  per-pack budgets.
- [`pack-signing.md`](./pack-signing.md) — signature verification
  and dependency trust propagation.
- [`security-model.md`](./security-model.md) § 4 — product gating
  consumes ranked / closed-beta rows above.
- [`tasks/mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md`](../../tasks/mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md)
  — registry records `trustTier` per pack.
- [`tasks/phase-2/05-mod-system/10-sandbox-enforcement-contract.md`](../../tasks/phase-2/05-mod-system/10-sandbox-enforcement-contract.md)
  — owning predicate.
