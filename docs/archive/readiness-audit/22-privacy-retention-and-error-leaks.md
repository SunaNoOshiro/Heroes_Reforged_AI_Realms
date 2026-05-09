# 22. PRIVACY, DATA RETENTION & ERROR-MESSAGE INFORMATION LEAKS

> **Audit context.** This repo is design-first / schema-first; no runtime
> exists. The "server-side" surface is two **optional** stubs only:
> `services/signaling/README.md` (one paragraph: stateless WebRTC
> handshake) and `services/ai-gateway/README.md` (one paragraph: optional
> provider boundary). Neither has an implementation, a logging policy, a
> retention rule, a compliance posture, or a privacy artifact. The only
> client-side personal-data surface is `metadata.playerName` in the save
> format and a high-score `state.profile.highScores` slice (audit 21,
> Q398). There is **no** privacy policy, **no** data inventory, **no**
> centralized error formatter, **no** crash-report sink, **no**
> analytics/telemetry layer, and **no** auth model. Almost every question
> below therefore resolves to ❌ UNKNOWN by design — the planning phase
> has not yet specified a privacy / retention / error-leak posture.

---

### Q: 410. Is there a written privacy policy linked from the application, and is it versioned?

**Status:** ❌ UNKNOWN

**Answer:**
**No privacy policy exists.** No `PRIVACY.md`, `privacy.html`, or `docs/legal/` artifact is present in the repo. No screen package (including `01-main-menu`, `54-system-menu`, `56-options`) declares a "Privacy" link, modal, or footer item. Versioning is therefore moot — there is no document to version, no `privacyPolicyVersion` field in `state.profile.*`, and no acceptance/consent record schema in `content-schema/`.

**Evidence:**
- No `PRIVACY.md` / `docs/legal/` / `docs/privacy.md` in [docs/](../)
- [docs/architecture/wiki/screens/01-main-menu/spec.md](../../architecture/wiki/screens/01-main-menu/spec.md), [54-system-menu/spec.md](../../architecture/wiki/screens/54-system-menu/spec.md), [56-options/spec.md](../../architecture/wiki/screens/56-options/spec.md) — no privacy-link element
- [docs/archive/readiness-audit/21-user-generated-content-and-personal-data.md](21-user-generated-content-and-personal-data.md) Q409 — no data-inventory artifact either

---

### Q: 411. What data does the signaling server retain, and for how long?

**Status:** ⚠ Partial

**Answer:**
- **Documented in-memory state:** "only room → peer mapping; cleared when room is empty" (signaling task 01). Server is described as *stateless* across restarts.
- **NOT documented:** whether the WebSocket transport layer or the hosting platform (Fly.io / Railway, named only as deploy targets) writes access logs, IP addresses, SDP payloads, ICE candidates (which contain IP/port tuples), connect/disconnect events, or error traces — and for how long. There is no log-retention TTL, no log-redaction rule, and no "ephemeral by design" statement covering the observability layer.
- The signaling protocol carries `OFFER`, `ANSWER`, `ICE_CANDIDATE` — ICE candidates inherently expose IPs to the peer; whether the server *persists* them (vs. just relays) is not stated.

