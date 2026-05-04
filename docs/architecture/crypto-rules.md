# Crypto Rules

Three mandatory rules covering every secret comparison shipped by the
project. Plan 27 (save tampering & pack signing), Plan 25 (TURN
credentials & signaling abuse), and any future auth surface inherit
this contract.

> Source plan:
> [`docs/implementation-plans/22-privacy-retention-and-error-leaks-plan.md`](../implementation-plans/22-privacy-retention-and-error-leaks-plan.md)
> § Critical Fixes — Crypto-rules + constant-time compare.

## 1. Compare — constant time, always

Every secret comparison MUST use a constant-time function:

- Node-side (signaling service, future server adapters):
  `crypto.timingSafeEqual(a, b)` from `node:crypto`.
- Browser-side (client signature checks, save-file MAC checks,
  future auth tokens): `crypto.subtle.timingSafeEqual`-equivalent
  helper exposed by the project's `src/crypto/timing-safe.ts`
  (reserved path; specified by task **22-03**).

`a === b`, `a == b`, `Buffer.compare(a, b) === 0`, and
`String(a) === String(b)` on a secret are CI lint failures. The lint
rule `no-raw-eq-on-secret` is keyed off the `redact: true` type tag
described below; task **22-03** reserves the lint integration.

Inputs of unequal length are still compared in constant time over
the longer length; the function returns `false` without short-
circuiting.

## 2. Throw — uniform error, never carry the secret

Failed comparisons throw an `Error` that:

- carries `redact: true` so the formatter strips its message and
  cause chain (per [`error-formatter.md` § 3](./error-formatter.md#3-redaction-allowlist));
- never carries the attempted value, the expected value, the key
  ID, the algorithm name, or the comparison length in any field a
  caller can read;
- maps to a single closed wire / UI code per surface
  ([`signature-error.schema.json`](../../content-schema/schemas/signature-error.schema.json)
  for pack-signature surfaces; closed signaling enum on the wire,
  closed AI-gateway enum at the gateway boundary).

A "wrong key" check and a "no such key" check MUST collapse to the
same thrown error so a malicious pack cannot distinguish them.

## 3. Log — `errorId` only

Failed comparisons are logged at `severity: 'warn'` through
`formatDevError` (per
[`error-formatter.md` § 6](./error-formatter.md#6-production-vs-dev-branching)).
The dev sink keeps:

- the `errorId` (UUID v4);
- the surface name (`pack-signature`, `save-mac`, `auth-token`);
- the closed wire/UI code.

The dev sink MUST NOT keep:

- the attempted secret (raw or encoded);
- the expected secret;
- the comparison delta;
- the timing of the comparison (in production builds);
- any cause chain that could leak the above.

In production, `formatDevError` collapses the cause chain entirely
per rule 3 of [`production-build.md`](./production-build.md).

## 4. Surfaces

| Surface | Compare key path | Wire / UI code |
|---|---|---|
| Pack signature | `manifest.signature.value` vs. computed sig | `INVALID_SIGNATURE` (per [`signature-error.schema.json`](../../content-schema/schemas/signature-error.schema.json)) |
| Save MAC | `save.metadata.mac` vs. computed MAC (Plan 27) | `errors.import.corrupted` |
| TURN credential | `turn.credential` vs. expected (Plan 25) | `JOIN_FAILED` (per [`services/signaling/error-codes.md`](../../services/signaling/error-codes.md)) |
| Future auth tokens | (out of scope until Plan 25) | `JOIN_FAILED` |

When `signature` is unset on a pack, the surface returns the
explicit `SIGNATURE_DISABLED` code (the "feature off" state) rather
than `INVALID_SIGNATURE`. This is the *only* case where a non-failure
distinct code is permitted; both flow through `formatUserError` to
the same closed key namespace.

## 5. Cross-references

- [`error-formatter.md`](./error-formatter.md) — the
  `redact: true` tag is consumed there.
- [`production-build.md`](./production-build.md) — cause-chain
  stripping in production.
- [`pack-contract.md` § Trust Fields](./pack-contract.md#trust-fields)
  — cross-links this file as the comparison rule.
- [`signature-error.schema.json`](../../content-schema/schemas/signature-error.schema.json)
  — closed wire enum.
- [`services/signaling/error-codes.md`](../../services/signaling/error-codes.md)
  — wire error mapping that this file governs.
