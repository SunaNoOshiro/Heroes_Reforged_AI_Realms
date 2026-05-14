# Transport Security

Canonical doctrine for **HTTPS-only / WSS-only** listeners, **HSTS**,
**TLS floor**, **anti-downgrade**, **dev-cert exclusion**, and
**certificate lifecycle**. Every web-tier surface (signaling server,
AI gateway, web shell, future native shell) inherits this contract.

Companion docs:

- [`web-headers.md`](./web-headers.md) — CSP / SRI / CORS /
  `Referrer-Policy` baseline.
- [`tls-observability.md`](./tls-observability.md) — redacted TLS-error
  log shape.
- [`multiplayer-security.md`](./multiplayer-security.md) — room secret,
  TURN credentials, anti-cheat threat model.
- [`peer-identity.md`](./peer-identity.md) — peer keypair contract.
- [`signaling-envelope.md`](./signaling-envelope.md) — signed
  signaling envelope.

---

## 1. Listener (WSS-only / HTTPS-only)

| Surface | Required scheme | Dev exception |
|---|---|---|
| Signaling server (`services/signaling/`) | `wss://` | `ws://localhost` only when `NODE_ENV === 'test'` |
| AI gateway (`services/ai-gateway/`) | `https://` | `http://localhost` only when `NODE_ENV === 'test'` |
| Web shell (`services/web/`) | `https://` | `http://localhost` in the dev loop only |
| Invite-link parser ([Task 8](../../tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md)) | `https://` | none — `http://` rejected unconditionally |

Two non-negotiable bootstrap rules:

- The signaling server MUST refuse to bind on `ws://` unless
  `process.env.NODE_ENV === 'test'`.
- The AI-gateway adapter MUST refuse to attach to an `http://`
  upstream **regardless of environment**.

## 2. TLS Floor

- **Minimum protocol**: TLS 1.2. TLS 1.0 / 1.1 / SSL 3.0 are rejected.
- **Preferred protocol**: TLS 1.3 where the platform supports it
  (Fly.io, Railway, Cloudflare).
- **Cipher allowlist** (TLS 1.2 only):
  - `ECDHE-ECDSA-AES128-GCM-SHA256`
  - `ECDHE-RSA-AES128-GCM-SHA256`
  - `ECDHE-ECDSA-CHACHA20-POLY1305`
  - `ECDHE-RSA-CHACHA20-POLY1305`

  Any RC4, 3DES, CBC-without-AEAD, or NULL cipher is forbidden.
- **No weak-cipher fallback**: the reverse proxy / edge MUST refuse
  any handshake that cannot agree on the allowlist.
- **`NODE_TLS_REJECT_UNAUTHORIZED=0` is forbidden** in any production
  env file or non-test code path. The CI gate in
  [`tasks/phase-3/01-multiplayer/24-transport-security-edge-config.md`](../../tasks/phase-3/01-multiplayer/24-transport-security-edge-config.md)
  fails any commit that introduces it outside `*.test.*`.

## 3. HSTS at the Edge

Every production response from a web-tier surface MUST carry:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

- `max-age >= 31536000` (one year) is the CI floor; the doctrine
  pins **two years** (`63072000`) as the production default to ease
  preload-list submission.
- `includeSubDomains` is mandatory.
- `preload` is opt-in; recommended once the operator commits to
  HSTS-preload submission semantics.

## 4. Anti-Downgrade

- The web shell embeds
  `<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">`
  in `<head>` **and** the edge sets the corresponding response
  header (see [`web-headers.md`](./web-headers.md)).
- All in-app URL constants (signaling URL, AI-gateway URL, invite-
  link base) are pinned to `wss://` / `https://`. The CI gate
  `npm run validate:transport` greps `services/signaling/`,
  `services/ai-gateway/`, and the future web-shell config for any
  `ws://` or `http://` literal and fails on hit. Test fixtures may
  opt out by tagging the line with the `// transport:test-only`
  sentinel comment.
- A first visit to an `http://` URL is unconditionally redirected
  to the canonical `https://` origin **at the edge, before any HTML
  is served**.

## 5. Dev vs. Prod

| `NODE_ENV` | Allowed scheme | TLS check | Cert source |
|---|---|---|---|
| `production` | `wss://` / `https://` only | strict | Let's Encrypt or platform-managed |
| `development` | `wss://` / `https://` preferred; `ws://localhost` / `http://localhost` allowed | strict for non-localhost; bypassed only on `localhost` | local mkcert / dev cert |
| `test` | `ws://localhost` / `http://localhost` allowed | bypassed | none required |

Any process whose `process.env.NODE_ENV` is unset MUST refuse to
bind a non-localhost listener — fail-closed default.

**Free-tier exception (GitHub Pages).** When the static SPA is
served from GitHub Pages, response headers cannot be set, so the
HSTS header in § 3 is unreachable. The fallback is best-effort:

