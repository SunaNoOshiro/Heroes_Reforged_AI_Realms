# Content Security Policy (CSP) — Host Application

A **deny-by-default** Content Security Policy ships with the host
HTML and bounds every other defence in the codebase. Without it,
the no-eval / no-remote-asset / no-inline-script rules in
[`worker-csp.md`](./worker-csp.md), [`asset-loading.md`](./asset-loading.md),
and [`ugc-safety.md`](./ugc-safety.md) hold by intent only; CSP turns
intent into refusal at the browser layer.

Companion docs:
- [`worker-csp.md`](./worker-csp.md) — per-Worker CSP profile that
  inherits this one.
- [`runtime-requirements.md`](./runtime-requirements.md) — pinned
  browser-engine floor that CSP and Trusted Types depend on.
- [`asset-loading.md`](./asset-loading.md) — `connect-src` consumer
  for `pack://` virtual fetches.
- [`net-transport.md`](./net-transport.md) — `connect-src` consumer
  for WebRTC signalling.
- [`ai-integration.md`](./ai-integration.md) — `connect-src` consumer
  for the optional AI gateway.
- [`error-formatter.md`](./error-formatter.md) — sanitiser pipeline
  reused by Trusted Types `createHTML`.

---

## 1. Shipped policy

The canonical `index.html` ships the policy via a
`<meta http-equiv="Content-Security-Policy">` tag. Static-host
configurations (nginx, Cloudflare Pages, Tauri local server) MUST
also emit the same policy as an HTTP response header. The two
surfaces are kept lockstep by the build pipeline; divergence fails
CI (§ 3, check 4).

```
default-src 'self';
script-src 'self';
connect-src 'self' wss://signaling.* https://ai-gateway.*;
img-src 'self' blob: data:;
media-src 'self' blob:;
font-src 'self';
frame-ancestors 'none';
object-src 'none';
base-uri 'none';
require-trusted-types-for 'script';
trusted-types canonical-policy;
```

### Per-directive rationale

