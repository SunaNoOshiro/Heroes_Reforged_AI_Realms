# 29. RATE LIMITING & SECRET MANAGEMENT

### Q: 593. Is there a documented rate-limit policy per endpoint (signaling, AI gateway, telemetry, crash report)?

**Status:** ❌ UNKNOWN

**Answer:**
**No per-endpoint rate-limit policy is committed.**
- **Signaling**: confirmed missing — see [docs/readiness-audit/25-turn-credentials-and-signaling-server-abuse.md](25-turn-credentials-and-signaling-server-abuse.md) Q500 ("No rate limiting of any kind is documented") and Q504. The signaling task only sets a "100 concurrent rooms" memory ceiling, not a request rate.
- **AI gateway**: [services/ai-gateway/README.md](../../services/ai-gateway/README.md) names "rate limiting or policy enforcement is centralized" as a *use case*, but commits no buckets, thresholds, or per-route policy. The gateway itself is a 14-line README stub with no implementation.
- **Telemetry**: no telemetry endpoint is documented anywhere in [docs/architecture/](../architecture/) or [tasks/](../../tasks/).
- **Crash report**: no crash-report endpoint, schema, or upload contract exists.

**Evidence:**
- [services/ai-gateway/README.md](../../services/ai-gateway/README.md) (use case named, policy not defined)
- [services/signaling/README.md](../../services/signaling/README.md) (6-line stub)
- [docs/readiness-audit/25-turn-credentials-and-signaling-server-abuse.md](25-turn-credentials-and-signaling-server-abuse.md) Q500, Q504
- No `telemetry/` or `crash-report/` artifact in repo

---

### Q: 594. Are rate limits tiered (per IP, per session, per account, global) to defeat single-vector evasion?

**Status:** ❌ UNKNOWN

**Answer:**
**No tiered policy exists** — and the prerequisite "account / session" axes do not exist either. [docs/readiness-audit/24-tls-enforcement-and-webrtc-authentication.md](24-tls-enforcement-and-webrtc-authentication.md) Q475, Q485 confirm there is no peer identity, no account, and no session token. With only IP available as a throttle key, behind CG-NAT or IPv6 /64 a single attacker can present unlimited identities. Cross-ref Q501 of audit 25.

**Evidence:**
- [docs/readiness-audit/24-tls-enforcement-and-webrtc-authentication.md](24-tls-enforcement-and-webrtc-authentication.md) Q475, Q485
- [docs/readiness-audit/25-turn-credentials-and-signaling-server-abuse.md](25-turn-credentials-and-signaling-server-abuse.md) Q501

---

### Q: 595. Are rate limits enforced at the edge (CDN/WAF) before reaching application code?

**Status:** ❌ UNKNOWN

**Answer:**
**No edge / CDN / WAF contract is committed.** The named hosting providers (Fly.io / Railway, per [docs/readiness-audit/24-tls-enforcement-and-webrtc-authentication.md](24-tls-enforcement-and-webrtc-authentication.md) Q461) provide some default DDoS protection, but no project-level WAF rule, no Cloudflare / fly-proxy rate-limit config, and no reverse-proxy contract exists. Cross-ref [docs/readiness-audit/25-turn-credentials-and-signaling-server-abuse.md](25-turn-credentials-and-signaling-server-abuse.md) Q508.

**Evidence:**
- [docs/readiness-audit/24-tls-enforcement-and-webrtc-authentication.md](24-tls-enforcement-and-webrtc-authentication.md) Q461
- [docs/readiness-audit/25-turn-credentials-and-signaling-server-abuse.md](25-turn-credentials-and-signaling-server-abuse.md) Q508

---

### Q: 596. Are rate-limit responses distinguishable from genuine errors but not so distinguishable they help an attacker calibrate?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. There is no canonical error envelope (no `429 Too Many Requests`, no `RATE_LIMITED` signaling message, no rate-limit error code in the AI-gateway README), and no oracle-resistance discussion. Without a rate limiter (Q593), there is no response shape to harden.

**Evidence:**
- See Q593. No `error.schema.json`, no rate-limit code in any task or schema.
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) (no error envelope)

---

