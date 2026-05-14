# Services Runtime Rules

Single consolidated rules doc for every backend service
(`services/signaling/`, `services/ai-gateway/`, any future adapter).
Forward-pinned spec: no service is taking traffic yet, but every
rule below applies the day one does.

Companion docs:
- [`docs/architecture/trust-boundaries.md`](../architecture/trust-boundaries.md)
  — "client is fully untrusted" axiom; § 3 names the gate per
  cross-zone arrow; § 7 routes every "fail loud" row through
  `assert()` + `securityLog()`.
- [`docs/architecture/fail-loud.md`](../architecture/fail-loud.md)
  § 5 — bans direct `console.*` and direct `pino()` imports
  outside `services/shared/logger.ts`.
- [`docs/architecture/privacy.md`](../architecture/privacy.md) —
  GDPR / CCPA scope; entry point for the 72-hour breach pathway.
- [`docs/operations/pack-signing-key.md`](./pack-signing-key.md)
  § 6 — signing-key compromise playbook.
- [`docs/operations/rollback-playbook.md`](./rollback-playbook.md)
  § 4 — kill-switch policy (signed feature-flag manifest).
- [`SECURITY.md`](../../SECURITY.md) — disclosure surface; pins
  this file as the containment runbook.
- Owning task:
  [`phase-3.05-observability.01-shared-logger-and-redaction`](../../tasks/phase-3/05-observability/01-shared-logger-and-redaction.md).
- Schemas:
  [`log-record.schema.json`](../../content-schema/schemas/log-record.schema.json),
  [`security-event.schema.json`](../../content-schema/schemas/security-event.schema.json),
  [`audit-log-entry.schema.json`](../../content-schema/schemas/audit-log-entry.schema.json)
  (on-device privacy journal; see § 4),
  [`pack-revocation-list.schema.json`](../../content-schema/schemas/pack-revocation-list.schema.json).

---

## 1. Logger pipeline

The single sanctioned emit path for `services/**` is
[`services/shared/logger.ts`](../../services/shared/logger.ts):

```
caller
  → safeLog / appLog / accessLog / auditLog / securityLog
  → redact (services/shared/redact.ts)
  → log-record.schema.json validation
  → pino transport
  → stdout (JSON)
  → hosting-provider log shipper
```

Direct `console.*` and direct `pino()` imports outside that file
are refused by the lint rules in
[`fail-loud.md`](../architecture/fail-loud.md) § 5.

## 2. LogRecord shape

Every emission validates against
[`log-record.schema.json`](../../content-schema/schemas/log-record.schema.json)
before reaching the transport. Required fields:

- `ts` — ISO 8601 UTC; logger-set, not caller-set.
- `severity` — `debug | info | warn | error | fatal` (closed).
- `channel` — `app | access | audit | security` (closed; mirrored
  by [`log-channels.ts`](../../services/shared/log-channels.ts)).
- `service` — emitting service name (`signaling`, `ai-gateway`, …),
  pinned by the logger's `base.service`.
- `correlationId` — UUID v4 minted at request / WS-connection /
  worker-message entry; threaded through every downstream emission.
- `event` — snake_case event name (`room_created`,
  `signature_failure`, `request_completed`).
- `fields` — optional structured payload; the redactor strips
  denied names (§ 3) before emission. Free-form strings are capped
  at 256 chars by the schema.

`SecurityEvent` records ride the `security` channel and additionally
validate against
[`security-event.schema.json`](../../content-schema/schemas/security-event.schema.json)
before reaching the transport. The `kind` enum is closed: extending
it requires § 10.

## 3. Redaction

[`services/shared/redact.ts`](../../services/shared/redact.ts)
recursively strips any property whose name matches the deny list
(case-insensitive) before emission. The list never shrinks; new
banned fields append.

Denied field names (canonical form; the redactor also accepts
snake_case variants `api_key` / `player_name` / `chat_text`):

- `authorization`, `apiKey`, `token`, `password`
- `prompt`, `theme`
- `playerName`, `chatText`
- `ip`, `remoteAddress`, `x-forwarded-for`
- `cookie`, `set-cookie`

