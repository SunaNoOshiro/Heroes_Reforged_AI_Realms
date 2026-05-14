# Trust Boundaries

Single canonical contract for **what each component trusts, what
crosses each boundary, and which named gate validates the cross**.
Every later module reads this file before designing a feature that
touches a cross-zone arrow, instead of re-deriving the rule per PR.

Companion docs:
- [`authority.md`](./authority.md) — who decides what (legality, RNG,
  content, identity, moderation).
- [`untrusted-strings.md`](./untrusted-strings.md) — per-string
  sanitization, length cap, character allow-list, NFC rule.
- [`fail-loud.md`](./fail-loud.md) — the four lint rules and the
  `assert()` helper that enforce the "missing gameplay requirements
  must fail loudly" rule from [`CLAUDE.md`](../../CLAUDE.md).
- [`security-model.md`](./security-model.md) — what symmetric
  input-only lockstep protects.
- [`pack-contract.md`](./pack-contract.md) — pack signature +
  sandbox flag.
- [`signaling-message-schema.md`](./signaling-message-schema.md) —
  wire-shape gate for the signaling envelope.
- [`diagrams/trust-zones.md`](./diagrams/trust-zones.md) — Mermaid
  zone diagram referenced by this doc.

---

## 1. Axiom

**The client is fully untrusted.** Every byte that arrives from a
peer browser, DataChannel, WebSocket frame, pack archive, save file,
AI prompt, AI completion, worker `postMessage`, or hosting-provider
request is **adversarial input until validated by a named gate**.
WSS / TLS is mandatory; plaintext WebSocket is not permitted.

This axiom subsumes and supersedes the older per-component rules,
which all remain true:

- "no provider keys in browser" — see
  [`ai-integration.md`](./ai-integration.md).
- "AI-generated packs auto-flagged sandboxed" — see
  [`pack-contract.md`](./pack-contract.md).
- "missing gameplay requirements must fail loudly" — see
  [`CLAUDE.md`](../../CLAUDE.md) and
  [`fail-loud.md`](./fail-loud.md).
- "stateless signaling" — see
  [`signaling-stateless-invariant.md`](./signaling-stateless-invariant.md).

---

## 2. Trusted core

The trusted core is **`src/engine/`, `src/rules/`,
`src/content-schema/`**. It assumes its inputs have already been
schema-validated by an adapter at the boundary; callers MUST validate
before invoking. The core is **reducer-pure** per
[`determinism.md`](./determinism.md): no I/O, no clock, no DOM, no
allocations beyond the canonical state shape. Any new module placed
inside the core must satisfy the side-effect ban listed in
[`side-effect-matrix.md`](./side-effect-matrix.md).

---

## 3. Per-component matrix

Each row names one cross-zone arrow, the gate that validates it, the
action on violation, and the evidence file that owns the gate. The
matrix is **closed**: adding a new cross-zone arrow requires
extending this table and naming a `SecurityEvent.kind` from
[`security-event.schema.json`](../../content-schema/schemas/security-event.schema.json)
that fires on violation.

| From → To | Inputs | Validation gate | On violation | Evidence |
|---|---|---|---|---|
| `Browser` → `UI / React` | DOM events, hash route, query string | React-default escape; URL allow-list per [`url-routing.md`](./url-routing.md) | drop | [`url-routing.md`](./url-routing.md), [`untrusted-strings.md`](./untrusted-strings.md) |
| `UI` → `content-runtime adapter` | pack id, scenario id | id-pattern check | fail loud + `SecurityEvent.schema_violation` | [`pack-resolver.md`](./pack-resolver.md) |
| `content-runtime adapter` → `pack on disk` | pack archive, manifest | manifest schema + `contentHash` + Ed25519 signature | fail loud + `SecurityEvent.signature_failure` / `content_hash_mismatch` | [`pack-contract.md`](./pack-contract.md), [`pack-signing.md`](./pack-signing.md) |
| `content-runtime adapter` → `engine` | parsed pack records | per-record schema validation against [`content-schema/schemas/`](../../content-schema/schemas/) | fail loud + `SecurityEvent.schema_violation` | [`schema-matrix.md`](./schema-matrix.md) |
| `Worker (AI bot)` → `engine reducer` | `MOVE_RESULT` envelope | [`worker-message.schema.json`](../../content-schema/schemas/worker-message.schema.json) — kind, version, payload, correlationId; `event.source` check | drop + `SecurityEvent.worker_message_invalid` | [`ai-contract.md`](./ai-contract.md), this doc § 4 |
| `engine` → `Worker` | adventure-state projection | view-projection contract from [`ai-contract.md`](./ai-contract.md) | drop | [`ai-contract.md`](./ai-contract.md) |
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

---

## 4. Worker boundary detail

The AI bot Worker today returns a `Command` directly into the reducer
with no schema validation. As the worker gains capabilities
(multi-agent reasoning, persistent memory, provider-backed inference),
an unvalidated `MOVE_RESULT` becomes the easiest path to inject a
malformed `Command` that the engine assumed was schema-valid.

Required gates:

- Every inbound `postMessage` must `Zod.parse` against
  [`worker-message.schema.json`](../../content-schema/schemas/worker-message.schema.json).
- `event.source` must equal the spawned worker reference; messages
  from any other source are dropped.
- The envelope `version` field gates parsing; mismatched version
  drops the message and emits
  `SecurityEvent.worker_message_invalid`.
- Inner `payload.command` is validated against
  [`command.schema.json`](../../content-schema/schemas/command.schema.json)
  before reducer dispatch.

Owners:

- The worker bootstrap (Worker entry point, `requestAIMove` client,
  per-difficulty budget) is owned by
  [`tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md`](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md).
- The four gates above land with
  [`tasks/phase-3/05-observability/02-worker-message-validation.md`](../../tasks/phase-3/05-observability/02-worker-message-validation.md),
  whose acceptance criteria mirror this section.

---

## 5. Player-report correlation

Player reports correlate to server-side events via a
[`case-id.schema.json`](../../content-schema/schemas/case-id.schema.json):
a 256-bit random hex string with no PII, never derived from
`playerName` or IP. The player surfaces the case id locally; the
server tags every `LogRecord` for the session with the same
`correlationId` field. Maintainer + player share only the case id;
the maintainer uses it as a key into the security log channel. See
[`chat-safety.md`](./chat-safety.md) for the reporting UX surface.

---

## 6. Authority gap

Identity (per-peer, per-session) has **no enforced authority** at
runtime today. No component owns "is this peer who they claim to
be." The DTLS fingerprint pin from
[`dtls-fingerprint-pinning.md`](./dtls-fingerprint-pinning.md) gives
transport-layer integrity but not application-level identity. The
closing surface is scoped in
[`peer-identity.md`](./peer-identity.md) and tracked under
[`authority.md` § 2](./authority.md#2-identity-gap) (planned tasks
`phase-3.01-multiplayer.16/25/26/27`).

---

## 7. Fail-loud rule

Every row in the matrix that says "fail loud" must:

1. Throw a typed `TrustViolationError` via the global `assert()`
   helper specified in [`fail-loud.md`](./fail-loud.md).
2. Emit a `SecurityEvent` matching the listed `kind` via
   `services/shared/logger.ts → securityLog()`.
3. Never silently coerce the field with `??` or `|| defaultValue`;
   default-coalescing is banned on schema-required fields by the
   lint rule in [`fail-loud.md`](./fail-loud.md) § 3.

Silent rejection is allowed only for "drop" rows — e.g., a malformed
signaling frame is dropped without surfacing to the user, but the
`SecurityEvent` is still emitted.

---

## 🔍 Sync Check

- **UI: ✔** — No UI surface is owned by this doc; player-facing
  surfaces (chat report, error modal) are routed to
  [`chat-safety.md`](./chat-safety.md) and
  [`error-ux.md`](./error-ux.md), and those links are preserved.
- **Schema: ✔** —
  [`security-event.schema.json`](../../content-schema/schemas/security-event.schema.json),
  [`worker-message.schema.json`](../../content-schema/schemas/worker-message.schema.json),
  [`case-id.schema.json`](../../content-schema/schemas/case-id.schema.json),
  and every other schema cited in § 3 exist on disk; all
  `SecurityEvent.kind` values referenced (`schema_violation`,
  `signature_failure`, `content_hash_mismatch`,
  `worker_message_invalid`, `save_load_invalid`,
  `signaling_message_invalid`, `peer_message_invalid`,
  `prompt_injection_suspected`, `moderation_block`,
  `rate_limit_exceeded`) match the closed `kind` enum, and the row
  for this doc exists in
  [`schema-matrix.md`](./schema-matrix.md).
- **Tasks: ✔** — § 4 now points at
  [`phase-3.05-observability.02-worker-message-validation`](../../tasks/phase-3/05-observability/02-worker-message-validation.md)
  (the actual owner of the four gates) alongside
  [`mvp.10-heuristic-ai.06-run-ai-in-web-worker`](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md)
  (worker bootstrap). § 6 routes the identity-gap closure to
  `phase-3.01-multiplayer.16/25/26/27` via
  [`authority.md`](./authority.md).

## ⚠ Issues

- **Worker-boundary task attribution corrected.** The prior version
  said `tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md`
  "carries the four acceptance criteria" of § 4. That task bootstraps
  the worker but does not enumerate the four schema-validation gates;
  those land in
  [`tasks/phase-3/05-observability/02-worker-message-validation.md`](../../tasks/phase-3/05-observability/02-worker-message-validation.md),
  which Reads First this doc § 4 and whose Acceptance Criteria
  mirror the four gates verbatim. Per § 8 Option A of the audit
  doctrine, the target was rewritten to point at the real owner;
  mvp.10-heuristic-ai.06 is preserved as the worker-bootstrap link.
- **"Deferred" identity-gap framing replaced with "scoped."** The
  prior § 6 said the peer-identity surface was "deferred" and
  pointed at `authority.md § GAP`. Per
  [`authority.md` § 2](./authority.md#2-identity-gap), the surface
  is scoped in [`peer-identity.md`](./peer-identity.md) with planned
  tasks `phase-3.01-multiplayer.16/25/26/27`. The sibling
  [`authority.md`](./authority.md) flagged this exact mismatch in
  its own `## ⚠ Issues`; the rewrite closes it. The anchor was also
  updated from `§ GAP` (which never resolved) to
  `§ 2 Identity gap` (`#2-identity-gap`).
- **`CLAUDE.md` line-number reference removed.** The prior § 1
  cited "[`CLAUDE.md`](../../CLAUDE.md) line 149" for the fail-loud
  rule. The current
  [`CLAUDE.md`](../../CLAUDE.md) has been restructured; line 149 no
  longer holds that rule (it is now in the "Hard constraints" block
  at the top of the file). The rewrite drops the line pin and
  delegates the canonical statement to
  [`fail-loud.md`](./fail-loud.md), which is already linked. No code
  or doc change implied; the rule itself survives unchanged in
  CLAUDE.md.
