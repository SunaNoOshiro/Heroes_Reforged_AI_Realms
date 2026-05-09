# 31. TRUST BOUNDARIES & LOGGING/MONITORING

> **Audit context.** The repo is design-first / schema-first. Two
> server-side stubs exist as one-paragraph READMEs:
> [`services/signaling/README.md`](../../../services/signaling/README.md)
> and [`services/ai-gateway/README.md`](../../../services/ai-gateway/README.md).
> Neither is implemented and neither owns a logging policy. There is **no**
> centralized logger, **no** telemetry, **no** crash-report sink, **no**
> dashboards, **no** SLO, **no** on-call rotation, and **no** incident
> runbook. Trust boundaries exist *partially* in domain docs (sandbox flag
> for AI-generated packs, pack-signature verification, "fail loudly" on
> missing gameplay records, AI provider keys forbidden from the browser),
> but they are not collected into one trust-boundary contract. Most
> answers below therefore resolve to ❌ UNKNOWN by design — operational
> security has not yet been specified.

---

### Q: 645. Is the trust boundary between client, signaling server, AI gateway, and TURN server explicitly documented?

**Status:** ❌ UNKNOWN

**Answer:**
**No single trust-boundary doc exists.** The repo describes each component in isolation but never draws the trust diagram.
- The signaling server is described as "stateless … only forwards WebRTC signaling messages" ([tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) lines 7–21) without naming what it *trusts* about peers or what peers should *not* trust about it.
- The AI gateway is described as "the boundary when secrets … should not live in the browser" ([docs/architecture/ai-integration.md](../../architecture/ai-integration.md) lines 21–28) without naming what it trusts about callers or what the client should trust about its responses.
- TURN does not exist at all — see [docs/archive/readiness-audit/25-turn-credentials-and-signaling-server-abuse.md](25-turn-credentials-and-signaling-server-abuse.md) Q488–Q493.
- No `docs/architecture/trust-boundaries.md`, no `docs/security/trust-model.md`, and no Mermaid trust-zone diagram in [docs/architecture/diagrams/](../../architecture/diagrams/).

**Evidence:**
- [services/signaling/README.md](../../../services/signaling/README.md) (6 lines)
- [services/ai-gateway/README.md](../../../services/ai-gateway/README.md) (14 lines)
- [docs/architecture/ai-integration.md](../../architecture/ai-integration.md)
- [docs/archive/readiness-audit/25-turn-credentials-and-signaling-server-abuse.md](25-turn-credentials-and-signaling-server-abuse.md) Q488–Q493
- Missing: `docs/architecture/trust-boundaries.md`

---

### Q: 646. Is the assumption "the client is fully untrusted" stated in design docs and reflected in every server endpoint?

**Status:** ⚠ Partial

**Answer:**
**Stated indirectly, not as a first-class principle, and not verified per endpoint.**
- The AI integration doc commits one client-untrust rule: "Browser code must not require raw provider API keys" ([docs/architecture/ai-integration.md](../../architecture/ai-integration.md) line 28) — i.e. secrets are kept off the client because the client could leak them.
- The pack contract enforces sandboxing of AI-generated content via the manifest `sandboxed: true` flag ([docs/architecture/pack-contract.md](../../architecture/pack-contract.md) lines 54–60) — but that is content-trust, not client-trust.
- **Missing:** no doc says "treat every byte from a peer / browser / DataChannel / WebSocket / pack / save as adversarial input." No per-endpoint contract states what the server must validate before acting. The signaling-server task lists messages (`CREATE_ROOM`, `JOIN_ROOM`, `OFFER`, `ANSWER`, `ICE_CANDIDATE`) without per-message validation rules or schema. There is no "client is untrusted" line in [docs/architecture/overview.md](../../architecture/overview.md) or [CLAUDE.md](../../../CLAUDE.md).

**Evidence:**
- [docs/architecture/ai-integration.md](../../architecture/ai-integration.md) line 28
- [docs/architecture/pack-contract.md](../../architecture/pack-contract.md) lines 54–60
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) (no per-message validation)
- Missing: explicit "client is untrusted" principle in any architecture doc

---

### Q: 647. Is the signaling server stateless and treated as untrusted by clients (only DTLS/HTTPS provides peer-to-peer integrity)?

**Status:** ⚠ Partial

**Answer:**
- **Stateless: yes, by spec.** "Server memory: only room → peer mapping; cleared when room is empty … Server restarts do not corrupt in-progress games (it's stateless — clients reconnect and re-handshake)" ([tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) lines 20, 32).
- **"Treated as untrusted by clients": NO explicit statement.** No doc tells the client to verify peer fingerprints, refuse to act on signaling messages without a peer-side check, or relate DTLS-SRTP/DataChannel integrity to a deliberate trust assumption about the relay. WSS itself is **not mandated** ([docs/archive/readiness-audit/24-tls-enforcement-and-webrtc-authentication.md](24-tls-enforcement-and-webrtc-authentication.md) Q463), so even the transport between client and signaler is not pinned to TLS.
- WebRTC's DataChannel does provide DTLS, but the spec never says "this is the *only* integrity guarantee — do not rely on the signaler for anything more."

**Evidence:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) lines 20, 32
- [docs/archive/readiness-audit/24-tls-enforcement-and-webrtc-authentication.md](24-tls-enforcement-and-webrtc-authentication.md) Q463 (WSS not mandated)
- [docs/archive/readiness-audit/07-multiplayer.md](07-multiplayer.md) Q144 (TLS only at transport layer)

---

### Q: 648. Are peer-supplied display names and metadata treated as untrusted strings throughout the codebase?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. `metadata.playerName` is the only documented peer-supplied string in the save format ([docs/archive/readiness-audit/22-privacy-retention-and-error-leaks.md](22-privacy-retention-and-error-leaks.md) intro), and there is no documented sanitization, length cap, character-class allowlist, Unicode normalization (NFC), or render-time escaping rule. No XSS-defense doc, no DOMPurify dependency, no React-default-escape commitment. Chat is referenced but not specified ([docs/archive/readiness-audit/19-chat-safety-and-user-reporting.md](19-chat-safety-and-user-reporting.md)). Peer-supplied SDP / ICE candidates / room codes are also not validated.