### Q: 597. Is there exponential backoff guidance returned to clients (`Retry-After` header)?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No `Retry-After` header, no `retry_after_ms` field in any signaling message, and no client-side backoff library or strategy is documented. The AI generation pipeline ([docs/architecture/ai-generation-pipeline.md](../architecture/ai-generation-pipeline.md) line 73) says "vendor-specific retry, token accounting, or rate-limiting lives here and must not leak into later stages" — but the *contract surface* the client sees has no documented retry guidance.

**Evidence:**
- [docs/architecture/ai-generation-pipeline.md](../architecture/ai-generation-pipeline.md) (vendor retries hidden; no client guidance)
- [services/ai-gateway/README.md](../../services/ai-gateway/README.md) (no response shape)

---

### Q: 598. Are AI generation requests rate-limited per user AND per content category to prevent cost-exhaustion?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. There is no "user" axis (no account model — Q594), no per-category bucket (faction vs. asset vs. moderation), and no per-request cost accounting. [tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md](../../tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md) defines hard caps on **generated values** (HP ≤ 500, ATK ≤ 50, abilities ≤ 5) but not on **call rate** or **provider spend**. The gateway README mentions rate limiting as a use case without committing limits.

**Evidence:**
- [tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md](../../tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md) (content caps, not request caps)
- [services/ai-gateway/README.md](../../services/ai-gateway/README.md)
- [docs/architecture/ai-integration.md](../architecture/ai-integration.md) (provider-neutral; no quota schema)

---

### Q: 599. Is there a hard daily/weekly cap on AI generation per account to bound provider cost in worst case?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No per-account daily/weekly cap, no provider-spend ceiling, no kill-switch on cost overrun, and no "account" axis to bind a cap to (Q594). The repo's exit criterion for generation ("3 minutes per faction" — [tasks/phase-3/02-ai-generation.md](../../tasks/phase-3/02-ai-generation.md) line 10) is a latency target, not a cost ceiling.

**Evidence:**
- [tasks/phase-3/02-ai-generation.md](../../tasks/phase-3/02-ai-generation.md) (latency target only)
- No `quota.schema.json` or `cost-ceiling.json` in repo

---

### Q: 600. Are room-creation rates limited to prevent lobby-spam griefing of public lobby browser?

**Status:** ✔ Defined (N/A by omission)

**Answer:**
**No public lobby browser exists** ([docs/readiness-audit/18-room-codes-and-lobby-discovery.md](18-room-codes-and-lobby-discovery.md) Q321: "strictly invite-by-code"), so the "lobby-spam griefing of the browser" vector does not exist. **However**, room creation itself is **not rate-limited** — see [docs/readiness-audit/25-turn-credentials-and-signaling-server-abuse.md](25-turn-credentials-and-signaling-server-abuse.md) Q500, Q502. A scripted attacker can still occupy all 100 global slots and DoS legitimate creation; the absence of a *browser* removes the *advertising* surface but not the *resource-exhaustion* surface.

**Evidence:**
- [docs/readiness-audit/18-room-codes-and-lobby-discovery.md](18-room-codes-and-lobby-discovery.md) Q310–Q312, Q321
- [docs/readiness-audit/25-turn-credentials-and-signaling-server-abuse.md](25-turn-credentials-and-signaling-server-abuse.md) Q500, Q502

---

### Q: 601. Are commands-per-second limited at the data-channel level to prevent peer flooding?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. The deterministic command bus ([docs/architecture/command-schema.md](../architecture/command-schema.md), [docs/architecture/state-flow.md](../architecture/state-flow.md)) defines *what* messages are exchanged, not *how many per second* a peer may send. The WebRTC DataChannel task ([tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md)) defines no per-channel cps cap, no token bucket, and no peer-flood detection. A malicious peer can drown the local reducer until UI freezes; cross-ref [docs/readiness-audit/26-replay-tampering-and-simulation-cheating.md](26-replay-tampering-and-simulation-cheating.md) for adjacent integrity gaps.

**Evidence:**
- [tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md) (no cps cap)
- [docs/architecture/state-flow.md](../architecture/state-flow.md) (no rate contract)

---

### Q: 602. Are chat messages rate-limited per peer, with exponential mute on sustained violation?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. [docs/readiness-audit/19-chat-safety-and-user-reporting.md](19-chat-safety-and-user-reporting.md) covers chat at policy level; no per-peer cps, no escalating mute (10s → 1m → 5m → permanent), and no "exponential" backoff schedule is committed. The chat surface itself ([docs/architecture/wiki/screens/](../architecture/wiki/screens/)) does not list a chat panel as a screen package — chat is referenced but not specified.

