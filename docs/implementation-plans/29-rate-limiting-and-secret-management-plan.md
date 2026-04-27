# Implementation Plan: 29 — Rate Limiting & Secret Management

> Source audit: [docs/readiness-audit/29-rate-limiting-and-secret-management.md](../readiness-audit/29-rate-limiting-and-secret-management.md)
> Audit AI-Readiness score at time of writing: **1 / 10** — target after this plan: **8 / 10**.
> The original audit file is **not** modified. This plan converts every
> ❌ UNKNOWN, ⚠ Partial, Missing-Logic, and Risk item from Q593–Q618 into
> concrete, executable work items grounded in existing artifacts:
> [`services/ai-gateway/README.md`](../../services/ai-gateway/README.md),
> [`services/signaling/README.md`](../../services/signaling/README.md),
> [`tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md),
> [`tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md`](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md),
> [`tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md`](../../tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md),
> [`tasks/phase-3/02-ai-generation/01-prompt-provider-structured-output-raw-json.md`](../../tasks/phase-3/02-ai-generation/01-prompt-provider-structured-output-raw-json.md),
> [`tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md`](../../tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md),
> [`tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md`](../../tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md),
> [`docs/architecture/ai-integration.md`](../architecture/ai-integration.md),
> [`docs/architecture/ai-generation-pipeline.md`](../architecture/ai-generation-pipeline.md),
> [`docs/architecture/schema-matrix.md`](../architecture/schema-matrix.md),
> [`.gitignore`](../../.gitignore),
> and adjacent plans **22** (privacy / retention / error leaks),
> **24** (TLS / WSS + WebRTC auth), **25** (TURN + signaling abuse),
> **27** (save tampering & pack signing), **30** (dependencies & build
> pipeline), **31** (trust boundaries / logging / monitoring).

---

## 1. Overview

Audit 29 evaluated 26 questions across two themes — **rate limiting**
(Q593–Q605) and **secret management** (Q606–Q618). **Of the 26, only
Q600 (✔ N/A by lobby omission) is fully resolved; Q606, Q614, and
Q617 are ⚠ Partial; the remaining 22 are ❌ UNKNOWN.**

The repository today commits a handful of *boundaries*:

- the AI gateway exists as the secrets-holding edge for provider keys
  ([`docs/architecture/ai-integration.md`](../architecture/ai-integration.md)
  lines 22, 28, 48 — "browser code must not require raw provider API
  keys");
- generated-content **values** are hard-capped (HP ≤ 500, ATK ≤ 50,
  abilities ≤ 5 — [`tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md`](../../tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md));
- the Ed25519 *public* key is hardcoded into the engine for pack
  verification ([`tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md`](../../tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md));
- a global "100 concurrent rooms" memory ceiling is named for the
  signaling server.

…but says **nothing** about:

1. **Per-endpoint rate-limit policy** for the AI gateway, telemetry,
   crash report, or signaling action mix beyond the 100-room ceiling
   (Q593, Q598, Q599).
2. **Tiered limits** (per-IP / per-IP-prefix / per-session / per-account
   / global) — the prerequisite session/account axes also do not exist
   (Q594).
3. **Edge-tier enforcement** (CDN / WAF / fly-proxy / Cloudflare rate
   rules) (Q595).
4. **Standard rate-limit response envelope** — no `429`, no
   `Retry-After`, no `RATE_LIMITED` signaling code, no oracle-resistant
   shape (Q596, Q597).
5. **AI generation cost ceiling** — no per-user / per-category bucket,
   no daily/weekly cap, no provider-spend kill-switch (Q598, Q599).
6. **DataChannel cps cap and chat throttling** with escalating mute
   (Q601, Q602).
7. **Crash-report system** — no endpoint, no schema, no fingerprint
   discussion (Q603).
8. **Counter durability** — no Redis / shared store, no clock-skew
   guidance, no failover semantics (Q604).
9. **Anomaly alerting** — no SLO, no PagerDuty / Slack channel, no
   per-client elevated-threshold definition (Q605).
10. **Secret storage and injection mechanism** — no env-var / KMS /
    secret-manager choice, no per-env variation, no `.env.example`
    (Q606, Q608, Q615).
11. **TURN shared-secret store and issuer** (Q607) — defers to
    [Plan 25](./25-turn-credentials-and-signaling-server-abuse-plan.md);
    this plan re-cites and adds the *secret-side* contract.
12. **Log redaction contract** — no rule against secrets in logs /
    errors / responses (Q609).
13. **Rotation cadence and drills** (Q610).
14. **Least-privilege scoping** per environment (Q611).
15. **Pre-commit / CI secret scanning** — no `.gitleaks.toml`, no
    pre-commit hook, and `.gitignore` does not list `.env` / `*.pem` /
    `*.key` (Q612, Q617).
16. **Leak-response runbook** — no `SECURITY.md`, no incident playbook
    (Q613).
17. **Pack-signing private-key custody** — verification is committed,
    private-key storage (HSM / YubiKey / offline) is not (Q614).
18. **Dev-vs-prod secret separation** (Q615).
19. **Build-time secret hygiene** — no bundler-define audit, no
    source-map token list (Q616).
20. **Debug-flag gating** — no rule preventing runtime / attacker-
    controlled enablement of verbose logs in production (Q618).

A naive autonomous implementer following the current spec would ship
an AI gateway with the provider key in `process.env` on a single Fly
machine, no rate limit, no cost cap, and a `.gitignore` that does not
even exclude `.env` — a single bad day burns the provider budget and
leaks the key. This plan formalizes:

1. A **canonical rate-limit doctrine**
   (`docs/operations/rate-limits.md`) — per-endpoint matrix covering
   AI gateway, telemetry, crash report, datachannel, chat; tiered
   keys (IP, IP-prefix, session, account, global); edge-tier
   responsibility; oracle-resistant response shape.
2. A **canonical error envelope schema**
   (`content-schema/schemas/error-envelope.schema.json`) — discriminated
   `{ error: "RATE_LIMITED" | …, retryAfterMs, scope: "ip" | "session"
   | "account" | "global" }`; HTTP `429` + `Retry-After` mapping;
   signaling `ERROR` / `RATE_LIMITED` frames.
3. A **canonical AI-cost-budget contract**
   (`content-schema/schemas/cost-budget.schema.json` and an extension
   to `generation-request.schema.json`) — per-request `costBudget`,
   server-side per-account daily/weekly ledger, provider-spend
   kill-switch ENV.
4. A **canonical secrets doctrine**
   (`docs/operations/secrets.md`) — secret-manager source-of-truth,
   env-var injection at runtime, per-env (`dev` / `staging` / `prod`)
   prefixed names, rotation cadence, leak playbook, dev-vs-prod
   separation, `.env.example` at repo root.
5. A **`.gitignore` and CI secret-scanning** hardening pass — explicit
   `.env*`, `*.pem`, `*.key`, `*.p12`, `secrets.json`, `id_ed25519*`,
   `id_rsa*` patterns; `.gitleaks.toml`; pre-commit hook; CI workflow.
6. A **`SECURITY.md` and incident-response runbook** — disclosure
   inbox, severity matrix, leaked-secret playbook (rotate → revoke →
   audit → post-mortem in 7 d), signing-key compromise procedure.
7. A **DataChannel and chat throttling task** — per-peer token bucket
   on outbound commands; chat 1 msg / 2 s with escalating mute
   `10s → 1m → 5m → 1h → permanent`.
8. A **crash-report opt-in contract** — explicit *deferred* decision
   today (no system shipped), with the schema and rate-limit shape
   pre-committed so a future opt-in does not require redesigning the
   surface.
9. A **debug-flag gating contract**
   (`docs/operations/debug-flags.md`) — compile-time `__DEV__`,
   no `?debug=1`, no `localStorage.debug`, build-output check that
   verbose loggers are tree-shaken.
10. A **pack-signing private-key custody task** — Ed25519 private key
    on a YubiKey / HSM, never copied to disk, signing performed via a
    one-shot release-manager script; annual rotation drill.
11. **CI gates** rejecting (a) committed secrets matching the
    `.gitleaks.toml` ruleset, (b) production bundles containing known
    secret patterns (`sk-`, `Bearer`, `-----BEGIN`), (c) tasks that
    add a new public endpoint without a rate-limit row in the matrix,
    (d) env-var reads outside `services/*/src/config.ts`.

This plan **only formalizes missing artifacts** — no gameplay rules
are invented. Where audits **22** / **24** / **25** / **27** / **30** /
**31** already produced plans, this plan **defers** to those artifacts
and adds only the cost, secret, throttling, scanning, and rotation
surfaces that connect them.

**Overall readiness state:** 1 / 10 (per audit). Closing the items
below lifts this to 8 / 10, which is the threshold for letting agents
ship the first AI-gateway-backed generation build (or the first M5
public-facing multiplayer build) without exposing the project's
provider budget or its signing key on the first day of integration.

---

## 2. Critical Fixes (Must Do First)

These six items are the *active risk surface* (provider-budget
exhaustion in hours, key leak on first commit, open log-secret leak,
signing-key compromise breaking the entire mod-trust model) and must
land before any AI-gateway-backed code is written and before the first
provider key is created.

---

### Critical Fix 1 — Secrets Management Contract + `.env.example` + Repo `.gitignore` Hardening

**Source:** Q606, Q608, Q611, Q615, Q617. Risks "Bundle leak of
provider keys", "No rotation = permanent compromise".

**Problem:** The "no provider keys in browser" rule is written
([`docs/architecture/ai-integration.md`](../architecture/ai-integration.md)
lines 22, 28, 48) but **where on the gateway** keys live, and **how**
they get there, is undefined. There is no env-var contract, no
secret-manager choice, no per-env (`dev` / `staging` / `prod`)
variation, no `.env.example` at repo root, no IAM / least-privilege
matrix. The repo `.gitignore` lists only `.DS_Store`, `node_modules/`,
`coverage/`, `dist/`, `*.tsbuildinfo`, `*.crdownload` — `.env` is
**not** excluded, neither are `*.pem`, `*.key`, `*.p12`, `secrets.json`,
`id_ed25519*`, `id_rsa*`. A developer who creates a `.env` at repo
root has it untracked only if they remember to add it to `.gitignore`
themselves.

**Impact:** A single copy-paste of a provider key on the first day of
gateway integration commits it to history. With no rotation cadence
(Critical Fix 5) and no scanner (Critical Fix 2), the leak is neither
detected nor remediated; the key remains exploitable indefinitely.
Without dev/prod separation, a single leak burns the production
provider budget regardless of which environment it leaked from.

**Solution:** Author one canonical secrets doctrine, harden
`.gitignore`, commit a placeholder `.env.example`, and forbid
`process.env` reads outside a single per-service `config.ts` that
performs validation at startup.

**Files to Update:**
- [.gitignore](../../.gitignore) — extend pattern list (see Implementation Steps)
- [services/ai-gateway/README.md](../../services/ai-gateway/README.md) — link the new doctrine doc; require `services/ai-gateway/src/config.ts` as the only `process.env` reader; require `.env.example` row for every consumed variable
- [services/signaling/README.md](../../services/signaling/README.md) — same boundary
- [services/README.md](../../services/README.md) — add a "Secrets" section requiring per-service `config.ts` and pointing to the doctrine
- [docs/architecture/ai-integration.md](../architecture/ai-integration.md) — add a "Secret storage" subsection citing the new doctrine; preserve the existing "no keys in browser" wording verbatim
- [docs/architecture/schema-matrix.md](../architecture/schema-matrix.md) — register the new env / secret schemas with owning task

**New Files:**
- `docs/operations/secrets.md` — canonical doctrine:
  - **Source of truth:** a managed secret manager (Doppler **or**
    AWS Secrets Manager **or** GCP Secret Manager — pick one and
    document the trade-off; Doppler chosen as default for low ops
    overhead in single-team config).
  - **Runtime injection:** secret manager → environment variables at
    container start; **never** baked into image, **never** read from
    a file under VCS.
  - **Per-env variation:** name prefixes `DEV_*` / `STAGING_*` /
    `PROD_*`; production manager scope is write-locked to the deploy
    pipeline identity, dev manager scope is write-open to engineers.
  - **Per-env provider accounts:** dev provider org with hard
    USD/month cap; prod provider account never on a developer
    machine.
  - **Loading rule:** every service has a single
    `services/<name>/src/config.ts` that reads `process.env`,
    validates with `zod` / AJV, and exports a frozen `Config` object;
    no other module may read `process.env` directly.
  - **Required variables (initial set):**
    `AI_PROVIDER` (enum), `AI_PROVIDER_API_KEY`, `AI_GATEWAY_PORT`,
    `AI_GATEWAY_DISABLED` (kill-switch),
    `SIGNALING_PORT`, `TURN_SHARED_SECRET` (defers to Plan 25),
    `LOG_LEVEL`, `NODE_ENV`.
  - **`.env` discipline:** `.env.example` is the schema; a missing
    variable at startup throws with `Missing required env: <NAME>`
    (no fallback to public defaults for secrets).
- `.env.example` at repo root — every name from the doctrine, every
  value a placeholder (`<set-via-doppler>` / `change-me`); no real
  secrets, ever.
- `docs/operations/iam.md` — least-privilege matrix:
  - AI gateway identity: read-only access to `AI_PROVIDER_API_KEY`;
    no access to `TURN_SHARED_SECRET` or signing keys.
  - Signaling identity: read-only access to `TURN_SHARED_SECRET`; no
    access to `AI_PROVIDER_API_KEY`.
  - CI identity: write access to **dev** secret-manager scope only;
    read-only on production secret names (for example value
    structure verification only).
  - Release-manager identity (humans): rotate-and-revoke on production
    secrets; no read access to current production values.
- `tasks/operations/01-secrets-doctrine.md` — owning task; `ownedPaths`
  covers `docs/operations/secrets.md`, `docs/operations/iam.md`,
  `.env.example`, `.gitignore`, the per-service `config.ts` skeleton.

**Implementation Steps:**
1. Author `docs/operations/secrets.md` exactly as specified above.
   Pin Doppler as the default (decision rationale: single-team, no
   AWS/GCP runtime today; revisit when multi-cloud).
2. Author `docs/operations/iam.md` with the least-privilege matrix.
3. Author `.env.example` at repo root with every name listed; no real
   values.
4. Update `.gitignore` to add (in this order, grouped):
   ```
   # Secrets
   .env
   .env.*
   !.env.example
   *.pem
   *.key
   *.p12
   *.pfx
   secrets.json
   id_ed25519*
   id_rsa*
   .doppler/
   ```
5. Update [`services/ai-gateway/README.md`](../../services/ai-gateway/README.md)
   and [`services/signaling/README.md`](../../services/signaling/README.md)
   with the **single-`config.ts` rule**: every `process.env` read
   lives in `services/<name>/src/config.ts`; every other module
   imports the validated `Config`.
6. Add a `validate:secrets-discipline` check in
   `scripts/check-repo-contracts.mjs`:
   - greps each `services/*/src/**/*.ts` for `process.env`;
     fails if found outside `config.ts`.
   - asserts `.env.example` exists and lists every variable named in
     `docs/operations/secrets.md`.
   - asserts `.gitignore` contains the patterns above.
7. Wire `validate:secrets-discipline` into `npm run validate`.
8. Cross-link from
   [`docs/architecture/ai-integration.md`](../architecture/ai-integration.md)
   "Secret storage" subsection to `docs/operations/secrets.md`. Do
   **not** rewrite the existing "no keys in browser" sentence.

**Dependencies:** None (self-contained doctrine).

**Complexity:** **M**

---

### Critical Fix 2 — `.gitleaks.toml` + Pre-commit Hook + CI Secret Scan

**Source:** Q612, Q613. Risks "Bundle leak of provider keys",
"Secret-in-logs leak".

**Problem:** No `.gitleaks.toml`, no `.trufflehog.yml`, no
`.husky/pre-commit`, no `.github/workflows/secret-scan.yml`. Combined
with the unhardened `.gitignore` (Critical Fix 1), there is **zero**
protection against committing a key. Audit 30 (Q641, Q643) flags the
same gap from the dependencies/build angle; this plan owns the
implementation.

**Impact:** First time a developer pastes a real key into a `.env`
under repo root and runs `git add .`, it goes to history. Public-mirror
indexers grab keys within seconds; no detection means no rotation
trigger.

**Solution:** Commit a `gitleaks` config with the default ruleset and
project-specific allowlist; wire it as both a pre-commit hook (via
`husky`) and a CI workflow that fails any PR with a finding.

**Files to Update:**
- [.github/workflows/validate.yml](../../.github/workflows/validate.yml) — add a `secret-scan` job (or extend the existing job) that runs `gitleaks detect --source . --redact --no-banner` on every push and PR; fail on non-zero exit
- [package.json](../../package.json) — add `"prepare": "husky install"`, add `"validate:secrets": "gitleaks detect --source . --redact --no-banner"`, register `validate:secrets` inside `npm run validate`

**New Files:**
- `.gitleaks.toml` — extends the upstream default ruleset; project allowlist limited to:
  - placeholder values in `.env.example` (e.g., `change-me`, `<set-via-doppler>`)
  - canonical example fixtures under `content-schema/examples/`
  - Markdown samples that illustrate the *shape* of an error envelope but never a real key
- `.husky/pre-commit` — runs `npx gitleaks protect --staged --redact --no-banner`; non-zero exit blocks the commit
- `.github/workflows/secret-scan.yml` — separate workflow on `pull_request` targeting `main`; uploads a SARIF artifact on finding so the playbook (Critical Fix 5) has a starting point
- `tasks/operations/02-secret-scanning.md` — owning task; `ownedPaths` covers `.gitleaks.toml`, `.husky/`, `.github/workflows/secret-scan.yml`, `package.json` script row

**Implementation Steps:**
1. Author `.gitleaks.toml` with `extend = "upstream-default"` and a
   minimal allowlist for the placeholder cases above.
2. Add `husky` as a dev dependency; commit `.husky/pre-commit`.
3. Add the `secret-scan` job to CI; wire it as a *required* check on
   `main`.
4. Cross-link the runbook (Critical Fix 5) from the workflow's
   failure message: `"On finding: see SECURITY.md leaked-secret
   playbook"`.
5. Add an integration test (`scripts/__tests__/secret-scan.test.mjs`)
   that pipes a known-pattern fixture through `gitleaks detect` and
   asserts a finding; pipes the placeholders and asserts no finding.

**Dependencies:** **Critical Fix 1** (so the allowlist references real
placeholders).

**Complexity:** **S**

---

### Critical Fix 3 — AI Gateway Per-Account Rate Limits + Daily/Weekly Cap + Provider-Spend Kill-Switch

**Source:** Q598, Q599, Q605. Risks "Cost-exhaustion via AI",
"Provider budget drained in hours".

**Problem:** [`services/ai-gateway/README.md`](../../services/ai-gateway/README.md)
names rate limiting as a use case (1 sentence, line 9) but commits no
buckets, no thresholds, no per-route policy. The provider-neutral
`GenerationProvider` interface exposes
[`generateStructured`](../../tasks/phase-3/02-ai-generation/01-prompt-provider-structured-output-raw-json.md)
with no cost accounting.
[`tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md`](../../tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md)
caps **generated values** (HP ≤ 500, ATK ≤ 50, abilities ≤ 5) but
**not** call rate or provider spend. The exit criterion "3 minutes per
faction" ([`tasks/phase-3/02-ai-generation.md`](../../tasks/phase-3/02-ai-generation.md)
line 10) is a latency target, not a cost ceiling.

