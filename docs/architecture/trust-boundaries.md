# Trust Boundaries

Single canonical contract for **what each component trusts, what
crosses each boundary, and which named gate validates the cross**.
Every later module reads this file before designing a feature that
touches a cross-zone arrow, instead of re-deriving the rule per
PR.

Companion files:
- [`authority.md`](./authority.md) — who decides what (legality,
  RNG, content, identity, moderation).
- [`untrusted-strings.md`](./untrusted-strings.md) — per-string
  sanitization, length cap, character allow-list, NFC rule.
- [`fail-loud.md`](./fail-loud.md) — the four lint rules and the
  `assert()` helper that enforce the "missing gameplay
  requirements must fail loudly" rule from
  [`CLAUDE.md`](../../CLAUDE.md).
- [`security-model.md`](./security-model.md) — what symmetric
  input-only lockstep protects.
- [`pack-contract.md`](./pack-contract.md) — pack signature +
  sandbox flag.
- [`signaling-message-schema.md`](./signaling-message-schema.md)
  — wire-shape gate for the signaling envelope.
- [`diagrams/trust-zones.md`](./diagrams/trust-zones.md) — Mermaid
  zone diagram referenced by this doc.

---

## 1. Axiom

**The client is fully untrusted.** Every byte that arrives from a
peer browser, DataChannel, WebSocket frame, pack archive, save
file, AI prompt, AI completion, worker `postMessage`, or
hosting-provider request is **adversarial input until validated by
a named gate**. WSS / TLS is mandatory; no plaintext WebSocket is
permitted.

This rule subsumes and supersedes the older per-component rules:
- "no provider keys in browser"
  ([`ai-integration.md`](./ai-integration.md))
- "AI-generated packs auto-flagged sandboxed"
  ([`pack-contract.md`](./pack-contract.md))
- "missing gameplay requirements must fail loudly"
  ([`CLAUDE.md`](../../CLAUDE.md) line 149)
- "stateless signaling"
  ([`signaling-stateless-invariant.md`](./signaling-stateless-invariant.md))

These remain true; the axiom names the unifying principle.

---

## 2. Trusted Core

The trusted core is **`src/engine/`, `src/rules/`,
`src/content-schema/`**. The engine assumes its inputs have
already been schema-validated by an adapter at the boundary;
callers MUST validate before invoking. The trusted core is
**reducer-pure** per [`determinism.md`](./determinism.md): no I/O,
no clock, no DOM, no allocations beyond the canonical state shape.

Any new module placed inside the trusted core must satisfy the
side-effect ban listed in
[`side-effect-matrix.md`](./side-effect-matrix.md).

---

## 3. Per-Component Matrix

Each row names one cross-zone arrow, the gate that validates it,
the action on violation, and the evidence file that owns the
gate.

| From → To | Inputs | Validation gate | On violation | Evidence |
|---|---|---|---|---|
| `Browser` → `UI / React` | DOM events, hash route, query string | React-default escape; URL allow-list per [`url-routing.md`](./url-routing.md) | drop | [`url-routing.md`](./url-routing.md), [`untrusted-strings.md`](./untrusted-strings.md) |
| `UI` → `content-runtime adapter` | pack id, scenario id | id-pattern check | fail loud + `SecurityEvent.schema_violation` | [`pack-resolver.md`](./pack-resolver.md) |
| `content-runtime adapter` → `pack on disk` | pack archive, manifest | manifest schema + `contentHash` + Ed25519 signature | fail loud + `SecurityEvent.signature_failure` / `content_hash_mismatch` | [`pack-contract.md`](./pack-contract.md), [`pack-signing.md`](./pack-signing.md) |
| `content-runtime adapter` → `engine` | parsed pack records | per-record schema validation against [`content-schema/schemas/`](../../content-schema/schemas/) | fail loud + `SecurityEvent.schema_violation` | [`schema-matrix.md`](./schema-matrix.md) |
| `Worker (AI bot)` → `engine reducer` | `MOVE_RESULT` envelope | [`worker-message.schema.json`](../../content-schema/schemas/worker-message.schema.json) — kind, version, payload, correlationId; `event.source` check | drop + `SecurityEvent.worker_message_invalid` | [`ai-contract.md`](./ai-contract.md), this doc § 4 |
| `engine` → `Worker` | adventure state projection | view-projection contract from [`ai-contract.md`](./ai-contract.md) | drop | [`ai-contract.md`](./ai-contract.md) |
| `Persistence adapter` → `engine` | save file (JSON, gzipped) | gzipped-size cap 16 MB, decompressed cap 64 MB, `commandLog.length ≤ 100 000`, [`save.schema.json`](../../content-schema/schemas/save.schema.json), envelope MAC per [`save-envelope-mac.md`](./save-envelope-mac.md) | fail loud + `SecurityEvent.save_load_invalid` | [`save-migration.md`](./save-migration.md), [`save-envelope-mac.md`](./save-envelope-mac.md) |
| `Browser` → `signaling server` | WSS frame | [`signaling-envelope.schema.json`](../../content-schema/schemas/signaling-envelope.schema.json) outer + [`signaling-message.schema.json`](../../content-schema/schemas/signaling-message.schema.json) inner; per-frame size cap 64 KiB | drop + close conn + `SecurityEvent.signaling_message_invalid` | [`signaling-message-schema.md`](./signaling-message-schema.md), [`signaling-payload-policy.md`](./signaling-payload-policy.md) |
| `signaling server` → `peer browser` | forwarded SDP / ICE | re-validation against same envelope schema | drop | [`signaling-message-schema.md`](./signaling-message-schema.md) |
| `Peer browser (DataChannel)` → `engine reducer` | command envelope, hash exchange | [`command-envelope.schema.json`](../../content-schema/schemas/command-envelope.schema.json), HMAC per [`lockstep-envelope.md`](./lockstep-envelope.md) | abort match + `SecurityEvent.peer_message_invalid` | [`lockstep-envelope.md`](./lockstep-envelope.md), [`security-model.md`](./security-model.md) |
| `Peer browser (chat DC)` → `UI` | chat string | [`chat-message.schema.json`](../../content-schema/schemas/chat-message.schema.json) (NFC, 280-char cap) | drop + log | [`chat-safety.md`](./chat-safety.md) |
| `AI gateway` → `Anthropic / OpenAI` | system + user prompt | input length / NFC / character-class cap on `theme`; jailbreak classifier (Stage 1.5) per [`ai-generation-pipeline.md`](./ai-generation-pipeline.md) | drop + `SecurityEvent.prompt_injection_suspected` | [`ai-generation-pipeline.md`](./ai-generation-pipeline.md) |
| `Anthropic / OpenAI` → `AI gateway` | structured-output JSON | per-stage schema validation (Stages 3–6 in [`ai-generation-pipeline.md`](./ai-generation-pipeline.md)) + moderation pass | drop + `SecurityEvent.moderation_block` / `schema_violation` | [`ai-moderation-contract.md`](./ai-moderation-contract.md) |
| `Browser` → `AI gateway` | request body | rate-limit per [`signaling-rate-limits.md`](./signaling-rate-limits.md); request schema | reject 429 / 422 + `SecurityEvent.rate_limit_exceeded` / `schema_violation` | [`ai-integration.md`](./ai-integration.md) |
| `Hosting provider` → `service` | env vars, headers | secret-injection allow-list (no provider keys logged); HTTPS only | refuse to start | [`pack-signing-key.md`](../operations/pack-signing-key.md) |
| `Future desktop wrapper` → `OS filesystem` | file-picker results | `fs.allowlist` scoped to app config dir; pickers only | refuse + log | [`desktop-sandboxing.md`](./desktop-sandboxing.md) |