**Evidence:**
- [docs/archive/readiness-audit/22-privacy-retention-and-error-leaks.md](22-privacy-retention-and-error-leaks.md) (`metadata.playerName` only)
- [docs/archive/readiness-audit/19-chat-safety-and-user-reporting.md](19-chat-safety-and-user-reporting.md) (chat un-specified)
- No `display-name.schema.json`, no `sanitize.ts`, no escaping policy

---

### Q: 649. Does the AI gateway treat the user's prompt as untrusted (prompt-injection defenses, output filtering)?

**Status:** ❌ UNKNOWN

**Answer:**
**No prompt-injection defense is documented.** The pipeline doc treats raw provider *output* as untrusted ("the pipeline treats raw output as untrusted input. Determinism begins at stage 4 onward, once content is validated" — [docs/architecture/ai-generation-pipeline.md](../../architecture/ai-generation-pipeline.md) lines 141–144) — but says nothing about the user's *prompt* as a vector. There is no:
- system-prompt isolation rule (mark/escape user input inside prompts)
- jailbreak / prompt-injection allowlist or block-list
- prompt-template hygiene (`{{user_input}}` interpolation rules)
- length / character-class cap on `GenerationRequest.theme`
- secondary-classifier check on the prompt
- output-filter beyond "schema validation" + the optional moderation pass

`ModerationProvider` is mentioned ([tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md](../../../tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md)) but its scope is "no offensive names/lore" on **outputs**, not "block prompt-injection" on **inputs**.

**Evidence:**
- [docs/architecture/ai-generation-pipeline.md](../../architecture/ai-generation-pipeline.md) lines 141–144 (output untrusted; input not addressed)
- [tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md](../../../tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md) (output moderation only)
- [content-schema/schemas/generation-request.schema.json](../../../content-schema/schemas/generation-request.schema.json)

---

### Q: 650. Does the AI gateway treat the model's output as untrusted (validation against schema, moderation pass)?

**Status:** ✔ Defined

**Answer:**
**Yes — this is the strongest part of the trust model in the repo.** The pipeline pins typed boundaries between stages and treats raw provider output as untrusted:
- **Stage 3 (Shape validation)** — Zod-validates raw JSON against [`generated-faction.schema.json`](../../../content-schema/schemas/generated-faction.schema.json); discriminated-union failures (unknown effect kind, cross-kind specialty fields) surface with field paths.
- **Stage 4 (Coherence check)** — every `unitId`, `abilityId`, `buildingId`, `skillId` must resolve; stats must fit the tier corridor; costs must use canonical resources; building prereqs must exist.
- **Stage 5 (Auto-balance gate)** — Wilson 95 % CI must overlap [35 %, 65 %] against first-party factions.
- **Stage 6 (Pack materialize)** — only an accepted, schema-valid `GeneratedFaction` becomes a pack on disk; the manifest is auto-flagged `sandboxed: true` ([tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md](../../../tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md) line 24).
- **Hard caps** are enforced regardless of optimizer output (HP ≤ 500, ATK ≤ 50, abilities ≤ 5).
- **Moderation** is an optional pre-stage `ModerationProvider.moderate(input)` that can block on slurs.

**Evidence:**
- [docs/architecture/ai-generation-pipeline.md](../../architecture/ai-generation-pipeline.md) lines 76–127, 141–144
- [tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md](../../../tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md) lines 21–24
- [content-schema/schemas/generated-faction.schema.json](../../../content-schema/schemas/generated-faction.schema.json)
- [docs/architecture/ai-integration.md](../../architecture/ai-integration.md) lines 30–31 ("Generated content must still pass schema validation, coherence checks, and sandbox policy before it becomes loadable content")

---

### Q: 651. Are pack contents loaded from disk treated as untrusted, including those bundled with the app?

**Status:** ⚠ Partial

**Answer:**
- **Schema validation: yes for all packs.** `scripts/check-repo-contracts.mjs` validates every example record in every example pack against its schema ([docs/architecture/pack-contract.md](../../architecture/pack-contract.md) lines 51–52). At runtime, `src/content-runtime/` owns "manifest loading … signature checks … sandbox policy … canonical-json serialization + `contentHash` computation" ([docs/architecture/pack-contract.md](../../architecture/pack-contract.md) lines 117–127).
- **Sandbox flag: only auto-set on AI-generated packs.** First-party packs are *not* automatically marked `sandboxed: true`; the trust escalation comes from the optional `signature` field ([docs/architecture/pack-contract.md](../../architecture/pack-contract.md) lines 56–60), with verification via Ed25519 ([tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md](../../../tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md)).
- **Bundled-pack distinction: not explicit.** No doc says "even an Anthropic-shipped first-party pack must be schema-validated and signature-verified before load." The implicit posture is "official packs are signed, sandboxed packs are not, and either way schemas validate" — but the *principle* "all disk input is untrusted regardless of origin" is never stated.
- **Decoder hardening: missing.** Audit 28 (Q566–Q571) confirms no path-traversal sanitization on ZIP extraction, no MIME content-sniff, no image-dimension cap, no audio-duration cap, no SVG forbidding rule, no font-source restriction.

**Evidence:**
- [docs/architecture/pack-contract.md](../../architecture/pack-contract.md) lines 51–52, 56–60, 117–127
- [tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md](../../../tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md)
- [docs/archive/readiness-audit/28-asset-loading-and-sandboxing.md](28-asset-loading-and-sandboxing.md) Q566–Q571
- [docs/archive/readiness-audit/27-save-tampering-and-pack-signing.md](27-save-tampering-and-pack-signing.md)

---

### Q: 652. Are save files always treated as untrusted, even when written by this app on this device?

**Status:** ⚠ Partial

