# Production-Build Error & Bundle Policy

The five rules below pin the **behaviour** every production bundle
must exhibit. Toolchain choice (Vite, esbuild, swc) is out of scope —
this doc declares the contract; the build pipeline (task
[`mvp.00-core-architecture.22-02-production-build-policy`](../../tasks/mvp/00-core-architecture/22-02-production-build-policy.md))
makes the toolchain satisfy it. Cross-doc map at § 6.

## 1. `__DEV__` is constant-folded

`process.env.NODE_ENV === 'production'` is set at build time. A
compile-time constant `__DEV__` is folded to:

- `true` for dev / local / CI builds;
- `false` for production builds.

Code paths gated on `if (__DEV__)` are dead-code-eliminated in
production. `__DEV__` is the **single switch** consulted by every
other rule in this doc; runtime checks against
`process.env.NODE_ENV` inside `src/` are forbidden.

## 2. Source maps are not shipped publicly

Source maps MAY be uploaded to a private store (e.g., a crash-mapping
service), but the public bundle's `//# sourceMappingURL=` comment
MUST be stripped. A production bundle that contains the literal
string `sourceMappingURL=` is a CI failure (see rule 5).

The on-device crash log writer (per
[`data-inventory.md` § Crash Dumps](./data-inventory.md#4-crash-dumps))
already carries an `errorId`; the private map upload is keyed off the
same `errorId` so support can resolve a stack without a public map
ever leaking.

## 3. `formatUserError` is the only UI error sink

In production builds:

- every UI sink (toasts, modals, inline error panels) routes through
  `formatUserError` declared in
  [`error-formatter.md`](./error-formatter.md);
- `formatUserError` drops the `Error.cause` chain entirely;
- `formatDevError` is still called for the on-device crash log file,
  but it produces a synthetic single-line stack only.

A production bundle that imports `err.message`, `err.stack`,
`String(err)`, or `JSON.stringify(err)` from `src/ui/` or
`src/services/*` (anywhere outside `src/errors/`) is a CI failure —
enforced by lint rule `no-raw-error-message-in-ui` reserved by task
[`mvp.00-core-architecture.22-01-error-formatter-contract`](../../tasks/mvp/00-core-architecture/22-01-error-formatter-contract.md).

**Analytics-SDK load gate.** Because `formatUserError` is the only
sink, no analytics SDK MAY load before
`state.privacy.allowAnalytics === true`. The toggle is owned by the
privacy pane in
[`56-options`](./wiki/screens/56-options/) per
[`privacy.md`](./privacy.md); this rule is the build-mode gate that
prevents a silent regression.

## 4. Console sinks route through `formatDevError`

Even in production, `console.error` and `console.warn` calls inside
`src/ui/` route through `formatDevError`. A player with the browser
console open must never see PII, file paths, or SDP / ICE blobs —
only the redacted stack and the `errorId`.

The only path to a raw stack is the on-device crash log file, which
**never auto-uploads**. The user must explicitly press "Send report"
in screen
[`75-content-report`](./wiki/screens/75-content-report/) after
seeing a redacted preview.

## 5. Bundle-size CI check on dev-only constants

A bundle-size CI check fails if any known dev-only constant appears
in the production artifact. The minimum guarded set:

| Token | Why it must not appear | Cross-rule |
|---|---|---|
| `__SOURCE_PATHS__` | reserved for dev-only path emission | — |
| `__DEV__` (literal, non-folded) | post-fold the constant should be `false` and tree-shaken | rule 1 |
| `sourceMappingURL=` | public sourcemap leak | rule 2 |
| `process.env.NODE_ENV` | code should already use `__DEV__` | rule 1 |

This file is the acceptance criterion the build task must satisfy;
the toolchain implementation is deferred to the build-pipeline task.

## 6. Cross-references

- [`error-formatter.md`](./error-formatter.md) — the formatter's
  prod branch consumes rules 1, 3, and 4.
- [`crypto-rules.md`](./crypto-rules.md) — secret-compare failures
  flow through the same formatter; rule 4 strips them.
- [`data-inventory.md` § Crash Dumps](./data-inventory.md#4-crash-dumps)
  — declares the on-device crash log surface that rules 2 and 4
  feed.
- [`state-flow.md`](./state-flow.md) — names this doc as the build
  contract; the privacy slice (`state.privacy.*`) consumed by the
  analytics gate lives there.
- [`csp.md`](./csp.md) — production-bundle CSP requirements layered
  on top of these build-mode rules.

---

## 🔍 Sync Check

- **UI: ✔** — Screen references resolve:
  [`75-content-report`](./wiki/screens/75-content-report/) (rule 4
  "Send report" path) and
  [`56-options`](./wiki/screens/56-options/) (analytics opt-in
  toggle, per rule 3 gate). Anchor
  `#1-__dev__-is-constant-folded` is consumed by
  [`64-network-lobby/spec.md`](./wiki/screens/64-network-lobby/spec.md)
  and survives the rewrite.
- **Schema: ✔** — No schema is declared in this doc; the analytics
  toggle gate references `state.privacy.*` which is owned by
  [`privacy-options.schema.json`](../../content-schema/schemas/privacy-options.schema.json)
  via [`privacy.md`](./privacy.md). No `schema-matrix.md` row is
  required for this doc.
- **Tasks: ✔** — Owning task
  [`mvp.00-core-architecture.22-02-production-build-policy`](../../tasks/mvp/00-core-architecture/22-02-production-build-policy.md)
  names this file as its sole Owned Path; the lint rule referenced
  in rule 3 is owned by
  [`mvp.00-core-architecture.22-01-error-formatter-contract`](../../tasks/mvp/00-core-architecture/22-01-error-formatter-contract.md)
  per `tasks/task-registry.json`.

## ⚠ Issues

- **Analytics-load-gate state path drifts from the schema.** Rule 3
  gates the analytics SDK on `state.privacy.allowAnalytics === true`,
  matching [`privacy.md` § Telemetry posture](./privacy.md#7-telemetry-posture).
  The persisted privacy slice, however, is
  [`privacy-options.schema.json`](../../content-schema/schemas/privacy-options.schema.json)
  with the field name `analyticsOptIn` (state path
  `state.privacy.options.analyticsOptIn`), as used by
  [`data-inventory.md`](./data-inventory.md) row 18,
  [`persistence.md` § 1](./persistence.md#1-per-slice-mapping),
  [`command-schema.md`](./command-schema.md) (`TOGGLE_ANALYTICS_OPT_IN`),
  and [`56-options/data-contracts.md`](./wiki/screens/56-options/data-contracts.md).
  Either `state.privacy.allowAnalytics` is a derived selector that
  needs an explicit definition somewhere canonical, or both arch
  docs should refer directly to `state.privacy.options.analyticsOptIn`.
  Per CLAUDE.md root contract ("every persisted field is registered
  in `data-inventory.md`"), the canonical name is the schema field.
  The owning task —
  [`mvp.00-core-architecture.22-02-production-build-policy`](../../tasks/mvp/00-core-architecture/22-02-production-build-policy.md),
  in coordination with the privacy-doc owner — should pick one
  spelling and propagate. Skill did not silently rewrite this doc
  alone (Hard Prohibitions A and D) because the same drift survives
  in `privacy.md` and would create a fresh inconsistency.
