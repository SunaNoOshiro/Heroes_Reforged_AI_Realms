# Pack Scripting — Reserved Slot, No Capability Yet

**This doc is intentionally empty of capability declarations.** The
codebase ships no pack-scripting capability today. The slot is
reserved so a future addition (e.g. `scripts.lua`, `scripts.wasm`,
`scripts.eff`) cannot land without first amending this doc with:

- the Worker / Worklet isolation contract under
  [`worker-csp.md`](./worker-csp.md);
- the structured-clone message-bus shape;
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
ships under a **versioned enum** declared here. The enum is closed:

| Version | Capability tokens |
|---|---|
| `v0` | `scripts.none` (the only token in scope today) |

A pack manifest that declares any `scripts.*` token other than
`scripts.none` is **rejected at validation time** unless this table
lists the token in a versioned row.

Adding a new row requires, in the same change:

1. A standalone architecture amendment (a PR that updates this doc
   alone, reviewed against § 2).
2. A matching update to `manifest.schema.json` `capabilities` enum
   (already a closed list per
   [`pack-contract.md` § Capabilities](./pack-contract.md#capabilities)).
3. The full artefact set: a runtime contract doc, a Worker security
   profile, a sandbox capability row, a security-test corpus, and a
   sandbox-tier policy.

---

## 2. Review rubric for any future scripting capability

A scripting capability MUST satisfy every row below before this
table admits it. A "no" on any row is a hard reject; the amendment
goes back to design.

| Requirement | Why |
|---|---|
| Runs inside a Worker / Worklet under [`worker-csp.md`](./worker-csp.md). | No same-thread eval surface. |
| Communicates via structured-clone-only message bus with a typed schema. | Closes message-bus injection. |
| Has a per-script CPU budget enforced by the Worker timeout. | Closes runaway-loop DoS. |
| Has a per-script memory budget enforced by the host (e.g. WASM linear-memory cap). | Closes memory bomb. |
| Cannot read or write outside the pack's own `pack:<id>:` IndexedDB prefix. | Closes cross-pack data exfil. |
| Cannot reach any URL except `pack://<id>/`. | Closes outbound network leak. |
| Is denied by default in the [`sandbox-model.md`](./sandbox-model.md) capability matrix; even `canonical` packs require an explicit `overrides[]` entry. | Defence in depth. |
| Has a [`tests/security/escape-vectors/`](../../tests/security/escape-vectors/) fixture for at least the OWASP-class top-three escape attempts per the language's history. | CI gate against regression. |
| Has been gated behind a feature flag for at least 30 days of CI green before the flag default flips. | Smoke-test soak. |

The rubric lives here so a drive-by PR cannot weaken it without the
review trail.

---

## 3. Capability-enum CI gate

Two layers gate any new `scripts.*` token:

- **Loader-side (existing).**
  [`scripts/check-pack-error-codes.mjs`](../../scripts/check-pack-error-codes.mjs)
  asserts that every error code emitted by the pack loader is
  registered in
  [`pack-error-codes.md`](./pack-error-codes.md). Any new
  `scripts.*` admission must add its rejection codes to that
  catalogue.
- **Schema-side.** Any value in `manifest.schema.json`
  `capabilities.items.enum` that starts with `scripts.` MUST appear
  in § 1 above. Adding a token requires editing **both** the schema
  enum and § 1 in the same change; either-side-only changes are
  rejected.

Today the schema lists exactly one `scripts.*` value (`scripts.none`)
and § 1 lists exactly one (`scripts.none`), so the layers are in
sync.

---

## 4. Cross-references

- [`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json)
  — `capabilities.items.enum`.
- [`pack-contract.md`](./pack-contract.md) — § Capabilities,
  § Capability Enforcement.
- [`sandbox-model.md`](./sandbox-model.md) — capability matrix row
  `scripts.*` (refuse for every tier today).
- [`worker-csp.md`](./worker-csp.md) — Worker security profile any
  future scripting capability inherits.
- [`ugc-safety.md`](./ugc-safety.md) — byte-level sniffs for
  `scripts.none` packs.

---

## 🔍 Sync Check

- **UI: ✔** — Doc has no UI surface; no screen package to cross-check.
- **Schema: ✔** — `manifest.schema.json` `capabilities.items.enum` lists `scripts.none` as the only `scripts.*` value, matching § 1's `v0` row; `description` already pins enforcement to this doc.
- **Tasks: ⚠** — No live task references this file (`tasks/task-registry.json` has no entry); the original implementation plan now lives only in `docs/archive/implementation-plans/28-asset-loading-and-sandboxing-plan.md` (archived). Companion arch docs (`sandbox-model.md` row 85, `pack-contract.md` § Capabilities, `ugc-safety.md` § 6, `asset-policy.md` rows 58–59) all back-link correctly.

## ⚠ Issues

- **Schema-side enum gate is documented but not implemented.** § 3 asserts that an enum check rejects any `scripts.*` value missing from § 1, but [`scripts/check-pack-error-codes.mjs`](../../scripts/check-pack-error-codes.mjs) only matches the `pack.error.<area>.<name>` pattern (regex `/pack\.error\.[a-z]+\.[a-z][a-zA-Z0-9-]*/g`); no validator parses `manifest.schema.json` `capabilities.items.enum` for `scripts.*` tokens. Today the gap is benign (the schema and § 1 both list only `scripts.none`), but the rule will not actually fail CI when a future token lands. Per CLAUDE.md root contract ("Schema evolution is additive-first; alias before remove… enforced by CI"), a follow-up validator (e.g. `scripts/validate-pack-scripting-enum.mjs` wired into `npm run validate`) must enforce the cross-file equality before any `scripts.*` admission. Suggested values: parse § 1's `v0` row, diff against `manifest.schema.json` `properties.capabilities.items.enum` filtered by `^scripts\.`, exit non-zero on asymmetric difference. Skill did not add the validator (Hard Prohibition D — never edit cross-checked files).