**Evidence:**
- [docs/readiness-audit/19-chat-safety-and-user-reporting.md](19-chat-safety-and-user-reporting.md)
- No `chat.schema.json`, no `mute.schema.json`, no chat screen package

---

### Q: 603. Are crash-report uploads rate-limited per device fingerprint?

**Status:** ❌ UNKNOWN

**Answer:**
**No crash-report system is documented at all.** No upload endpoint, no `crashReport.schema.json`, no device fingerprint scheme (and fingerprinting carries its own privacy implications — see [docs/readiness-audit/22-privacy-retention-and-error-leaks.md](22-privacy-retention-and-error-leaks.md)). Without an endpoint, there is nothing to rate-limit.

**Evidence:**
- No crash-report task in `tasks/`
- No `services/crash-report/`
- [docs/readiness-audit/22-privacy-retention-and-error-leaks.md](22-privacy-retention-and-error-leaks.md)

---

### Q: 604. Are rate-limit counters resilient to clock-skew and instance failover?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. Without a rate limiter (Q593), there is no counter to make resilient. No Redis / shared-state contract is committed for the signaling server — its in-memory state is single-instance ("100 concurrent rooms" lives in one process), so even a basic per-IP counter would reset on every restart and double-count behind multiple instances. No NTP / monotonic-clock / Lamport-clock guidance is given.

**Evidence:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) (single-instance, in-memory only)
- No shared counter store named in any task

---

### Q: 605. Is there alerting when a single client crosses elevated rate-limit thresholds (anomaly detection)?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No alerting pipeline (PagerDuty / Slack / email), no anomaly-detection heuristic, no per-client trend window, and no "elevated threshold" definition. Cross-ref [docs/readiness-audit/31-trust-boundaries-and-logging-monitoring.md](31-trust-boundaries-and-logging-monitoring.md) — the broader monitoring contract is also unspecified.

**Evidence:**
- See Q593. No `alerting.md`, no SLO doc, no on-call runbook in repo.
- [docs/readiness-audit/31-trust-boundaries-and-logging-monitoring.md](31-trust-boundaries-and-logging-monitoring.md)

---

### Q: 606. Where are AI provider API keys stored — only on the AI gateway server, never in the client bundle?

**Status:** ⚠ Partial

**Answer:**
**The rule is written; the storage location is not.** [docs/architecture/ai-integration.md](../architecture/ai-integration.md) line 28 commits "Browser code must not require raw provider API keys" and line 22 names the gateway as the boundary "when secrets … should not live in the browser." So the client-side prohibition is explicit. **However**, no doc says **where on the gateway** keys are stored: env var, KMS, secret manager, file, etc. is not chosen. The gateway README is 14 lines and mentions secrets only in a use-case sentence. There is no code in `src/ai/providers/` yet, so storage is *fully open*.

**Evidence:**
- [docs/architecture/ai-integration.md](../architecture/ai-integration.md) lines 22, 28, 48 (client-side prohibition)
- [services/ai-gateway/README.md](../../services/ai-gateway/README.md) (14 lines, no storage spec)
- See Q608 (storage mechanism unspecified)

---

### Q: 607. Where are TURN shared secrets stored, and how does the credential-issuer access them at runtime?

**Status:** ❌ UNKNOWN

**Answer:**
**Not specified — no TURN deployment exists.** See [docs/readiness-audit/25-turn-credentials-and-signaling-server-abuse.md](25-turn-credentials-and-signaling-server-abuse.md) Q488–Q493: no TURN provider, no credential model, no shared-secret store, no issuer, no rotation runbook. The credential-issuer doesn't exist, so its access path doesn't exist.

**Evidence:**
- [docs/readiness-audit/25-turn-credentials-and-signaling-server-abuse.md](25-turn-credentials-and-signaling-server-abuse.md) Q488, Q489, Q493
- [services/signaling/README.md](../../services/signaling/README.md) (6 lines; no auth-service stub)

---

### Q: 608. Are secrets injected via environment variables, KMS, secret manager, or files, and is the choice documented per environment?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No environment-injection contract, no KMS choice (AWS KMS / GCP KMS / HashiCorp Vault / Doppler / 1Password Secrets), no per-env (`dev` / `staging` / `prod`) variation, and no `.env.example` template is committed at the repo root. The closest doc is the AI integration boundary which acknowledges secrets *exist* somewhere on the backend but does not name the mechanism.

