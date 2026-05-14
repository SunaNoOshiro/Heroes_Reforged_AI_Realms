# Free-Tier Deploy Recipe

A single-page recipe for running Heroes Reforged at **~$0/month**
(custom domain optional). This is **one supported deploy** among
others; nothing in the architecture forces this profile, but every
contract pinned in the codebase is compatible with it.

Companion docs:

- [`docs/architecture/transport-security.md`](../architecture/transport-security.md)
  — TLS / HSTS / cipher / cert lifecycle.
- [`docs/architecture/web-headers.md`](../architecture/web-headers.md)
  — CSP / SRI / CORS baseline.
- [`docs/architecture/multiplayer-security.md`](../architecture/multiplayer-security.md)
  — room secret + TURN threat model.
- [`docs/architecture/ai-integration.md`](../architecture/ai-integration.md)
  — provider-neutral AI boundary.
- [`docs/architecture/signaling-payload-policy.md`](../architecture/signaling-payload-policy.md)
  — what the signaling server is allowed to forward.

---

## 1. Layer Map

| Layer | Choice | Recurring cost |
|---|---|---|
| Static SPA | **GitHub Pages** (or Cloudflare Pages for full HSTS header) | $0 |
| Signaling server | **Fly.io free tier** (3× 256 MB shared-CPU VMs, 160 GB outbound/mo) | $0 |
| STUN | Public `stun.l.google.com:19302` | $0 |
| TURN | **Off by default** — see § 5 | $0 |
| TLS certs | Let's Encrypt (platform-managed) | $0 |
| AI generation | **BYO key / local Ollama** — see § 6 | $0 |
| Domain | `*.pages.dev` / `*.github.io` free; custom domain ~$10/yr | $0 / $10 yr |

Only two layers can run up a bill: TURN bandwidth (used by ~15–20 %
of peer connections) and provider AI calls (entirely opt-in). Both
are addressed below.

## 2. Static SPA — GitHub Pages

- The built `dist/` is published to the `gh-pages` branch by the
  build pipeline.
- Custom domain via the standard `CNAME` file; free Let's Encrypt
  TLS is automatic on `*.github.io` and on custom domains.
- 100 GB bandwidth / month soft cap — ample for a single-player +
  P2P game.