## 4. Channels + retention

| Channel | Retention | Use |
|---|---|---|
| `app` | 30 d (provider TTL) | runtime events, dev errors |
| `access` | 30 d (provider TTL) | inbound HTTP / WS |
| `audit` | indefinite | privacy / wipe / policy events emitted server-side as `LogRecord` with `channel: "audit"` |
| `security` | 1 y (provider TTL or daily archive) | every `SecurityEvent` |

The `audit` channel carries server-side `LogRecord`s; the on-device
[`audit-log-entry.schema.json`](../../content-schema/schemas/audit-log-entry.schema.json)
journal (ERASURE / REPLAY_EXPORT / POLICY_ACCEPTED / OPT_IN_TOGGLED,
persisted in IndexedDB `hr-profile.audit`) is a separate surface —
see `## ⚠ Issues` for the reconciliation gap.

Maintainer-only read access via the hosting provider's IAM. A richer
role matrix lands when a co-maintainer joins.

## 5. Spike thresholds

Each `SecurityEvent.kind` is sampled in a **5-minute sliding
window**, bucketed by the listed key, with the listed spike
threshold over the **rolling 1-hour baseline**. Action on spike:
§ 7.

| `SecurityEvent.kind` | Bucket key | Threshold |
|---|---|---|
| `signature_failure` | `(packId, keyId)` | 5× |
| `content_hash_mismatch` | `packId` | 5× |
| `schema_violation` | `schemaPath` | 5× |
| `rate_limit_exceeded` | `routeId` | absolute > 100/min |
| `auth_failure` | global | 10× |
| `pack_traversal_attempt` | `packId` | absolute ≥ 1 |
| `worker_message_invalid` | `messageKind` | 10× |
| `signaling_message_invalid` | hashed prefix | absolute > 5/min |
| `prompt_injection_suspected` | `classifier` | 5× |
| `moderation_block` | `classifier` | 10× |
| `peer_message_invalid` | `messageKind` | 10× |
| `save_load_invalid` | global | 10× |
| `oversize_payload` | `routeId` | 5× |

Hashed prefix = `SHA-256(daily_salt || /24-or-/64)[..16]`. The
salt rotates daily so the security log never indexes raw IPs.

## 6. SLO targets

Technical thresholds the dashboard surfaces. Signal → action: § 7.

| SLO | Target |
|---|---|
| signaling ack latency | p99 < 200 ms |
| AI gateway total latency | p95 < 10 s |
| `signature_failure` rate | < 0.01 % |
| `schema_violation` rate | < 0.1 % |
| signaling invalid-message rate per prefix | < 5/min |
| AI gateway daily spend | < $50/day |

## 7. Containment runbooks

Detection signal → containment steps. Solo maintainer reads the
dashboard, takes the action; no notification chain, no post-mortem
template.

**Signing-key compromise** — Trigger: `signature_failure` on an
unsigned official pack, or an unauthorized
`signing_key_custody_change` audit entry. Action: run
[`pack-signing-key.md` § 6](./pack-signing-key.md) end-to-end
(quarantine the suspect token, mint a replacement on a fresh
YubiKey, ship a client release that updates
`OFFICIAL_PUBLIC_KEY_BASE64` / `OFFICIAL_PUBLIC_KEY_FINGERPRINT` and
appends the retired fingerprint to
`DENYLISTED_PUBLIC_KEY_FINGERPRINTS`, re-sign every canonical pack,
publish a fresh `canonical-packs` registry version).

**Signature-failure spike** — Trigger: § 5 threshold breached on
`signature_failure`. Action: inspect the top-10 `(packId, keyId)`
buckets.

- One pack dominating → revoke that pack via
  [`pack-revocation-list.schema.json`](../../content-schema/schemas/pack-revocation-list.schema.json)
  (`packId`, `contentHash`, `reason`).
- One prefix dominating → blocklist per the signaling-abuse runbook
  in this doc § 5.
- Broad signal → switch the verifier to deny-by-default and disable
  AI generation.

