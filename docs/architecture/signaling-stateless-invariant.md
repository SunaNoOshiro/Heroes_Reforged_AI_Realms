# Signaling Stateless Invariant

> *§ System Improvements / Architecture (Stateless-by-design audit
> checklist).*

Canonical contract for **what the M5 signaling server is allowed to
remember**. Without a mechanical gate a future contributor can
silently add a persistent slice ("just a small cache") and regress
the threat model — § 3 wires the gate that prevents that drift.

**Companion docs:**
- [`multiplayer-security.md`](./multiplayer-security.md) — threat
  model that this invariant supports.
- [`signaling-payload-policy.md`](./signaling-payload-policy.md) —
  allow / deny list of payloads (denylisted payloads are also things
  the server may never persist).
- [`signaling-rate-limits.md`](./signaling-rate-limits.md) — the
  token-bucket tier that drives the rate-limit slice in § 1.
- [`signaling-edge-defense.md`](./signaling-edge-defense.md) —
  edge-tier prefix bucket and blocklist consumed by § 1.
- [`signaling-audit-log.md`](./signaling-audit-log.md) — IP-prefix
  redaction shape used for every key in § 1.
- [`signaling-message-schema.md`](./signaling-message-schema.md) —
  wire validation gate (per-frame timers in § 1 row).
- [`turn-credentials.md`](./turn-credentials.md) — TTL math behind
  the deny-list slice in § 1.

**Implementation:**
- Owning task —
  [`tasks/phase-3/01-multiplayer/35-edge-defense-and-health-segregation.md`](../../tasks/phase-3/01-multiplayer/35-edge-defense-and-health-segregation.md).
- Mechanical gate — `services/signaling/scripts/check-stateless.ts`,
  invoked by `npm run validate:signaling-stateless` (wired into
  `npm run validate`).

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
[`signaling-audit-log.md` § 3](./signaling-audit-log.md#3-ip-redaction-rule);
the raw `(IP, peerId, displayName, …)` tuple is never held.

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

---

## 🔍 Sync Check

- **UI: ✔** — No UI surface is owned by this doc; the
  connection-failure states bound to `state.net.lobby.errorState`
  in [`64-network-lobby/spec.md`](./wiki/screens/64-network-lobby/spec.md)
  are owned by [`signaling-edge-defense.md`](./signaling-edge-defense.md)
  and [`turn-fallback-policy.md`](./turn-fallback-policy.md), which
  this doc does not duplicate.
- **Schema: ✔** — No schema is owned by this doc; the closed
  allowlist files (`blocklist/redis-backing.ts`,
  `captcha/turnstile.ts`) match [Task 35 § Outputs](../../tasks/phase-3/01-multiplayer/35-edge-defense-and-health-segregation.md)
  verbatim, and the redacted-prefix shape in § 1 matches
  [`signaling-audit-log.md` § 3](./signaling-audit-log.md#3-ip-redaction-rule).
  TURN deny-list TTL formula `expEpochSeconds + 60_000` matches
  [`turn-credentials.md` § 7](./turn-credentials.md#7-revocation-on-end).
- **Tasks: ⚠** — Owners cited in § 1 (Tasks 01, 13, 20, 31, 32, 33,
  35) all resolve under
  [`tasks/phase-3/01-multiplayer/`](../../tasks/phase-3/01-multiplayer/),
  and the owning task
  [`35-edge-defense-and-health-segregation`](../../tasks/phase-3/01-multiplayer/35-edge-defense-and-health-segregation.md)
  lists this doc in `Read First` and pins the gate in `Outputs` +
  `Acceptance Criteria`. Task 35 is currently `planned` in
  [`tasks/task-status.json`](../../tasks/task-status.json), so the
  in-prose tense is forward-looking; see `## ⚠ Issues`.

## ⚠ Issues

- **Forward-looking gate language is not yet implemented.** The
  Implementation block above states `services/signaling/scripts/check-stateless.ts`
  and `npm run validate:signaling-stateless` are wired into
  `npm run validate`. Today, `services/signaling/scripts/` does not
  exist and `package.json` has no `validate:signaling-stateless`
  entry — both are pinned in
  [Task 35 § Outputs](../../tasks/phase-3/01-multiplayer/35-edge-defense-and-health-segregation.md)
  and [§ Acceptance Criteria](../../tasks/phase-3/01-multiplayer/35-edge-defense-and-health-segregation.md),
  and Task 35 is `planned` per
  [`tasks/task-status.json`](../../tasks/task-status.json). The
  rewrite preserved the present-tense contract wording (Hard
  Prohibition A — meaning unchanged; this is the canonical target
  shape) and surfaced the gap here. No `## ⚠ Issues` action implied
  beyond shipping Task 35.
- **TTL formula mixes time units (carried over from canonical
  doc).** § 1 row "TURN credential deny-list" lists
  `TTL = expEpochSeconds + 60_000` with `(≤ 6 minutes)`. The
  literal arithmetic mixes seconds (`expEpochSeconds`) with
  milliseconds (`60_000`); the same wording appears in
  [`turn-credentials.md` § 7](./turn-credentials.md#7-revocation-on-end),
  which is the SSOT for this math. The intent — retain deny-list
  entries until ≤ 1 minute past credential expiry, with a 5-minute
  hard credential ceiling totalling ≤ 6 minutes — is unambiguous,
  and the SSOT owns the canonical wording. Per Hard Prohibition A
  (no meaning change) and § 8 Option B (target is consistent with
  the SSOT; the SSOT is where any clarification belongs), this
  audit kept the wording verbatim. Suggested follow-up: align both
  docs on `expEpochSeconds + 60` (seconds) or
  `(expEpochSeconds * 1000) + 60_000` (ms) so the units are
  internally consistent. This audit did not edit
  `turn-credentials.md` (Hard Prohibition D).