**Impact:** A single attacker (or a buggy retry loop) drains the
provider budget within an hour. With no per-account axis, there is no
way to single out the offender; with no kill-switch, even noticing the
spend mid-incident does not stop it.

**Solution:** Author a canonical AI-cost doctrine, extend
`generation-request.schema.json` with a `costBudget` field, add a
server-side per-account daily/weekly ledger, and define the
`AI_GATEWAY_DISABLED` kill-switch ENV.

**Files to Update:**
- [services/ai-gateway/README.md](../../services/ai-gateway/README.md) — add **Rate Limits**, **Cost Ceiling**, and **Kill-Switch** sections referencing the new doctrine and schema
- [tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md](../../tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md) — extend with **Call-Rate Caps** and **Spend Caps** sub-sections; preserve existing value caps verbatim
- [tasks/phase-3/02-ai-generation/01-prompt-provider-structured-output-raw-json.md](../../tasks/phase-3/02-ai-generation/01-prompt-provider-structured-output-raw-json.md) — require `GenerationRequest.costBudget`; require `GenerationProvider.estimateCost(req): { tokensIn: number; tokensOut: number; usdCents: number }` before issuance
- [content-schema/schemas/generation-request.schema.json](../../content-schema/schemas/generation-request.schema.json) — add `costBudget`
- [docs/architecture/ai-generation-pipeline.md](../architecture/ai-generation-pipeline.md) — annotate stage 1 with "cost-ledger check before vendor call"
- [docs/architecture/schema-matrix.md](../architecture/schema-matrix.md) — register `cost-budget.schema.json` and the cost-ledger ownership

