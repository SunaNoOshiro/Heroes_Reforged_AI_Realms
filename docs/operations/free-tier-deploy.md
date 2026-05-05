# Free-Tier Deploy Recipe

> Source plan:
> [`docs/implementation-plans/24-tls-enforcement-and-webrtc-authentication-plan.md`](../implementation-plans/24-tls-enforcement-and-webrtc-authentication-plan.md).

A single-page deploy recipe for running Heroes Reforged at **~$0/month**
(domain optional). This is one supported deploy among others; nothing
in the architecture forces this profile, but every contract pinned in
the codebase is compatible with it.

Companion docs:

- [`docs/architecture/transport-security.md`](../architecture/transport-security.md)
  — TLS / HSTS / cipher / cert-lifecycle baseline.
- [`docs/architecture/web-headers.md`](../architecture/web-headers.md)
  — CSP / SRI / CORS baseline.
- [`docs/architecture/multiplayer-security.md`](../architecture/multiplayer-security.md)
  — TURN credential format + threat model.
- [`docs/architecture/ai-integration.md`](../architecture/ai-integration.md)
  — provider-neutral AI boundary.

---

## 1. Layer Map

| Layer | Choice | Recurring cost |
|---|---|---|
| Static SPA | **GitHub Pages** (or Cloudflare Pages for full HSTS header) | $0 |
| Signaling server | **Fly.io free tier** (3× 256 MB shared-CPU VMs, 160 GB outbound/mo) | $0 |
| STUN | Public `stun.l.google.com:19302` | $0 |
| TURN | **Off by default** — see § 5 | $0 |
| TLS certs | Let's Encrypt (managed by the platform) | $0 |
| AI generation | **BYO key / local Ollama** — see § 6 | $0 |
| Domain | `*.pages.dev` / `*.github.io` free; custom domain ~$10/yr | $0 / $10 yr |

The two cost walls are TURN bandwidth (only used by ~15–20 % of peer
connections) and provider AI calls (entirely opt-in). Both are
addressed below.

## 2. Static SPA — GitHub Pages

- Repo's built `dist/` is published to the `gh-pages` branch by the
  build pipeline.
- Custom domain via the standard `CNAME` file. Free TLS via
  Let's Encrypt is automatic on `*.github.io` and on custom domains.
- 100 GB bandwidth / month soft cap. Plenty for a single-player +
  P2P game.