**Evidence:**
- No `.env.example` in repo root
- No `docs/operations/secrets.md`
- [services/ai-gateway/README.md](../../services/ai-gateway/README.md), [services/signaling/README.md](../../services/signaling/README.md) (both stubs)

---

### Q: 609. Are secrets ever logged, included in error messages, or echoed in responses?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified — and no logging contract exists to enforce against. Cross-ref [docs/readiness-audit/22-privacy-retention-and-error-leaks.md](22-privacy-retention-and-error-leaks.md) and [docs/readiness-audit/31-trust-boundaries-and-logging-monitoring.md](31-trust-boundaries-and-logging-monitoring.md). Without a "no secrets in logs / errors / responses" gate (e.g., redacting middleware, lint rule against `console.log(process.env)`), the *de facto* policy is "trust the implementer."

**Evidence:**
- See Q593, Q608
- No `redact.ts`, no log-middleware contract, no error-envelope schema

---

### Q: 610. Are secrets rotated on a schedule, and is the rotation runbook tested?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No rotation cadence (7 d / 30 d / 90 d), no runbook in `docs/operations/`, no automated rotation job, and no rotation-drill acceptance criterion. Cross-ref [docs/readiness-audit/25-turn-credentials-and-signaling-server-abuse.md](25-turn-credentials-and-signaling-server-abuse.md) Q493 — TURN-secret rotation is also undefined.

**Evidence:**
- [docs/readiness-audit/25-turn-credentials-and-signaling-server-abuse.md](25-turn-credentials-and-signaling-server-abuse.md) Q493
- No rotation policy file in repo

---

### Q: 611. Are secrets scoped to least privilege (read-only vs. read-write, per-environment)?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No IAM / role / permission model is committed. No "AI gateway has read-only access to provider keys, signaling has no provider access" matrix. With provider keys typically being single tokens (not capability-scoped), this also depends on the provider's ACL surface — no provider-side scoping rule is documented.

**Evidence:**
- See Q608
- No `iam.md` / `permissions.md` in repo

---

### Q: 612. Are secrets scanned for in commits (pre-commit hook, CI scan with gitleaks/trufflehog)?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No `.gitleaks.toml` / `.trufflehog.yml` / pre-commit hook in repo. The `.gitignore` excludes `.env` only by convention via `node_modules/` / `dist/` (it does **not** explicitly list `.env` — see Q617). Cross-ref [docs/readiness-audit/30-dependencies-and-build-pipeline.md](30-dependencies-and-build-pipeline.md) Q641, Q643 (CI secret-scan and pre-commit enforcement also un-answered).

**Evidence:**
- `/Users/suna_no_oshiro/Documents/fun-gpt/Heroes_Reforged_AI_Realms/.gitignore` (no `.env` line, no `*.pem`, no `*.key`)
- No `.husky/pre-commit`, no `.github/workflows/secret-scan.yml`
- [docs/readiness-audit/30-dependencies-and-build-pipeline.md](30-dependencies-and-build-pipeline.md)

---

### Q: 613. Are leaked secrets handled with a runbook (rotate, revoke, audit)?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No incident-response runbook, no "leaked-secret playbook" (`SECURITY.md` / `INCIDENT.md`), no audit-log requirement, and no on-call rotation. Without scanning (Q612), leaks would also not be detected in the first place.

**Evidence:**
- No `SECURITY.md` in repo root
- No `docs/operations/incident-response.md`

---

### Q: 614. Are signing keys for packs stored offline or in an HSM, separated from runtime services?

**Status:** ⚠ Partial

**Answer:**
**Verification side is committed; storage side is not.** [tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md](../../tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md) commits Ed25519 verification with the **public key hardcoded in the engine** ("Official public key (hardcoded in the engine)"). [tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md](../../tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md) commits "every official pack carries … official signature metadata" but **does not say where the private signing key lives**: HSM, YubiKey, offline air-gapped machine, encrypted file, KMS-managed key, etc. is not chosen. The signing *operation* is also not described as a separate process, so a runtime service could in principle read the same key.

**Evidence:**
- [tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md](../../tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md) (verification only; public key hardcoded)
- [tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md](../../tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md) (no private-key storage spec)
- [docs/readiness-audit/27-save-tampering-and-pack-signing.md](27-save-tampering-and-pack-signing.md)

