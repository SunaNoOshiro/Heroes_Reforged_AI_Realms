# Content Security Policy (CSP) — Host Application

> Source plan:
> [`docs/implementation-plans/28-asset-loading-and-sandboxing-plan.md`](../implementation-plans/28-asset-loading-and-sandboxing-plan.md)
> § Tasks — Shipped CSP.

The host HTML ships a **deny-by-default Content Security Policy**
that bounds every other defence layer in the codebase. Without
CSP, the no-eval / no-remote-asset / no-inline-script rules in
[`worker-csp.md`](./worker-csp.md), [`asset-loading.md`](./asset-loading.md),
and [`ugc-safety.md`](./ugc-safety.md) are enforced by intent
only; CSP is the wall that turns intent into refusal at the
browser layer.

Companion docs:
- [`worker-csp.md`](./worker-csp.md) — per-Worker CSP profile.
- [`runtime-requirements.md`](./runtime-requirements.md) — pinned
  browser engine floor that CSP support depends on.
- [`asset-loading.md`](./asset-loading.md) — `connect-src` for
  asset fetches.
- [`net-transport.md`](./net-transport.md) — `connect-src` for
  WebRTC signalling and AI gateway.
- [`ai-integration.md`](./ai-integration.md) — AI gateway origin
  allowlist.

---

## 1. Shipped policy

The canonical HTML file ships the CSP via a `<meta http-equiv>`
tag. Static-host configurations (e.g. nginx, Cloudflare Pages,
Tauri local server) MUST also emit the same policy as an
HTTP response header. The two surfaces are kept in lockstep by
the build pipeline (Plan 30); divergence is a CI failure.

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
| `script-src 'self'` | No `unsafe-eval`, no `unsafe-inline`. Workers, Worklets, modules all served same-origin. |
| `connect-src 'self' wss://signaling.* https://ai-gateway.*` | Same-origin XHR/fetch + the two named wildcards. The wildcards collapse to concrete origins at build time per [`net-transport.md`](./net-transport.md) and [`ai-integration.md`](./ai-integration.md). |
| `img-src 'self' blob: data:` | `blob:` URLs let `createImageBitmap` accept a transferred buffer; `data:` is needed for tiny inline placeholders ([`pack-contract.md` § Asset Fallback](./pack-contract.md#asset-fallback-and-placeholders)). External `https:` images are rejected. |
| `media-src 'self' blob:` | Same as `img-src` for audio buffers. |
| `font-src 'self'` | Pack assets MAY NOT include fonts (per [`asset-policy.md`](./asset-policy.md)); the host ships its own bundled font. |
| `frame-ancestors 'none'` | The app refuses to be embedded in any iframe — closes clickjacking. |
| `object-src 'none'` | No `<object>`, `<embed>`, or legacy plugin surface. |
| `base-uri 'none'` | A `<base>` tag injection cannot rewrite the script origin. |
| `require-trusted-types-for 'script'` | Every DOM-sink that takes a string ([`element.innerHTML`, `Worker(url)`, `eval`, …]) requires a `TrustedHTML` / `TrustedScriptURL` value, minted only by the policy below. |
| `trusted-types canonical-policy` | One named policy. Any other policy name (including the `default` policy) is refused by the browser. |

---

## 2. Trusted Types policy

The single allowed policy is `canonical-policy`, registered at
boot in `src/runtime/security/trusted-types.ts` (owning task:
[`tasks/mvp/00-core-architecture/22-04-shipped-csp-and-trusted-types.md`](../../tasks/mvp/00-core-architecture/22-04-shipped-csp-and-trusted-types.md)).

```typescript
trustedTypes.createPolicy("canonical-policy", {
  // Only mints a TrustedHTML for strings that have already been
  // sanitised by the formatter pipeline.
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

`formatTrustedHtml` is the single entry point for any DOM-sink
that takes HTML. It runs the strings through the same formatter
pipeline used by [`error-formatter.md`](./error-formatter.md) for
user-visible error text — text-only by default, named markup
allowlist for the few places that need it.

---

## 3. CI gate

The build pipeline (Plan 30 — owning doc
[`production-build.md`](./production-build.md)) ships a
**CSP-assertion script** that:

1. Loads the bundled `index.html` and asserts the `<meta>` CSP
   matches § 1 byte-for-byte.
2. Greps the bundled JavaScript for `eval(`, `new Function(`,
   `setTimeout("…")`, `setInterval("…")`, and any `<script>`
   inline content; the build fails on any match.
3. Asserts that `trustedTypes.createPolicy` is called exactly
   once with the name `canonical-policy`, and that `createScript`
   / `createScriptURL` both throw.
4. Asserts the CSP header emitted by the static-host config (the
   two surfaces are kept lockstep).

The gate is wired into `npm run validate` after the existing
build-attestation gate. Failures route through the closed
`build.error.csp.*` codes registered in
[`pack-error-codes.md`](./pack-error-codes.md).

---

## 4. Permitted exceptions

There are **no permitted runtime exceptions**. If a third-party
library requires `unsafe-eval` (e.g. legacy `eval`-based
templating), it is rejected by the dependency policy
([`dependency-policy.md`](./dependency-policy.md)). The current
allowlist is:

| Origin | Directive | Why |
|---|---|---|
| `wss://signaling.*` | `connect-src` | WebRTC signalling per [`net-transport.md`](./net-transport.md). The actual hosts collapse to two concrete origins at build time. |
| `https://ai-gateway.*` | `connect-src` | Optional AI gateway per [`ai-integration.md`](./ai-integration.md). When the gateway is disabled, the directive collapses to `connect-src 'self'`. |

---

## 5. Cross-references

- [`worker-csp.md`](./worker-csp.md) — per-Worker CSP that
  inherits this profile.
- [`runtime-requirements.md`](./runtime-requirements.md) — browser
  engine floor.
- [`asset-loading.md`](./asset-loading.md) — `connect-src`
  consumer for `pack://` virtual fetches (handled by the host's
  in-memory archive root, not by the network surface).
- [`net-transport.md`](./net-transport.md) — `connect-src`
  signalling consumer.
- [`ai-integration.md`](./ai-integration.md) — `connect-src`
  AI gateway consumer.
- [`error-formatter.md`](./error-formatter.md) — Trusted Types
  policy consumes the same sanitiser pipeline.
- [`production-build.md`](./production-build.md) — CI gate.
