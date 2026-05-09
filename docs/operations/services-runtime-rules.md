# Services Runtime Rules

> Cross-link: [`docs/architecture/trust-boundaries.md`](../architecture/trust-boundaries.md),
> [`docs/architecture/fail-loud.md`](../architecture/fail-loud.md).

The whole operations stack collapsed into one doc. Solo
maintainer, no services running yet. These rules apply the **day**
`services/signaling/`, `services/ai-gateway/`, or any future
backend adapter starts taking real traffic. Until then, this is
forward-pinned spec.

---

## 1. Logger pipeline

The single sanctioned emit path for `services/**` is
[`services/shared/logger.ts`](../../services/shared/logger.ts):

```
caller → safeLog / appLog / accessLog / auditLog / securityLog
       → redact (services/shared/redact.ts)
       → log-record.schema.json validation
       → pino transport → stdout (JSON)
       → hosting-provider log shipper
```

Direct `console.*` and direct `pino()` imports outside that file
are refused by the lint rules in
[`fail-loud.md`](../architecture/fail-loud.md) § 5.

## 2. LogRecord shape

Every emission validates against
[`log-record.schema.json`](../../content-schema/schemas/log-record.schema.json):
`ts` (ISO 8601 UTC), `severity` (debug/info/warn/error/fatal),
`channel` (app/access/audit/security), `service`,
`correlationId` (UUID v4 per request / WS connection / worker
message), `event`, optional `fields`.

`SecurityEvent` records ride the `security` channel and validate
against [`security-event.schema.json`](../../content-schema/schemas/security-event.schema.json)
before reaching the transport.

## 3. Redaction

The deny list in [`services/shared/redact.ts`](../../services/shared/redact.ts)
strips `authorization`, `apiKey`, `token`, `password`, `prompt`,
`theme`, `playerName`, `chatText`, `ip`, `cookie`,
`set-cookie`, `x-forwarded-for` from any nested object before
emission. The list never shrinks; new banned fields append.

## 4. Channel + retention

| Channel | Retention | Use |
|---|---|---|
| `app` | 30 d (provider TTL) | runtime events, dev errors |
| `access` | 30 d (provider TTL) | inbound HTTP / WS |
| `audit` | indefinite | privacy / wipe / policy events ([`audit-log-entry.schema.json`](../../content-schema/schemas/audit-log-entry.schema.json)) |
| `security` | 1 y (provider TTL or daily archive) | every `SecurityEvent` |

Maintainer-only read access via the hosting provider's IAM. A
richer role matrix lands when a co-maintainer joins.

## 5. Spike thresholds

Each `SecurityEvent.kind` is sampled in a 5-minute sliding
window, bucketed by the listed key, with the listed spike
threshold over the rolling 1-h baseline. The action when a spike
fires is § 7 below.

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

Hashed prefix = `SHA-256(daily_salt || /24-or-/64)[..16]`; the
salt rotates daily so the security log never indexes raw IPs.

## 6. SLO targets

Technical thresholds the dashboard surfaces; signal → action in
§ 7.

| SLO | Target |
|---|---|
| signaling ack latency | p99 < 200 ms |
| AI gateway total latency | p95 < 10 s |
| signature_failure rate | < 0.01 % |
| schema_violation rate | < 0.1 % |
| signaling invalid-message rate per prefix | < 5/min |
| AI gateway daily spend | < $50/day |

## 7. Containment runbooks

Detection signal + containment steps. No notification chain, no
post-mortem template — solo maintainer reads the dashboard,
takes the action.

**Signing-key compromise** (`signature_failure` for an unsigned
pack, or unauthorized `signing_key_custody_change` audit entry):
add the key id to
[`pack-revocation-list.schema.json`](../../content-schema/schemas/pack-revocation-list.schema.json)
per [`pack-signing-key.md`](./pack-signing-key.md) § 6, mint a
replacement, re-sign canonical packs, push a fresh
`canonical-packs` registry version.

**Signature-failure spike** (§ 5 threshold breached): inspect
top-10 `(packId, keyId)` buckets. One pack dominating → revoke
that pack id. One prefix dominating → blocklist per the
signaling-abuse runbook in this doc § 5. Broad signal → switch
the verifier to deny-by-default and disable AI generation.

**AI cost runaway** (daily-spend SLO breach): engage kill-switch
`AI_GATEWAY_DISABLED=true` per
[`rollback-playbook.md`](./rollback-playbook.md). Inspect top
spenders by `correlationId`. Concentrated → blocklist the
prefix. Broad → deny-by-default.

**Leaked secret** (secret-scan finds a token, or `LogRecord`
shows a denied field): rotate with the issuing provider,
force-rotate any minted credentials, purge the leak surface,
add the field path to
[`services/shared/redact.ts`](../../services/shared/redact.ts).

**Mass-PII leak** (> 100 distinct subjects in a non-`audit`
channel, or external report of personal data on a public
surface): stop the surface, triage scope, snapshot for forensic
record, request CDN purge if relevant. **GDPR Article 33**:
notify the supervisory authority within **72 hours**;
**Article 34**: notify subjects when high-risk per
[`docs/architecture/privacy.md`](../architecture/privacy.md).

## 8. Crash reports (opt-in, future)

When wired in, the payload is `{ stateHash, stack,
redactedCommandTail, engineBuildId, userAgent (truncated),
correlationId }`. Banned: `playerName`, chat content, pack body,
save body, IP, prompt body, secrets. Per-fingerprint rate limit
≤ 10/h; global ≤ 100 distinct fingerprints/h. Crash-report
ingest endpoint MUST be physically separated from the
`security` channel: own bucket, 30-day TTL, separate read role.

## 9. Metrics + dashboards

When the runtime lands, services expose `/metrics` (Prometheus
text) on the **admin** listener only. Public listener never
serves `/metrics`. Cardinality discipline: no raw IP labels, no
`playerName` labels, no `correlationId` labels.

## 10. Adding a new rule

A new `SecurityEvent.kind` extends the closed enum in
[`security-event.schema.json`](../../content-schema/schemas/security-event.schema.json),
§ 5 (sampling), § 7 (containment). A new SLO appends to § 6 and
§ 7. A new redact field appends to
[`redact.ts`](../../services/shared/redact.ts). No silent
additions.