- `upgrade-insecure-requests` is delivered via
  `<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">`
  in the HTML head — browsers honor it from meta.
- HSTS in `<meta>` is **ignored** by browsers; there is no meta
  fallback. Operators who need HSTS as a real response header
  upgrade to Cloudflare Pages (also free) per
  [`docs/operations/free-tier-deploy.md` § 2](../operations/free-tier-deploy.md#2-static-spa--github-pages).

## 6. Cert Lifecycle

- **Provisioning**: Let's Encrypt via platform-native ACME (Fly.io,
  Railway, Caddy). Self-hosted operators are documented in
  [`services/multiplayer/turn-config.md`](../../services/multiplayer/turn-config.md).
- **Auto-renewal**: automatic at **30 days before expiry**.
- **Expiry alert**: the operator's monitoring stack MUST page on
  `expiry < 14 days`. Until alerting infrastructure lands, the
  manual fallback is
  [`docs/operations/rollback-playbook.md`](../operations/rollback-playbook.md).
- **Rotation cadence**: keys rotate at every renewal — there is no
  long-lived key surface. A compromised key has a **≤ 90 day** blast
  radius.
- **Dev-cert exclusion**: `npm run validate:transport` rejects any
  reference to `*.dev.crt`, `localhost.crt`, or `mkcert*.pem` in
  production env files or release-tag artifacts.

## 7. Cert Pinning

**N/A while the only client surface is a browser SPA.** Browsers do
not expose a stable cert-pin API; the deprecated `Expect-CT` header
is not load-bearing. Native clients are out of scope for M5–M7.

**Re-evaluation trigger.** The **first task** whose `ownedPaths`
include a native-shell directory (e.g. `apps/desktop/`,
`apps/mobile/`) MUST cite this section and either pin certs or
document why pinning is deferred.

## 8. CI Gates

`npm run validate:transport`

- greps `services/signaling/` and `services/ai-gateway/` for any
  `ws://` / `http://` literal (sentinel-marked fixtures excepted);
- asserts no `NODE_TLS_REJECT_UNAUTHORIZED` outside `*.test.*`;
- asserts no `*.dev.crt` / `localhost.crt` / `mkcert*.pem` in
  production env files.

`npm run validate:headers` (per [`web-headers.md`](./web-headers.md))

- asserts the edge config exposes HSTS with `max-age >= 31536000`
  and `includeSubDomains`.

`npm run validate:tasks`

- any new task whose `ownedPaths` include a native-shell directory
  MUST reference
  [`transport-security.md` § Cert Pinning](#7-cert-pinning).

## 9. Out of scope

- **Cert pinning for native shells** — see § 7.
- **mTLS** between client and signaling — overkill for a stateless
  signaling lobby; the room secret + signed envelope already gate
  identity (see
  [`multiplayer-security.md`](./multiplayer-security.md) and
  [`signaling-envelope.md`](./signaling-envelope.md)).
- **Operational alert routing** for cert expiry — owned by the
  alerting / monitoring infrastructure.

---

## 🔍 Sync Check

- **UI: ✔** — Doctrine is operator/edge-tier only; no UI screen
  consumes it. The single UI touch-point — invite-link scheme — is
  the `https://`-only rule in § 1, which matches the deep-link
  parser contract in
  [`tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md`](../../tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md)
  (rejects `http://` unconditionally; surfaces
  `ui.network-lobby.invite.insecureScheme`).
- **Schema: ✔** — No `content-schema/schemas/*.schema.json`
  registration is implied — TLS / HSTS / cipher values are edge-config
  shape, not wire / save schema. Header-baseline cross-doc
  ([`web-headers.md` § 1](./web-headers.md#1-required-headers))
  agrees on `Strict-Transport-Security: max-age=63072000;
  includeSubDomains; preload`. Cipher allowlist matches the
  `[tls].ciphers` block in
  [`services/signaling/config/edge.example.toml`](../../services/signaling/config/edge.example.toml)
  and
  [`services/ai-gateway/config/edge.example.toml`](../../services/ai-gateway/config/edge.example.toml).
- **Tasks: ✔** — Owning task
  [`phase-3.01-multiplayer.24-transport-security-edge-config`](../../tasks/phase-3/01-multiplayer/24-transport-security-edge-config.md)
  lists this file in `Read First`, derives its acceptance criteria
  from §§ 1, 2, 3, 6, 7, 8, and owns the
  `scripts/check-transport-security.mjs` /
  `scripts/check-web-headers.mjs` gates referenced here. Reciprocal
  citations in
  [`tls-observability.md`](./tls-observability.md) §§ 1, 4 (cipher
  allowlist + `tls.cert.pin_mismatch` reservation) and
  [`docs/operations/free-tier-deploy.md` § 2](../operations/free-tier-deploy.md#2-static-spa--github-pages)
  resolve.

## ⚠ Issues

_None._