---

### Q: 615. Are local development secrets distinct from production secrets to prevent accidental cross-use?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No "dev keys must be created with `dev-` prefix and capped to a sandbox account / org," no CI enforcement that prod secrets are never echoed to local `.env`, and no separate provider-account guidance. With no environment-variable contract (Q608), there is no environment to differentiate.

**Evidence:**
- See Q608
- No `.env.development` / `.env.production` template

---

### Q: 616. Are secrets required for build-time excluded from the shipped artifact?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No build-time-secret list (e.g., source-map upload tokens, telemetry write-keys), no `vite define` / `webpack DefinePlugin` audit, and no rule that build-only secrets must not appear in the bundle. The repo has no client build configured yet (no `vite.config.ts` / `webpack.config.js` committed at the time of this audit), so this is *de facto* open.

**Evidence:**
- No build config in repo root
- No `docs/build/secrets.md`

---

### Q: 617. Is `.env` excluded from the bundle, dist artifacts, and source archives?

**Status:** ⚠ Partial

**Answer:**
**Indirectly — and incompletely.** Repo `.gitignore` excludes `node_modules/`, `dist/`, `coverage/`, `.DS_Store`, `*.tsbuildinfo`, `*.crdownload` — it does **not** explicitly list `.env`, `.env.*`, `*.pem`, `*.key`, `secrets.json`, or any other typical secret pattern. A developer who creates a `.env` at repo root would have it untracked only if they remember to add it to `.gitignore` themselves. There is no bundler-side exclusion documented (Vite / Webpack `DefinePlugin` discipline) and no source-archive exclusion (`npm pack` ignore list).

**Evidence:**
- `/Users/suna_no_oshiro/Documents/fun-gpt/Heroes_Reforged_AI_Realms/.gitignore` (5 patterns; no `.env`)
- No `.npmignore` / `files` field in repo `package.json` audit
- No `docs/operations/secrets.md`

---

### Q: 618. Are debug and verbose-logging modes gated so they cannot be enabled in production via env vars an attacker controls?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No "DEBUG flag is build-time, not runtime," no "verbose logs allowed only when `NODE_ENV !== 'production'`," no protection against an attacker setting `?debug=1` query string or injecting `localStorage.debug = '*'`. The closest reference is the renderer doc citing "harder to debug determinism" as a concern for higher-level frameworks ([docs/architecture/renderer-technology-choice.md](../architecture/renderer-technology-choice.md) line 26), but no debug-flag gating policy is committed. Cross-ref [docs/readiness-audit/22-privacy-retention-and-error-leaks.md](22-privacy-retention-and-error-leaks.md) — verbose logs in production also widen PII leakage.

**Evidence:**
- No `debug-flags.md` in repo
- [docs/readiness-audit/22-privacy-retention-and-error-leaks.md](22-privacy-retention-and-error-leaks.md)
- [docs/readiness-audit/31-trust-boundaries-and-logging-monitoring.md](31-trust-boundaries-and-logging-monitoring.md)

---

## 🔍 Summary

### Missing Logic
- **End-to-end rate-limit policy matrix** — no per-endpoint policy for signaling, AI gateway, telemetry, or crash report; no tiered (IP / session / account / global) buckets; no edge-tier (CDN / WAF) enforcement (Q593–Q595, Q598).
- **Rate-limit response contract** — no canonical `429` / `RATE_LIMITED` envelope, no `Retry-After`, no oracle-resistant error shape (Q596, Q597).
- **AI cost ceiling** — no per-user / per-category bucket, no daily/weekly cap, no provider-spend kill-switch (Q598, Q599).
- **DataChannel and chat throttling** — no per-peer cps cap, no escalating chat mute, no peer-flood detection (Q601, Q602).
- **Crash-report system** — does not exist at all (no endpoint, no schema, no rate limit, no fingerprint discussion) (Q603).
- **Counter resilience** — no shared store (Redis / DB) for rate counters; no clock-skew / failover guidance (Q604).
- **Anomaly-detection alerting** — no SLO, no PagerDuty / Slack channel, no per-client elevated-threshold definition (Q605).
- **Secret storage & injection mechanism** — no env-var / KMS / secret-manager choice, no per-env variation, no `.env.example` (Q606, Q607, Q608).
- **TURN secret store** — no shared-secret store, no issuer, no rotation runbook (Q607, Q610).
- **Log-redaction contract** — no rule against secrets in logs / errors / responses; no redacting middleware (Q609).
- **Rotation cadence and drills** — no schedule, no runbook, no drill acceptance criterion (Q610).
- **Least-privilege scoping** — no IAM / capability matrix per environment (Q611).
- **Pre-commit / CI secret scanning** — no gitleaks / trufflehog config; `.gitignore` does not exclude `.env` / `*.pem` / `*.key` (Q612, Q617).
- **Leak-response runbook** — no `SECURITY.md`, no incident playbook, no audit-log requirement (Q613).
- **Pack-signing private-key storage** — verification is defined; private-key storage (HSM / offline / air-gapped) and signing-process separation are not (Q614).
- **Dev-vs-prod secret separation** — no rule, no per-env templates (Q615).
- **Build-time secret hygiene** — no audit of bundler `define` / source-map tokens / telemetry write-keys (Q616).
- **Debug-flag gating** — no rule preventing runtime / attacker-controlled enablement of verbose logs in production (Q618).

