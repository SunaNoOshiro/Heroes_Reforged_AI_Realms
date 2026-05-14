# Web Headers

Edge-tier response-header baseline for **CSP**, **SRI**, **CORS**,
**Referrer-Policy**, **HSTS** echo, and `Permissions-Policy`. Every
project-owned web-tier surface — web shell, signaling HTTP routes,
AI gateway HTTP routes — inherits this contract.

Companion docs:

- [`transport-security.md`](./transport-security.md) — TLS floor,
  HSTS canonical pin, WSS-only / HTTPS-only listener rules. This
  doc echoes the HSTS value; the transport doc owns the policy.
- [`csp.md`](./csp.md) — host-SPA `<meta>` CSP and Trusted Types.
  When the web shell ships, the response-header CSP below MUST
  match `csp.md` byte-for-byte (see § 1 "CSP duality").
- [`permissions.md`](./permissions.md) — OS / browser API allowlist
  that the `Permissions-Policy` header enforces at the edge.
- [`pack-contract.md`](./pack-contract.md) — packs MUST NOT embed
  external `<script>` / `<link rel="stylesheet">` (§ 2 fallback).

---

## 1. Required Headers

Every HTML / JSON response served by a project-owned web-tier
surface (web shell, signaling HTTP routes, AI gateway HTTP routes)
MUST carry the headers below. The example values are the
production baseline; operators MAY tighten but MUST NOT loosen.

```
Content-Security-Policy:
  default-src 'self';
  connect-src 'self' wss://signaling.example.com https://ai.example.com;
  img-src 'self' data:;
  media-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  frame-ancestors 'none';
  upgrade-insecure-requests;
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Referrer-Policy: no-referrer
X-Content-Type-Options: nosniff
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

Rules:

- `'unsafe-inline'` on `style-src` is allowed only because the
  current SPA emits inline `style` attributes for the renderer
  hit-test layer. Inline `<script>` is **never** allowed.
- `connect-src` MUST pin to the canonical signaling and AI-gateway
  hostnames. `*` and scheme-only origins are forbidden.
- `frame-ancestors 'none'` blocks the SPA from being framed; the
  game does not embed in third-party iframes.
- `upgrade-insecure-requests` is paired with the same directive in
  [`transport-security.md` § 4](./transport-security.md#4-anti-downgrade).
- `Permissions-Policy` denies `camera` / `microphone` / `geolocation`
  by default; future opt-in surfaces MUST cite
  [`permissions.md`](./permissions.md) before enabling.
- `Strict-Transport-Security` is echoed from
  [`transport-security.md` § 3](./transport-security.md#3-hsts-at-the-edge);
  if the two ever drift, the transport doc wins.

**CSP duality.** The host SPA also ships a deny-by-default CSP via
`<meta http-equiv="Content-Security-Policy">` per
[`csp.md`](./csp.md). The response-header CSP above is the edge
mirror for non-HTML responses and for hosts that can set headers.
When the web shell lands, build pipelines MUST keep the meta CSP
and the response-header CSP lockstep; divergence is a CI failure
per [`csp.md` § 3](./csp.md#3-ci-gate). The current baseline above
predates the Trusted-Types tightening in `csp.md`; see `## ⚠ Issues`
for the reconciliation gap.

## 2. Subresource Integrity (SRI)

Every external `<script>` or `<link rel="stylesheet">` in any
shipped HTML MUST carry both `integrity="sha384-…"` and
`crossorigin="anonymous"`.

- The wiki generator (`scripts/generate-architecture-wiki.mjs`)
  inlines its assets and therefore emits no external `<script>`.
  If extended to load CDN scripts, the generator MUST emit SRI.
- The future web-shell builder (deferred surface) MUST populate
  SRI from a build-time hash table; missing or wrong `integrity`
  is a CI failure.
- Packs MUST NOT embed external `<script>` / `<link rel="stylesheet">`
  per [`pack-contract.md`](./pack-contract.md). Any future
  exception MUST ship with SRI; the validator rejects on
  missing / wrong hash.

## 3. CORS Allowlist

| Surface | `Access-Control-Allow-Origin` | Notes |
|---|---|---|
| Signaling WebSocket upgrade | `Origin` header validated against the canonical web origin; mismatch returns `403` | Wildcards forbidden |
| Signaling `/turn-credential`, `/healthz` | Canonical web origin only | No `*` |
| AI gateway HTTP routes | Canonical web origin only | No `*` |
| Web shell static assets | `same-origin` (no CORS surface) | n/a |

The CI gate `npm run validate:headers` parses each edge example
config and fails if any `Access-Control-Allow-Origin: *` entry
appears, or if the `Origin` allowlist is missing.

## 4. Per-Surface Edge Config Examples

- [`services/signaling/config/edge.example.toml`](../../services/signaling/config/edge.example.toml)
  — WSS listener, plain-WS rejection, HSTS, cipher allowlist,
  `Origin` validation, CORS pin.
- [`services/ai-gateway/config/edge.example.toml`](../../services/ai-gateway/config/edge.example.toml)
  — HTTPS listener, HSTS, CORS pinned to canonical web origin.
- `services/web/config/edge.example.toml` — deferred until the
  web-shell tree lands; will own the CSP / SRI surface for HTML
  responses.

## 5. CI Gates

