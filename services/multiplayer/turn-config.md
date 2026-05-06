# TURN Configuration

Operational config for the M5 multiplayer module's TURN fallback.
Cross-link from
[`docs/architecture/multiplayer-security.md`](../../docs/architecture/multiplayer-security.md)
and
[`tasks/phase-3/01-multiplayer/10-turn-fallback-and-credentials.md`](../../tasks/phase-3/01-multiplayer/10-turn-fallback-and-credentials.md).

---

## Provider Pin

**Default: Cloudflare Calls TURN.**

Rationale: free tier covers the projected M5 closed-beta volume,
geographic POPs cover NA + EU + APAC without per-region config, and
the credential issuance API matches the HMAC-SHA1 short-TTL contract
the signaling server already needs to expose (no separate auth
plumbing).

**Self-hosted fallback: coturn (Docker image
`coturn/coturn:latest-alpine`).** Documented for self-publishers who
cannot rely on Cloudflare; same credential format applies.

---

## Credential Issuance

The signaling server exposes one HTTP endpoint alongside the
WebSocket upgrade (server: `services/signaling/src/server.ts`):

```
GET /turn-credential
→ {
    urls: [ "turn:turn.cloudflare.com:3478?transport=udp",
            "turn:turn.cloudflare.com:3478?transport=tcp",
            "turns:turn.cloudflare.com:443?transport=tcp" ],
    username: `${unixTsExpiry}:${roomId}`,
    credential: base64( HMAC_SHA1(TURN_SECRET, username) ),
    ttl: 600
  }
```

- `TURN_SECRET` is provided to the signaling deployment via env var
  (`TURN_SHARED_SECRET`); never logged, never serialized into client
  state.
- `unixTsExpiry = now + 600`; the client refreshes credentials by
  re-calling `/turn-credential` on `iceconnectionstatechange =
  failed` or before the TTL elapses.
- Endpoint is rate-limited to 6 calls per minute per `(roomId, IP)`.

---

## Rotation Policy

Rotation: see
[`docs/architecture/turn-credentials.md` § 9](../../docs/architecture/turn-credentials.md#9-rotation)
(canonical, 7-day).

---

## Region List

Cloudflare Calls TURN exposes a single global anycast endpoint
(`turn.cloudflare.com`) — no manual region pinning required. For
coturn self-hosting the recommended baseline is one POP per
continent (NA, EU, APAC) with a regional DNS round-robin.

---

## Cost Owner

| Provider | Owner | Budget signal |
| --- | --- | --- |
| Cloudflare Calls TURN | Project lead (`program.master.pero@gmail.com`) | Free tier through M5 closed beta; revisit at first 100 concurrent rooms |
| Self-hosted coturn | Self-publisher (out of project scope) | N/A — recipe only |

---

## Client-Side Fallback Flow

Defined in
[`tasks/phase-3/01-multiplayer/10-turn-fallback-and-credentials.md`](../../tasks/phase-3/01-multiplayer/10-turn-fallback-and-credentials.md).
Summary:

1. Client opens peer connection with STUN URLs only.
2. Wait 4 s for ICE-gather to complete; if no `host` or `srflx`
   candidate pair emerges, fetch `/turn-credential` and add TURN URLs
   to `RTCConfiguration.iceServers`.
3. Restart ICE; expect connectivity within an additional 4 s
   (8 s total worst case).
4. Telemetry: emit `turn_fallback_used` counter on every match that
   ends up using a `relay` candidate pair.

---

## Threat Model Cross-Link

Credential leak, bandwidth abuse, and provider lock-in mitigations
live in
[`docs/architecture/multiplayer-security.md` § TURN Credentials](../../docs/architecture/multiplayer-security.md#turn-credentials).