**Answer:**
- **Implicitly yes by replay design.** Saves are log-only (gzip-JSON `commandLog: Command[]`), so any tamper that produces a logically invalid command sequence is rejected when the deterministic reducer rejects the command. The "Missing gameplay records, invalid commands, and unresolved content IDs **fail loudly** before controls become enabled" rule lives in [docs/architecture/wiki/screens/55-save-load/data-contracts.md](../../architecture/wiki/screens/55-save-load/data-contracts.md).
- **Explicitly no.** Audit 27 (Q540–Q548) confirms: no signature, no HMAC (only `xxh64` non-keyed `stateHash`), no `save.schema.json`, no per-command numeric-bounds check at load, no array-length cap on `commandLog`, no JSON-parser depth/size cap, no migration-version integrity check. The threat model "user can edit anything, runtime must reject invalid states" is **not** explicitly written; it is left to be inferred from the replay architecture.

**Evidence:**
- [docs/architecture/wiki/screens/55-save-load/data-contracts.md](../../architecture/wiki/screens/55-save-load/data-contracts.md) ("fail loudly")
- [docs/archive/readiness-audit/27-save-tampering-and-pack-signing.md](27-save-tampering-and-pack-signing.md) Q540–Q548
- [tasks/mvp/08-persistence/02-log-only-save-format.md](../../../tasks/mvp/08-persistence/02-log-only-save-format.md) (no signature field)
- Missing: `content-schema/schemas/save.schema.json`

---

### Q: 653. Is there a single "trusted core" component identified, with everything else being untrusted input?

**Status:** ⚠ Partial

**Answer:**
**Implicitly yes — `src/engine/` + `src/rules/` + `src/content-schema/` are the deterministic trusted core — but never named as such in trust terms.** [CLAUDE.md](../../../CLAUDE.md) and [docs/architecture/overview.md](../../architecture/overview.md) describe the engine as pure, deterministic, and the consumer of validated content; everything else (UI, renderer, pack loader, AI gateway, signaling) is described as adapters at boundaries. But:
- No doc draws a "trusted core" boundary diagram.
- No doc says "the engine assumes all inputs have already been validated; callers must validate before invoking."
- The trust expectation lives in folder ownership rather than in an explicit trust contract.

`src/content-runtime/` is the closest thing to a "validation boundary" component (manifest loading, signature checks, sandbox policy, contentHash) — but it shares the trust burden with adapters in `src/ui/`, `src/persistence/`, `src/net/`, and the AI generation pipeline.

**Evidence:**
- [CLAUDE.md](../../../CLAUDE.md) ("deterministic engine code in `src/engine/` … rules and formulas in `src/rules/` … schema validation and migration in `src/content-schema/` … pack loading and override logic in `src/content-runtime/`")
- [docs/architecture/overview.md](../../architecture/overview.md) lines 14–23
- [docs/architecture/pack-contract.md](../../architecture/pack-contract.md) lines 117–131
- Missing: `docs/architecture/trust-core.md` or trust-zone diagram

---

### Q: 654. Are inter-process / inter-Worker boundaries treated as trust boundaries with structured-clone validation?

**Status:** ❌ UNKNOWN

**Answer:**
**One Worker is in scope (AI bot worker), and its boundary is not validated.** [tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md](../../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md) defines a `{ type: "COMPUTE_MOVE", state: AdventureState, difficulty: DifficultyLevel }` → `{ type: "MOVE_RESULT", command: Command }` message contract, and notes "Worker receives a serialized state copy (not a reference — workers cannot share memory)." But:
- No schema validation on inbound `MOVE_RESULT` messages before applying the returned `Command`.
- No origin / source check on `event.data` (a Worker page can receive messages from `postMessage` from any frame).
- No integrity / version field on the message envelope.
- No defense against the worker returning a malformed `Command` that crashes the reducer.

Since the AI worker is *bundled with the app* (not a third-party Worker), the trust gap is small but real (bug in worker → reducer crash). No future "third-party AI worker" or "iframe-sandboxed pack scripts" boundary is documented; the scripts capability is "scripts.none" ([docs/archive/readiness-audit/28-asset-loading-and-sandboxing.md](28-asset-loading-and-sandboxing.md)) so additional inter-context boundaries do not exist *yet*.

**Evidence:**
- [tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md](../../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md) (no inbound message validation)
- [docs/archive/readiness-audit/28-asset-loading-and-sandboxing.md](28-asset-loading-and-sandboxing.md) (scripts.none capability)
- Missing: `worker-message.schema.json`

---

### Q: 655. Is local file-system access scoped to a sandboxed directory so a compromised renderer cannot roam the disk?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified, and threat model is browser-first.** The shipping target is a browser app whose file access is structurally limited to `IndexedDB` / `localStorage` / `Origin-Private File System` / explicit `<input type="file">` user choices — the OS sandboxes the renderer. So in the *web* deployment, this is enforced by the browser, not by the app.
- **Desktop wrapper (Electron / Tauri):** not in scope today, but if a desktop wrapper is added later, file-system scoping (e.g., Tauri `fs.allowlist`, Electron `webPreferences.sandbox: true`, restricting `app.getPath('userData')` reads) is undocumented. Audit 28 Q566 explicitly flags ZIP-extraction `../` traversal as un-mitigated, which would only become exploitable with desktop file-system access.
- **Save / pack imports:** today flow through user-initiated file pickers (per save/load screen); there is no documented allowlist of acceptable directories.
- No `sandbox.md`, no `fs-allowlist.json`, no Electron / Tauri config.

**Evidence:**
- No desktop-wrapper task in [tasks/](../../../tasks/)
- [docs/archive/readiness-audit/28-asset-loading-and-sandboxing.md](28-asset-loading-and-sandboxing.md) Q566 (ZIP traversal)
- Missing: `docs/architecture/desktop-sandboxing.md`

---

### Q: 656. Is there clarity on which entity is authoritative for which decision (legality, RNG, content, identity)?

**Status:** ⚠ Partial

