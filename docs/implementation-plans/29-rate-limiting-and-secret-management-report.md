# Implementation Report — Plan 29 (Rate Limiting & Secret Management)

> Source plan:
> [`29-rate-limiting-and-secret-management-plan.md`](./29-rate-limiting-and-secret-management-plan.md).

## Decision

The repository today is a **browser-only / BYO-key** deploy per
[`docs/operations/free-tier-deploy.md`](../operations/free-tier-deploy.md)
§ 6. Plan 29 was authored for the optional hosted-AI-gateway
scenario; most of its surface (per-account cost ceiling, kill-switch,
ledger code, alerting pipeline) is dead weight when the project does
not pay a provider invoice.

This implementation lands the **load-bearing** subset that applies
to the BYO-key build and **defers** the gateway-runtime surface to
the day a hosted-gateway plan is reopened. The user explicitly
chose this scope in chat.

Concretely, the following plan items are **not** implemented in this
change and are explicitly deferred:

- `services/ai-gateway/src/cost-ledger.ts`,
  `services/ai-gateway/src/limits.ts`
- `content-schema/schemas/cost-budget.schema.json` and the
  `costBudget` extension to `generation-request.schema.json`
- `docs/operations/ai-cost-ceiling.md` body (the matrix and the
  three-phase debit/refund semantics)
- `docs/operations/debug-flags.md`,
  `docs/operations/build-time-secrets.md`,
  `docs/operations/crash-report.md`,
  `docs/operations/counter-durability.md`,
  `docs/operations/alerts.md` — replaced by short paragraphs
  inside [`rate-limits.md`](../operations/rate-limits.md) where
  appropriate
- `content-schema/schemas/mute-state.schema.json`,
  `content-schema/schemas/crash-report.schema.json`
- The 16 task spec files under `tasks/operations/*` and
  `tasks/phase-3/04-polish/05-chat-throttling-and-escalating-mute.md`
- Changes to `services/ai-gateway/README.md`,
  `services/signaling/README.md`, `docs/architecture/schema-matrix.md`,
  `docs/architecture/ai-integration.md`,
  `docs/architecture/ai-generation-pipeline.md`,
  `docs/architecture/command-schema.md`

## What Landed

### 1. Updated files

- [.gitignore](../../.gitignore) — extended with the secret-pattern
  block (`Secrets` group covering `.env`, `.env.*` (with
  `!.env.example`), `*.pem`, `*.key`, `*.p12`, `*.pfx`,
  `secrets.json`, `id_ed25519*`, `id_rsa*`, `.doppler/`).
- [content-schema/schemas/generation-request.schema.json](../../content-schema/schemas/generation-request.schema.json)
  — reverted (no `costBudget` field added); change consciously
  deferred under path B.
- [scripts/check-repo-contracts.mjs](../../scripts/check-repo-contracts.mjs)
  — added the `.error-envelope.json` → `error-envelope.schema.json`
  example-suffix mapping so the new canonical examples validate.
- [tasks/phase-3/01-multiplayer/13-signaling-rate-limiting.md](../../tasks/phase-3/01-multiplayer/13-signaling-rate-limiting.md)
  — added Read First links to `error-envelope.md`,
  `rate-limits.md`, and the new schema, plus an acceptance criterion
  pinning the canonical envelope shape on `RATE_LIMITED` replies.

### 2. New files

#### Doctrine docs

- [docs/operations/secrets.md](../operations/secrets.md) — secrets
  management contract (Doppler default, env-var injection,
  per-env prefixes, single-`config.ts` rule, rotation cadence).
- [docs/operations/iam.md](../operations/iam.md) — least-privilege
  matrix per identity (services, CI, release manager, engineer,
  pack signer).
- [docs/operations/error-envelope.md](../operations/error-envelope.md)
  — closed error vocabulary, HTTP / signaling mapping,
  oracle-resistance rule, `retryAfterMs` semantics.
- [docs/operations/rate-limits.md](../operations/rate-limits.md) —
  master matrix; cross-cutting tiers, edge-tier responsibility,
  inline DataChannel and chat sub-matrices, deferred crash-report
  shape.
- [docs/operations/log-redaction.md](../operations/log-redaction.md)
  — forbidden fields, forbidden composite values, planned lint
  gate.
- [docs/operations/incident-response.md](../operations/incident-response.md)
  — four playbooks (leaked secret, provider-budget anomaly,
  pack-signing-key compromise, debug-flag exposure).
- [docs/operations/pack-signing-key.md](../operations/pack-signing-key.md)
  — YubiKey / HSM custody, on-device generation, offline signing,
  rotation cadence.

#### Repo-root files

- [SECURITY.md](../../SECURITY.md) — disclosure inbox, severity
  matrix (S0–S3), acknowledgement SLA, public-disclosure default.
