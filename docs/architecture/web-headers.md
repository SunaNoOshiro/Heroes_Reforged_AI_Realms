# Web Headers

Canonical baseline for **Content-Security-Policy**, **Subresource
Integrity**, **CORS**, **Referrer-Policy**, and the rest of the web-
tier security headers. Inherits the transport floor from
[`transport-security.md`](./transport-security.md).

---

## 1. Required Headers

Every HTML / JSON response served by a project-owned web-tier surface
(web shell, signaling server's HTTP routes, AI gateway) MUST carry
the headers below. The example values are the production baseline;
operators MAY tighten but MUST NOT loosen.

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

Notes:

- `'unsafe-inline'` on `style-src` is allowed only because the
  current SPA generates inline `style` attributes for the renderer
  hit-test layer. Inline `<script>` is **not** allowed.
- `connect-src` must be pinned to the canonical signaling and AI
  gateway hostnames; never use `*` or scheme-only origins.
- `frame-ancestors 'none'` blocks the SPA from being framed; the
  game does not embed in third-party iframes.
- `upgrade-insecure-requests` is paired with the same directive in
  `transport-security.md` § Anti-Downgrade.
- `Permissions-Policy` denies camera / microphone / geolocation by
  default; future opt-in surfaces MUST cite
  [`permissions.md`](./permissions.md) before enabling.

## 2. Subresource Integrity (SRI)

Every external `<script>` or `<link rel="stylesheet">` in any
shipped HTML MUST carry both `integrity="sha384-…"` and
`crossorigin="anonymous"`.

- The wiki generator (`scripts/generate-architecture-wiki.mjs`)
  inlines its assets and therefore does not emit external
  `<script>` tags; if it is ever extended to load CDN scripts, the
  generator MUST emit SRI.
- The future web-shell builder (deferred surface) MUST
  populate SRI from a build-time hash table; missing or wrong
  `integrity` is a CI failure.
- Packs MUST NOT embed external `<script>` / `<link rel="stylesheet">`
  per [`pack-contract.md`](./pack-contract.md). If a future
  exception surfaces, SRI is mandatory and the validator rejects
  on missing/wrong hash.

## 3. CORS Allowlist

| Surface | `Access-Control-Allow-Origin` | Notes |
|---|---|---|
| Signaling server WebSocket upgrade | `Origin` header validated against the canonical web origin; mismatch returns `403` | Wildcard origins are forbidden |
| Signaling server `/turn-credential`, `/healthz` | canonical web origin only | No `*` |
| AI gateway HTTP routes | canonical web origin only | No `*` |
| Web shell static assets | `same-origin` (no CORS surface) | n/a |

The CI gate `npm run validate:headers` parses each edge example
config and fails if any `Access-Control-Allow-Origin: *` entry
appears, or if the `Origin` allowlist is missing.

## 4. Per-Surface Edge Config Examples

- [`services/signaling/config/edge.example.toml`](../../services/signaling/config/edge.example.toml)
  — WSS listener, plain-WS rejection, HSTS, cipher allowlist,
  Origin validation.
- [`services/ai-gateway/config/edge.example.toml`](../../services/ai-gateway/config/edge.example.toml)
  — HTTPS listener, HSTS, CORS pinned to canonical origin.
- `services/web/config/edge.example.toml` (deferred until the
  web-shell tree lands).

## 5. CI Gates

- `npm run validate:headers`:
  - parses each edge config for the headers in § 1;
  - fails if any required header is missing;
  - fails if `Access-Control-Allow-Origin: *` is present;
  - fails if `Strict-Transport-Security` lacks
    `includeSubDomains` or has `max-age < 31536000`.
- `npm run validate:transport` (per
  [`transport-security.md` § 8](./transport-security.md#8-ci-gates)).

## 6. Out of scope

- **CSP `report-uri` / `report-to`** — wired by the logging /
  monitoring surface; the baseline above is intentionally
  reporting-disabled until that infra is in place.
- **Cookies / session-cookie attributes** — the project has no
  server-issued session cookie surface; if one is added, this doc
  gains a "Cookies" section pinning `Secure`, `HttpOnly`,
  `SameSite=Strict`.
- **CORP / COEP / COOP** — defer until the web shell starts using
  `SharedArrayBuffer`-style features; not required by the M5
  rendering / multiplayer surfaces.