- **Header limitation.** GitHub Pages does not let operators set
  arbitrary response headers. The
  [`web-headers.md` § 1](../architecture/web-headers.md#1-required-headers)
  baseline degrades as follows:

  | Header | Free-tier delivery |
  |---|---|
  | `Content-Security-Policy` | `<meta http-equiv="Content-Security-Policy" …>` in `<head>` — honored by every supported browser. |
  | `upgrade-insecure-requests` | Embedded in the same CSP `<meta>` tag. |
  | `Strict-Transport-Security` | **Not deliverable.** Browsers ignore HSTS in `<meta>`. |

  Operators who need HSTS as a real response header upgrade to
  **Cloudflare Pages** (also free, full header control via
  `_headers`). This gap is acknowledged in
  [`transport-security.md` § 5](../architecture/transport-security.md#5-dev-vs-prod).

## 3. Signaling Server — Fly.io Free Tier

- Stateless container per
  [Task 01](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md).
- One `fly.toml`, single region, autoscale-to-zero when idle. Cold
  start ~1 s — acceptable for a lobby join.
- TLS terminated at the Fly.io edge; HSTS, cipher allowlist, and
  `Origin` allowlist applied via
  [`services/signaling/config/edge.example.toml`](../../services/signaling/config/edge.example.toml).
- 160 GB/mo outbound is plenty: only SDP / ICE metadata traverses
  signaling per
  [`signaling-payload-policy.md`](../architecture/signaling-payload-policy.md)
  — never gameplay, chat, or content hashes.
- WSS-only listener; `ws://` rejected at bootstrap per
  [`transport-security.md` § 1](../architecture/transport-security.md#1-listener-wss-only--https-only).

### Alternative: Oracle Cloud Always Free

4 ARM cores + 24 GB RAM permanently, no auto-suspend, no bandwidth
cap. The operator manages the VM and certbot (and optionally a
Cloudflare Tunnel edge). Pick this if Fly.io's auto-suspend or
160 GB cap is unacceptable.

### Alternative: Cloudflare Workers + Durable Objects

Free tier viable (1 M req/month) but requires rewriting the
`ws`-based server as a Worker / DO. Only worth the lift if zero-ops
at the cost of code portability is the priority.

## 4. STUN — Public Google STUN

`stun.l.google.com:19302` is pinned by
[Task 02](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md).
Free, no account, no credentials. Sufficient for ~80 % of
peer-to-peer connections.

## 5. TURN — Off by Default

TURN bandwidth is the only place "free" runs out. Cloudflare Calls
TURN's 1 000 GB/mo free tier caps out at scale.

**Free-tier rule.** Ship with **STUN only**. The 15–20 % of users
behind symmetric NAT surface `peerFailureReason: NETWORK_ERROR` in
the network lobby per
[`64-network-lobby/spec.md` § Peer-Failure Error Contract](../architecture/wiki/screens/64-network-lobby/spec.md);
the operator-facing remediation hint is "try a different network."

Self-publishers who want broader compatibility plug in either:

- **Cloudflare Calls TURN** (free 1 000 GB/mo; ~$0.01 / GB beyond)
  via
  [`services/multiplayer/turn-config.md`](../../services/multiplayer/turn-config.md).
- **Self-hosted coturn** on the same Oracle Always Free VM as the
  signaling server — no incremental cost.

This mirrors the "TURN-only matches inflating bills" mitigation in
[`multiplayer-security.md` § Anti-Cheat Threat Model](../architecture/multiplayer-security.md#anti-cheat-threat-model).

## 6. AI Generation — BYO Key / Local AI

Default deploy: **the project pays nothing for AI**. The
provider-neutral seam in
[`ai-integration.md`](../architecture/ai-integration.md) already
allows this; nothing in the schema forces a hosted gateway.

- **BYO API key.** The user pastes their provider key into the
  privacy-scoped settings pane; the key is stored in IndexedDB (per
  [`data-inventory.md`](../architecture/data-inventory.md)) and
  consumed directly from the browser — no project-side relay.
- **Local AI.** The user points the AI provider URL at
  `http://localhost:11434` (Ollama) or any OpenAI-compatible local
  endpoint. Zero cloud cost, full privacy.
- **Shared gateway** (`services/ai-gateway/`). **Opt-in** for
  operators who want centralized keys / quotas. The default deploy
  does not run it; the 1.x path is BYO-key with no project-side
  secret per
  [`ai-integration.md` § 2](../architecture/ai-integration.md#2-ownership).

## 7. Cloudflare Free Tiers Cheat Sheet

For operators who'd rather wrap everything in Cloudflare:

| Service | Free quota | Use |
|---|---|---|
| Cloudflare Pages | Unlimited bandwidth + req, 500 builds/mo, full header control via `_headers` | Static SPA (HSTS-friendly upgrade from GitHub Pages) |
| Cloudflare Workers | 100 K req/day, 10 ms CPU | Edge logic / WAF |
| Cloudflare Calls TURN | 1 000 GB/mo | Optional TURN |
| Cloudflare Tunnel | Free, WebSocket-capable | Tunnel from a self-hosted signaling VM to a public hostname |
| DDoS + WAF | Free | Wraps any origin behind their nameservers |

Domain registration through Cloudflare is **at-cost** (no markup)
but not free.

## 8. Total Monthly Cost

| Scenario | Recurring |
|---|---|
| GitHub Pages + Fly.io + STUN-only + BYO AI key + `*.github.io` domain | **$0** |
| Same, with custom domain | **~$10/year** (registrar) |
| Same, with Cloudflare TURN under 1 TB/mo | **$0** |
| Same, with Cloudflare TURN at 5 TB/mo | **~$40/month** (overage) |
| Same, with hosted AI gateway paying $5/mo of provider quota | **~$5/month** |

The deploy is "almost free" as long as TURN stays off (or under the
1 TB cap) and the AI gateway is not run project-side.

## 9. What This Profile Does Not Do

- **No HSTS response header** on GitHub Pages — Cloudflare Pages
  fixes this for free.
- **No always-on signaling** on Fly.io free tier — cold-start ~1 s;
  Oracle Always Free fixes this.
- **No global edge presence** — single-region signaling means peers
  on other continents see ~150–200 ms RTT to the lobby. Acceptable
  for M5 multiplayer scope (signaling is metadata-only; the match
  itself is P2P after handshake).
- **No paid alerting** for cert expiry. The 14-day expiry alert in
  [`transport-security.md` § 6](../architecture/transport-security.md#6-cert-lifecycle)
  becomes manual or skipped on free tier; a paid alerting tier is
  the upgrade path.

## 10. Migration Path

If usage grows past free-tier limits, the upgrade order is:

1. Custom domain (~$10/yr).
2. Cloudflare Pages for full headers.
3. Cloudflare Calls TURN if direct-connect failures are a real
   support burden.
4. Fly.io paid tier (~$5/mo per VM) once cold-starts hurt UX.
5. Hosted AI gateway only if monetization / quota / shared-key
   centralization is needed — otherwise stay BYO.

Each step is incremental; the architecture forces no big-bang
migration.

---

## 🔍 Sync Check

- **UI: ✔** — `peerFailureReason: NETWORK_ERROR` matches the closed
  enum in
  [`64-network-lobby/spec.md` § Peer-Failure Error Contract](../architecture/wiki/screens/64-network-lobby/spec.md),
  [`64-network-lobby/interactions.md`](../architecture/wiki/screens/64-network-lobby/interactions.md),
  [`64-network-lobby/data-contracts.md`](../architecture/wiki/screens/64-network-lobby/data-contracts.md),
  and task
  [`21-peer-failure-ui-contract.md`](../../tasks/phase-3/01-multiplayer/21-peer-failure-ui-contract.md).
  The remediation hint is no longer quoted as literal copy — the
  screen spec is canonical.
- **Schema: ✔** — No schema rows owned here. STUN pin
  `stun.l.google.com:19302` matches the `Outputs` block of
  [Task 02](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md);
  edge-config + WSS-only + HSTS + TLS-floor rules trace to
  [`transport-security.md`](../architecture/transport-security.md)
  and
  [`web-headers.md`](../architecture/web-headers.md)
  byte-for-byte.
- **Tasks: ⚠** — [Task 01](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
  and [Task 02](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md)
  cover signaling + STUN as cited. § 6 references
  [`data-inventory.md`](../architecture/data-inventory.md) as the
  registration point for the BYO API key, but no matching row
  exists there. See `## ⚠ Issues`.

## ⚠ Issues

- **Missing data-inventory row for the BYO AI provider key.**
  § 6 asserts the user's provider key is stored in IndexedDB and
  registered in
  [`data-inventory.md`](../architecture/data-inventory.md). No
  matching row exists in
  [`data-inventory.md` § 1](../architecture/data-inventory.md#1-inventory-table)
  — the closest rows are unrelated (`AI prompt (per pack)` lives
  in `hr-packs.packs`; profile/privacy rows live in
  `hr-profile.*`). Per CLAUDE.md root contract ("every persisted
  field is registered in `data-inventory.md`"), the owning task
  for the BYO-key UI must add a row before the slice can ship.
  Suggested values: Field=`BYO AI provider key`,
  State path=`state.privacy.options.aiProviderKey`,
  Medium=`IndexedDB (hr-profile.privacy)`, Sensitivity=`high`
  (raw provider secret), Retention=`until user-deleted`,
  Wipe scope=`WIPE_LOCAL_DATA scope=profile|all`,
  Notes=`BYO-key flow per ai-integration.md § 2`. The audit did
  not edit `data-inventory.md` (Hard Prohibition D).
- **Stale TURN credential shape in
  `services/multiplayer/turn-config.md`.** Not new to this audit
  but worth noting because § 5 cross-links into it: that file
  still pins `username = ${unixTsExpiry}:${roomId}`,
  `ttl = 600 s`, and a `GET /turn-credential` HTTP endpoint, while
  the canonical doctrine in
  [`turn-credentials.md`](../architecture/turn-credentials.md) is
  `username = ${expEpochSeconds}:${roomCode}:${peerId}`, hard
  300 s ceiling, delivered via the `TURN_CREDENTIALS` signaling
  envelope (no separate HTTP endpoint). Already flagged in
  [`multiplayer-security.md` ⚠ Issues](../architecture/multiplayer-security.md);
  closer is the multiplayer / TURN-credentials task family. The
  free-tier recipe itself does not duplicate the stale shape, so
  this is FYI only — no edit needed in this file.
