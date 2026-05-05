# Signaling Stateless Invariant

> Source plan:
> [`docs/implementation-plans/25-turn-credentials-and-signaling-server-abuse-plan.md`](../implementation-plans/25-turn-credentials-and-signaling-server-abuse-plan.md)
> § System Improvements / Architecture (Stateless-by-design audit
> checklist).

This file is the canonical contract for **what the M5 signaling
server is allowed to remember**. It exists because the
"stateless-by-design" property is referenced from
[`multiplayer-security.md`](./multiplayer-security.md),
[`signaling-payload-policy.md`](./signaling-payload-policy.md),
and [`signaling-rate-limits.md`](./signaling-rate-limits.md), but
without a mechanical gate a future contributor can silently add a
persistent slice ("just a small cache") and regress the threat
model.

The owning task is
[`tasks/phase-3/01-multiplayer/35-edge-defense-and-health-segregation.md`](../../tasks/phase-3/01-multiplayer/35-edge-defense-and-health-segregation.md);
the stateless gate `services/signaling/scripts/check-stateless.ts`
is wired into `npm run validate:signaling-stateless` and into
`npm run validate`.

---

## 1. Allowed in-memory state

The signaling server may hold the following slices, all
**ephemeral** (no disk write, no DB connection, no cross-restart
cache):

| Slice | Owner | Lifetime |
| --- | --- | --- |
| `room → peer` map | Task 01 | until room evicted (idle TTL or max-lifetime per [`signaling-rate-limits.md`](./signaling-rate-limits.md)) |
| In-flight SDP / ICE candidates | Task 01 | per-message; never accumulated across messages |
| Rate-limit token buckets | Task 13 (and shared additions in Task 32) | TTL ≤ 1 hour per inactive bucket entry |
| TURN credential deny-list | Task 33 | TTL = `expEpochSeconds + 60_000` (≤ 6 minutes) |
| Edge-tier blocklist | Task 35 | TTL ≤ 7 days (the maximum repeat-offender window) |
| WebSocket per-frame timers | Task 31 | per-connection; cleared on close |
| Audit-log buffer | Task 20 | flushed to stdout-JSON; never retained in memory beyond the flush window (≤ 1 second) |

Every slice above is keyed on **redacted prefixes / hashes** per
[`signaling-audit-log.md`](./signaling-audit-log.md); the raw
`(IP, peerId, displayName, …)` tuple is never held.

## 2. Forbidden state

The following are **categorically forbidden** in
`services/signaling/`:

- Any disk write under `services/signaling/`.
- Any `node:fs` import that calls `*WriteSync` /
  `writeFile*` / `appendFile*` / `createWriteStream`.
- Any DB driver import: `pg`, `mysql`, `mysql2`, `mongodb`,
  `sqlite3`, `better-sqlite3`, `prisma`, `drizzle-orm`.
- Any `redis` import outside of the explicitly opt-in
  `services/signaling/src/blocklist/redis-backing.ts` and
  `services/signaling/src/captcha/turnstile.ts`. Both are
  TTL-bound (≤ 7 days for blocklist; per-token-verify for
  CAPTCHA).
- Any IndexedDB / `localStorage` / `document.cookie` usage
  (these are browser globals; not present in Node, but the
  grep gate runs against the source as a future-proofing rule).
- Any cross-restart cache (`node-cache` with file persistence,
  `keyv-file`, `level`, etc.).
- Any user-correlated history beyond a single connection's
  lifetime: a peer's prior chat, prior commands, prior pack
  hashes, prior display names, prior IP, prior pubkey are all
  forbidden.

## 3. Mechanical gate

`services/signaling/scripts/check-stateless.ts` (owned by
[Task 35](../../tasks/phase-3/01-multiplayer/35-edge-defense-and-health-segregation.md))
runs at `npm run validate:signaling-stateless`:

1. Walks `services/signaling/src/`.
2. For every `*.ts` / `*.mjs`, parses imports.
3. Fails on any forbidden import unless the file is on the closed
   allowlist (currently `blocklist/redis-backing.ts` and
   `captcha/turnstile.ts`).
4. Greps for `await *.write*`, `appendFile`, `createWriteStream`
   call sites; fails outside the audit-log writer (which writes
   stdout, not disk).
5. Greps for `localStorage`, `document.cookie`, `indexedDB` —
   fails on any match.

The gate is wired into `npm run validate` so a forbidden state
slice fails CI before review.

## 4. Operational rationale

- **A live-instance compromise leaks at most one match.** The
  `room → peer` map is keyed on the active connections; an
  attacker with read-only access to memory sees the active 2
  peers and the in-flight SDP for the current handshake — no
  prior history.
- **A deploy restart is harmless.** Every TTL-bound slice
  re-warms in seconds; nothing survives the redeploy that an
  attacker could exploit.
- **Stateless == horizontally trivial.** A future deploy that
  fronts multiple signaling instances behind a sticky-WS
  load-balancer (M7 scope) inherits the property without
  re-architecting.

## 5. Cross-References

- Allowlist of payloads that may travel: [`signaling-payload-policy.md`](./signaling-payload-policy.md).
- Wire shape: [`signaling-message-schema.md`](./signaling-message-schema.md).
- Bucket lifetimes: [`signaling-rate-limits.md`](./signaling-rate-limits.md).
- Deny-list TTL math: [`turn-credentials.md` § 7](./turn-credentials.md#7-revocation-on-end).
- Blocklist TTL ladder: [`signaling-edge-defense.md` § 4](./signaling-edge-defense.md#4-time-bound-blocklist).
- Threat model: [`multiplayer-security.md`](./multiplayer-security.md).
