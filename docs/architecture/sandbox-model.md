# Sandbox Model — Trust Tiers and Capability Matrix

`manifest.sandboxed: boolean` is a one-bit declaration; this doc
turns it into a **capability matrix** keyed on a closed
`trustTier` enum. Every loader, registry, override-resolver, and
storage / network surface that touches a pack consults the matrix
before granting the corresponding capability.

Companion docs:

- [`asset-loading.md`](./asset-loading.md) — per-pack budgets that
  the matrix scales by tier.
- [`asset-policy.md`](./asset-policy.md) — closed asset-kind enum.
- [`pack-contract.md`](./pack-contract.md) — Sandbox enforcement
  table consumes the predicate defined here.
- [`pack-signing.md`](./pack-signing.md) — Ed25519 signature gate
  and trust-tier derivation.
- [`worker-csp.md`](./worker-csp.md) — Worker security profile.
- [`security-model.md`](./security-model.md) — multiplayer threat
  model that ranked / closed-beta gating consumes.

---

## 1. Trust tiers

The closed `trustTier` enum has three values; tier derivation is
the **output** of the Ed25519 verification ordering pinned in
[`pack-signing.md` § 2](./pack-signing.md#2-verification-order),
not a re-implementation of it.

| Tier | How it is established |
|---|---|
| `canonical` | Listed in the canonical-packs registry per [`content-system-policy.md` § 9](./content-system-policy.md#9-canonical-pack-registry); signature verifies under the publisher root. |
| `community-signed` | Signature verifies under a community publisher key registered in [`publisher-registry.schema.json`](../../content-schema/schemas/publisher-registry.schema.json); not on the canonical list. |
| `sandboxed` | Either unsigned, or signed under an unknown / revoked key, or `manifest.sandboxed === true`. Default for every pack that has not yet cleared the canonical / community gates. |

Tier derivation order (first matching rule wins):

1. Manifest sets `sandboxed: true` ⇒ `sandboxed`.
2. Signature missing or fails verification ⇒ `sandboxed`.
3. `keyId` resolves to a canonical-publisher key AND pack is on
   the canonical-packs registry ⇒ `canonical`.
4. `keyId` resolves to a community-publisher key ⇒ `community-signed`.
5. Otherwise ⇒ `sandboxed`.

`manifest.sandboxed: boolean` is preserved for back-compat as a
**derived signal**: `sandboxed === (trustTier === "sandboxed")`.
Packs MAY set `sandboxed: true` explicitly to opt in to the
sandboxed tier even when their signature would otherwise place
them higher (e.g. AI-generated content at Stage 6 pack
materialize). The optional `manifest.sandboxedReason` enum
(`ai-generated | user-edited | unsigned`) carries the
human-readable cause.

---

## 2. Capability matrix

Rows = capabilities; columns = trust tiers. `✓` = granted,
`refuse` = refused unconditionally, `cap-X` = granted under the
named cap from [`asset-loading.md`](./asset-loading.md).
**Default deny:** any capability not listed below is refused for
every tier until this matrix is amended.

| Capability | `canonical` | `community-signed` | `sandboxed` |
|---|---|---|---|
| Asset decode (image / audio / JSON) | ✓ (cap-table § 1.1) | ✓ (cap-table § 1.1) | ✓ (cap-table § 1.1, hard refuse on overage) |
| Override `canonical` record | ✓ | refuse (must declare explicit `overrides[]` in canonical-pack-only chain) | **refuse** |
| Override `community-signed` record | ✓ | ✓ (with explicit `overrides[]`) | **refuse** |
| Override `sandboxed` record | ✓ | ✓ | ✓ (load order; `sandboxed` cannot shadow higher tier) |
| Register custom kind in `AssetRegistry` | ✓ | ✓ | refuse (custom kinds bypass `kind` enum) |
| `pack://` virtual fetch (own assets) | ✓ | ✓ | ✓ |
| Same-origin fetch | ✓ | refuse | refuse |
| `blob:` fetch | ✓ | ✓ | ✓ |
| Any other URL scheme | refuse | refuse | refuse |
| `IndexedDB` write | ✓ (`pack:<id>:` prefix) | ✓ (`pack:<id>:` prefix) | ✓ (`pack:<id>:` prefix) |
| Cross-prefix `IndexedDB` read | refuse | refuse | refuse |
| `maxConcurrentFetches` | `8` | `8` | `8` |
| `maxFetchesPerSecondPerPack` | `32` | `32` | `16` |
| `maxResidentBytesPerPack` | `64 MB` | `64 MB` | `32 MB` |
| Ranked-multiplayer participation | ✓ | refuse | refuse |
| Closed-beta-multiplayer participation | ✓ | ✓ (per-lobby opt-in) | refuse |
| Replay validator (canonical) | ✓ | refuse | refuse |
| Editor (with badge) | ✓ | ✓ | ✓ (`SANDBOX` badge) |
| `scripts.*` capability beyond `scripts.none` | refuse (until [`pack-scripting.md`](./pack-scripting.md) amends) | refuse | refuse |

The shared predicate `isSandboxAllowed(context, manifest)` named
by [`pack-contract.md` § Sandbox enforcement](./pack-contract.md#sandbox-enforcement)
is implemented as a lookup against this matrix; do not duplicate
the table elsewhere. Numeric ceilings are pinned in
[`asset-loading.md` § 1](./asset-loading.md#1-cap-table); this
matrix consumes them, never re-defines them.

---

## 3. Override-precedence trust rule

Cross-tier overrides are governed by **two stacked rules**, and
the trust-floor rule is enforced **before** the load-order rule
so it catches malicious load-order rearrangements and tier-
downgrade attempts that would otherwise slip past the load-order
check:

1. **Load order** — the existing rule from
   [`pack-contract.md` § Override Precedence](./pack-contract.md#override-precedence).
2. **Trust floor** — a pack at tier *T* MAY NEVER override a
   record whose owning pack is at a strictly higher tier. A
   same-tier override is allowed only with an explicit
   `overrides[]` entry that survives signature verification.

Concrete cases:

- A `sandboxed` pack cannot shadow a `canonical` or
  `community-signed` record by load order.
- A `community-signed` pack cannot silently shadow a `canonical`
  record without an explicit `overrides[]` entry that survives
  signature verification.
- A violation is refused at registry-assembly time with
  `override.sandboxed-shadow-canonical` (existing) or
  `override.community-shadow-canonical` (new — to be registered
  in [`pack-error-codes.md`](./pack-error-codes.md); see
  `## ⚠ Issues`).

---

## 4. Tier inheritance through dependencies

A pack's effective tier is the **minimum** of its own tier and
every transitive dependency's tier. The algorithm is pinned by
[`pack-signing.md` § 9 Dependency trust propagation](./pack-signing.md#9-dependency-trust-propagation);
this doc consumes it without re-stating it.

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
  refused with
  [`pack.error.signing.tier-mismatch`](./pack-error-codes.md).

The signature gate refuses any tier upgrade not covered by the
publisher registry.

---

## 6. Cross-references

- [`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json)
  — `trustTier` enum + `sandboxed` derived flag.
- [`pack-contract.md` § Sandbox enforcement](./pack-contract.md#sandbox-enforcement)
  — consumes § 2 above.
- [`asset-loading.md` § 1.3 Tier hooks](./asset-loading.md#13-tier-hooks)
  — tier hooks on per-pack budgets.
- [`pack-signing.md`](./pack-signing.md) — signature verification
  and dependency trust propagation.
- [`security-model.md`](./security-model.md) — product gating
  consumes ranked / closed-beta rows above.
- [`tasks/mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md`](../../tasks/mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md)
  — registry records `trustTier` per pack.
- [`tasks/phase-2/05-mod-system/10-sandbox-enforcement-contract.md`](../../tasks/phase-2/05-mod-system/10-sandbox-enforcement-contract.md)
  — owning predicate.

---

## 🔍 Sync Check

- **UI: ✔** — Doc has no UI surface of its own; the `SANDBOX`
  badge it gates is rendered by screen 72 per
  [`pack-trust.md`](./pack-trust.md), and the tier-aware budget
  numbers match
  [`asset-loading.md` § 1.3](./asset-loading.md#13-tier-hooks).
- **Schema: ⚠** — The closed `trustTier` enum (`canonical |
  community-signed | sandboxed`), `sandboxed`, and
  `sandboxedReason` (`ai-generated | user-edited | unsigned`) all
  match
  [`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json);
  `Manifest` row exists in
  [`schema-matrix.md`](./schema-matrix.md). § 5 asserts that a
  declared `trustTier` is signed as part of the canonical message,
  but [`pack-signing.md` § 1](./pack-signing.md#1-canonical-signed-message)
  does not list `trustTier` among the signed fields — see
  `## ⚠ Issues`.
- **Tasks: ✔** — Owning tasks
  [`tasks/phase-2/05-mod-system/10-sandbox-enforcement-contract.md`](../../tasks/phase-2/05-mod-system/10-sandbox-enforcement-contract.md)
  and
  [`tasks/mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md`](../../tasks/mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md)
  both reference this doc under Read First; matching rows present
  in `task-registry.json`.

## ⚠ Issues

- **`override.sandboxed-shadow-canonical` and
  `override.community-shadow-canonical` are not registered in
  [`pack-error-codes.md`](./pack-error-codes.md).** § 3 cites both
  codes (and [`pack-contract.md` § Override Precedence](./pack-contract.md#override-precedence)
  also cites `override.sandboxed-shadow-canonical` and
  `override.unauthorized-shadow`), but `pack-error-codes.md` only
  defines `pack.error.override.unordered`. Per the project root
  contract on closed error vocabularies, the missing rows must be
  added to `pack-error-codes.md` before the registry-assembly
  layer can refuse with these codes. Owner:
  [`tasks/phase-2/05-mod-system/10-sandbox-enforcement-contract.md`](../../tasks/phase-2/05-mod-system/10-sandbox-enforcement-contract.md)
  (the predicate consumer) or the pack-error-codes maintainer.
  Suggested values: `pack.error.override.sandboxed-shadow-canonical`,
  `pack.error.override.community-shadow-canonical`, both fatal,
  short message "sandboxed pack may not shadow higher-tier
  record" / "community-signed pack may not silently shadow
  canonical record". Skill did not edit `pack-error-codes.md`
  (Hard Prohibition D).
- **`trustTier` is not part of the canonical signed message
  defined in [`pack-signing.md` § 1](./pack-signing.md#1-canonical-signed-message).**
  § 5 above states that "a pack that explicitly declares
  `trustTier` MUST sign the canonical signed message including
  that field," but `pack-signing.md` § 1 lists the signed fields
  as `{ id, version, contentHash, engineHash, dependencies,
  capabilities, sandboxed, assetDigest, previousKeyId }` —
  `trustTier` is absent. Either `pack-signing.md` § 1 must add
  `trustTier` to the signed-message field set (preferred — keeps
  the tier-mismatch refusal cryptographically grounded), or
  § 5 here must drop the "signed including that field" claim and
  instead anchor the rule on the publisher-registry / `keyId`
  binding alone. The wording above was preserved (Hard Prohibition
  A — never silently rewrite a structural-invariant claim); the
  fix belongs to the pack-signing owner (Hard Prohibition D).
- **`sandbox-model.md` is missing from
  [`INDEX.md`](./INDEX.md).** Every cross-link in the canonical
  set (`pack-contract.md`, `pack-signing.md`, `asset-loading.md`,
  `security-model.md`, two task files) back-points to this doc,
  but the architecture index does not list it. Non-blocking, but
  the row should be added by whoever next edits `INDEX.md`. Skill
  did not edit the index (Hard Prohibition D).