- **Header limitation**: GitHub Pages does not let you set arbitrary
  response headers. The
  [`web-headers.md` § 1](../architecture/web-headers.md#1-required-headers)
  baseline is delivered via in-document directives:
  - `Content-Security-Policy` → `<meta http-equiv="Content-Security-Policy" …>`
    in the HTML head; this is honored by every supported browser.
  - `upgrade-insecure-requests` → embedded in the same CSP meta tag.
  - `Strict-Transport-Security` → **not** settable via meta. Browsers
    ignore HSTS in `<meta>`. The free-tier deploy accepts this gap;
    every other transport-security control still applies. Operators
    who need HSTS as a real header upgrade to **Cloudflare Pages**
    (also free) which provides full header control via
    `_headers`.
- Cross-link: this exception is acknowledged in
  [`transport-security.md` § 5](../architecture/transport-security.md#5-dev-vs-prod).

## 3. Signaling Server — Fly.io Free Tier

- Stateless container per
  [Task 01](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md).
- One `fly.toml` deploy, single region, autoscale to 0 when idle. Cold
  start ~1 s — acceptable for a lobby join.
- TLS terminated at the Fly.io edge; HSTS, cipher allowlist, and
  Origin allowlist applied per
  [`services/signaling/config/edge.example.toml`](../../services/signaling/config/edge.example.toml).
- 160 GB/mo outbound is plenty for signaling traffic (only SDP/ICE
  metadata flows through, never gameplay or chat — see
  [`signaling-payload-policy.md`](../architecture/signaling-payload-policy.md)).
- WSS-only listener; `ws://` rejected at bootstrap per
  [`transport-security.md` § 1](../architecture/transport-security.md#1-listener-wss-only--https-only).

### Alternative: Oracle Cloud Always Free

If Fly.io's auto-suspend is unacceptable or the 160 GB cap looks
tight, Oracle's "Always Free" tier offers 4 ARM cores + 24 GB RAM
permanently. More setup pain (you manage the VM, certs via
certbot, optional Cloudflare Tunnel for the edge), but it never
suspends and has no bandwidth cap.

### Alternative: Cloudflare Workers + Durable Objects

Free tier viable (1 M req/month). Requires rewriting the `ws`-based
server as a Worker / DO; bigger lift, only worth it if you want
zero-ops at the cost of code-portability.

## 4. STUN — Public Google STUN

`stun.l.google.com:19302` is already pinned by
[Task 02](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md).
Free, no account needed, no credentials. Sufficient for ~80 % of
peer-to-peer connections.

## 5. TURN — Off by Default

TURN bandwidth is the only place free runs out. Cloudflare Calls
TURN has a 1 000 GB/mo free tier, but at scale this caps out fast.

**Free-tier rule**: ship with **STUN only**. The 15–20 % of users
behind symmetric NAT will see `peerFailureReason: NETWORK_ERROR`
and a localized "couldn't establish a direct connection" hint;
the lobby UI suggests "ask the other player to switch networks
or use a phone hotspot."

Self-publishers who want broader compatibility plug in either:

- **Cloudflare Calls TURN** (free 1 000 GB/mo) via
  [`services/multiplayer/turn-config.md`](../../services/multiplayer/turn-config.md);
  beyond the free tier, ~$0.01 / GB.
- **Self-hosted coturn** on the same Oracle Always Free VM as the
  signaling server, no incremental cost.

This matches the "TURN-only matches inflating bills" mitigation in
[`multiplayer-security.md` § Anti-Cheat Threat Model](../architecture/multiplayer-security.md#anti-cheat-threat-model).

## 6. AI Generation — BYO Key / Local AI

Default deploy mode: **the project pays nothing for AI**.

- **BYO API key**: the user pastes their provider key into the
  privacy-scoped settings pane; the key is stored in IndexedDB
  (per [`data-inventory.md`](../architecture/data-inventory.md))
  and used directly from the browser. The provider request goes
  client → provider; no project-side relay.
- **Local AI**: the user points the AI provider URL at
  `http://localhost:11434` (Ollama) or any OpenAI-compatible local
  endpoint. Zero cloud cost, full privacy.
- **Shared gateway** (`services/ai-gateway/`): **opt-in** for
  operators who want to centralize keys / quotas. Default deploy
  does not run it.

The provider-neutral boundary in
[`ai-integration.md`](../architecture/ai-integration.md) already
allows this; nothing in the schema forces a hosted gateway.

## 7. Cloudflare Free Tiers Cheat Sheet

For operators who'd rather wrap everything in Cloudflare:

| Service | Free quota | Use |
|---|---|---|
| Cloudflare Pages | Unlimited bandwidth + req, 500 builds/mo, full header control via `_headers` | Static SPA (HSTS-friendly upgrade from GitHub Pages) |
| Cloudflare Workers | 100 K req/day, 10 ms CPU | Edge logic / WAF |
| Cloudflare Calls TURN | 1 000 GB/mo | Optional TURN |
| Cloudflare Tunnel | Free, WebSocket-capable | Tunnel from a self-hosted signaling VM to a public hostname |
| DDoS + WAF | Free | Wraps any origin behind their nameservers |

Domain registration through Cloudflare is **at-cost** (no markup) but
not free.

## 8. Total Monthly Cost

| Scenario | Recurring |
|---|---|
| GitHub Pages + Fly.io + STUN-only + BYO AI key + `*.github.io` domain | **$0** |
| Same, with custom domain | **~$10/year** (registrar) |
| Same, with Cloudflare TURN under 1 TB/mo | **$0** |
| Same, with Cloudflare TURN at 5 TB/mo | **~$40/month** (overage) |
| Same, with hosted AI gateway paying $5/mo of provider quota | **~$5/month** |

The deploy is "almost free" in the strict sense as long as TURN
stays off (or under the 1 TB cap) and the AI gateway is not run
project-side.

## 9. What This Profile Does Not Do

- **No HSTS as a response header** on GitHub Pages. Cloudflare Pages
  fixes this for free.
- **No always-on signaling** on Fly.io free tier (cold-start ~1 s).
  Oracle Always Free fixes this.
- **No global edge presence**. Single-region signaling means peers
  on other continents see ~150–200 ms RTT to the lobby. Acceptable
  for the M5 multiplayer scope (signaling is metadata-only; the
  match itself is P2P after handshake).
- **No paid alerting** for cert expiry. The 14-day expiry alert in
  [`transport-security.md` § 6](../architecture/transport-security.md#6-cert-lifecycle)
  becomes manual or skipped on free tier; Plan 31 (alerting) is
  the upgrade path.

## 10. Migration Path

If usage grows past free-tier limits, the upgrade order is:

1. Custom domain (~$10/yr).
2. Cloudflare Pages for full headers.
3. Cloudflare Calls TURN if direct-connect failures are a real
   support burden.
4. Fly.io paid tier (~$5/mo per VM) once cold-starts hurt UX.
5. Hosted AI gateway only if you want to monetize / quota / share
   one key — otherwise stay BYO.

Each step is incremental; nothing about the architecture forces a
big-bang migration.