**Answer:**
- **Legality (rule application):** authoritative in the deterministic reducer (`src/engine/` + `src/rules/`). [CLAUDE.md](../../../CLAUDE.md) and the determinism stack make this explicit.
- **RNG:** authoritative in seeded PCG32 sub-streams; no peer or server influences ([docs/architecture/determinism.md](../../architecture/determinism.md)).
- **Content (schemas, IDs, manifests):** authoritative in `content-schema/` + `src/content-runtime/`; first-party packs are signature-verified, AI-generated packs are sandboxed.
- **Identity:** **no authoritative source.** No account, no peer identity, no session token ([docs/archive/readiness-audit/24-tls-enforcement-and-webrtc-authentication.md](24-tls-enforcement-and-webrtc-authentication.md) Q475, Q485). `metadata.playerName` is a client-supplied string with no authority behind it.
- **Lockstep authority:** in P2P lockstep there is no single host-authoritative entity for game state — every client computes the same transitions and the per-turn hash exchange ([tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md](../../../tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md)) detects divergence. Host election exists for migration, not for authority.

The authoritative-decision table is **not** consolidated anywhere; it has to be reconstructed from determinism / pack-contract / multiplayer docs.

**Evidence:**
- [docs/architecture/determinism.md](../../architecture/determinism.md)
- [docs/architecture/pack-contract.md](../../architecture/pack-contract.md)
- [docs/archive/readiness-audit/24-tls-enforcement-and-webrtc-authentication.md](24-tls-enforcement-and-webrtc-authentication.md) Q475, Q485
- [tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md](../../../tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md)
- Missing: consolidated `docs/architecture/authority.md`

---

### Q: 657. Are violations of trust-boundary contracts caught loudly (assert/throw) rather than silently coerced?

**Status:** ⚠ Partial

**Answer:**
- **"Fail loudly" is named as a top-level principle.** [CLAUDE.md](../../../CLAUDE.md) line 45 and [docs/architecture/master-plan.md](../../architecture/master-plan.md) line 79 both commit "missing gameplay requirements must fail loudly." [docs/architecture/state-flow.md](../../architecture/state-flow.md) line 14 shows "fail loud: contentHash mismatch" in the load flow. The save/load screen contract says "fail loudly before controls become enabled."
- **Counter-rule:** "missing presentation may fall back" ([CLAUDE.md](../../../CLAUDE.md) line 44) — silent coercion is *allowed* on the presentation side, which can mask a tampered asset binding.
- **Operationally weak.** The "fail loudly" rule is policy, but no codebase-wide invariant gates it: no global `assert()` library, no error-boundary contract, no CI lint that bans `try {} catch (_) {}` swallowing, no rule against `?? defaultValue` on missing schema fields. The save loader explicitly does not have a "validator runs first, no reducer call without it" gate ([docs/archive/readiness-audit/27-save-tampering-and-pack-signing.md](27-save-tampering-and-pack-signing.md) Q545).
- The pipeline-level discrimination (typed `ValidationReport` / `CoherenceReport` / `BalanceReport` returns) is the closest enforced pattern — but those are domain-level returns, not trust-boundary asserts.

**Evidence:**
- [CLAUDE.md](../../../CLAUDE.md) lines 44–45
- [docs/architecture/master-plan.md](../../architecture/master-plan.md) line 79
- [docs/architecture/state-flow.md](../../architecture/state-flow.md) line 14
- [docs/architecture/wiki/screens/55-save-load/data-contracts.md](../../architecture/wiki/screens/55-save-load/data-contracts.md)
- [docs/archive/readiness-audit/27-save-tampering-and-pack-signing.md](27-save-tampering-and-pack-signing.md) Q545

---

### Q: 658. Is there a centralized logging pipeline for the signaling server, AI gateway, and TURN service?

**Status:** ❌ UNKNOWN

**Answer:**
**No logging pipeline is documented for any service.** Neither `services/signaling/README.md` (6 lines) nor `services/ai-gateway/README.md` (14 lines) names a logger, log shipper, log destination, log format, or retention. There is no `services/*/logging.md`, no `docs/architecture/observability.md`, no `services/shared/logger.ts` contract, no chosen log library (pino / winston / bunyan / OpenTelemetry / Datadog / Loki). TURN does not exist ([docs/archive/readiness-audit/25-turn-credentials-and-signaling-server-abuse.md](25-turn-credentials-and-signaling-server-abuse.md) Q488). The de facto logger is `console.log`, which the hosting provider (Fly.io / Railway, named in the signaling task) captures by default into its own dashboard — but nothing in the spec aggregates these into a centralized pipeline.

**Evidence:**
- [services/signaling/README.md](../../../services/signaling/README.md), [services/ai-gateway/README.md](../../../services/ai-gateway/README.md)
- [docs/archive/readiness-audit/22-privacy-retention-and-error-leaks.md](22-privacy-retention-and-error-leaks.md) Q411–Q413
- No `docs/architecture/observability.md`

---

### Q: 659. Are security-relevant events distinguished from operational logs (auth failures, rate-limit hits, signature failures)?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified — and most of the source events do not exist either.**
- "Auth failures" — no auth surface ([docs/archive/readiness-audit/24-tls-enforcement-and-webrtc-authentication.md](24-tls-enforcement-and-webrtc-authentication.md) Q475, Q485), so nothing to log.
- "Rate-limit hits" — no rate limiter ([docs/archive/readiness-audit/29-rate-limiting-and-secret-management.md](29-rate-limiting-and-secret-management.md) Q593).
- "Signature failures" — Ed25519 verification is defined ([tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md](../../../tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md)) but the failure path is "reject pack"; no log channel, log severity, log tag, or `security.event.signature_failed` envelope is committed.
- No `SecurityEvent` schema, no `LogChannel` enum (`audit` / `security` / `app` / `access`), no severity levels (`info` / `warn` / `error` / `critical` / `security`).

**Evidence:**
- [docs/archive/readiness-audit/24-tls-enforcement-and-webrtc-authentication.md](24-tls-enforcement-and-webrtc-authentication.md) Q475, Q485
- [docs/archive/readiness-audit/29-rate-limiting-and-secret-management.md](29-rate-limiting-and-secret-management.md) Q593
- [tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md](../../../tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md)
- Missing: `security-event.schema.json`

