# Transport Security — Edge Config

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Pin the **WSS-only signaling listener**, **HTTPS-only AI gateway**,
and **HSTS / CSP / CORS / SRI** baseline at the edge. Author the
example reverse-proxy configs and add CI gates that fail any
regression on transport scheme, headers, or dev-cert leakage.
Covers the headers, cert-lifecycle, and cert-pinning items in
the transport-security improvements list.

Read First:
- [`docs/architecture/transport-security.md`](../../../docs/architecture/transport-security.md)
- [`docs/architecture/web-headers.md`](../../../docs/architecture/web-headers.md)
- [`docs/architecture/tls-observability.md`](../../../docs/architecture/tls-observability.md)
- [`docs/architecture/multiplayer-security.md`](../../../docs/architecture/multiplayer-security.md)

Inputs:
- Hosting platform edge config grammar (Caddyfile or Fly.io
  `fly.toml` `[[services]]` block).
- Canonical signaling and AI-gateway hostnames (operator-provided).

Outputs:
- `services/signaling/config/edge.example.toml` — example
  reverse-proxy / edge config: WSS listener, plain-WS rejection,
  HSTS header, cipher allowlist, `Origin` allowlist.
- `services/ai-gateway/config/edge.example.toml` — example
  reverse-proxy / edge config: HTTPS listener, HSTS header,
  `Access-Control-Allow-Origin` pinned to canonical web origin.
- `scripts/check-transport-security.mjs` — CI gate
  (`npm run validate:transport`). Greps services for any `ws://` /
  `http://` URL literal (excluding test fixtures with the
  `// transport:test-only` sentinel comment); asserts edge configs
  include HSTS with `max-age >= 31536000` and `includeSubDomains`;
  asserts no `NODE_TLS_REJECT_UNAUTHORIZED` outside `*.test.*`;
  asserts no `*.dev.crt` / `localhost.crt` / `mkcert*.pem` references
  in production env files.
- `scripts/check-web-headers.mjs` — CI gate
  (`npm run validate:headers`). Parses each edge config and asserts
  every required header in
  [`web-headers.md` § 1](../../../docs/architecture/web-headers.md#1-required-headers)
  is present with conformant values; rejects `Access-Control-Allow-Origin: *`.

Owned Paths:
- `services/signaling/config/edge.example.toml`
- `services/ai-gateway/config/edge.example.toml`
- `scripts/check-transport-security.mjs`
- `scripts/check-web-headers.mjs`

Owned Paths (shared):
- `services/signaling/src/server.ts` — Task 01 is the **primary
  owner**. This task contributes only the bootstrap assertion that
  refuses to bind on `ws://` unless `process.env.NODE_ENV === 'test'`.
  Wiring is **additive**: no change to the request-handler entry
  or message-envelope shape.
- `package.json` — owned by repo-tooling tasks; this task only
  appends two `validate:*` script entries and wires them into
  `validate`. Wiring is **additive**: no rename or removal of
  existing scripts.

Dependencies:
- phase-3.01-multiplayer.01-signaling-server-node-js-websocket-lobby

Acceptance Criteria:
- The signaling-server bootstrap refuses to bind on `ws://` unless
  `process.env.NODE_ENV === 'test'`; refusal surfaces a structured
  error with `errorCode: 'tls.bootstrap.plainWsForbidden'`.
- The AI-gateway adapter refuses to attach to an `http://` upstream
  regardless of environment (verified by unit test).
- `services/signaling/config/edge.example.toml` and
  `services/ai-gateway/config/edge.example.toml` both include:
  `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`,
  the cipher allowlist from
  [`transport-security.md` § 2](../../../docs/architecture/transport-security.md#2-tls-floor),
  and an `Origin` /
  `Access-Control-Allow-Origin` allowlist pinned to the canonical
  web origin.
- `npm run validate:transport` fails on any `ws://` literal in
  `services/signaling/` (excluding sentinel-marked fixtures);
  fails on any `http://` literal in `services/ai-gateway/`;
  fails on `NODE_TLS_REJECT_UNAUTHORIZED=0` in production env;
  fails on any `*.dev.crt` / `localhost.crt` / `mkcert*.pem`
  reference in production env files.
- `npm run validate:headers` fails on a missing or weak HSTS,
  on `Access-Control-Allow-Origin: *`, or on a missing required
  header from
  [`web-headers.md` § 1](../../../docs/architecture/web-headers.md#1-required-headers).
- Both gates wired into `npm run validate`; the wiring is
  additive (no rename or removal of existing `validate:*` scripts).
- The cert-lifecycle subsection of
  [`transport-security.md` § 6](../../../docs/architecture/transport-security.md#6-cert-lifecycle)
  is referenced from this task's verifyCommands runbook so an
  operator picking up the task can find the renewal cadence.
- The cert-pinning N/A note in
  [`transport-security.md` § 7](../../../docs/architecture/transport-security.md#7-cert-pinning)
  is enforced: any new task whose `ownedPaths` include a
  native-shell directory must reference that section. CI gate
  reserved here; native-shell directories do not yet exist, so
  the gate is documented but not load-bearing.
- **Shared-ownership split with Task 01**: Task 01 is the
  **primary owner** of `services/signaling/src/server.ts`. The
  bootstrap `ws://` refusal contributed by this task is
  **additive**: it MUST NOT rewrite Task 01's request-handler
  entrypoint, the message-envelope shape, or the in-memory
  room-table layout. The new call site slots in alongside the
  existing rate-limit and approval hooks.
- **Shared-ownership split with repo-tooling**: `package.json`
  is **owned by** the repo-tooling task layer. The
  `validate:transport` and `validate:headers` script entries
  contributed by this task are **additive**; they MUST NOT rename
  or remove existing `validate:*` scripts.

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
