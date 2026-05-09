# Pack Scripting — Reserved Slot, No Capability Yet

**This doc is intentionally empty of capability declarations.**
The codebase does not ship any pack-scripting capability today.
The slot is reserved so that a future addition (e.g.
`scripts.lua`, `scripts.wasm`, `scripts.eff`) cannot land
without first amending this doc with:

- the Worker / Worklet isolation contract under
  [`worker-csp.md`](./worker-csp.md);
- the structured-clone message bus shape;
- the per-script CPU and memory budget;
- the trust-tier capability gate per
  [`sandbox-model.md`](./sandbox-model.md);
- the security-test corpus for the new attack surface in
  [`tests/security/escape-vectors/`](../../tests/security/escape-vectors/).

Companion docs:
- [`pack-contract.md`](./pack-contract.md) — § Capabilities.
- [`sandbox-model.md`](./sandbox-model.md) — capability matrix.
- [`worker-csp.md`](./worker-csp.md) — Worker security profile.
- [`ugc-safety.md`](./ugc-safety.md) — § Capability Enforcement.

---

## 1. Versioned capability enum

When (and only when) a pack-scripting capability is admitted, it
ships under a **versioned enum** declared here. The capability
enum is the closed list:

| Version | Capability tokens |
|---|---|
| `v0` | `scripts.none` (the only token in scope today) |

A pack manifest that declares any `scripts.*` token other than
`scripts.none` is **rejected at validation time** unless this
table lists the token in a versioned row. The CI gate
(`scripts/check-pack-error-codes.mjs`) refuses any new token
that is not enumerated in this table.

Adding a new row requires:

1. A standalone architecture amendment (PR that updates this doc
   alone, reviewed against the rubric below).
2. A matching update to `manifest.schema.json` `capabilities`
   enum (already a closed list per
   [`pack-contract.md` § Capabilities](./pack-contract.md#capabilities)).
3. The full artefact set: a runtime contract doc, a Worker
   security profile, a sandbox capability row, a security-test
   corpus, and a sandbox-tier policy.

---

## 2. Review rubric for any future scripting capability

A scripting capability MUST satisfy every row below before this
table admits it. A "no" on any row is a hard reject; the
amendment goes back to design.

| Requirement | Why |
|---|---|
| Runs inside a Worker / Worklet under [`worker-csp.md`](./worker-csp.md). | No same-thread eval surface. |
| Communicates via structured-clone-only message bus with a typed schema. | Closes message-bus injection. |
| Has a per-script CPU budget enforced by the Worker timeout. | Closes runaway-loop DoS. |
| Has a per-script memory budget enforced by the host (e.g. WASM linear-memory cap). | Closes memory bomb. |
| Cannot read or write outside the pack's own `pack:<id>:` IndexedDB prefix. | Closes cross-pack data exfil. |
| Cannot reach any URL except `pack://<id>/`. | Closes outbound network leak. |
| Is denied by default in the [`sandbox-model.md`](./sandbox-model.md) capability matrix; even `canonical` packs require an explicit `overrides[]` entry. | Defence in depth. |
| Has a `tests/security/escape-vectors/` fixture for at least the OWASP-class top three escape attempts per the language's history. | CI gate against regression. |
| Has been gated behind a feature flag for at least 30 days of CI green before the flag default flips. | Smoke-test soak. |

The rubric lives here so a drive-by PR cannot weaken it without
the review trail.

---

## 3. Capability-enum CI gate

`scripts/check-pack-error-codes.mjs` (existing repo gate)
asserts that every value emitted by the pack loader is registered
in [`pack-error-codes.md`](./pack-error-codes.md). The extension adds a **schema-side** rule: any value in
`manifest.schema.json` `capabilities.items.enum` that starts with
`scripts.` MUST appear in § 1 above. The gate fails on any
schema entry that is not listed.

The gate is read-only — adding a new token requires editing
**both** the schema enum and § 1 in the same change. CI rejects
either-side-only changes.

---

## 4. Cross-references

- [`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json)
  — `capabilities.items.enum`.
- [`pack-contract.md`](./pack-contract.md) — § Capabilities,
  § Capability Enforcement.
- [`sandbox-model.md`](./sandbox-model.md) — capability matrix
  row "scripts.*" (refuse for every tier today).
- [`worker-csp.md`](./worker-csp.md) — Worker security profile
  any future scripting capability inherits.
- [`ugc-safety.md`](./ugc-safety.md) — byte-level sniffs for
  `scripts.none` packs.