---

### Q: 660. Are log fields scrubbed of PII (IP, display name, prompt content) before persistence?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified — and audit 22 already confirmed this.** [docs/archive/readiness-audit/22-privacy-retention-and-error-leaks.md](22-privacy-retention-and-error-leaks.md) Q413 explicitly answers: "No log-scrubbing or hashing rule is documented for either the signaling server or the AI gateway. With ICE candidates carrying public/private IPs and the WebSocket layer surfacing client IPs by default, IP capture is the *default* behavior of any standard Node/Express/`ws` deployment, and nothing in the spec overrides that default." There is no `redact()` middleware, no allow-list of safe-to-log fields, no rule against logging `metadata.playerName`, no rule against logging the AI prompt content, no hashing of IPs at ingest.

**Evidence:**
- [docs/archive/readiness-audit/22-privacy-retention-and-error-leaks.md](22-privacy-retention-and-error-leaks.md) Q413
- [docs/archive/readiness-audit/29-rate-limiting-and-secret-management.md](29-rate-limiting-and-secret-management.md) Q609
- Missing: `services/shared/redact.ts`

---

### Q: 661. Are logs retained for a defined period and then automatically deleted?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. [docs/archive/readiness-audit/22-privacy-retention-and-error-leaks.md](22-privacy-retention-and-error-leaks.md) Q411 confirms no log-retention TTL for signaling. Q412 confirms no retention policy for AI gateway. Q414 confirms no crash-report retention because no crash-report system exists. The hosting providers named (Fly.io / Railway) have *their own* default log retention (Fly.io retains logs for ~3 days on free tier, longer on paid), but no project-side rule pins that to a chosen value, no automatic deletion job is scheduled, and no audit trail records what was deleted.

**Evidence:**
- [docs/archive/readiness-audit/22-privacy-retention-and-error-leaks.md](22-privacy-retention-and-error-leaks.md) Q411, Q412, Q414
- No `docs/operations/log-retention.md`

---

### Q: 662. Is access to logs role-gated and audit-logged itself?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No IAM model, no role definitions (`viewer` / `oncall` / `admin`), no SSO contract, no audit-log-of-log-access requirement. The hosting providers' web consoles are gated by their own account auth (Fly.io org membership, Railway team), but no project-level least-privilege policy is committed. No `docs/operations/access-control.md`, no `iam.md`. Cross-ref [docs/archive/readiness-audit/29-rate-limiting-and-secret-management.md](29-rate-limiting-and-secret-management.md) Q611.

**Evidence:**
- [docs/archive/readiness-audit/29-rate-limiting-and-secret-management.md](29-rate-limiting-and-secret-management.md) Q611
- No `docs/operations/access-control.md`

---

### Q: 663. Are anomalies alerted on (sudden spike in room creation, signature failures, rate-limit hits)?

**Status:** ❌ UNKNOWN

**Answer:**
**No alerting pipeline is documented.** No PagerDuty / Opsgenie / Slack-webhook / email-alert integration; no anomaly-detection heuristic, no per-metric threshold definition, no SLO. [docs/archive/readiness-audit/29-rate-limiting-and-secret-management.md](29-rate-limiting-and-secret-management.md) Q605 already confirms this. With no metrics collection (Q666), no logger (Q658), no rate limiter (Q593), and no signature-failure log channel (Q659), there is also no signal to alert on.

**Evidence:**
- [docs/archive/readiness-audit/29-rate-limiting-and-secret-management.md](29-rate-limiting-and-secret-management.md) Q605
- No `docs/operations/alerting.md`, no `slo.yaml`

---

### Q: 664. Is there an on-call rotation, and what is the SLA for security alerts?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified — no on-call rotation, no SLA, no escalation matrix.** No `docs/operations/oncall.md`, no `SECURITY.md` with response-time commitments, no severity matrix (P0 / P1 / P2 with target response times), no rotation tool (PagerDuty schedule, OpsGenie). The repo is a one-developer planning effort today, so the *de facto* on-call is "the maintainer when they happen to look" — fine for pre-launch, blocking for any production deployment with multiplayer or AI gateway live.

**Evidence:**
- No `SECURITY.md` in repo root
- No `docs/operations/oncall.md`

---

### Q: 665. Are log timestamps normalized (UTC, monotonic) to support cross-service correlation?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No timestamp-normalization rule, no UTC-only commitment, no monotonic-clock requirement, no `correlationId` envelope, no NTP requirement. With no logger (Q658), there is no timestamp policy to enforce. Cross-service correlation is also moot when there is one service (signaling) in the runtime plan today; it would matter the moment AI gateway, TURN, or telemetry are added.

**Evidence:**
- No logging spec in repo
- [docs/archive/readiness-audit/29-rate-limiting-and-secret-management.md](29-rate-limiting-and-secret-management.md) Q604 (no NTP / monotonic guidance)

---

### Q: 666. Is there structured logging (JSON) so security events are machine-queryable?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No JSON-log format, no `LogRecord` schema, no chosen library that emits structured logs by default (pino / winston-json / bunyan). The signaling-task spec is silent on logging entirely. Without structured logs, machine-querying security events (`severity=security AND event=signature_failure AND ts>now-1h`) is impossible.

**Evidence:**
- No `LogRecord` schema in [content-schema/schemas/](../../../content-schema/schemas/)
- [services/signaling/README.md](../../../services/signaling/README.md), [services/ai-gateway/README.md](../../../services/ai-gateway/README.md)

---

### Q: 667. Are crash reports and security events on separate ingestion paths to avoid PII bleed?

**Status:** ❌ UNKNOWN

**Answer:**
**Neither pipeline exists.** No crash-report system ([docs/archive/readiness-audit/22-privacy-retention-and-error-leaks.md](22-privacy-retention-and-error-leaks.md) Q414, [docs/archive/readiness-audit/29-rate-limiting-and-secret-management.md](29-rate-limiting-and-secret-management.md) Q603), no security-event channel (Q659), no separation rule. Were crash reports introduced naïvely they would (a) carry stack traces and command-log tails that include `metadata.playerName` and (b) flow into the same hosting-provider log stream as security events, mixing PII into a feed that may need broader access for security triage.