### Risks
- **Cost-exhaustion via AI**. With no per-user, per-category, or daily/weekly cap on `GenerationProvider.generateStructured`, a single attacker (or a buggy retry loop) can drain the project's provider budget within an hour (Q598, Q599).
- **DoS on signaling and (future) TURN**. Ratifies the larger gap surfaced in audit 25 — no rate limiter + no edge filter + 100-room global ceiling = trivial DoS. Adding TURN naïvely without secret rotation (Q607, Q610) compounds it into open-relay bandwidth abuse (Q593, Q594, Q604).
- **Bundle leak of provider keys**. The "no provider keys in browser" rule is written ([ai-integration.md](../architecture/ai-integration.md)), but with no `.env` exclusion (Q617) and no scanner (Q612), a developer copy-paste will commit a key on the first day of provider integration.
- **Secret-in-logs leak**. Without a redaction contract (Q609) and without log policy at all ([31-trust-boundaries-and-logging-monitoring.md](31-trust-boundaries-and-logging-monitoring.md)), the first `console.error(err)` that includes an `Authorization` header will end up in hosting-provider logs.
- **Pack-signing key compromise**. The Ed25519 *public* key is hardcoded into the engine (correct), but the *private* key has no documented home — a developer-laptop `.pem` is the implementer default. Compromise here lets an attacker forge an "official" pack and bypass the sandbox flag, defeating the entire mod-trust model ([27-save-tampering-and-pack-signing.md](27-save-tampering-and-pack-signing.md), Q614).
- **No rotation = permanent compromise**. Without rotation (Q610) and without a leak runbook (Q613), a single leak forces a coordinated client redeploy or stays exploitable indefinitely.
- **Debug-flag attack surface**. Without gating (Q618), an attacker who can set `localStorage.debug = '*'` or `?debug=1` exposes verbose internal state (state hashes, command logs, peer IDs) — both privacy leak and reverse-engineering aid.
- **No telemetry / crash report = blind ops**. The flip side of "no crash-report system" is positive for privacy (less PII on the wire) but operationally blind: no anomaly detection, no spend dashboards, no DoS visibility (Q603, Q605).

### Improvements
- **Adopt a secrets-management contract**. Commit `docs/operations/secrets.md` defining: env-var injection at runtime, secret manager (e.g., Doppler / AWS Secrets Manager / GCP Secret Manager) as source of truth, `.env.example` at repo root, per-env (dev / staging / prod) prefixed key names, rotation cadence (provider keys ≤ 30 d, TURN secrets ≤ 7 d, signing keys ≤ 1 y or compromise-triggered).
- **Rate-limit matrix**. Publish `docs/operations/rate-limits.md` with a per-endpoint table:
  - signaling `CREATE_ROOM`: 5/min/IP, burst 10; global 50/min
  - signaling `JOIN_ROOM`: 10/min/IP; per-code: 5 wrong joins/min → temporary lock
  - signaling per-conn message rate: 60 msg/min
  - AI gateway `generateStructured`: 5/h/account (no account → 5/h/IP), per-day 20, per-week 100; hard cost ceiling per project per day (USD)
  - DataChannel: 30 cps per peer (token bucket); chat: 1 msg/2 s, escalating mute 10s → 1m → 5m → 1h → permanent