**Evidence:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md:18-21](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md#L18) — "only room → peer mapping; cleared when room is empty"
- [services/signaling/README.md](../../../services/signaling/README.md) — three lines, no retention/log policy
- [docs/archive/readiness-audit/25-turn-credentials-and-signaling-server-abuse.md](25-turn-credentials-and-signaling-server-abuse.md) Q500–Q501 — no per-IP / per-account log surface specified

---

### Q: 412. What data does the AI gateway retain (prompts, responses, user IDs), and for how long?

**Status:** ❌ UNKNOWN

**Answer:**
**No retention policy is documented for the AI gateway.** `services/ai-gateway/README.md` is a 13-line stub describing the *purpose* (keep secrets off the client, centralize rate-limits/policy) but defines no schema for what is stored, no TTL for prompts/responses, no user-ID model (no auth surface exists), no prompt-redaction rule, and no caching layer. `GenerationRequest` and `RawFactionData` are the on-the-wire payloads, but no rule states whether the gateway logs them, persists them as a fixture cache, or forwards them to a moderation log.

**Evidence:**
- [services/ai-gateway/README.md](../../../services/ai-gateway/README.md) — purpose only
- [docs/architecture/ai-integration.md:40-49](../../architecture/ai-integration.md#L40) — boundary rules, no retention
- [content-schema/schemas/generation-request.schema.json](../../../content-schema/schemas/generation-request.schema.json), [content-schema/schemas/generated-faction.schema.json](../../../content-schema/schemas/generated-faction.schema.json) — payload shapes, no retention
- [docs/archive/readiness-audit/14-ai-generated-content-pipeline.md](14-ai-generated-content-pipeline.md) — pipeline gaps include logging/retention

---

### Q: 413. Are server-side logs scrubbed of IP addresses or hashed before persistence?

**Status:** ❌ UNKNOWN

**Answer:**
**No log-scrubbing or hashing rule is documented** for either the signaling server or the AI gateway. The signaling task does not even state that logs are *off*; it only says the server is stateless w.r.t. game state. With ICE candidates carrying public/private IPs and the WebSocket layer surfacing client IPs by default, IP capture is the *default* behavior of any standard Node/Express/`ws` deployment, and nothing in the spec overrides that default.

**Evidence:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) — silent on logging
- [services/signaling/README.md](../../../services/signaling/README.md), [services/ai-gateway/README.md](../../../services/ai-gateway/README.md) — no log policy
- No `services/*/logging.md` or `docs/architecture/observability.md`

---

### Q: 414. How long are crash reports kept, and who has access?

**Status:** ❌ UNKNOWN

**Answer:**
**No crash-report pipeline exists.** Audit 19/Q351 and audit 21/Q404 both confirmed there is no crash-report destination, format, or transport. Without a sink, retention TTL and access-control roles are undefined. The only adjacent artifact is the **desync diagnostic** (`tasks/phase-3/01-multiplayer/04-05`), which produces an in-memory report (`turn`, both hashes, last-N commands) — but its persistence, transport, and audience are also unspecified.

**Evidence:**
- [docs/archive/readiness-audit/19-chat-safety-and-user-reporting.md](19-chat-safety-and-user-reporting.md) Q351
- [docs/archive/readiness-audit/21-user-generated-content-and-personal-data.md](21-user-generated-content-and-personal-data.md) Q404
- [tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md:30-32](../../../tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md#L30) — desync report content; no retention rule

---

### Q: 415. Is there a user-facing "delete my data" flow for any server-side data?

**Status:** ❌ UNKNOWN

**Answer:**
**No "delete my data" flow exists** — neither client-side ("forget me," see audit 21/Q401) nor server-side. There is no `DELETE_PROFILE`, `DELETE_ACCOUNT`, `WIPE_LOCAL_DATA`, or `REQUEST_ERASURE` command in any screen package, no contact endpoint, and no documented manual process. Because there is no auth surface and no documented server-side persistence (Q411–Q412), the question of *what* a user could delete is itself undefined.

**Evidence:**
- [docs/archive/readiness-audit/21-user-generated-content-and-personal-data.md](21-user-generated-content-and-personal-data.md) Q401
- [docs/architecture/wiki/screens/54-system-menu/](../../architecture/wiki/screens/54-system-menu/), [docs/architecture/wiki/screens/56-options/data-contracts.md](../../architecture/wiki/screens/56-options/data-contracts.md) — no wipe / erasure command
- No `docs/legal/erasure-process.md`

---

### Q: 416. Is the data-deletion flow auditable (does the user receive confirmation, and is deletion verifiable)?

**Status:** ❌ UNKNOWN

**Answer:**
**N/A — no deletion flow exists** (Q415). Therefore there is no confirmation receipt, no `erasureRequestId`, no audit-log schema, and no verification mechanism. This is a hard blocker for any GDPR / CCPA "right to erasure" obligation.

**Evidence:**
- Q415 above
- No `auditLog` / `erasureLog` schema in [content-schema/schemas/](../../../content-schema/schemas/)

---

### Q: 417. Is data shared with any third parties (analytics, AI providers, hosting), and is that disclosed?

**Status:** ⚠ Partial

**Answer:**
- **Implied third parties** in the architecture: an AI model **provider** (via `GenerationProvider` adapter, `services/ai-gateway/`) and a **hosting platform** for the signaling server ("Fly.io, Railway" named in task 01).
- **Disclosure:** None. There is no privacy policy (Q410), no third-party processor list, no per-provider DPA reference (Q419), and no in-app disclosure ("Powered by …" / "Hosted on …"). `ai-integration.md` describes provider-neutral interfaces but does not require the user to be informed which provider is active.
- **Analytics:** None disclosed because none exists (Q403).

**Evidence:**
- [docs/architecture/ai-integration.md:13-23](../../architecture/ai-integration.md#L13) — provider adapter pattern
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md:21](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md#L21) — Fly.io / Railway named as deploy targets
- No `docs/legal/processors.md` or in-app provider disclosure
- [docs/archive/readiness-audit/21-user-generated-content-and-personal-data.md](21-user-generated-content-and-personal-data.md) Q403

---

### Q: 418. Are there regional compliance requirements (GDPR, CCPA, COPPA) the architecture must satisfy?

**Status:** ❌ UNKNOWN

**Answer:**
**Not stated.** No compliance posture is named anywhere in `docs/`. There is no "EU-resident handling" rule, no California "Do Not Sell" toggle, and no COPPA under-13 carve-out. Because the app is browser-distributable and ships an AI generation feature (which has been the trigger for several recent compliance reviews in similar tools), GDPR/CCPA at minimum must be assumed in scope; COPPA is implicated if the audience is unrestricted (Q420).

**Evidence:**
- No mention of `GDPR`, `CCPA`, `COPPA`, `LGPD`, `PIPEDA` in [docs/](../) (architecture or planning)
- [docs/archive/readiness-audit/21-user-generated-content-and-personal-data.md](21-user-generated-content-and-personal-data.md) Q409 — no data inventory to drive a compliance map

---

### Q: 419. Is there a Data Processing Agreement (DPA) with each external provider that touches user data?

**Status:** ❌ UNKNOWN

**Answer:**
**No DPA, processor agreement, or vendor list is documented.** No external provider has been chosen or named beyond two casual hosting examples. Because the AI provider is intentionally provider-neutral (`GenerationProvider` adapter), the DPA obligation is deferred until a provider is selected — but the planning phase contains no checklist for that selection.

**Evidence:**
- [docs/architecture/ai-integration.md](../../architecture/ai-integration.md) — provider-neutral, no procurement/DPA rule
- No `docs/legal/processors.md` / `docs/legal/dpa-checklist.md`

---

### Q: 420. Are minors detected or restricted, and is parental consent required for any feature?

**Status:** ❌ UNKNOWN

**Answer:**
**No age gate, no minor detection, and no parental-consent surface exists.** Audit 21/Q397 (and audit 20/Q385) confirmed there is no `contentRating` field on `manifest.schema.json`, no age toggle in `config.player.*`, and no app-launch age prompt. AI generation, lobby chat, and UGC author flows are all unrestricted by age in the current spec.

**Evidence:**
- [docs/archive/readiness-audit/21-user-generated-content-and-personal-data.md](21-user-generated-content-and-personal-data.md) Q397
- [docs/archive/readiness-audit/20-save-imports-and-pack-trust-prompts.md](20-save-imports-and-pack-trust-prompts.md) Q385
- No `ageGate` / `parentalConsent` field in [content-schema/schemas/](../../../content-schema/schemas/)

---

### Q: 421. Are replays shareable, and do they leak the opponent's display name or account identifier without consent?

**Status:** ⚠ Partial

**Answer:**
- **Sharability:** Not specified. The save format includes a `commandLog` and `stateHash` — sufficient to reconstruct a replay — but **no replay-export, replay-share, or replay-upload command/screen exists** anywhere in the spec. The only "share" surface contemplated is the (unspecified) save-import flow flagged in audit 20.
- **Leakage if shared:** **Yes, by default.** `metadata.playerName` is written cleartext into the save file (audit 21/Q405), and `state.players.byId[*].displayName` is in the live state that the command log mutates. Therefore *if* a replay/save were shared, **both peers' display names would travel with it** with no redaction step and no consent dialog.
- No "account identifier" exists today (no auth surface).

**Evidence:**
- [docs/architecture/diagrams/24-save-flow.md:30-48](../../architecture/diagrams/24-save-flow.md#L30) — `metadata.playerName` cleartext
- [docs/archive/readiness-audit/21-user-generated-content-and-personal-data.md](21-user-generated-content-and-personal-data.md) Q405
- No `EXPORT_REPLAY` / `SHARE_REPLAY` command in [docs/architecture/wiki/screens/](../../architecture/wiki/screens/)
- [docs/archive/readiness-audit/20-save-imports-and-pack-trust-prompts.md](20-save-imports-and-pack-trust-prompts.md) — no save-import flow either

---

### Q: 422. Are usage metrics (session length, screens visited) collected, and is opt-out available before first transmission?

**Status:** ❌ UNKNOWN

**Answer:**
**No usage-metrics collection exists.** The architecture explicitly *forbids* runtime mutation of pack records based on telemetry ("Live games never rewrite pack records based on telemetry," `ai-generation-pipeline.md:149`), but it does not state whether usage telemetry is collected for product purposes. There is no metrics SDK, no `state.telemetry.*` slice, no `config.privacy.allowAnalytics` key, and consequently no opt-out / first-run prompt.

**Evidence:**
- [docs/architecture/ai-generation-pipeline.md:149](../../architecture/ai-generation-pipeline.md#L149) — telemetry mentioned only to forbid runtime mutation
- [docs/archive/readiness-audit/21-user-generated-content-and-personal-data.md](21-user-generated-content-and-personal-data.md) Q403
- No analytics doc / config key in [docs/architecture/](../../architecture/)

---

### Q: 423. Is telemetry on by default or off by default for new installs?

**Status:** ❌ UNKNOWN

**Answer:**
**Undefined because no telemetry layer exists** (Q422). The conservative, GDPR-aligned default would be **off-by-default with explicit opt-in**, but no such default is committed to in writing. Without a doc, the first contributor to wire telemetry could ship it on-by-default and silently violate the conservative posture.

**Evidence:**
- Q422 above
- No `config.privacy.*` defaults in any schema or screen

---

### Q: 424. Do error messages distinguish between "wrong room code" and "room exists but full" in a way that aids enumeration?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** The signaling task names messages `CREATE_ROOM`, `JOIN_ROOM`, `OFFER`, `ANSWER`, `ICE_CANDIDATE`, `PEER_CONNECTED`, `PEER_DISCONNECTED` but **defines no error / rejection vocabulary** — there is no `ROOM_NOT_FOUND` vs. `ROOM_FULL` vs. `INVALID_CODE` distinction documented, and no rule requiring a uniform "join failed" code that hides the reason. Combined with audit 18/Q303 (no rate limiting on joins), even a uniform error would not stop enumeration; a *distinguishable* error makes enumeration trivial.

**Evidence:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md:18-19](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md#L18) — message list, no error vocabulary
- [docs/archive/readiness-audit/18-room-codes-and-lobby-discovery.md](18-room-codes-and-lobby-discovery.md) Q303 — no rate limit
- No `signalingErrorCodes` enum in any schema

---

### Q: 425. Do error messages leak file paths, stack traces, or environment variables to the end user?

**Status:** ❌ UNKNOWN

**Answer:**
**No error-presentation contract is documented.** Screen `interactions.md` files all use the same boilerplate: "show localized error text, and play failure feedback" — i.e., the *intent* is to surface a localized string, not a stack trace. But there is **no centralized error formatter** (Q435), **no rule banning `Error.stack` from UI sinks**, and **no production vs. dev build flag** (Q432) to strip stack traces. The default React unhandled-error path *will* surface stack traces to the console, and any ad-hoc `toast(err.message)` could surface paths or env values.

**Evidence:**
- [docs/architecture/wiki/screens/01-main-menu/interactions.md:38](../../architecture/wiki/screens/01-main-menu/interactions.md#L38) (representative) — "show localized error text" only
- No error-formatter / production-mode rule in [docs/architecture/](../../architecture/)

---

### Q: 426. Do connection-failure messages reveal the peer's IP, ISP, or geolocation?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** WebRTC ICE candidates inherently carry IP:port tuples once a connection is attempted; whether the **failure-path UI** surfaces those (e.g., "Could not reach 203.0.113.5:51234") is undefined. Screen package `64-network-lobby` defines no error-payload schema for a failed peer connection. The conservative rule — "never put a peer's IP/ICE address in a user-visible toast or log" — is not written down.

**Evidence:**
- [docs/architecture/wiki/screens/64-network-lobby/interactions.md](../../architecture/wiki/screens/64-network-lobby/interactions.md) — no peer-failure error contract
- [tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md](../../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md) — no UI error rule
- [docs/archive/readiness-audit/24-tls-enforcement-and-webrtc-authentication.md](24-tls-enforcement-and-webrtc-authentication.md) Q471 — TLS error logging gap noted

---

### Q: 427. Do desync messages leak gameplay state that the opponent has not yet revealed (e.g., hidden hero loadouts)?

**Status:** ⚠ Partial

**Answer:**
- **Documented desync report payload** (task 04, AC line "Desync report includes: turn number, both hashes, last 10 commands"): it surfaces both peers' state hashes and the **last 10 commands**. A command log can include `BATTLE_ATTACK`/`MOVE_HERO` etc. — i.e. **public** inputs.
- **Risk surface:** `tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md` widens this to include intermediate `expected: bigint` hashes during bisect. Hashes themselves don't leak hidden state, but **commands do** if they include parameters tied to hidden information (e.g., a hero's spell list, fog-of-war movement intentions, hidden artifact transfers). The spec does not state which command parameters are *visible* vs. *hidden* and therefore does not state which fields must be redacted before being shown in a desync diagnostic UI.

**Evidence:**
- [tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md:30-32](../../../tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md#L30) — last-10-commands report
- [tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md](../../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md)
- No "hidden state taxonomy" in [docs/architecture/command-schema.md](../../architecture/command-schema.md) or [content-schema/schemas/command.schema.json](../../../content-schema/schemas/command.schema.json)

---

### Q: 428. Are validation errors on imported saves specific enough to fix the issue without revealing internal schema details that enable forgery?

**Status:** ❌ UNKNOWN

**Answer:**
**No save-import flow exists** (audit 20/Q374) and therefore no import-error UX is specified. The schema-validation tooling (`scripts/check-repo-contracts.mjs`, JSON-Schema validators) emits full JSON-Pointer paths and constraint names by default, which is fine for developer consoles but **not** sanitized for end-user surfaces. The "developer-grade vs. user-grade" error split is undefined; any future import flow could trivially echo full schema errors and hand a forger a recipe.

**Evidence:**
- [docs/archive/readiness-audit/20-save-imports-and-pack-trust-prompts.md](20-save-imports-and-pack-trust-prompts.md) Q374
- No save-import error contract in [docs/architecture/wiki/screens/](../../architecture/wiki/screens/)
- [docs/archive/readiness-audit/27-save-tampering-and-pack-signing.md](27-save-tampering-and-pack-signing.md) — adjacent forgery surface

---

### Q: 429. Are 401/403/404 distinctions consistent so that auth state is not inferable from status codes?

**Status:** ❌ UNKNOWN

**Answer:**
**No auth model and no HTTP status-code policy is documented.** Neither the signaling server nor the AI gateway specifies which status codes are returned on which conditions, so the inferability question has no answer yet. Once auth lands, the conservative pattern (uniform `404` for "exists-but-forbidden" *and* "not-found") must be written into a `services/*/error-codes.md`, which does not exist today.

**Evidence:**
- [services/signaling/README.md](../../../services/signaling/README.md), [services/ai-gateway/README.md](../../../services/ai-gateway/README.md) — no error-code matrix
- [docs/archive/readiness-audit/29-rate-limiting-and-secret-management.md](29-rate-limiting-and-secret-management.md) — adjacent gaps
- No `auth.md` / `error-codes.md` in [docs/architecture/](../../architecture/)

---

### Q: 430. Are error logs uploaded automatically, and do they redact PII before transmission?

**Status:** ❌ UNKNOWN

**Answer:**
**No automatic-upload pipeline exists** (Q414), and therefore no redaction step is specified. The conservative posture — "logs stay on-device unless the user clicks a Send button after seeing a redacted preview" — is not committed to in writing.

**Evidence:**
- Q414, Q404 above
- [docs/archive/readiness-audit/19-chat-safety-and-user-reporting.md](19-chat-safety-and-user-reporting.md) Q351
- No `redaction.md` / `telemetry.md` in [docs/architecture/](../../architecture/)

---

### Q: 431. Does a failing pack signature error reveal which signature key was tried (key enumeration)?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** `manifest.schema.json` allows an optional `signature` block (`scheme`, `keyId`, `value`) and `pack-contract.md` lists "signature checks" as a `src/content-runtime/` responsibility, but **no signature error vocabulary** is defined: there is no rule against echoing the attempted `keyId` or "no matching key in keychain" back to the user, no "constant-time" compare requirement (Q433), and no constraint on whether failures map to `INVALID_SIGNATURE` (uniform) vs. `UNKNOWN_KEY_ID` / `KEY_REVOKED` (enumerable).

**Evidence:**
- [content-schema/schemas/manifest.schema.json](../../../content-schema/schemas/manifest.schema.json) — `signature` block
- [docs/architecture/pack-contract.md:54-57, 117-127](../../architecture/pack-contract.md#L54)
- [docs/archive/readiness-audit/27-save-tampering-and-pack-signing.md](27-save-tampering-and-pack-signing.md) — adjacent gaps
- No `signature-error.md` / closed enum in [content-schema/schemas/](../../../content-schema/schemas/)

---

### Q: 432. Are dev-mode verbose errors disabled in production builds?

**Status:** ❌ UNKNOWN

**Answer:**
**No build-mode policy is documented.** The repo has no `vite`/`webpack`/`tsconfig` build manifest yet (planning phase). No `process.env.NODE_ENV === 'production'` rule, no `__DEV__` flag, no source-map-stripping rule, and no "errors are user-grade in prod, developer-grade in dev" contract is defined. Audit 30 (build pipeline) treats this as an open dependency.

**Evidence:**
- No build config in repo root (e.g., no `vite.config.ts` / `tsconfig.production.json`)
- [docs/archive/readiness-audit/30-dependencies-and-build-pipeline.md](30-dependencies-and-build-pipeline.md) — adjacent gap
- No `production-build.md` rule in [docs/architecture/](../../architecture/)

---

### Q: 433. Are timing-based oracles avoided in error paths (e.g., constant-time comparison for tokens)?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** No guidance to use `crypto.timingSafeEqual` (Node) or `subtle.timingSafeEqual`-equivalent constant-time comparisons exists, for either pack signatures (Q431), TURN credentials (audit 25), save-file MACs (audit 27), or future auth tokens. With no auth surface yet, the *risk* is latent; the *rule* must be written before the first credential check ships.

**Evidence:**
- No `crypto-rules.md` or "constant-time compare" rule in [docs/architecture/](../../architecture/)
- [docs/archive/readiness-audit/25-turn-credentials-and-signaling-server-abuse.md](25-turn-credentials-and-signaling-server-abuse.md), [docs/archive/readiness-audit/27-save-tampering-and-pack-signing.md](27-save-tampering-and-pack-signing.md) — adjacent surfaces

---

### Q: 434. Do failed AI generation errors echo the user's prompt back into a public log?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified.** The AI-generation pipeline produces a `CoherenceReport` and may store the prompt hash + provider id on `GeneratedFaction.notes` (audit 21/Q396), but **no rule constrains the *failure-path* logger** — provider errors, schema-validation failures, and balancing-loop rejections could all naturally include the original prompt in stack traces or warning lines, and no contract bans that. Combined with Q412 (no AI-gateway retention rule), a failed generation could be stored verbatim on a server log indefinitely.

**Evidence:**
- [docs/architecture/ai-generation-pipeline.md](../../architecture/ai-generation-pipeline.md) — pipeline shape, no error-redaction rule
- [content-schema/schemas/generated-faction.schema.json](../../../content-schema/schemas/generated-faction.schema.json) — `notes` carries `promptHash` only (intent is hashing, but enforcement is gateway-side)
- Q412 above

---

### Q: 435. Is there a centralized error-formatter that the rest of the code must route through, to prevent ad-hoc leak-prone messages?

**Status:** ❌ UNKNOWN

**Answer:**
**No centralized error-formatter is specified.** No `src/errors/` module, no `formatUserError(err)`/`formatDevError(err)` API, no required contract that UI/services route through a sanitizer, and no lint rule banning raw `err.message` / `err.stack` in user-visible sinks. Each screen's `interactions.md` says "show localized error text" but does not name a function or module that produces that text from a thrown `Error`. As a result, individual contributors will (by default) `toast(err.message)`, which is precisely the leak-prone pattern questions Q425, Q428, and Q434 are guarding against.

**Evidence:**
- No `src/errors/` directory specified in [docs/architecture/](../../architecture/) or in any task `Owned Paths`
- No "error-formatter" mention in [docs/architecture/state-flow.md](../../architecture/state-flow.md), [docs/architecture/overview.md](../../architecture/overview.md)
- [docs/architecture/wiki/screens/01-main-menu/interactions.md:38](../../architecture/wiki/screens/01-main-menu/interactions.md#L38) (boilerplate replicated across screens) — surfaces a localized string but does not constrain its source

---

## 🔍 Summary

### Missing Logic
- **No privacy policy artifact**, no version field, no in-app link. (Q410)
- **No retention TTL** on signaling-server transport logs, no scrub/hash rule for IPs in WebSocket / ICE-candidate flows. (Q411, Q413)
- **No retention or redaction rule** for the AI gateway (prompts, responses, error logs). (Q412, Q434)
- **No crash-report sink, schema, retention, or access-control roster.** (Q414)
- **No "delete my data" command** anywhere — neither client-side ("forget me", audit 21/Q401) nor server-side, and no auditable confirmation. (Q415, Q416)
- **No third-party processor disclosure**, no DPA checklist or vendor list. (Q417, Q419)
- **No compliance posture** (GDPR / CCPA / COPPA / LGPD / PIPEDA) declared in writing. (Q418)
- **No age gate / minor detection / parental-consent surface.** (Q420, audit 21/Q397)
- **No replay-export flow**, but if one ships, **no PII-redaction step** for `metadata.playerName` or `state.players.byId.*.displayName`. (Q421)
- **No telemetry/usage-metrics layer**, no opt-in default declared in writing. (Q422, Q423)
- **No signaling error vocabulary** (uniform "join failed" vs. distinguishable `ROOM_NOT_FOUND` / `ROOM_FULL` / `INVALID_CODE`). (Q424)
- **No production-vs-dev error stripping rule** and no source-map / stack-trace policy. (Q432)
- **No constant-time-compare rule** for any future credential, signature, or MAC check. (Q433)
- **No centralized error-formatter** and no lint banning raw `err.message`/`err.stack` in UI sinks. (Q435)
- **No save-import error UX** that distinguishes "user-grade fix advice" from "developer-grade schema dump." (Q428)
- **No HTTP status-code policy** (401/403/404 uniformity rule) for either service. (Q429)
- **No automatic-upload pipeline + redaction step** for any error log. (Q430)
- **No signature-error vocabulary** (closed enum) for pack signature failures. (Q431)
- **No "hidden-state taxonomy"** that would tell a desync-diagnostic builder which command parameters must be redacted before display. (Q427)
- **No peer-IP / ICE-address suppression rule** for connection-failure UI. (Q426)

### Risks
- **Server-default IP capture** (Q411, Q413): standard `ws` / Express deployments log client IPs and SDP/ICE payloads by default; without an explicit "logs are scrubbed/disabled" policy, the eventual deployment will silently retain identifying data.
- **AI-prompt leakage on failure** (Q412, Q434): a failed `GenerationProvider` call that re-throws the original prompt in its message will land in whatever observability layer the gateway uses; combined with no retention rule, prompts can persist for the platform default (often 30+ days).
- **Replay/save sharing leaks display names** (Q421, audit 21/Q405): `metadata.playerName` is cleartext and there is no consent gate on the (unspecified) sharing surface; *both* peers' display names travel together.
- **Room-code enumeration via distinguishable errors** (Q424, audit 18/Q303–Q305): a 30–36-symbol, 6-character keyspace + no rate limit + a `ROOM_FULL` vs. `ROOM_NOT_FOUND` distinction = the active set is enumerable in seconds.
- **Stack traces / file paths reaching the user** (Q425, Q432, Q435): no formatter, no production gate, no lint — the React unhandled-error path will surface raw stacks.
- **Signature key enumeration** (Q431, Q433): without a uniform `INVALID_SIGNATURE` and constant-time compare, a malicious pack can enumerate the keychain or distinguish "wrong-key" from "no-such-key."
- **Hidden-state leak in desync reports** (Q427): the last-10-commands payload can carry hero loadouts / spell choices / fog-of-war movement intentions; without a redaction policy, a desync becomes a one-shot intel leak in competitive play.
- **Unsanctioned compliance surface** (Q418, Q419, Q420): shipping AI-generated content + lobby chat + cross-region multiplayer triggers GDPR/CCPA/COPPA exposure; no DPA pipeline, no age gate, no data inventory means the legal team has nothing to review and no implementer has a checklist.
- **`localStorage`-token risk inheriting from no-policy** (audit 21/Q400, Q433): when an auth surface lands, the default ergonomic ("stash a JWT") will fight no rule.
- **Auto-bisect amplifies leakage** (Q427, task 05): bisect re-runs older command windows; *each* round of hash exchange materializes the same hidden-state-bearing commands.

### Improvements
1. **Author `docs/architecture/privacy.md`** as the single privacy/retention/error-leak source of truth, versioned. Link it from `01-main-menu` footer and `54-system-menu`. Co-locate `docs/architecture/data-inventory.md` (audit 21 alignment).
2. **Author `services/signaling/observability.md`** declaring: no IP/SDP/ICE persistence beyond in-memory connection lifetime; structured logs scrubbed of `req.ip` and `xff`; access logs disabled or short-TTL (e.g., ≤24h on the platform side); no sampling, no upload to third-party APM unless `services/signaling/processors.md` lists it.
3. **Author `services/ai-gateway/retention.md`** declaring: prompts logged only as `promptHash`; raw responses retained ≤24h for debugging then purged; no per-user identifiers persisted because no auth exists; failure-path logger uses a sanitizer that strips the prompt body.
4. **Define a closed signaling error vocabulary** in `tasks/phase-3/01-multiplayer/01-…`: a uniform `JOIN_FAILED` returned for any of {wrong code, full, expired, rate-limited}; reasons surfaced *only* to the room owner via a separately authenticated channel — never to the joiner.
5. **Define a closed pack-signature error vocabulary** in `pack-contract.md`: uniform `INVALID_SIGNATURE`; never echo `keyId`. Mandate `crypto.timingSafeEqual` for the value comparison and document it in a new `docs/architecture/crypto-rules.md` (Q433).
6. **Author `docs/architecture/error-formatter.md` + `src/errors/format.ts` contract.** All UI-bound errors must route through `formatUserError(err, locale)` which (a) emits a localization key, (b) strips `Error.stack`, (c) drops `Error.cause` chain by default, and (d) is the *only* call allowed in production. Add a CI lint banning raw `err.message`/`err.stack` in `src/ui/`.
7. **Add a build-mode rule** in `docs/architecture/production-build.md`: production bundles strip source maps from the artifact (host them privately if needed for crash mapping), set `NODE_ENV=production`, and remove `__DEV__` blocks. Audit 30 alignment.
8. **Define a desync-redaction taxonomy** in `command-schema.md`: each command field is tagged `public` / `hidden`; the desync-report builder copies only `public` fields verbatim and replaces `hidden` fields with a digest. Apply to tasks 04 + 05.
9. **Define a peer-failure UI contract** in screen `64-network-lobby`: peer IP / ICE address never appears in any user-visible string or local log; only an opaque `peerLabel` (display name) and a generic reason code.
10. **Add a `WIPE_LOCAL_DATA` command + erasure-receipt schema** (audit 21 alignment) in `54-system-menu`; document scope (saves, profile, options, chat, pending generation cache, future tokens) so audits 21 + 22 stay aligned.
11. **Add a `config.privacy.allowAnalytics` toggle (default `false`)** + matching `state.privacy.*` slice and a first-run "What we collect" disclosure modal. No analytics SDK loads until on (Q422, Q423).
12. **Author `docs/legal/processors.md`** — vendor list, DPA status, regional processing notes, and a "selection checklist" required before any new third-party can be added. Drives Q417/Q419.
13. **Add a `contentRating` field to `manifest.schema.json` and an `ageGate` to `config.player.*`** — wires Q420 + audit 21/Q397 + audit 20/Q385 together.
14. **Add a uniform HTTP error-code policy** in `services/*/error-codes.md`: 404 for both "not found" and "exists but forbidden"; 401 only on a missing/malformed token; 429 for rate-limit; 500 only on internal failure with no body that contains a `cause`.
15. **Specify "save/replay export sanitization"** in `docs/architecture/diagrams/24-save-flow.md`: an export builder that, when sharing crosses a peer/account boundary, replaces `metadata.playerName` with a hash + an opt-in cleartext field; a confirmation modal lists every PII field that will travel with the file.

### AI-Readiness
**Score: 1.0/10**

**Reason:** Of 26 questions, 22 resolve to ❌ UNKNOWN, 4 to ⚠ Partial, and 0 to fully ✔ Defined. The repo has *no* privacy artifact, *no* retention policy on either service stub, *no* compliance posture, *no* error-formatter contract, *no* production-vs-dev error policy, *no* uniform error vocabulary for signaling or signature flows, *no* automatic-upload/redaction pipeline, and *no* user-erasure pathway. The four "partials" are all because adjacent specs incidentally touch the surface: signaling retains *only* room→peer mappings in memory (Q411), the desync report has a documented payload (Q427), `metadata.playerName` is cleartext in the save format which would leak via any future replay share (Q421), and the AI / signaling stubs at least *exist* as files even if their bodies are README-only (Q417). An autonomous implementer asked to "implement privacy + retention + error-leak controls" would have to invent: a privacy policy, a data inventory, a retention TTL matrix per surface, a centralized error-formatter, a production-build error-stripping rule, a closed error vocabulary for signaling/signature/import paths, a desync-redaction taxonomy, a peer-IP suppression rule, an erasure command + receipt, a constant-time-compare rule, and a third-party processor list. That far exceeds the project's "schema-first, contract-first" rule and means **none of the controls in audit 22 can be implemented today without a prior architecture pass**. The strongest available footholds are (a) the existing `localization.schema.json` "error messages" slot (gives a natural binding point for a centralized formatter), (b) the closed `capabilities` enum + `signature` block in `manifest.schema.json` (gives the surface for a uniform signature-error vocabulary), and (c) the documented desync-report payload in tasks 04/05 (gives the natural insertion point for a redaction taxonomy).