**AI cost runaway** — Trigger: AI-gateway daily-spend SLO breach
(§ 6). Action: engage the AI-gateway kill-switch per
[`rollback-playbook.md` § 4](./rollback-playbook.md#4-kill-switch-policy)
(signed flag-manifest path), then inspect top spenders by
`correlationId`. Concentrated → blocklist the prefix. Broad →
deny-by-default.

**Leaked secret** — Trigger: secret-scan finds a token, or a
`LogRecord` shows a denied field. Action: rotate with the issuing
provider, force-rotate any minted credentials, purge the leak
surface, and append the field path to
[`services/shared/redact.ts`](../../services/shared/redact.ts).

**Mass-PII leak** — Trigger: > 100 distinct subjects on a
non-`audit` channel, or an external report of personal data on a
public surface. Action: stop the surface, triage scope, snapshot
for forensic record, request CDN purge if relevant. **GDPR
Article 33** — notify the supervisory authority within
**72 hours**; **Article 34** — notify subjects when high-risk.
Privacy entry point:
[`docs/architecture/privacy.md`](../architecture/privacy.md).

## 8. Crash reports (opt-in, future)

When wired in, the payload is:

```
{ stateHash, stack, redactedCommandTail, engineBuildId,
  userAgent (truncated), correlationId }
```

Banned in the payload: `playerName`, chat content, pack body, save
body, IP, prompt body, secrets.

Per-fingerprint rate limit ≤ 10/h; global ≤ 100 distinct
fingerprints/h.

The crash-report ingest endpoint MUST be **physically separated**
from the `security` channel: own bucket, 30-day TTL, separate read
role.

## 9. Metrics + dashboards

When the runtime lands, services expose `/metrics` (Prometheus
text) on the **admin** listener only. The public listener never
serves `/metrics`.

Cardinality discipline: no raw-IP labels, no `playerName` labels,
no `correlationId` labels.

## 10. Adding a new rule

- A new `SecurityEvent.kind` extends the closed enum in
  [`security-event.schema.json`](../../content-schema/schemas/security-event.schema.json),
  § 5 (sampling), and § 7 (containment).
- A new SLO appends to § 6 and § 7.
- A new redact field appends to
  [`services/shared/redact.ts`](../../services/shared/redact.ts)
  and to § 3.

No silent additions.

---

## 🔍 Sync Check

- **UI: ✔** — No UI surface owned by this doc; player-facing
  privacy / report surfaces are routed to
  [`privacy.md`](../architecture/privacy.md) and the screen
  packages it links.
- **Schema: ⚠** —
  [`log-record.schema.json`](../../content-schema/schemas/log-record.schema.json)
  and
  [`security-event.schema.json`](../../content-schema/schemas/security-event.schema.json)
  match § 2 / § 5 (closed `severity`, `channel`, and `kind` enums;
  `SecurityEvent.kind` values cited here are exactly the 13 in the
  schema). The redact list in § 3 now matches
  [`services/shared/redact.ts`](../../services/shared/redact.ts)
  (was missing `remoteAddress`). The audit-channel row in § 4 was
  linked to the wrong schema and is reframed below. Neither
  `LogRecord` nor `SecurityEvent` has a row in
  [`schema-matrix.md`](../architecture/schema-matrix.md) — already
  flagged in that doc's own `## ⚠ Issues`.
- **Tasks: ✔** — Owning task
  [`phase-3.05-observability.01-shared-logger-and-redaction`](../../tasks/phase-3/05-observability/01-shared-logger-and-redaction.md)
  lists this file in `Owned Paths` and Reads First the matching
  arch docs. SECURITY.md and
  [`pack-signing-key.md`](./pack-signing-key.md) both point at § 7
  of this file, and those anchors still resolve.

## ⚠ Issues

- **Signing-key compromise pointed at the wrong schema.** The
  prior § 7 said to "add the key id to
  [`pack-revocation-list.schema.json`](../../content-schema/schemas/pack-revocation-list.schema.json)"
  on signing-key compromise. That schema's closed shape is
  `{ packId, contentHash, reason }` — no `keyId` surface; it
  revokes packs, not keys. The canonical key-denylist surface is
  `DENYLISTED_PUBLIC_KEY_FINGERPRINTS` in
  [`src/engine/security/official-public-key.ts`](../../src/engine/security/official-public-key.ts),
  shipped via a client release per
  [`pack-signing-key.md` § 6](./pack-signing-key.md). Per § 8
  Option A of the audit doctrine, the target was rewritten to
  delegate the runbook to `pack-signing-key.md § 6` and to use
  `pack-revocation-list.schema.json` only for the (separate)
  pack-revocation step under "Signature-failure spike". No code
  or schema change implied.
- **Audit-channel row linked the on-device privacy journal.** The
  prior § 4 audit row pointed at
  [`audit-log-entry.schema.json`](../../content-schema/schemas/audit-log-entry.schema.json),
  whose closed `type` enum (`ERASURE | REPLAY_EXPORT |
  POLICY_ACCEPTED | OPT_IN_TOGGLED`) and persistence (IndexedDB
  `hr-profile.audit` per
  [`data-inventory.md`](../architecture/data-inventory.md)) belong
  to the on-device privacy journal — not the service-side `audit`
  channel of `LogRecord`. There is no separate "audit-channel
  payload" schema; the audit channel just narrows
  `log-record.schema.json` to `channel: "audit"`. The rewrite
  reframes the row and keeps the on-device journal as a
  cross-reference. No code or schema change implied; the doc was
  the side that drifted.
- **`AI_GATEWAY_DISABLED=true` env-var kill-switch is not what
  `rollback-playbook.md` defines.** The prior § 7 "AI cost
  runaway" said `engage kill-switch AI_GATEWAY_DISABLED=true per
  rollback-playbook.md`;
  [`rollback-playbook.md` § 4](./rollback-playbook.md#4-kill-switch-policy)
  defines kill-switches as a **signed flag-manifest** with
  `enabled: boolean` + optional `rolloutPermille`, not as an env
  var. The rewrite delegates to the manifest path without naming
  a specific env var, but a concrete flag id is still missing.
  Suggested values: pick a `featureId` (e.g.,
  `ai_gateway_enabled`) and pin it in both files. Owner:
  [`phase-3.05-observability.01-shared-logger-and-redaction`](../../tasks/phase-3/05-observability/01-shared-logger-and-redaction.md)
  to add the flag id to this doc;
  [`rollback-playbook.md`](./rollback-playbook.md) §-4 to register
  it in the manifest catalogue when the manifest format lands.
- **`security-event.schema.json` description points at a
  non-existent doc.** The schema's top-level `description` says
  `kind` maps to a sampling rule in
  `docs/operations/integrity-monitoring.md`; that file does not
  exist — the sampling rules consolidated into this file (§ 5).
  Per CLAUDE.md ("docs name real files"), either the schema
  description must be updated to point at
  `docs/operations/services-runtime-rules.md § 5`, or
  `integrity-monitoring.md` must be restored. Owner: same as
  above (`phase-3.05-observability.01-shared-logger-and-redaction`
  owns both this doc and
  [`security-event.schema.json`](../../content-schema/schemas/security-event.schema.json)).
  Suggested fix: edit the schema description string to
  `docs/operations/services-runtime-rules.md § 5`. Skill did not
  edit the schema (Hard Prohibition D).
- **Owning task's redact-list AC is one short.** The owning task
  [`phase-3.05-observability.01-shared-logger-and-redaction`](../../tasks/phase-3/05-observability/01-shared-logger-and-redaction.md)
  Acceptance Criteria enumerate 11 redacted field names
  (`authorization`, `apiKey`, `token`, `password`, `prompt`,
  `theme`, `playerName`, `chatText`, `ip`, `cookie`, `set-cookie`);
  this doc § 3 — and
  [`services/shared/redact.ts`](../../services/shared/redact.ts) —
  add `x-forwarded-for` and `remoteAddress`. The task AC must grow
  to include both before the gate can mechanically check the doc.
  Skill did not edit the task file (Hard Prohibition D).
