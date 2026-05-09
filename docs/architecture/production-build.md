# Production-Build Error & Bundle Policy

The five rules below are the contract that the build pipeline (Plan
30, when authored) must satisfy before any production bundle ships.
None of the rules describe the toolchain itself — Vite/esbuild/swc
configuration is the territory. This file pins the *behaviour*
the bundle must exhibit, regardless of which toolchain renders it.

## 1. `__DEV__` is constant-folded

`process.env.NODE_ENV === 'production'` is set at build time. A
compile-time constant `__DEV__` is folded to:

- `true` for dev / local / CI builds;
- `false` for production builds.

Code paths gated on `if (__DEV__)` are dead-code-eliminated in
production. The constant is the single switch consulted by every
other rule below; runtime checks against `process.env.NODE_ENV`
inside `src/` are forbidden (use `__DEV__`).

## 2. Source maps are not shipped publicly

Source maps MAY be uploaded to a private store (e.g., a crash-mapping
service) but the public bundle's `//# sourceMappingURL=` comment
MUST be stripped. A production bundle that contains the literal
string `sourceMappingURL=` is a CI failure.

The on-device crash log writer (per
[`data-inventory.md` § Crash Dumps](./data-inventory.md#4-crash-dumps))
already carries an `errorId`; the private map upload is keyed off
the same `errorId` so support can resolve a stack without a public
map ever leaking.

## 3. `formatUserError` is the only UI error sink

In production builds:

- every UI sink (toasts, modals, inline error panels) routes through
  `formatUserError` declared in
  [`error-formatter.md`](./error-formatter.md);
- `formatUserError` drops the `Error.cause` chain entirely;
- `formatDevError` is still called for the on-device crash log file,
  but it produces a synthetic single-line stack only.

A production bundle that imports `err.message` / `err.stack` /
`String(err)` / `JSON.stringify(err)` from `src/ui/` or
`src/services/*` (outside `src/errors/`) is a CI failure — see the
lint rule `no-raw-error-message-in-ui` reserved by task **22-01**.

This rule is the **only** way an analytics SDK is permitted to load:
no SDK MAY load before `state.privacy.allowAnalytics === true`.
The toggle is owned by the privacy pane; this rule is the
build-mode gate that prevents a silent regression.

## 4. Console sinks route through `formatDevError`

Even in production, `console.error` / `console.warn` calls inside
`src/ui/` route through `formatDevError`. The reasoning: a player
with the browser console open should never see PII, file paths, or
SDP / ICE blobs — only the redacted stack and the `errorId`.

The only way to obtain a raw stack is the on-device crash log file,
which never auto-uploads. The user must explicitly press "Send
report" in screen
[`75-content-report`](./wiki/screens/75-content-report/) after seeing
a redacted preview.

## 5. Bundle-size CI check on dev-only constants

A bundle-size CI check fails if any known dev-only constant appears
in the production artifact. The minimum guarded set:

- `__SOURCE_PATHS__` (reserved for dev-only path emission);
- `__DEV__` literal as a non-folded reference (post-fold the
  constant should be replaced with `false` and tree-shaken);
- the literal `sourceMappingURL=` (rule 2 cross-check);
- the literal `process.env.NODE_ENV` (rule 1 cross-check — code
  should already use `__DEV__`).

This file is the acceptance criterion the build task must satisfy.

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