- **Edge enforcement**. Place signaling + gateway behind Cloudflare (or fly-proxy WAF) with per-IP CONNECT rate limit, SDP/payload size cap, and a small managed challenge under load. Document the WAF rule set in `docs/operations/edge.md`.
- **Standard error envelope**. Define `{ "error": "RATE_LIMITED", "retryAfterMs": <n>, "scope": "ip" | "session" }` for both HTTP (`429` + `Retry-After`) and signaling messages; add to `content-schema/`. Make scope coarse enough that an attacker cannot calibrate exact buckets.
- **Cost guardrails for AI generation**. Add a `costBudget` field to `GenerationRequest`; the orchestrator rejects when remaining daily/weekly budget < estimated request cost. Wire a kill-switch ENV (`AI_GATEWAY_DISABLED=1`) that returns "service paused for cost control" without leaking detail.
- **Crash-report system (optional, opt-in)**. If introduced, require: opt-in toggle, no PII in payload (state-hash + stack trace + redacted command tail), per-device-fingerprint cap (not raw fingerprint stored — hash + bucket), gateway-side per-IP rate limit, and 30-day retention max.
- **Counter durability**. When rate counters are introduced, back them with Redis (or per-IP signed cookie carrying a token-bucket state) to survive restarts and multi-instance failover; document NTP requirement.
- **Anomaly alerts**. Define SLOs (signaling 99 % `<200 ms` ack, AI gateway 95 % `<10 s`); page on rate-limit-exceeded count > N/min, on `5xx` rate > 1 %, on per-IP elevated burst > 10× baseline.
- **`.gitignore` hardening**. Add `.env`, `.env.*`, `*.pem`, `*.key`, `*.p12`, `secrets.json`, `id_ed25519*`, `id_rsa*`. Add `.gitleaks.toml` with default ruleset and run it both as a pre-commit hook and in CI on every PR.
- **`SECURITY.md` and incident runbook**. Add: how to report (security@…), severity matrix, leaked-secret playbook (rotate → revoke at provider → audit log → post-mortem in 7 d), and signing-key compromise procedure (engine-bundled public-key replacement requires a client release; this elevates urgency).
- **Pack-signing key handling**. Commit that the official Ed25519 *private* key is generated and stored on a YubiKey (or HSM-equivalent), never copied to disk, never reachable from CI; signing is performed in a one-shot script invoked by a release manager. Add an annual rotation drill that ships a new public key in a regular client release alongside the new private key on hardware.
- **Debug-flag gating**. Compile-time flag (`__DEV__`) folded by the bundler; no runtime mechanism (no `?debug=1`, no `localStorage`-driven verbose mode in production builds). Add a build-output check that `console.debug` and verbose loggers are tree-shaken from production bundles.
- **Build-time secret audit**. CI step: bundle production build, grep for known secret patterns (`sk-`, `Bearer`, `-----BEGIN`); fail PR if matched.
- **Dev-vs-prod separation**. Provider accounts split: a "dev" provider org / API key with hard $/month cap; a "prod" key only writable by the deploy pipeline. Document the rule "no prod key on a developer machine, ever."

### AI-Readiness
Score: **1/10**

Reason: Of 26 questions, **0** are fully defined. **3** (Q600 N/A by lobby omission, Q606 partial via the explicit "no keys in browser" rule, Q614 partial via verification-side Ed25519, Q617 partial via the under-spec `.gitignore`) are partial. The remaining ~22 are ❌ UNKNOWN. The repo today commits *the boundary* (provider-neutral AI interfaces, gateway as the secrets boundary, sandbox flag for AI packs, Ed25519 verification) but **none of the operational machinery** that would make those boundaries safe in production: no rate limits, no cost ceiling, no secret store, no rotation, no scanning, no `SECURITY.md`, no debug-flag discipline, no crash-report system, no telemetry, no signing-key custody. An AI implementer following the current spec would ship an AI gateway with the provider key in `process.env` on a single Fly machine, no rate limit, no cost cap, and a `.gitignore` that does not even exclude `.env` — a single bad day burns the provider budget and leaks the key. Closing the **Improvements** list (`docs/operations/secrets.md`, `docs/operations/rate-limits.md`, `SECURITY.md`, `.gitleaks.toml`, hardware-stored signing key, cost ceiling on `GenerationProvider`) lifts this to 7–8/10.