**Evidence:**
- [docs/archive/readiness-audit/22-privacy-retention-and-error-leaks.md](22-privacy-retention-and-error-leaks.md) Q414
- [docs/archive/readiness-audit/29-rate-limiting-and-secret-management.md](29-rate-limiting-and-secret-management.md) Q603

---

### Q: 668. Is there a way to correlate a player report (case ID) to server-side events without storing PII?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No "report this game" UX, no `caseId` schema, no in-app reporting flow. Audit 19 ([docs/archive/readiness-audit/19-chat-safety-and-user-reporting.md](19-chat-safety-and-user-reporting.md)) confirms no user-reporting surface. Without a case ID at the player end and without security-event log records at the server end, no correlation is possible. The desync-diagnostic report ([tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md](../../../tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md)) is in-memory and per-game; it has no persistent ID and no transport.

**Evidence:**
- [docs/archive/readiness-audit/19-chat-safety-and-user-reporting.md](19-chat-safety-and-user-reporting.md)
- [tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md](../../../tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md)
- No `case-id.schema.json`, no report screen package

---

### Q: 669. Are integrity-failure events (hash mismatch, signature failure, schema violation) sampled to detect targeted attacks?

**Status:** ❌ UNKNOWN

**Answer:**
**Events exist as code paths; sampling does not exist.** Three integrity-failure surfaces are defined:
- `contentHash` mismatch ([docs/architecture/state-flow.md](../../architecture/state-flow.md) line 14 — "fail loud")
- Ed25519 signature failure ([tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md](../../../tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md))
- Schema validation failure (`ValidationReport` from the AI pipeline; `scripts/check-repo-contracts.mjs` for build-time)

**None** of these surfaces are tied to a counter, a sampling window, an aggregation pipeline, or a "spike threshold ⇒ alert" rule. There is no per-IP / per-pack / per-key trend window. A targeted attacker probing the signature verifier with crafted packs would generate failures that disappear into either local-only error states or hosting-provider-default `console.error` lines.

**Evidence:**
- [docs/architecture/state-flow.md](../../architecture/state-flow.md) line 14
- [tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md](../../../tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md)
- [docs/architecture/ai-generation-pipeline.md](../../architecture/ai-generation-pipeline.md) (ValidationReport)
- Missing: `docs/operations/integrity-monitoring.md`

---

### Q: 670. Is there a tamper-evident audit log for security-critical operations (key rotation, ban, refund)?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No append-only audit log, no signed log chain (e.g., hash-chained or Merkle-style), no immutable-storage commitment. The events themselves are absent: no key rotation ([docs/archive/readiness-audit/29-rate-limiting-and-secret-management.md](29-rate-limiting-and-secret-management.md) Q610), no ban system ([docs/archive/readiness-audit/19-chat-safety-and-user-reporting.md](19-chat-safety-and-user-reporting.md)), no refund system (no payment surface in scope). Signing-key custody is also undefined ([docs/archive/readiness-audit/29-rate-limiting-and-secret-management.md](29-rate-limiting-and-secret-management.md) Q614), so even the "rotate Ed25519 pack-signing key" event has no defined owner, let alone a tamper-evident record of having happened.

**Evidence:**
- [docs/archive/readiness-audit/29-rate-limiting-and-secret-management.md](29-rate-limiting-and-secret-management.md) Q610, Q614
- No `audit-log.schema.json`

---

### Q: 671. Are dashboards available for monitoring abuse rates, auth failures, and CDN cache poisoning indicators?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No Grafana / Datadog / hosting-provider dashboard JSON committed; no metrics endpoint (Prometheus `/metrics`), no Counters / Histograms named, no SLO board. The relevant signal sources are also missing:
- "abuse rates" — no rate limiter, no chat moderation backend (Q593, audit 19)
- "auth failures" — no auth surface (Q659)
- "CDN cache poisoning" — no CDN in scope; no edge / WAF rule ([docs/archive/readiness-audit/29-rate-limiting-and-secret-management.md](29-rate-limiting-and-secret-management.md) Q595)

**Evidence:**
- [docs/archive/readiness-audit/29-rate-limiting-and-secret-management.md](29-rate-limiting-and-secret-management.md) Q593, Q595
- No `docs/operations/dashboards/` or `monitoring.md`

---

### Q: 672. Is there a runbook for declared security incidents, including communication and disclosure obligations?

**Status:** ❌ UNKNOWN

**Answer:**
**No `SECURITY.md`, no incident runbook, no disclosure policy.** [docs/archive/readiness-audit/29-rate-limiting-and-secret-management.md](29-rate-limiting-and-secret-management.md) Q613 already confirms: no leaked-secret playbook, no incident-response document, no audit-log requirement. There is no:
- contact (`security@…`) for vulnerability reports
- triage timeline (acknowledge in 24 h, fix critical in 7 d, etc.)
- coordinated-disclosure policy
- user-notification template ("we detected unauthorized access to …")
- regulator-notification trigger (GDPR 72-hour breach notification)
- post-mortem template

**Evidence:**
- [docs/archive/readiness-audit/29-rate-limiting-and-secret-management.md](29-rate-limiting-and-secret-management.md) Q613
- No `SECURITY.md` in repo root
- No `docs/operations/incident-response.md`

---

## 🔍 Summary

