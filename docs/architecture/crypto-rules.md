# Crypto Rules

> Companion: [`crypto-primitives.md`](./crypto-primitives.md) lists
> which algorithm runs at which surface plus rotation cadence. This
> file governs the **failure-collapse** rules and the closed
> [`signature-error.schema.json`](../../content-schema/schemas/signature-error.schema.json)
> taxonomy. Read both when adding a new comparison call site.

Three mandatory rules cover every secret comparison in the project.
Pack signing, save MACs, TURN credentials, and any future auth
surface inherit this contract.

## 1. Compare — constant time, always

Every secret comparison MUST use a constant-time function:

- **Node-side** (signaling service, future server adapters):
  `crypto.timingSafeEqual(a, b)` from `node:crypto`.
- **Browser-side** (client signature checks, save-file MAC checks,
  future auth tokens): a `crypto.subtle.timingSafeEqual`-equivalent
  helper exposed by `src/crypto/timing-safe.ts` (reserved path;
  specified by task **22-03**).

The following are CI lint failures via `no-raw-eq-on-secret`, keyed
off the `redact: true` type tag from § 2 (lint integration reserved
by task **22-03**):

- `a === b`
- `a == b`
- `Buffer.compare(a, b) === 0`
- `String(a) === String(b)`

Inputs of unequal length are still compared in constant time over
the longer length; the function returns `false` without
short-circuiting.

## 2. Throw — uniform error, never carry the secret

A failed comparison throws an `Error` that:

- carries `redact: true` so the formatter strips its message and
  cause chain (per
  [`error-formatter.md` § 3](./error-formatter.md#3-redaction-allowlist));
- never carries the attempted value, the expected value, the key
  ID, the algorithm name, or the comparison length on any field a
  caller can read;
- maps to a single closed wire / UI code per surface (see § 4).

A "wrong key" failure and a "no such key" failure MUST collapse to
the **same** thrown error so a malicious pack cannot distinguish
them.

## 3. Log — `errorId` only

Failed comparisons are logged at `severity: 'warn'` through
`formatDevError` (per
[`error-formatter.md` § 6](./error-formatter.md#6-production-vs-dev-branching)).

The dev sink keeps:

- the `errorId` (UUID v4);
- the surface name (`pack-signature`, `save-mac`, `auth-token`);
- the closed wire / UI code.

The dev sink MUST NOT keep:

- the attempted secret (raw or encoded);
- the expected secret;
- the comparison delta;
- the comparison timing (in production builds);
- any cause chain that could leak the above.

In production, `formatDevError` collapses the cause chain entirely
per rule 3 of [`production-build.md`](./production-build.md).

## 4. Surfaces

| Surface | Compare key path | Wire / UI code |
|---|---|---|
| Pack signature | `manifest.signature.value` vs. computed sig | `INVALID_SIGNATURE` (per [`signature-error.schema.json`](../../content-schema/schemas/signature-error.schema.json)) |
| Save MAC | `save.metadata.mac` vs. computed MAC | `errors.import.corrupted` |
| TURN credential | `turn.credential` vs. expected | `JOIN_FAILED` (per [`services/signaling/error-codes.md`](../../services/signaling/error-codes.md)) |
| Future auth tokens | (out of scope until an auth surface lands) | `JOIN_FAILED` |

When `signature` is unset on a pack, the surface returns
`SIGNATURE_DISABLED` (the explicit "feature off" state) rather than
`INVALID_SIGNATURE`. This is the **only** case where a non-failure
distinct code is permitted; both flow through `formatUserError` to
the same closed key namespace.

## 5. Cross-references

- [`crypto-primitives.md`](./crypto-primitives.md) — primitive
  table and rotation cadences.
- [`error-formatter.md`](./error-formatter.md) — consumer of the
  `redact: true` tag.
- [`production-build.md`](./production-build.md) — cause-chain
  stripping in production.
- [`pack-contract.md` § Trust Fields](./pack-contract.md#trust-fields)
  — pack-side cross-link to this rule.
- [`signature-error.schema.json`](../../content-schema/schemas/signature-error.schema.json)
  — closed wire enum.
- [`services/signaling/error-codes.md`](../../services/signaling/error-codes.md)
  — wire-error mapping that this file governs.

---

## 🔍 Sync Check

- **UI: ✔** — Doc carries no UI surface; the three wire / UI codes
  it cites match their owners exactly:
  [`signature-error.schema.json`](../../content-schema/schemas/signature-error.schema.json)
  (`INVALID_SIGNATURE`, `SIGNATURE_DISABLED`),
  [`error-formatter.md` § 7](./error-formatter.md#7-schema-validation-errors)
  (`errors.import.corrupted`), and
  [`services/signaling/error-codes.md` § 1](../../services/signaling/error-codes.md#1-wire-visible-codes-joiner)
  (`JOIN_FAILED`).
- **Schema: ✔** —
  [`signature-error.schema.json`](../../content-schema/schemas/signature-error.schema.json)
  `code` enum is exactly `["INVALID_SIGNATURE", "SIGNATURE_DISABLED"]`;
  `SignatureError` row present in
  [`schema-matrix.md`](./schema-matrix.md); the canonical example at
  [`content-schema/examples/signature-error/canonical.signature-error.json`](../../content-schema/examples/signature-error/canonical.signature-error.json)
  validates.
- **Tasks: ✔** — Owning task
  [`tasks/mvp/00-core-architecture/22-03-crypto-rules-and-signature-error.md`](../../tasks/mvp/00-core-architecture/22-03-crypto-rules-and-signature-error.md)
  lists this doc under Owned Paths and reserves the
  `no-raw-eq-on-secret` lint slot;
  [`pack-contract.md` § Trust Fields](./pack-contract.md#trust-fields)
  carries the reciprocal cross-link.

## ⚠ Issues

- **Sibling sync-check points at a non-existent task path.**
  [`crypto-primitives.md`](./crypto-primitives.md) § Sync Check
  claims the owning task is
  `tasks/phase-3/01-multiplayer/22-03-crypto-rules-and-signature-error.md`,
  but the task actually lives at
  `tasks/mvp/00-core-architecture/22-03-crypto-rules-and-signature-error.md`.
  Per [`.agents/rules/tasks.md`](../../.agents/rules/tasks.md), task
  paths are authoritative; the fix belongs in `crypto-primitives.md`'s
  trailing block. Skill did not edit the sibling doc (Hard
  Prohibition D — never edit cross-checked files).
- **Architecture INDEX missing the crypto family.** Neither
  `crypto-rules.md` nor `crypto-primitives.md` appears in
  [`INDEX.md`](./INDEX.md), even though
  [`runtime-requirements.md`](./runtime-requirements.md) (Web Crypto
  floor) is listed. Non-blocking — every owner doc back-points to
  these files — but the index gap should be filled by whoever next
  edits `INDEX.md`. Skill did not add the rows (Hard Prohibition D).