**New Files:**
- `docs/operations/ai-cost-ceiling.md` — canonical doctrine with this matrix:
  | Scope | Bucket | Default | Burst | Behavior on exhaustion |
  | --- | --- | --- | --- | --- |
  | per account | `generateStructured` calls | 5 / hour | 10 | `ERROR{code:"rateLimited", scope:"account", retryAfterMs}` |
  | per account | `generateStructured` calls | 20 / day | 30 | same, longer cooldown |
  | per account | `generateStructured` calls | 100 / week | — | same |
  | per account | spend | $0.50 / day | — | `ERROR{code:"budgetExceeded"}` |
  | per category (`faction` / `unit` / `asset` / `moderation`) | calls | per-category sub-cap (60 % of account daily) | — | `ERROR{code:"categoryBudgetExceeded"}` |
  | global | spend | configurable USD/day (default $20) | — | gateway flips to `AI_GATEWAY_DISABLED=1` automatically + alert |
  | per IP (when no account) | calls | 5 / hour | 10 | same shape |
  - **Estimation:** every call passes through
    `GenerationProvider.estimateCost` first; the ledger debits the
    estimate before the call and credits/debits the difference after
    on actual usage.
  - **Kill-switch:** `AI_GATEWAY_DISABLED=1` → all routes return
    `503 { error: "SERVICE_PAUSED", retryAfterMs: 600000 }` with no
    detail leak.
- `content-schema/schemas/cost-budget.schema.json` —
  ```
  { "remainingDayUsdCents": int>=0,
    "remainingWeekUsdCents": int>=0,
    "remainingHourCalls": int>=0,
    "category": "faction"|"unit"|"asset"|"moderation"|"other" }
  ```
- `services/ai-gateway/src/cost-ledger.ts` — pure ledger with injectable clock and storage adapter (in-memory default; Redis in Critical Fix 6 of System Improvements)
- `services/ai-gateway/src/limits.ts` — composed limiter exposing `check(accountId, category, estimate): { allowed: boolean; reason?: string; retryAfterMs?: number }`
- `tasks/phase-3/02-ai-generation/09-ai-cost-ceiling-and-kill-switch.md` — owning task; `ownedPaths` covers `services/ai-gateway/src/cost-ledger.ts`, `services/ai-gateway/src/limits.ts`, `docs/operations/ai-cost-ceiling.md`, `content-schema/schemas/cost-budget.schema.json`

**Implementation Steps:**
1. Author `docs/operations/ai-cost-ceiling.md` with the matrix above
   and the ledger semantics (debit-on-estimate, reconcile-on-actual,
   refund-on-failure). Justify each number against the M5 evaluation
   criterion (5 generated factions in audit) so the daily cap is
   feasible for legitimate use.
2. Define `cost-budget.schema.json` and extend
   `generation-request.schema.json` with the `costBudget` ref.
3. Implement `services/ai-gateway/src/cost-ledger.ts` with an
   injected storage adapter (`InMemoryStore` for unit tests; Redis
   adapter is added in System Improvement 4).
4. Implement `services/ai-gateway/src/limits.ts`. Wire it as the
   single gate before any `GenerationProvider` call. Refund the
   ledger on `provider.errored()` to avoid double-billing on
   transient failures.
5. Implement the global spend monitor that auto-flips
   `AI_GATEWAY_DISABLED=1` once the configured daily USD ceiling is
   reached; emit `ALERT{code:"ai_kill_switch_engaged"}` (consumed by
   System Improvement 7).
6. Update task **06** with cross-links; preserve existing value caps.
7. Add unit tests under `services/ai-gateway/test/`: per-account
   exhaustion → `rateLimited`, per-category exhaustion →
   `categoryBudgetExceeded`, kill-switch flips at threshold,
   refund-on-error keeps ledger correct.

**Dependencies:** **Critical Fix 4** (error envelope) for the response
shape; **Critical Fix 1** (config.ts) for the kill-switch ENV.

**Complexity:** **L**

---

### Critical Fix 4 — Canonical Rate-Limit / Error Envelope Schema (HTTP `429` + Signaling `RATE_LIMITED`)

**Source:** Q596, Q597. Missing logic "Rate-limit response contract".