The matrix is closed. Adding a new cross-zone arrow requires
extending this table and naming a `SecurityEvent.kind` from
[`security-event.schema.json`](../../content-schema/schemas/security-event.schema.json)
that fires on violation.

---

## 4. Worker Boundary Detail

The AI bot Worker today returns a `Command` directly into the
reducer with no schema validation. As the worker gains
capabilities (multi-agent reasoning, persistent memory,
provider-backed inference), an unvalidated `MOVE_RESULT` becomes
the easiest path to inject a malformed `Command` that the engine
assumed was schema-valid.

Required gates:
- Every inbound `postMessage` must `Zod.parse` against
  [`worker-message.schema.json`](../../content-schema/schemas/worker-message.schema.json).
- `event.source` must equal the spawned worker reference;
  messages from any other source are dropped.
- The envelope `version` field gates parsing; mismatched version
  drops the message and emits
  `SecurityEvent.worker_message_invalid`.
- Inner `payload.command` is validated against
  [`command.schema.json`](../../content-schema/schemas/command.schema.json)
  before reducer dispatch.

Cross-link:
[`tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md`](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md)
carries the four acceptance criteria.

---

## 5. Player-Report Correlation

Player reports correlate to server-side events via a
[`case-id.schema.json`](../../content-schema/schemas/case-id.schema.json):
a 256-bit random hex string with no PII, never derived from
`playerName` or IP. The player surfaces the case id locally; the
server tags every `LogRecord` for the session with the same
`correlationId` field. Maintainer + player share only the case
id; the maintainer uses the id as a key into the security
channel.

Cross-link [`chat-safety.md`](./chat-safety.md) for the reporting
UX surface.

---

## 6. Authority gap

Identity (per-peer, per-session) has **no authority** today. No
component owns "is this peer who they claim to be." The DTLS
fingerprint pin from
[`dtls-fingerprint-pinning.md`](./dtls-fingerprint-pinning.md)
gives transport-layer integrity but not application-level
identity. Closing the gap is owned by the peer-identity surface
(deferred). The gap is recorded in
[`authority.md`](./authority.md) § GAP.

---

## 7. Fail-loud rule

Every row in the matrix that says "fail loud" must:
1. Throw a typed `TrustViolationError` via the global `assert()`
   helper specified in [`fail-loud.md`](./fail-loud.md).
2. Emit a `SecurityEvent` matching the listed `kind` via
   `services/shared/logger.ts → securityLog()`.
3. Never silently coerce the field with `??` or `||
   defaultValue`; default-coalescing is banned on schema-required
   fields by the lint rule named in
   [`fail-loud.md`](./fail-loud.md) § 3.

Silent rejection is allowed only for "drop" rows — e.g., a
malformed signaling frame is dropped without surfacing to the
user, but the `SecurityEvent` is still emitted.