`npm run validate:headers` (owned by
[`phase-3.01-multiplayer.24-transport-security-edge-config`](../../tasks/phase-3/01-multiplayer/24-transport-security-edge-config.md);
script `scripts/check-web-headers.mjs` lands with that task):

- parses each edge config for the headers in § 1;
- fails if any required header is missing;
- fails if `Access-Control-Allow-Origin: *` is present;
- fails if `Strict-Transport-Security` lacks `includeSubDomains`
  or has `max-age < 31536000`.

`npm run validate:transport` per
[`transport-security.md` § 8](./transport-security.md#8-ci-gates)
covers the TLS / scheme / dev-cert layer that this doc inherits.

## 6. Out of scope

- **CSP `report-uri` / `report-to`.** Wired by the logging /
  monitoring surface; the § 1 baseline is intentionally
  reporting-disabled until that infra is in place.
- **Cookies / session-cookie attributes.** The project has no
  server-issued session-cookie surface; if one is added, this doc
  gains a "Cookies" section pinning `Secure`, `HttpOnly`,
  `SameSite=Strict`.
- **CORP / COEP / COOP.** Deferred until the web shell starts
  using `SharedArrayBuffer`-style features; not required by the
  M5 rendering / multiplayer surfaces.

---

## 🔍 Sync Check

- **UI: ✔** — Edge-tier response headers only; no UI screen
  consumes them. The single user-visible touch-point — the
  `Permissions-Policy` deny set — matches the `forbidden` /
  `deferred` rows in
  [`permissions.md` § 1](./permissions.md#1-allowlist) (camera,
  microphone, geolocation all gated).
- **Schema: ✔ (n/a)** — No `content-schema/schemas/*.schema.json`
  registration is implied — header values are edge-config shape,
  not wire / save schema. The HSTS pin matches
  [`transport-security.md` § 3](./transport-security.md#3-hsts-at-the-edge)
  byte-for-byte
  (`max-age=63072000; includeSubDomains; preload`), and both
  example edge configs
  ([signaling](../../services/signaling/config/edge.example.toml),
  [ai-gateway](../../services/ai-gateway/config/edge.example.toml))
  emit the same value.
- **Tasks: ⚠** — Owning task
  [`phase-3.01-multiplayer.24-transport-security-edge-config`](../../tasks/phase-3/01-multiplayer/24-transport-security-edge-config.md)
  lists this file in `Read First` and derives its
  `validate:headers` gate from § 1 / § 3. Reciprocal cite
  resolves. However, the response-header CSP in § 1 diverges from
  [`csp.md` § 1](./csp.md#1-shipped-policy) (different directive
  set + missing Trusted Types). See `## ⚠ Issues`.

## ⚠ Issues

- **CSP duplication / drift with `csp.md`.** § 1 publishes a
  response-header CSP that does not match the host-SPA `<meta>` CSP
  in [`csp.md` § 1](./csp.md#1-shipped-policy). Specifically: § 1
  here includes `style-src 'self' 'unsafe-inline'`, omits
  `font-src`, `object-src 'none'`, `base-uri 'none'`,
  `require-trusted-types-for 'script'`, and
  `trusted-types canonical-policy`, and uses fully-qualified
  `connect-src` hostnames (`wss://signaling.example.com`,
  `https://ai.example.com`) instead of the wildcard form
  (`wss://signaling.*`, `https://ai-gateway.*`) the host SPA
  ships. Per [`csp.md` § 3](./csp.md#3-ci-gate) check 4, the meta
  CSP and the response-header CSP MUST match byte-for-byte. Per
  CLAUDE.md "no duplicated logic" (skill § 7), one of the two
  docs must be the canonical statement and the other a one-line
  reference. Recommended canonicalization: `csp.md` owns the CSP
  string; this doc demotes § 1's CSP block to a reference. Closer:
  the owning task above (Acceptance Criteria already cites
  "every required header from web-headers.md § 1", so the same
  task can reconcile). The audit did not edit `csp.md` (Hard
  Prohibition D).
- **Edge configs omit `Content-Security-Policy`.** § 1 requires
  every web-tier response to carry the CSP block, but
  [`services/signaling/config/edge.example.toml`](../../services/signaling/config/edge.example.toml)
  and
  [`services/ai-gateway/config/edge.example.toml`](../../services/ai-gateway/config/edge.example.toml)
  emit only HSTS / Referrer-Policy / X-Content-Type-Options /
  Permissions-Policy / CORS. Either the configs need a
  `Content-Security-Policy` entry, or this doc should narrow § 1
  to "HTML responses" (CSP is browser-meaningful only on
  HTML-like content). Per Acceptance Criteria of
  [`phase-3.01-multiplayer.24-transport-security-edge-config`](../../tasks/phase-3/01-multiplayer/24-transport-security-edge-config.md)
  ("missing required header from web-headers.md § 1" → fail),
  task 24 is the closer; recommended resolution is the narrowing
  (signaling `/healthz` and AI-gateway JSON do not benefit from
  CSP). The audit did not edit the toml configs (Hard
  Prohibition D).
- **`scripts/check-web-headers.mjs` not yet present.** § 5
  references `npm run validate:headers`; the script is an Owned
  Path of [`phase-3.01-multiplayer.24-transport-security-edge-config`](../../tasks/phase-3/01-multiplayer/24-transport-security-edge-config.md),
  which is still planned. Expected — the doc is the spec the
  task implements — but flagged here so future readers see the
  gate is doctrine-only until task 24 lands. No file edit
  required from this audit.