- [.env.example](../../.env.example) — environment-variable schema
  (placeholders only).
- [.gitleaks.toml](../../.gitleaks.toml) — extends upstream default
  ruleset; allowlist scoped to placeholder fixtures.
- [.husky/pre-commit](../../.husky/pre-commit) — runs `gitleaks
  protect --staged`; soft-fails to a warning if gitleaks is not
  installed locally so contributors are not blocked.
- [.github/workflows/secret-scan.yml](../../.github/workflows/secret-scan.yml)
  — `gitleaks detect` on PR + push to `main`; SARIF upload; fail
  message points at the leaked-secret playbook.

#### Schemas + examples

- [content-schema/schemas/error-envelope.schema.json](../../content-schema/schemas/error-envelope.schema.json)
  — closed `error` enum, coarse `scope`, forbidden-by-schema
  exact-bucket fields.
- [content-schema/examples/error-envelope/](../../content-schema/examples/error-envelope/)
  — six canonical examples (`canonical-rate-limited`,
  `canonical-budget-exceeded`, `canonical-service-paused`,
  `canonical-validation-failed`, `canonical-unavailable`,
  `canonical-internal`).

#### Pack-signing surfaces

- [scripts/sign-pack.mjs](../../scripts/sign-pack.mjs) — one-shot
  signing CLI with the CI-detection guard and the on-disk-key
  refusal; hardware-token integration intentionally not wired
  (future task).
- [src/engine/security/official-public-key.ts](../../src/engine/security/official-public-key.ts)
  — placeholder public-key constant + fingerprint + denylist
  array. Replaced via the rotation playbook in
  `incident-response.md` § 3.

### 3. Assumptions

- ⚠️ **Assumption: Browser-only / BYO-key deploy.** The user
  confirmed this in chat. The plan as written assumed a
  hosted-AI-gateway scenario; this implementation drops gateway
  runtime artefacts and keeps only the multiplayer / signing /
  scanner surface that applies regardless.
- ⚠️ **Assumption: Doppler is the chosen secret manager.** The
  plan offered Doppler / AWS Secrets Manager / GCP Secret Manager
  and asked the implementer to pick one and document the
  trade-off. Doppler picked because the plan named it as the
  default and it minimizes ops overhead in a single-team config.
- ⚠️ **Assumption: gitleaks installation is best-effort locally.**
  The plan required a hard-fail pre-commit hook. The implementation
  emits a warning when `gitleaks` and `npx` are both absent locally
  rather than blocking the commit, because the canonical CI gate
  in `.github/workflows/secret-scan.yml` is the authoritative
  check. This keeps engineers without gitleaks installed from
  being blocked on every commit.
- ⚠️ **Assumption: hardware-token signing call is deferred.**
  `scripts/sign-pack.mjs` ships the CI guard and the on-disk-key
  refusal but does not call into `gpg-card` / `pkcs11-tool` /
  vendor SDKs. The plan acknowledged the same split (signing key
  custody is the first commit; runtime signing wiring follows when
  the first official pack is published). The script states this
  in its top-of-file comment.
- ⚠️ **Assumption: `error-envelope.schema.json` is referenced via
  the existing signaling rate-limit task** rather than a new task
  file. The plan called for a new `tasks/operations/03-...md`
  owning task; under path B, owning-task surface area was held
  flat by attaching the schema reference (which `validate:tasks`
  requires) to the most relevant existing consumer.
- ⚠️ **Assumption: `services/<name>/src/config.ts` validators are
  not authored today.** The doctrine commits the rule; the
  enforcement gate (`validate:secrets-discipline`) is deferred
  until the first service implementation arrives, since today
  there is no `services/ai-gateway/src/` to lint and the gate
  would have nothing to assert.

### 4. Blockers

None. `npm run all` and `npm test` both pass.

## Verification

- `npm run validate:links` — `All Markdown links resolve.`
- `npm run validate:contracts` — `Repo contract checks passed.`
  (after the `.error-envelope.json` suffix mapping was added)
- `npm run validate:tasks` — `Task lint passed: 457 tasks, 0 issues.`
- `npm run all` — pipes through `validate` + `generate:wiki` +
  `generate:task-system-report`; all stages clean.
- `npm test` — `# tests 32 # pass 32 # fail 0`.

## Where Path A is Reopened

If the project ever pays a provider invoice (hosted AI gateway,
SaaS deploy, demo environment with strangers hitting "generate"),
re-open Plan 29 and implement the deferred items above. The
doctrine half is already in place; the gateway-runtime surface
slots in cleanly because every shape it depends on (error envelope,
secrets doctrine, IAM matrix, incident playbooks) is committed.