### Missing Logic
- **Trust-boundary contract** — no `docs/architecture/trust-boundaries.md`, no zone diagram, no per-component "what does this trust about its inputs / what should others trust about its outputs" matrix (Q645, Q653, Q656).
- **"Client is untrusted" first principle** — implied through individual rules (no provider keys in browser, sandbox flag for AI packs) but never named as a global axiom; no per-endpoint validation contract (Q646).
- **Signaling client-side trust posture** — server is stateless by spec, but no explicit "client must not trust the relay; only DTLS provides peer integrity" rule, and WSS is not even mandated (Q647).
- **Untrusted-string handling** — no sanitization / length cap / Unicode normalization / escape rule for `metadata.playerName`, chat messages, room codes, or peer SDP/ICE (Q648).
- **Prompt-injection defenses** — pipeline treats *output* as untrusted, but *input* (the user prompt) has no template hygiene, length cap, secondary-classifier check, or jailbreak block-list (Q649).
- **Inter-Worker validation** — AI bot Worker is in scope; inbound `MOVE_RESULT` is not schema-validated, no origin check, no version envelope (Q654).
- **Desktop / Tauri / Electron sandbox plan** — file-system scoping is browser-implicit today; if a desktop wrapper is ever added, no `fs-allowlist` / sandbox config exists (Q655).
- **Authoritative-decision table** — RNG / legality / content / identity authority is reconstructable but not consolidated in one doc; no peer / session identity authority exists at all (Q656).
- **Trust-boundary asserts** — "fail loudly" is policy, but no global `assert()` library, no CI lint against silent `catch`, no rule against `?? defaultValue` on schema-required fields (Q657).
- **Centralized logging pipeline** — no logger choice, no log shipper, no destination, no format, no `LogRecord` schema, no severity ladder (Q658, Q659, Q666).
- **PII redaction** — no allow-list of safe-to-log fields, no `redact()` middleware, no IP-hashing-at-ingest rule, no rule against logging `metadata.playerName` or AI prompt content (Q660).
- **Log retention TTL & deletion job** — no project-side TTL, no automated deletion, no audit of what was deleted; relies on hosting-provider defaults (Q661).
- **Log access control & audit-of-access** — no IAM model, no role matrix, no SSO contract, no log of who viewed which logs (Q662).
- **Alerting pipeline** — no PagerDuty / Slack / email integration, no anomaly-detection heuristic, no SLO, no per-metric threshold (Q663).
- **On-call rotation & SLA** — no `SECURITY.md` with severity matrix, no PagerDuty schedule, no escalation chain (Q664).
- **Timestamp normalization & correlation** — no UTC-only rule, no monotonic-clock requirement, no `correlationId` envelope, no NTP requirement (Q665).
- **Crash-report / security-event separation** — neither pipeline exists; no rule that they would be separated when introduced (Q667).
- **Player-report case ID & correlation** — no in-app reporting, no `caseId`, no correlation to server-side events; desync diagnostic is per-game in-memory only (Q668).
- **Integrity-failure sampling & anomaly detection** — `contentHash` / signature / schema failure paths exist as code, but no counter, no aggregation, no spike alert (Q669).
- **Tamper-evident audit log** — no append-only / signed-chain audit log; the security-critical events themselves (key rotation, ban, refund) are also undefined (Q670).
- **Dashboards & metrics endpoint** — no Grafana / Datadog dashboards, no `/metrics`, no SLO board, no abuse-rate counter (Q671).
- **Incident runbook & disclosure policy** — no `SECURITY.md`, no contact, no triage timeline, no GDPR breach-notification trigger, no post-mortem template (Q672).