**Problem:** No canonical error envelope, no `429`, no `Retry-After`,
no `RATE_LIMITED` signaling code. Without a response shape, every
limiter that comes online (Critical Fix 3, System Improvement 1, Plan
25's signaling matrix) invents its own. Without an oracle-resistance
discussion, error responses leak which axis hit the limit and let an
attacker calibrate exact buckets.

**Impact:** Inconsistent client handling, every consumer rolls its
own retry strategy (or none), and exact-bucket leakage tells an
attacker how to evade.

**Solution:** Define one error envelope schema for both HTTP and
WebSocket frames; map to `429 + Retry-After` for HTTP, to a
discriminated `ERROR` frame for signaling; commit oracle-resistance
rule (the `scope` field is coarse: `ip` / `session` / `account` /
`global`; **never** the exact bucket key or remaining-tokens count).

**Files to Update:**
- [docs/architecture/schema-matrix.md](../architecture/schema-matrix.md) — register `error-envelope.schema.json` row
- [docs/architecture/command-schema.md](../architecture/command-schema.md) — register `RATE_LIMITED`, `BUDGET_EXCEEDED`, `SERVICE_PAUSED` (UI-side trust events)
- [services/ai-gateway/README.md](../../services/ai-gateway/README.md) — link the envelope; require all 4xx/5xx responses to use it
- [services/signaling/README.md](../../services/signaling/README.md) — same; require signaling `ERROR` frames to embed it under `payload`
- [docs/architecture/wiki/screens/64-network-lobby/data-contracts.md](../architecture/wiki/screens/64-network-lobby/data-contracts.md) — list `RATE_LIMITED` and `BUDGET_EXCEEDED` frames the lobby must handle
- [docs/architecture/wiki/screens/64-network-lobby/interactions.md](../architecture/wiki/screens/64-network-lobby/interactions.md) — add `OnRateLimited` (toast + back-to-setup, no retry storm) handler

**New Files:**
- `content-schema/schemas/error-envelope.schema.json` —
  ```
  { "error": "RATE_LIMITED" | "BUDGET_EXCEEDED" | "SERVICE_PAUSED"
            | "VALIDATION_FAILED" | "UNAVAILABLE" | "INTERNAL",
    "retryAfterMs": int>=0,                 // only when retry-eligible
    "scope": "ip" | "session" | "account" | "global",
    "requestId": string (UUID v4)
  }
  ```
  with `additionalProperties: false`. **Forbidden** fields (rejected by
  schema): `bucketKey`, `remaining`, `limit`, `currentCount`, exact
  user/account IDs.
- `content-schema/examples/error-envelope/*.json` — one canonical example per `error` value
- `docs/operations/error-envelope.md` — canonical doctrine: when to set `retryAfterMs`, why `scope` is coarse, why exact-bucket fields are forbidden, HTTP-vs-signaling mapping table
- `tasks/operations/03-error-envelope-and-rate-limit-response.md` — owning task

**Implementation Steps:**
1. Author `docs/operations/error-envelope.md` with the schema, the
   mapping table (HTTP `429` ⇆ signaling `ERROR{code:"RATE_LIMITED"}`),
   and the oracle-resistance rule.
2. Define `error-envelope.schema.json` with strict
   `additionalProperties: false`. Add canonical examples.
3. Update `validate:contracts` (`scripts/check-repo-contracts.mjs`)
   to grep all `services/*/src/**/*.ts` for `res.status(429)` /
   `res.status(503)` and assert the response shape matches the
   schema; fail otherwise.
4. Cross-link the doctrine from Critical Fix 3 (AI gateway), Plan 25
   (signaling rate-limit matrix), and System Improvement 1 (master
   matrix).

**Dependencies:** None.

**Complexity:** **S**

---

### Critical Fix 5 — `SECURITY.md` + Leaked-Secret Playbook + Disclosure Inbox

**Source:** Q610, Q612, Q613. Risks "No rotation = permanent
compromise", "Secret-in-logs leak undetected".

**Problem:** No `SECURITY.md` at repo root, no
`docs/operations/incident-response.md`, no severity matrix, no
disclosure inbox, no on-call rotation. With Critical Fix 2 in place,
*finding* a leak is automated; *responding* to one still has no
defined steps.

**Impact:** Once a leak is detected (or reported), no one knows the
order of operations. Rotation may happen without revocation, audit
without rotation, or post-mortem without either. Cross-cuts pack-key
compromise (Critical Fix 6), where the wrong recovery order forces a
client release with stale public key while the private key is still
exploitable.

**Solution:** Author `SECURITY.md` and a step-by-step playbook with
explicit ordering (rotate → revoke → audit → post-mortem in 7 d);
commit a `security@` disclosure inbox.

**Files to Update:**
- (none)

**New Files:**
- `SECURITY.md` at repo root —
  - Disclosure inbox (`security@<domain>` placeholder until domain is
    chosen; `program.master.pero@gmail.com` as the interim contact).
  - Severity matrix (S0 — production secret leak / signing-key
    leak / RCE; S1 — service abuse-cost ≥ $100; S2 — log secret;
    S3 — defense-in-depth gap).
  - Acknowledgment SLA: S0 ≤ 4 h, S1 ≤ 24 h, S2/S3 ≤ 7 d.
- `docs/operations/incident-response.md` — playbooks:
  - **Leaked secret** — (1) rotate at secret manager; (2) revoke at
    provider; (3) audit access logs (last 30 d); (4) force-purge
    leaked value from git history (`git filter-repo`); (5) push new
    commit; (6) **always assume read** of every other secret in the
    same scope (rotate them too); (7) post-mortem in 7 d.
  - **Provider-budget anomaly** — flip `AI_GATEWAY_DISABLED=1`,
    snapshot ledger, identify offending account or IP, file post-mortem.
  - **Pack-signing key compromise** — described in Critical Fix 6.
  - **Debug-flag exposure in production** — described in System
    Improvement 9.
- `tasks/operations/04-security-md-and-incident-runbook.md` — owning task

**Implementation Steps:**
1. Author `SECURITY.md` and `docs/operations/incident-response.md`
   exactly as specified above.
2. Cross-link from Critical Fix 2 (workflow failure message), from
   Critical Fix 6 (signing-key playbook), and from Plan 22 (privacy
   leaks playbook).
3. Add a `validate:operations` check that asserts `SECURITY.md`
   exists and contains the four required playbook sections.

**Dependencies:** None.

**Complexity:** **S**

---

### Critical Fix 6 — Pack-Signing Private-Key Custody (YubiKey / HSM, Offline Signing)

**Source:** Q614. Risks "Pack-signing key compromise" (cross-ref
[27-save-tampering-and-pack-signing.md](../readiness-audit/27-save-tampering-and-pack-signing.md)).

**Problem:** [`tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md`](../../tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md)
commits Ed25519 verification with the **public** key hardcoded in the
engine (correct).
[`tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md`](../../tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md)
commits "every official pack carries … official signature metadata"
but **does not say where the private signing key lives**: HSM,
YubiKey, offline air-gapped machine, encrypted file, KMS-managed
key, etc. The signing *operation* is also not described as a
separate process — a runtime service could in principle read the
same key.

**Impact:** A developer-laptop `.pem` is the implementer default.
Compromise here lets an attacker forge an "official" pack and bypass
the sandbox flag, defeating the entire mod-trust model committed in
[Plan 27](./27-save-tampering-and-pack-signing-plan.md). Recovery
requires shipping a **client release** with a new public key (because
the public key is hardcoded into the engine bundle) — much higher
urgency than rotating any other secret.

**Solution:** Commit private-key custody on a hardware token; signing
is a one-shot release-manager script; CI **never** has the private
key.

**Files to Update:**
- [tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md](../../tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md) — extend with **Private-Key Custody** section linking the new doctrine
- [docs/operations/incident-response.md](#critical-fix-5--securitymd--leaked-secret-playbook--disclosure-inbox) — add the signing-key compromise playbook (this Critical Fix supplies the body; Critical Fix 5 owns the file)
- [docs/architecture/schema-matrix.md](../architecture/schema-matrix.md) — register the rotation cadence row

**New Files:**
- `docs/operations/pack-signing-key.md` — canonical doctrine:
  - **Generation:** the official Ed25519 key pair is generated **on**
    a YubiKey 5 (or HSM-equivalent) using `gpg --card-edit` /
    `ssh-keygen -t ed25519-sk` / vendor tooling; the private half
    never leaves the hardware.
  - **Signing:** a one-shot `scripts/sign-pack.mjs` invokes the
    hardware (touch-required); CI **never** runs this script; only a
    designated release manager runs it from a clean machine.
  - **Public key in engine:** the public bytes are embedded in
    `src/engine/security/official-public-key.ts`; rotating the public
    key **requires** a client release.
  - **Backups:** the private key is backed up only as a second
    YubiKey (or HSM token) stored in a separate physical location;
    no software backup ever exists.
  - **Rotation cadence:** annual rotation drill (configurable);
    compromise-triggered immediate rotation; both ship a new public
    key in a regular client release alongside the new private key on
    hardware.
  - **Compromise playbook (cited from `incident-response.md`):**
    (1) ship a client release with the new public key and a denylist
    entry for the leaked key fingerprint; (2) re-sign all official
    packs with the new private key; (3) bump the `manifest.signedBy`
    fingerprint; (4) saves referencing the old fingerprint downgrade
    to "untrusted" on next load; (5) post-mortem in 14 d.
- `scripts/sign-pack.mjs` — one-shot signing CLI; refuses to run if
  the environment looks like CI (`process.env.CI === "true"`); refuses
  to read a private key from anywhere on disk
- `tasks/phase-2/05-mod-system/05e-pack-signing-private-key-custody.md` — owning task; `ownedPaths` covers `docs/operations/pack-signing-key.md`, `scripts/sign-pack.mjs`, `src/engine/security/official-public-key.ts` (initial commit)

**Implementation Steps:**
1. Author `docs/operations/pack-signing-key.md` exactly as specified
   above.
2. Author `scripts/sign-pack.mjs`. The CI-detection guard is
   non-negotiable: refuse to run with a clear error
   `"sign-pack must run on a release-manager workstation, never CI"`.
3. Extend
   [`tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md`](../../tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md)
   with the **Private-Key Custody** section. Preserve all existing
   wording verbatim.
4. Add a `validate:tasks` check that asserts task **05d** references
   `docs/operations/pack-signing-key.md` and that `scripts/sign-pack.mjs`
   contains the CI guard.
5. Cross-link the compromise playbook into `SECURITY.md`
   (Critical Fix 5).

**Dependencies:** **Critical Fix 5** (the playbook lives in
`incident-response.md`); existing **task 02** (verification) and
**task 05d** (signing).

**Complexity:** **M**

---

## 3. System Improvements

Grouped by system. Each entry deliberately defers to its sibling plan
where the surface area overlaps.

---

### 3.1 Architecture / Operations Doctrine

#### Issue: No master rate-limit matrix across all endpoints

**Source:** Q593, Q594, Q595, Q604.

**Problem:** Even after Critical Fix 3 (AI gateway) and Plan 25
(signaling), the project has **no master matrix** that lists every
public endpoint with its tier, key, threshold, exhaustion behavior,
and edge-tier responsibility. Each surface owns its sub-matrix in
isolation, so a future AI-task or telemetry endpoint can be added
without anyone noticing the matrix is incomplete.

**Impact:** New endpoints land without a rate-limit row. Cross-cuts
the lint surface — there is no automated way to fail a PR that adds
an endpoint without a row.

**Solution:** Author one master `docs/operations/rate-limits.md`
that **embeds-by-reference** the AI-gateway matrix
(`docs/operations/ai-cost-ceiling.md` from Critical Fix 3) and the
signaling matrix (`docs/architecture/signaling-rate-limits.md` from
[Plan 25](./25-turn-credentials-and-signaling-server-abuse-plan.md));
own the cross-cutting tiers (per-IP / per-IP-prefix / per-session /
per-account / global) and the edge-tier responsibility.

**Files to Update:**
- [docs/operations/secrets.md](#critical-fix-1--secrets-management-contract--envexample--repo-gitignore-hardening) — cross-link
- [docs/architecture/schema-matrix.md](../architecture/schema-matrix.md) — register the master matrix

**New Files:**
- `docs/operations/rate-limits.md` — embeds-by-reference AI-gateway and signaling sub-matrices; owns the **edge-tier section** (Cloudflare or fly-proxy WAF, per-IP CONNECT rate limit, SDP/payload size cap, managed-challenge escalation under load — extends Plan 24's transport doc, not duplicates it)
- `tasks/operations/05-rate-limits-master-matrix.md` — owning task

**Implementation Steps:**
1. Author the master matrix as a doc that *defers* to sibling docs
   for endpoint-specific buckets; only the cross-cutting tiers and
   the edge contract live in this file.
2. Add a `validate:rate-limits` check: every task whose name or
   `ownedPaths` matches `services/*/src/routes/**` must reference
   `docs/operations/rate-limits.md` (or one of its sub-matrices).
3. Wire `validate:rate-limits` into `npm run validate`.

**Dependencies:** Critical Fix 3 (AI matrix), [Plan 25](./25-turn-credentials-and-signaling-server-abuse-plan.md) (signaling matrix), [Plan 24](./24-tls-enforcement-and-webrtc-authentication-plan.md) (edge / transport).

**Complexity:** **M**

---

#### Issue: No log-redaction contract for secrets in errors / responses / logs

**Source:** Q609. Risks "Secret-in-logs leak".

**Problem:** No rule against `console.error(req.headers)` or
`console.log(process.env)`; no redacting middleware; no error-envelope
audit. Cross-cuts [Plan 22](./22-privacy-retention-and-error-leaks-plan.md)
(PII redaction) but is *secret*-specific.

**Impact:** First `console.error(err)` that includes an `Authorization`
header lands in hosting-provider logs. Hosting providers often retain
logs ≥ 30 d, sometimes index them; rotating the leaked secret remains
the only remediation, and rotation has no runbook (Critical Fix 5
provides one but only *responds*, doesn't prevent).

**Solution:** Commit a redaction contract; ship a single
`services/<name>/src/log/redact.ts`; lint against
`process.env`-printing patterns.

**Files to Update:**
- [docs/operations/secrets.md](#critical-fix-1--secrets-management-contract--envexample--repo-gitignore-hardening) — add a "Logs & errors" section
- [services/ai-gateway/README.md](../../services/ai-gateway/README.md) — require all loggers go through `redact()`
- [services/signaling/README.md](../../services/signaling/README.md) — same

**New Files:**
- `docs/operations/log-redaction.md` — canonical doctrine: forbidden
  fields (`Authorization`, `Cookie`, `set-cookie`, `password`, `apiKey`,
  `secret`, `token`, `*key*`, `*secret*`); response-bodies-rejecting
  rule; SDP redaction (signaling `OFFER`/`ANSWER` payloads stripped to
  length+hash before logging); link to [Plan 22](./22-privacy-retention-and-error-leaks-plan.md) for PII overlap
- `services/<name>/src/log/redact.ts` (skeleton; per-service copy is
  expected — keep small, not extracted to a shared package yet)
- `tasks/operations/06-log-redaction-contract.md` — owning task

**Implementation Steps:**
1. Author `docs/operations/log-redaction.md`.
2. Implement `services/ai-gateway/src/log/redact.ts` and
   `services/signaling/src/log/redact.ts` (deliberately duplicated;
   extract only when the third service appears).
3. Add a lint rule to `scripts/check-repo-contracts.mjs`: greps each
   service's source for `console.{log,info,error,warn,debug}(`;
   fails if the argument expression contains `process.env`, `req.headers`,
   `req.body`, `err` (without `.message` / `.stack`), or any literal
   matching `/(?:authorization|cookie|password|api[_-]?key|secret|token)/i`
   without a `redact(` wrapper.

**Dependencies:** Critical Fix 1 (secrets doctrine).

**Complexity:** **M**

---

#### Issue: No rotation cadence or rotation drill

**Source:** Q610.

**Problem:** No schedule (7 d / 30 d / 90 d), no runbook in
`docs/operations/`, no automated rotation job, no rotation-drill
acceptance criterion. Combined with Critical Fix 5 (response
playbook), this owns the *prevention* side.

**Impact:** Permanent compromise on leak. Also, secrets that are not
exercised on rotation tend to be unexpectedly load-bearing (e.g.,
embedded in old client builds), and the first rotation after years is
the one that breaks production.

**Solution:** Cadence committed in `docs/operations/secrets.md`
(Critical Fix 1 already lists rotation as a doctrine field; this
issue formalizes the **drill** acceptance criterion).

**Files to Update:**
- [docs/operations/secrets.md](#critical-fix-1--secrets-management-contract--envexample--repo-gitignore-hardening) — add **Rotation Cadence Table**:
  | Secret | Cadence | Drill |
  | --- | --- | --- |
  | AI provider key | ≤ 30 d | quarterly |
  | TURN shared secret (when deployed) | ≤ 7 d | monthly |
  | Pack-signing key | annual + on compromise | annual |
  | Doppler service token | ≤ 30 d | quarterly |

**New Files:**
- `tasks/operations/07-rotation-drill.md` — owning task; the drill is
  a quarterly recurring task that exercises the playbook in a
  staging-only environment

**Implementation Steps:**
1. Extend `docs/operations/secrets.md` with the cadence table.
2. Author `tasks/operations/07-rotation-drill.md` with explicit
   acceptance criteria: dev-env rotation completes without service
   downtime; new key works; old key revoked; access logs reviewed.
3. Schedule the first drill explicitly via the project's `/schedule`
   surface (out-of-band; this plan only commits the doctrine and
   task spec).

**Dependencies:** Critical Fix 1, Critical Fix 5.

**Complexity:** **S**

---

#### Issue: No debug-flag gating to prevent runtime / attacker-controlled enablement

**Source:** Q618.

**Problem:** No "DEBUG flag is build-time, not runtime"; no protection
against `?debug=1` query string or `localStorage.debug = '*'` injection.

**Impact:** An attacker who can set `localStorage.debug = '*'`
(e.g., via a phished link with a URL fragment that the app honors,
or by social-engineering a console paste) exposes verbose internal
state — state hashes, command logs, peer IDs — both privacy leak
([Plan 22](./22-privacy-retention-and-error-leaks-plan.md)) and
reverse-engineering aid.

**Solution:** Compile-time `__DEV__` gate; no runtime mechanism;
build-output check that verbose loggers are tree-shaken from production
bundles.

**Files to Update:**
- (none — first commit creates the doctrine)

**New Files:**
- `docs/operations/debug-flags.md` — canonical doctrine:
  - **Source:** `__DEV__` is a constant folded by the bundler at
    build time (`vite define` or `webpack DefinePlugin`); production
    build sets `__DEV__ = false`.
  - **Forbidden:** `?debug=1`, `localStorage.debug`, `?verbose=1`,
    any URL/cookie/storage-driven verbose mode in production builds.
  - **Allowed in dev:** any of the above; the dev build can ship
    behind a separate domain (`dev.<domain>`) or only via local
    builds.
  - **Build-output check:** post-build, scan the production bundle
    for `__DEV__`, `console.debug`, and the verbose-logger function
    names; fail the build if any survives tree-shaking.
- `tasks/operations/08-debug-flag-gating.md` — owning task

**Implementation Steps:**
1. Author the doctrine.
2. Once the bundler config lands (the repo has no client build yet),
   commit `vite.config.ts` (or equivalent) with `__DEV__` defined
   to `false` for production.
3. Add `scripts/check-prod-bundle.mjs` (run in CI after build):
   greps `dist/**` for `console.debug(`, `__DEV__`,
   `localStorage.debug`, `process.env.DEBUG`, `?debug=`, `?verbose=`;
   fails on hit.

**Dependencies:** None for the doctrine; bundler-side check waits on
the first client build task.

**Complexity:** **S**

---

#### Issue: No build-time secret hygiene audit

**Source:** Q616.

**Problem:** No build-time-secret list (source-map upload tokens,
telemetry write-keys, sentry DSN); no `vite define` /
`webpack DefinePlugin` audit; no rule that build-only secrets must
not appear in the bundle.

**Impact:** A telemetry write-key or sentry DSN gets baked into the
client bundle and is grep-able by anyone.

**Solution:** Extend the prod-bundle scan (above) with known-secret
patterns; commit a list of allowed build-time defines; require any
new define be added to an allowlist.

**Files to Update:**
- [docs/operations/debug-flags.md](#issue-no-debug-flag-gating-to-prevent-runtime--attacker-controlled-enablement) — add **Build-Time Secret Hygiene** section (or split into a sibling doc)

**New Files:**
- `docs/operations/build-time-secrets.md` — list of allowed defines
  (e.g., `__DEV__`, `__VERSION__`, `__BUILD_SHA__`); rule that any
  new define requires a PR to this list; rule that no define value
  may match the secret-pattern set
- `tasks/operations/09-build-time-secret-audit.md` — owning task

**Implementation Steps:**
1. Author the doctrine.
2. Extend `scripts/check-prod-bundle.mjs`: grep `dist/**` for
   secret patterns (`sk-[a-zA-Z0-9]{20,}`, `Bearer\s+[A-Za-z0-9._-]+`,
   `-----BEGIN\s+(?:RSA|EC|OPENSSH|PGP)\s+PRIVATE`); fail on hit.
3. Add a CI job that runs `npm run build` and then
   `npm run validate:prod-bundle`.

**Dependencies:** Critical Fix 2 (gitleaks pattern reuse), and the
first client build task (out of scope here).

**Complexity:** **S**

---

### 3.2 Schemas

#### Issue: No `cost-budget` schema for AI requests

Owned by **Critical Fix 3**. Listed here for the schema-matrix audit.

**Files to Update:**
- [docs/architecture/schema-matrix.md](../architecture/schema-matrix.md)

**New Files:**
- `content-schema/schemas/cost-budget.schema.json` (Critical Fix 3 owns the body)

**Complexity:** **S** (doc-only registration once Critical Fix 3 lands)

---

#### Issue: No `error-envelope` schema

Owned by **Critical Fix 4**. Listed here for the schema-matrix audit.

**Complexity:** **S** (doc-only registration)

---

#### Issue: No `chat-message` and `mute-state` schemas

**Source:** Q602.

**Problem:** No `chat.schema.json`, no `mute.schema.json`, no chat
screen package. [`docs/readiness-audit/19-chat-safety-and-user-reporting.md`](../readiness-audit/19-chat-safety-and-user-reporting.md)
covers chat at policy level only;
[Plan 19](./19-chat-safety-and-user-reporting-plan.md) owns the
moderation/reporting half — this issue owns the *throttling* half.

**Impact:** Without a chat-message schema, throttling has no shape to
attach to.

**Solution:** Define the schemas; defer the screen package to
[Plan 19](./19-chat-safety-and-user-reporting-plan.md); add the
throttling matrix in `docs/operations/rate-limits.md`.

**Files to Update:**
- [docs/architecture/schema-matrix.md](../architecture/schema-matrix.md) — register `chat-message.schema.json` and `mute-state.schema.json`

**New Files:**
- `content-schema/schemas/chat-message.schema.json` — `{ from: peerId, ts: int, text: maxLength 256, …}` with `additionalProperties: false`
- `content-schema/schemas/mute-state.schema.json` — `{ peerId, level: 0|1|2|3|4, mutedUntilMs: int }` where level is the escalation step (0 unmuted, 1 = 10 s, 2 = 1 m, 3 = 5 m, 4 = 1 h, 5 = permanent)
- `tasks/phase-3/04-polish/05-chat-throttling-and-escalating-mute.md` — owning task; `ownedPaths` covers the schemas, `services/signaling/src/chat/throttle.ts` (chat is forwarded peer-to-peer; the signaling server does not see chat content unless a relay mode is added — clarify in task body)

**Implementation Steps:**
1. Define both schemas with canonical examples.
2. Add the chat throttling row to `docs/operations/rate-limits.md`:
   `1 msg / 2 s per peer; escalating mute 10 s → 1 m → 5 m → 1 h →
   permanent; reset window 24 h of compliant behavior`.
3. Implement the per-peer throttle on the *client* side (chat is
   peer-to-peer; the signaling server never touches it once
   datachannels are up).
4. Defer screen-package work to
   [Plan 19](./19-chat-safety-and-user-reporting-plan.md).

**Dependencies:** None.

**Complexity:** **M**

---

#### Issue: No crash-report schema (system deferred, schema pre-committed)

**Source:** Q603.

**Problem:** No crash-report system. The audit notes this is
*operationally* a gap but *privacy-positive* (no PII on the wire) —
the project may legitimately defer building one.

**Impact:** Without an endpoint, there is nothing to rate-limit. But
deferring is a decision that should be **explicit** in the spec, not
implicit by omission, so a future task does not greenfield-design a
PII-leaky crash report.

**Solution:** Commit an explicit *deferred* decision and pre-commit
the schema and rate-limit shape that any future opt-in must use.

**Files to Update:**
- [docs/architecture/schema-matrix.md](../architecture/schema-matrix.md) — register `crash-report.schema.json` row (status: schema only; no consumer yet)
- [docs/readiness-audit/22-privacy-retention-and-error-leaks.md](../readiness-audit/22-privacy-retention-and-error-leaks.md) — cross-link to this decision (do not modify the audit)
- [docs/implementation-plans/22-privacy-retention-and-error-leaks-plan.md](./22-privacy-retention-and-error-leaks-plan.md) — cross-link

**New Files:**
- `docs/operations/crash-report.md` — canonical decision: **not
  shipped today**; if shipped, must be opt-in; payload shape: state
  hash + stack trace + redacted command tail (last N command IDs,
  no payloads); identifier is `bucketHash = sha256(deviceFingerprint
  + bucketSalt) % 10000`, **never** the raw fingerprint; per-IP
  upload cap 1/h; 30-day retention max; gateway-side rate-limit row
  in `docs/operations/rate-limits.md`
- `content-schema/schemas/crash-report.schema.json` — pre-committed
  schema; no consumer
- `tasks/operations/10-crash-report-deferred-decision.md` — owning task

**Implementation Steps:**
1. Author `docs/operations/crash-report.md` with the decision and
   the pre-committed shape.
2. Define the schema. No service implementation today.
3. Add a `validate:tasks` rule: any future task that adds a crash-
   report consumer must reference this doctrine.

**Dependencies:** None.

**Complexity:** **S**

---

### 3.3 Multiplayer / Persistence / Performance

#### Issue: No DataChannel cps cap

**Source:** Q601.

**Problem:**
[`tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md`](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md)
defines no per-channel cps cap, no token bucket, and no peer-flood
detection. The deterministic command bus
([`docs/architecture/command-schema.md`](../architecture/command-schema.md),
[`docs/architecture/state-flow.md`](../architecture/state-flow.md))
defines *what* messages are exchanged, not *how many per second* a
peer may send.

**Impact:** A malicious peer can drown the local reducer until the UI
freezes. Also cross-cuts
[Plan 26](./26-replay-tampering-and-simulation-cheating-plan.md) —
flooding inputs is one form of replay tampering.

**Solution:** Add a per-peer outbound and inbound cps cap on the
DataChannel layer; reject (do not enqueue) frames once the cap is
exceeded; surface a `PEER_FLOODED` UI event when the inbound cap is
exceeded by a remote peer.

**Files to Update:**
- [tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md) — add **DataChannel CPS Cap** section
- [docs/architecture/command-schema.md](../architecture/command-schema.md) — register `PEER_FLOODED`
- [docs/architecture/wiki/screens/64-network-lobby/interactions.md](../architecture/wiki/screens/64-network-lobby/interactions.md) — handle `PEER_FLOODED` (toast + disconnect)

**New Files:**
- `tasks/phase-3/01-multiplayer/09-datachannel-cps-cap.md` — owning task; `ownedPaths` covers `src/multiplayer/datachannel/throttle.ts`

**Implementation Steps:**
1. Add the matrix row to `docs/operations/rate-limits.md`:
   `per peer, outbound: 30 cps token bucket, burst 60`;
   `per peer, inbound: same; over 2× threshold for ≥ 5 s ⇒
   PEER_FLOODED + disconnect`.
2. Implement the throttle module under `src/multiplayer/datachannel/`.
3. Cite [Plan 26](./26-replay-tampering-and-simulation-cheating-plan.md)
   for the desync surface.

**Dependencies:** None.

**Complexity:** **M**

---

#### Issue: No counter durability — single-instance, in-memory only

**Source:** Q604.

**Problem:**
[`tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
specifies a single-instance, in-memory state (the "100 concurrent
rooms" ceiling lives in one process). Every per-IP counter resets on
restart; no NTP / monotonic-clock / Lamport-clock guidance is given.
Multi-instance failover is undefined.

**Impact:** A trivially-restarted attacker bypasses any per-IP
counter. Multi-instance scale (hosting failover) double-counts or
under-counts.

**Solution:** When (and only when) rate counters are introduced, back
them with Redis (or a per-IP signed cookie carrying a token-bucket
state) to survive restarts and multi-instance failover; document NTP
requirement; specify a monotonic-clock fallback.

**Files to Update:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) — add **Counter Durability** section (cross-ref [Plan 25](./25-turn-credentials-and-signaling-server-abuse-plan.md))
- [services/ai-gateway/README.md](../../services/ai-gateway/README.md) — same; cost-ledger must use the same durability layer

**New Files:**
- `docs/operations/counter-durability.md` — canonical doctrine:
  Redis (or KeyDB) as the shared store; key prefix per service;
  TTL on every key (no unbounded growth); NTP requirement on every
  instance; monotonic-clock-only fallback for sub-second decisions
  (token-bucket refill); `expectedClockSkewMs` budgeted into every
  rate calculation
- `tasks/operations/11-counter-durability.md` — owning task

**Implementation Steps:**
1. Author the doctrine.
2. Add the Redis adapter to `services/ai-gateway/src/cost-ledger.ts`
   (Critical Fix 3).
3. Extend Plan 25's signaling rate-limiter to use the same Redis
   adapter.
4. Add a CI smoke test that boots two instances behind a tiny
   in-process load balancer and asserts a single attacker cannot
   exceed the per-IP cap by switching instances.

**Dependencies:** Critical Fix 3; [Plan 25](./25-turn-credentials-and-signaling-server-abuse-plan.md).

**Complexity:** **L**

---

#### Issue: No anomaly-detection alerting

**Source:** Q605.

**Problem:** No alerting pipeline (PagerDuty / Slack / email), no
anomaly-detection heuristic, no per-client trend window, no "elevated
threshold" definition. Cross-cuts [Plan 31](./31-trust-boundaries-and-logging-monitoring-plan.md)
(broader monitoring contract).

**Impact:** Even with rate limits in place (Critical Fix 3, Plan 25),
the project has no idea when the limits are *being hit at scale* —
which is exactly the signal that a coordinated attack or a buggy
client is in flight.

**Solution:** Define SLOs; expose limit-exceeded counters at a
private metrics endpoint; commit an alerting matrix.

**Files to Update:**
- [docs/operations/rate-limits.md](#issue-no-master-rate-limit-matrix-across-all-endpoints) — cross-link to alerts

**New Files:**
- `docs/operations/alerts.md` — canonical doctrine:
  - **SLOs:** signaling 99 % `<200 ms` ack; AI gateway 95 % `<10 s`
    end-to-end; cost-ledger 100 % deterministic (no double-debit).
  - **Page-on:** rate-limit-exceeded count > N/min (per route); 5xx
    rate > 1 % over 5 min; per-IP elevated burst > 10× baseline;
    `AI_GATEWAY_DISABLED` engaged automatically.
  - **Channels:** Slack `#ops-alerts` for warnings; PagerDuty (or
    email-only at first) for S0/S1.
  - **Defer to Plan 31** for the underlying log/metric pipeline.
- `tasks/operations/12-alerts-and-slos.md` — owning task

**Implementation Steps:**
1. Author `docs/operations/alerts.md`.
2. Cross-link from Critical Fix 3 (the global kill-switch fires an
   `ai_kill_switch_engaged` alert).
3. Defer the metric-shipping pipeline to [Plan 31](./31-trust-boundaries-and-logging-monitoring-plan.md).

**Dependencies:** [Plan 31](./31-trust-boundaries-and-logging-monitoring-plan.md).

**Complexity:** **M**

---

#### Issue: TURN shared-secret store unspecified

**Source:** Q607.

**Problem:** The TURN deployment does not exist yet
([Plan 25](./25-turn-credentials-and-signaling-server-abuse-plan.md)
owns the TURN-side contract); this audit's question Q607 is the
*secret-side* of the same gap.

**Solution:** When [Plan 25](./25-turn-credentials-and-signaling-server-abuse-plan.md)
ships TURN integration, the `TURN_SHARED_SECRET` follows the
secrets doctrine (Critical Fix 1): managed in the secret manager,
injected as ENV at runtime, scoped to the credential-issuer identity
only, rotated at the cadence in Critical Fix 1's table (≤ 7 d),
covered by Critical Fix 5's leak playbook.

**Files to Update:**
- [docs/operations/secrets.md](#critical-fix-1--secrets-management-contract--envexample--repo-gitignore-hardening) — already lists `TURN_SHARED_SECRET` in the required-vars set; ensure cross-link to [Plan 25](./25-turn-credentials-and-signaling-server-abuse-plan.md)

**Complexity:** **S** (cross-link only; substantive work in [Plan 25](./25-turn-credentials-and-signaling-server-abuse-plan.md))

---

## 4. Suggested Task Breakdown

New tasks (each one a separate `tasks/operations/*.md` or `tasks/phase-3/*.md` file):

- [ ] `tasks/operations/01-secrets-doctrine.md` — Critical Fix 1
- [ ] `tasks/operations/02-secret-scanning.md` — Critical Fix 2
- [ ] `tasks/phase-3/02-ai-generation/09-ai-cost-ceiling-and-kill-switch.md` — Critical Fix 3
- [ ] `tasks/operations/03-error-envelope-and-rate-limit-response.md` — Critical Fix 4
- [ ] `tasks/operations/04-security-md-and-incident-runbook.md` — Critical Fix 5
- [ ] `tasks/phase-2/05-mod-system/05e-pack-signing-private-key-custody.md` — Critical Fix 6
- [ ] `tasks/operations/05-rate-limits-master-matrix.md` — System Improvement, master matrix
- [ ] `tasks/operations/06-log-redaction-contract.md` — System Improvement, log redaction
- [ ] `tasks/operations/07-rotation-drill.md` — System Improvement, rotation drills
- [ ] `tasks/operations/08-debug-flag-gating.md` — System Improvement, debug flags
- [ ] `tasks/operations/09-build-time-secret-audit.md` — System Improvement, build-time hygiene
- [ ] `tasks/operations/10-crash-report-deferred-decision.md` — System Improvement, crash-report deferral
- [ ] `tasks/operations/11-counter-durability.md` — System Improvement, Redis-backed counters
- [ ] `tasks/operations/12-alerts-and-slos.md` — System Improvement, alerting
- [ ] `tasks/phase-3/01-multiplayer/09-datachannel-cps-cap.md` — System Improvement, datachannel cps cap
- [ ] `tasks/phase-3/04-polish/05-chat-throttling-and-escalating-mute.md` — System Improvement, chat throttling

Existing tasks to extend (no new file, edit-in-place):

- [ ] [`tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md`](../../tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md) — add **Call-Rate Caps** and **Spend Caps** subsections (Critical Fix 3)
- [ ] [`tasks/phase-3/02-ai-generation/01-prompt-provider-structured-output-raw-json.md`](../../tasks/phase-3/02-ai-generation/01-prompt-provider-structured-output-raw-json.md) — require `costBudget`; require `estimateCost` (Critical Fix 3)
- [ ] [`tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) — **Counter Durability** section (System Improvement, Redis)
- [ ] [`tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md`](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md) — **DataChannel CPS Cap** section (System Improvement, datachannel cps cap)
- [ ] [`tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md`](../../tasks/phase-2/05-mod-system/05d-official-pack-signing-and-bundle-verification.md) — **Private-Key Custody** section (Critical Fix 6)

New canonical docs:

- [ ] `docs/operations/secrets.md`
- [ ] `docs/operations/iam.md`
- [ ] `docs/operations/rate-limits.md`
- [ ] `docs/operations/ai-cost-ceiling.md`
- [ ] `docs/operations/error-envelope.md`
- [ ] `docs/operations/log-redaction.md`
- [ ] `docs/operations/debug-flags.md`
- [ ] `docs/operations/build-time-secrets.md`
- [ ] `docs/operations/crash-report.md`
- [ ] `docs/operations/counter-durability.md`
- [ ] `docs/operations/alerts.md`
- [ ] `docs/operations/incident-response.md`
- [ ] `docs/operations/pack-signing-key.md`
- [ ] `SECURITY.md` (repo root)
- [ ] `.env.example` (repo root)
- [ ] `.gitleaks.toml` (repo root)
- [ ] `.husky/pre-commit`
- [ ] `.github/workflows/secret-scan.yml`

New schemas:

- [ ] `content-schema/schemas/error-envelope.schema.json`
- [ ] `content-schema/schemas/cost-budget.schema.json`
- [ ] `content-schema/schemas/chat-message.schema.json`
- [ ] `content-schema/schemas/mute-state.schema.json`
- [ ] `content-schema/schemas/crash-report.schema.json`

New CI checks (wired into `npm run validate`):

- [ ] `validate:secrets-discipline` — `process.env` only in `config.ts`
- [ ] `validate:secrets` — `gitleaks detect`
- [ ] `validate:rate-limits` — every route has a matrix row
- [ ] `validate:prod-bundle` — no secret patterns in `dist/**`

---

## 5. Execution Order

1. **Critical Fix 1 — Secrets Doctrine + `.env.example` + `.gitignore`**.
   Land first; everything else assumes the doctrine. **No provider
   key is created** before this is in.
2. **Critical Fix 2 — `.gitleaks.toml` + Pre-commit + CI Scan**.
   Depends on Fix 1 (allowlist references). Land before any
   provider key is created.
3. **Critical Fix 5 — `SECURITY.md` + Incident Runbook**.
   Independent of Fixes 1/2; can land in parallel. Required before
   Fixes 3 and 6 because their compromise paths cite the playbook.
4. **Critical Fix 4 — Error Envelope Schema**. Independent.
   Required before Fix 3.
5. **Critical Fix 3 — AI Gateway Rate Limits + Cost Ceiling +
   Kill-Switch**. Depends on Fixes 1, 4. Land before any
   `GenerationProvider` implementation that hits a real provider.
6. **Critical Fix 6 — Pack-Signing Private-Key Custody**. Depends on
   Fix 5 (playbook). Land before the first signed official pack
   bundle is published.
7. **System Improvements — Architecture / Operations Doctrine**:
   master matrix, log redaction, rotation cadence, debug flags,
   build-time hygiene. Independent of each other; land in any order
   after Fix 1.
8. **System Improvements — Schemas**: chat / mute / crash-report.
   Independent.
9. **System Improvements — Multiplayer**: datachannel cps cap,
   counter durability, alerts. Counter durability depends on Fix 3
   (cost-ledger storage adapter) and on
   [Plan 25](./25-turn-credentials-and-signaling-server-abuse-plan.md)
   (signaling rate-limiter).
10. **TURN secret store** (Q607) — substantive work in
    [Plan 25](./25-turn-credentials-and-signaling-server-abuse-plan.md);
    cross-link only here.

---

## 6. Risks if Not Implemented

- **Provider-budget exhaustion in hours.** Without Critical Fix 3 a
  single attacker (or buggy retry) drains the project's AI provider
  budget within an hour. (Q598, Q599)
- **First-day key leak.** Without Critical Fixes 1 and 2 the first
  developer to paste a real provider key into `.env` commits it to
  history; with no scanner, the leak is not detected; with no
  rotation runbook, it is not remediated. (Q606, Q608, Q612, Q617)
- **DoS on signaling.** The 100-room global ceiling with no per-IP
  throttle (covered substantively in
  [Plan 25](./25-turn-credentials-and-signaling-server-abuse-plan.md))
  is trivially exhausted; this plan adds the **secrets** half of the
  story (the TURN secret) and the **counter durability** half
  (Redis). Without both, even the right rate-limiter resets on
  every restart. (Q604, Q607)
- **Open-relay TURN abuse.** Without Q607's secret-side contract and
  Critical Fix 1's rotation cadence, a TURN deployment naïvely added
  later becomes an open-relay bandwidth amplifier. (Q607, Q610)
- **Pack-signing key compromise.** Without Critical Fix 6 the
  default storage is a developer-laptop `.pem`. Compromise lets an
  attacker forge an "official" pack and bypass the sandbox flag —
  defeats the entire mod-trust model from
  [Plan 27](./27-save-tampering-and-pack-signing-plan.md). Recovery
  requires a coordinated client release. (Q614)
- **Secret-in-logs leak.** Without the log-redaction contract the
  first `console.error(err)` that includes an `Authorization` header
  ends up in hosting-provider logs (often retained ≥ 30 d). (Q609)
- **Permanent compromise on leak.** Without rotation (Critical Fix 1
  cadence + System Improvement 7 drill) and without the playbook
  (Critical Fix 5), a single leak forces a coordinated client
  redeploy or stays exploitable indefinitely. (Q610, Q613)
- **Debug-flag attack surface.** Without System Improvement 9 an
  attacker who can set `localStorage.debug = '*'` exposes verbose
  internal state — privacy leak and reverse-engineering aid in one.
  (Q618)
- **Blind operations.** Without System Improvement 7 (alerts) and
  the deferred crash-report decision (System Improvement 6) the
  project has no anomaly detection, no spend dashboards, no DoS
  visibility. The flip side is privacy-positive: until alerts ship,
  no PII is on the wire — but every silent failure stays silent.
  (Q603, Q605)
- **Datachannel peer flood.** Without System Improvement 9 a
  malicious peer drowns the local reducer until UI freezes; cross-
  cuts [Plan 26](./26-replay-tampering-and-simulation-cheating-plan.md)
  on replay-tampering integrity. (Q601)
- **Build-time secret bundling.** Without System Improvement 5 a
  source-map upload token or telemetry write-key gets baked into the
  client bundle. (Q616)

---

## 7. AI Implementation Readiness

**Score: 8 / 10** (post-plan, target).

| Area | Pre-plan | Post-plan |
| --- | --- | --- |
| Per-endpoint rate limits (Q593) | ❌ | ✔ master matrix in `docs/operations/rate-limits.md` |
| Tiered limits (Q594) | ❌ | ✔ IP / IP-prefix / session / account / global tiers committed; session/account axes deferred to Plan 24 with explicit "IP-only until then" rule |
| Edge enforcement (Q595) | ❌ | ✔ Cloudflare/fly-proxy contract under `docs/operations/rate-limits.md` (extends [Plan 24](./24-tls-enforcement-and-webrtc-authentication-plan.md)) |
| Error envelope (Q596, Q597) | ❌ | ✔ canonical schema + HTTP/WS mapping; oracle-resistance rule |
| AI per-user / per-category caps (Q598) | ❌ | ✔ Critical Fix 3 |
| AI daily/weekly cap + kill-switch (Q599) | ❌ | ✔ Critical Fix 3 |
| Room-creation limits (Q600) | ✔ N/A by lobby omission | ✔ unchanged |
| DataChannel cps cap (Q601) | ❌ | ✔ task **09** under multiplayer |
| Chat throttling + escalating mute (Q602) | ❌ | ✔ task **05** under polish + schemas |
| Crash-report system (Q603) | ❌ | ⚠ explicitly deferred with pre-committed shape and rate-limit row |
| Counter resilience (Q604) | ❌ | ✔ Redis adapter + clock guidance |
| Anomaly alerts (Q605) | ❌ | ✔ alerts doctrine; pipeline deferred to [Plan 31](./31-trust-boundaries-and-logging-monitoring-plan.md) |
| AI key location (Q606) | ⚠ rule only | ✔ secrets doctrine |
| TURN secret store (Q607) | ❌ | ✔ doctrine cross-link; substantive work in [Plan 25](./25-turn-credentials-and-signaling-server-abuse-plan.md) |
| Secret injection mechanism (Q608) | ❌ | ✔ Doppler + ENV + per-service `config.ts` |
| Secret-in-logs prevention (Q609) | ❌ | ✔ log-redaction contract |
| Rotation cadence (Q610) | ❌ | ✔ cadence table + drill task |
| Least-privilege (Q611) | ❌ | ✔ `docs/operations/iam.md` |
| Pre-commit / CI scanning (Q612) | ❌ | ✔ Critical Fix 2 |
| Leak runbook (Q613) | ❌ | ✔ Critical Fix 5 |
| Pack-signing key custody (Q614) | ⚠ verification only | ✔ Critical Fix 6 |
| Dev/prod separation (Q615) | ❌ | ✔ secrets doctrine + per-env prefixes |
| Build-time secret hygiene (Q616) | ❌ | ✔ build-time secret audit |
| `.env` exclusion (Q617) | ⚠ partial | ✔ `.gitignore` hardened |
| Debug-flag gating (Q618) | ❌ | ✔ debug-flag doctrine + prod-bundle check |

**Why 8 and not 10:**

- Two surfaces remain *intentionally deferred*, with explicit decisions
  rather than implementations: the **crash-report system** (no
  consumer; schema pre-committed) and the **session/account axis**
  (deferred to [Plan 24](./24-tls-enforcement-and-webrtc-authentication-plan.md);
  IP-only until then).
- The **alerting pipeline body** lives in
  [Plan 31](./31-trust-boundaries-and-logging-monitoring-plan.md);
  this plan only commits the SLO and matrix.
- The **prod-bundle check** depends on the first client build task
  (out of scope here); the doctrine is committed but the CI gate
  cannot run yet.
- Closing those three (crash-report opt-in lands, session/account
  axis lands via Plan 24, prod-bundle check is wired once a build
  exists) lifts this to 10/10.

A naive autonomous implementer following **this plan** ships an AI
gateway with a Doppler-managed key, per-account rate limits, a daily
cost cap, an automatic kill-switch, a `429`-shaped error envelope,
gitleaks blocking commits with secret patterns, a `.gitignore` that
excludes `.env*` and key files, a `SECURITY.md` with an incident
playbook, a pack-signing key on a YubiKey, and a debug-flag rule that
makes verbose logs build-time-only — none of which exists today.