| Directive | Why |
|---|---|
| `default-src 'self'` | Closed by default — every other directive opens a specific surface. |
| `script-src 'self'` | No `unsafe-eval`, no `unsafe-inline`. Workers, Worklets, and modules all served same-origin. |
| `connect-src 'self' wss://signaling.* https://ai-gateway.*` | Same-origin XHR / fetch plus the two named wildcards. The wildcards collapse to concrete origins at build time per [`net-transport.md`](./net-transport.md) and [`ai-integration.md`](./ai-integration.md). |
| `img-src 'self' blob: data:` | `blob:` lets `createImageBitmap` accept a transferred buffer; `data:` is needed for tiny inline placeholders ([`pack-contract.md` § Asset Fallback](./pack-contract.md#asset-fallback-and-placeholders)). External `https:` images are rejected. |
| `media-src 'self' blob:` | Same as `img-src` for audio buffers. |
| `font-src 'self'` | Pack assets MAY NOT include fonts (per [`asset-policy.md`](./asset-policy.md)); the host ships its own bundled font. |
| `frame-ancestors 'none'` | The app refuses to be embedded in any iframe — closes clickjacking. |
| `object-src 'none'` | No `<object>`, `<embed>`, or legacy plugin surface. |
| `base-uri 'none'` | A `<base>` tag injection cannot rewrite the script origin. |
| `require-trusted-types-for 'script'` | Every DOM-sink that takes a string (`element.innerHTML`, `Worker(url)`, `eval`, …) requires a `TrustedHTML` / `TrustedScriptURL` value, minted only by the policy below. |
| `trusted-types canonical-policy` | One named policy. Any other policy name (including the implicit `default` policy) is refused by the browser. |

---

## 2. Trusted Types policy

The single allowed policy is `canonical-policy`, registered at boot
in `src/runtime/security/trusted-types.ts` (owning task:
[`tasks/mvp/00-core-architecture/22-04-shipped-csp-and-trusted-types.md`](../../tasks/mvp/00-core-architecture/22-04-shipped-csp-and-trusted-types.md)).

```typescript
trustedTypes.createPolicy("canonical-policy", {
  // Only mints a TrustedHTML for strings already sanitised by the
  // formatter pipeline.
  createHTML: (input) => formatTrustedHtml(input),

  // Refuses every input. The codebase never mints a script URL at
  // runtime — Workers and modules are served same-origin and
  // referenced as static URLs.
  createScriptURL: (_input) => {
    throw new Error("trusted-types: createScriptURL is not allowed.");
  },

  // Refuses every input. No runtime eval; no Function constructor.
  createScript: (_input) => {
    throw new Error("trusted-types: createScript is not allowed.");
  },
});
```

`formatTrustedHtml` is the single entry point for any HTML-taking
DOM sink. It runs strings through the same sanitiser pipeline used
by [`error-formatter.md`](./error-formatter.md) for user-visible
error text — text-only by default, with a named-markup allowlist for
the few places that need it.

---

## 3. CI gate

The build pipeline ships a **CSP-assertion script** that:

1. Loads the bundled `index.html` and asserts the `<meta>` CSP
   matches § 1 byte-for-byte.
2. Greps the bundled JavaScript for `eval(`, `new Function(`,
   `setTimeout("…")`, `setInterval("…")`, and any inline `<script>`
   content; the build fails on any match.
3. Asserts that `trustedTypes.createPolicy` is called exactly once,
   with the name `canonical-policy`, and that `createScript` and
   `createScriptURL` both throw.
4. Asserts the static-host CSP header (when emitted by the build
   pipeline) matches the meta tag byte-for-byte.

The gate runs as part of `npm run validate`, scheduled immediately
after `validate:build-attestation`. Refusal codes route through the
closed `build.error.csp.*` namespace registered in
[`pack-error-codes.md`](./pack-error-codes.md).

---

## 4. Permitted exceptions

There are **no permitted runtime exceptions**. A third-party library
that requires `unsafe-eval` (e.g. `eval`-based templating) is
rejected by [`dependency-policy.md`](./dependency-policy.md). The
allowlist is only the two `connect-src` origins:

| Origin | Directive | Why |
|---|---|---|
| `wss://signaling.*` | `connect-src` | WebRTC signalling per [`net-transport.md`](./net-transport.md). The wildcard collapses to two concrete origins at build time. |
| `https://ai-gateway.*` | `connect-src` | Optional AI gateway per [`ai-integration.md`](./ai-integration.md). When the gateway is disabled, the directive collapses to `connect-src 'self'`. |

---

## 5. Cross-references

- [`worker-csp.md`](./worker-csp.md) — per-Worker CSP that inherits
  this profile.
- [`runtime-requirements.md`](./runtime-requirements.md) — browser
  engine floor.
- [`asset-loading.md`](./asset-loading.md) — `connect-src` consumer
  for `pack://` virtual fetches (handled by the host's in-memory
  archive root, not by the network surface).
- [`net-transport.md`](./net-transport.md) — `connect-src` signalling
  consumer.
- [`ai-integration.md`](./ai-integration.md) — `connect-src` AI
  gateway consumer.
- [`error-formatter.md`](./error-formatter.md) — Trusted Types
  policy reuses the same sanitiser pipeline.
- [`production-build.md`](./production-build.md) — production-bundle
  policy that the CSP gate runs alongside.

---

## 🔍 Sync Check

- **UI: ✔** — No UI surfaces are claimed by this doc; CSP and Trusted Types are runtime-only contracts and the only user-visible failure path is the React error boundary owned by [`worker-csp.md` § 5](./worker-csp.md#5-react-error-boundary).
- **Schema: ✔** — `canonical-policy` is the policy name, not a content schema; no `content-schema/schemas/*.schema.json` entry is implicated. Cross-checked [`schema-matrix.md`](./schema-matrix.md) — no row is claimed or required.
- **Tasks: ⚠** — Owning task [`mvp.00-core-architecture.22-04-shipped-csp-and-trusted-types`](../../tasks/mvp/00-core-architecture/22-04-shipped-csp-and-trusted-types.md) is `planned`; `src/runtime/security/trusted-types.ts` and `scripts/check-csp.mjs` do not yet exist. Expected — the doc is the spec the task implements.

## ⚠ Issues

- **`build.error.csp.*` namespace not yet registered.** This doc and the owning task both state that CSP-gate refusal codes are registered in [`pack-error-codes.md`](./pack-error-codes.md) under `build.error.csp.*`. The catalog there currently uses only the `pack.error.<area>.<reason>` convention; there is no `build.error.*` section yet. Per the owning task's Acceptance Criteria, `mvp.00-core-architecture.22-04-shipped-csp-and-trusted-types` is the closer. Suggested values: append a `build.error.csp.meta-drift`, `build.error.csp.dynamic-eval-found`, `build.error.csp.policy-misregistered`, `build.error.csp.header-drift` quartet matching the four CI-gate checks in § 3, with severity `fatal`. The audit did not edit `pack-error-codes.md` (Hard Prohibition D — never edit cross-checked files).
- **Asymmetric cross-link with `production-build.md`.** This doc lists [`production-build.md`](./production-build.md) as a "CI gate" companion, but `production-build.md` does not back-reference `csp.md` — its five rules do not include the CSP / Trusted Types gate. Non-blocking; the CSP gate is owned end-to-end by task `22-04`, not by `production-build.md`. The owner of `production-build.md` may wish to add a sixth rule pointing at this doc once the gate lands. The audit did not edit `production-build.md` (Hard Prohibition D).