### Risks
- **Operational blindness on launch.** Without a logger, structured events, dashboards, or alerts, the moment multiplayer or AI gateway runs in production, every abuse signal — coordinated DoS on signaling, AI cost-exhaustion, signature-verification probes, rate-limit attempts (when limits exist) — is invisible. Detection happens only when a player rage-quits hard enough to email the maintainer.
- **PII bleed by default.** Standard Node + `ws` deployments log client IPs, ICE candidates carry IPs to peers, and ad-hoc `console.error(err)` includes whatever the throwing code held — including `metadata.playerName`, AI prompt content, and (the moment a developer mistakes scope) `process.env.OPENAI_API_KEY` / `Authorization` header. The hosting provider's default retention then fixes this PII into logs nobody promised to delete.
- **Targeted-attack invisibility.** A patient attacker probing the Ed25519 verifier with crafted packs, the schema validator with malformed JSON, or the room-code namespace with brute force generates exactly the integrity-failure events the spec already names ("fail loud") — but with no counter, no sampling window, and no spike alert, "fail loud" only fails *to nobody*.
- **Trust-boundary drift in implementation.** Because no doc names the trust diagram and the "client is untrusted" axiom, a future implementer can plausibly re-introduce trust assumptions that violate the design (e.g., trusting `metadata.playerName` for moderation decisions, trusting peer-supplied `ICE_CANDIDATE` payload as well-formed, trusting a save's `migrationVersion` to skip schema checks). The audits 27 (saves), 28 (assets), 29 (secrets) already document concrete drift entry points; without a master trust contract, more will accumulate.
- **Inter-Worker contract drift.** The AI Worker today returns a `Command` directly into the reducer with no schema validation. As the worker gains capabilities (multi-agent reasoning, persistent memory, future provider-backed inference), an unvalidated `MOVE_RESULT` becomes the easiest path to crash the reducer or inject a malformed `Command` that the engine assumed was schema-valid.
- **No incident path.** A discovered vulnerability has no `security@` contact, no acknowledgement timeline, no coordinated-disclosure window, and no patch-release process. Researchers who follow responsible disclosure norms will give up; researchers who do not will publish.
- **Compliance posture is empty.** GDPR / CCPA both require a defined retention period, an erasure flow, a breach-notification process, and a defined data inventory. None exist (cross-ref [docs/archive/readiness-audit/22-privacy-retention-and-error-leaks.md](22-privacy-retention-and-error-leaks.md) Q410–Q417). The first regulator request lands on a maintainer with no documented answer.

### Improvements
- **Adopt `docs/architecture/trust-boundaries.md`** — a single doc with: trust zones (deterministic core / content runtime / UI / persistence / AI gateway / signaling / TURN / browser / OS), arrows annotated with what crosses each boundary and what validates it, an explicit "every boundary input is untrusted unless verified by Z" axiom, and a per-component "this is what we trust / this is what we do not trust" table. Cross-link from [CLAUDE.md](../../../CLAUDE.md), [docs/architecture/overview.md](../../architecture/overview.md), and the master plan.
- **Codify the authoritative-decision table** — a small table in `trust-boundaries.md` listing decision (legality, RNG, content, identity, lockstep ordering, host migration) → owner (engine, PCG32, content runtime, none/n/a, peer-consensus, heartbeat election) → enforcement file path. Surfaces the identity gap as a first-class TODO.
- **Define a `LogRecord` schema and choose pino.** Add `content-schema/schemas/log-record.schema.json` with `{ ts: ISO8601 UTC, severity, channel: app|access|audit|security, service, correlationId, event, fields: object }`. Pin pino as the logger across `services/signaling/` and `services/ai-gateway/`; default `redact: ['req.headers.authorization', 'req.body.prompt', 'metadata.playerName']`.
- **Create a `SecurityEvent` registry.** `content-schema/schemas/security-event.schema.json` enumerating: `signature_failure`, `content_hash_mismatch`, `schema_violation`, `rate_limit_exceeded`, `auth_failure` (when auth exists), `pack_traversal_attempt`, `worker_message_invalid`, `prompt_injection_suspected`. Every emitter writes to the `security` log channel with this schema.
- **PII redaction as a build-time gate.** A pre-commit / CI lint that scans server-side code for `console.log(req)`, `console.error(err)`, `JSON.stringify(state)` style patterns and requires they go through a `safeLog()` helper. Add `services/shared/redact.ts` with field-level allow-list.
- **Log retention contract.** `docs/operations/log-retention.md`: app logs 30 d, security events 1 y, audit log indefinite, crash reports 30 d (when introduced); automated deletion via hosting-provider TTL or a daily job.
- **Alerting & SLOs.** `docs/operations/slo.yaml` (signaling 99 % `<200 ms` ack, AI gateway 95 % `<10 s`, signature-verification failure rate < 0.01 %); `docs/operations/alerting.md` mapping each SLO breach + each `SecurityEvent` rate-spike to a Slack/PagerDuty channel.
- **`SECURITY.md` + incident runbook.** Top-level `SECURITY.md` with `security@` contact, severity matrix (P0 < 1 h ack / 24 h fix; P1 < 24 h / 7 d; P2 < 7 d / 30 d), coordinated-disclosure 90-day window, GDPR 72-hour breach-notification trigger. Runbook in `docs/operations/incident-response.md` with playbooks for: leaked-secret, signing-key compromise, signature-failure spike, AI cost runaway, mass-PII leak.
- **Tamper-evident audit log for sec-critical ops.** When key rotation / ban / refund are introduced, write each event to an append-only log with a hash chain (each entry `H(prev || entry)`); ship the log root daily to an external store. Schema in `content-schema/schemas/audit-log.schema.json`.
- **Worker-message validation.** Extend [tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md](../../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md) with an acceptance criterion: every inbound message is `Zod.parse`-validated against a `worker-message.schema.json` envelope with `{ kind, version, payload }`; invalid messages are dropped and emit `worker_message_invalid` security events.
- **Untrusted-string contract.** `docs/architecture/untrusted-strings.md`: every peer-supplied string (`playerName`, chat, room-code) declares `maxLength`, character-class allow-list, NFC-normalization rule, and rendering rule (always React-default-escape, never `dangerouslySetInnerHTML`).
- **Prompt-injection defenses.** Add to the AI gateway: prompt-template hygiene (a single `template(systemPrompt, userPrompt)` helper that escapes / fences user input), `GenerationRequest.theme` length and character-class cap, optional secondary-classifier `ModerationProvider.checkPromptInjection(prompt)` call before forwarding to the model, and an output structural check that the response does not echo a system-prompt fragment.
- **Crash-report system (opt-in, separate path).** If introduced, separate ingestion endpoint, separate retention bucket, separate access role; payload is `{ stateHash, stack, redactedCommandTail }` with no `playerName`, no IP, no prompt content; per-fingerprint-hash rate limit; 30-day TTL.
- **Player report → server correlation.** Define `case-id.schema.json` (256-bit random, no personal info); when a user reports an in-game incident, attach the `caseId` to the desync-diagnostic (or normal session) trace; server correlates via `correlationId` in `LogRecord`. No PII in either side; only the case ID links them.
- **Integrity-failure sampling & dashboards.** Counter for each `SecurityEvent` kind, 5-min sliding window, per-IP and per-pack-id buckets; alert on > 5× baseline. Dashboard panel for top-10 packs by signature failure / top-10 IPs by schema violation / top-10 prompts by moderation block.

### AI-Readiness
Score: **1/10**

Reason: Of 28 questions, **1** (Q650 — output untrust + schema validation + sandbox flag is the most thoroughly defined trust-boundary in the repo) is fully defined. **6** (Q646, Q647, Q651, Q652, Q653, Q656, Q657) are partial — each cites one or two written rules but lacks the consolidated trust contract, per-endpoint enforcement, or operational machinery. The remaining ~21 are ❌ UNKNOWN.

The repo today commits *some* meaningful trust boundaries — the AI generation pipeline's typed-stage architecture, the sandbox flag for AI packs, Ed25519 verification of first-party packs, "fail loudly" on missing gameplay records, "no provider keys in the browser" — but it has **zero** of the operational machinery that converts those boundaries into observable, alertable, auditable production behaviour: no logger, no `LogRecord` schema, no `SecurityEvent` registry, no PII redaction, no retention TTL, no IAM, no alerting, no on-call, no SLA, no dashboards, no incident runbook, no `SECURITY.md`. An AI implementer following the current spec ships a signaling server that `console.error`s client IPs and SDP payloads into Fly.io's default log retention, an AI gateway that logs the user's prompt verbatim, no detection of an attacker probing the Ed25519 verifier, and no documented way for a security researcher to even report a finding. Closing the **Improvements** list (`trust-boundaries.md`, `LogRecord` + `SecurityEvent` schemas, pino + redaction, retention contract, SLO + alerting, `SECURITY.md` + runbook, worker-message validation) lifts this to 7–8/10.
