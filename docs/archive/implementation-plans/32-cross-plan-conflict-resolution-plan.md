# Implementation Plan: 32 — Cross-Plan Conflict Resolution & Doctrine Reconciliation

> Source review: post-hoc review of implementation reports 03 → 31
> performed 2026-05-06.
> No new audit; this plan resolves contradictions and improvement
> opportunities identified by reading the 28 landed reports against
> the current repo state.
>
> Companion plans referenced: **06**, **07**, **08**, **09**, **10**,
> **12**, **13**, **14**, **16**, **17**, **22**, **24**, **25**,
> **26**, **27**, **28**, **29**, **31**.

---

## 1. Overview

The first 31 plans landed cleanly individually. Across the set, three
classes of issue accumulated:

1. **Confirmed conflicts** — concrete contradictions between landed
   artifacts that will fail at first runtime.
2. **Naming and namespace clashes** — semantically distinct artifacts
   that share confusing names, or duplicated data with silent-drift
   risk.
3. **Process patterns** — recurring workflow taxes (slot
   renumbering, missing-folder mapping, script-extension split,
   doctrine-without-runtime drift, `CLAUDE.md` churn, hash-primitive
   sprawl, persistence-budget aggregation).

The repository is still pre-runtime, so every fix is doctrine-,
schema-, or task-shape-only. No code is touched. No runtime is
introduced. The plan is additive-first; existing schemas and tasks
are extended, not rewritten.

This plan is anchored in already-landed sources of truth:

- [`worker-message.schema.json`](../../../content-schema/schemas/worker-message.schema.json) and
  [`tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md`](../../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md)
  (Conflict A.1).
- [`tasks/mvp/06-renderer/09-atlas-pipeline.md`](../../../tasks/mvp/06-renderer/09-atlas-pipeline.md)
  (Conflict A.2).
- [`docs/architecture/ai-contract.md`](../../architecture/ai-contract.md)
  and [`docs/architecture/determinism.md`](../../architecture/determinism.md)
  (Conflict A.3).
- [`content-schema/schemas/validation-error.schema.json`](../../../content-schema/schemas/validation-error.schema.json)
  vs
  [`content-schema/schemas/dispatcher-validation-error.schema.json`](../../../content-schema/schemas/dispatcher-validation-error.schema.json)
  (Clash B.1).
- The eight envelope-family schemas under
  [`content-schema/schemas/`](../../../content-schema/schemas/) (Clash B.2).
- [`content-schema/balance/corridor.json`](../../../content-schema/balance/corridor.json)
  and
  [`content-schema/schemas/balance-constraints.schema.json`](../../../content-schema/schemas/balance-constraints.schema.json)
  (Clash B.3).
- [`services/multiplayer/turn-config.md`](../../../services/multiplayer/turn-config.md)
  and [`docs/architecture/turn-credentials.md`](../../architecture/turn-credentials.md)
  (Clash B.4).
- [`docs/architecture/performance.md`](../../architecture/performance.md)
  and [`docs/architecture/ai-contract.md`](../../architecture/ai-contract.md)
  (Clash B.5).
- [`scripts/tasks.mjs`](../../../scripts/tasks.mjs) (Pattern C.1).
- [`docs/architecture/storage-policy.md`](../../architecture/storage-policy.md)
  and [`docs/architecture/runtime-requirements.md`](../../architecture/runtime-requirements.md)
  (Pattern C.7).

---

## 2. Critical Fixes

### CF-1 — Reconcile the AI worker envelope

**Problem.** Plan 31 closed [`worker-message.schema.json`](../../../content-schema/schemas/worker-message.schema.json)
to `COMPUTE_MOVE | MOVE_RESULT | ABORT | PING | PONG`. Plan 10 added
`AI_ERROR`, `AI_TRACE_REQUEST`, `AI_TRACE_RESULT` to
[`task-command-token-coverage.json`](../../architecture/task-command-token-coverage.json)
and to the AI worker task. The two are mutually inconsistent: at first
runtime, `securityLog()`'s AJV gate will reject every error / trace
message.

**Fix.** Extend the `kind` enum in `worker-message.schema.json`
**additively** to include all three Plan-10 kinds, and add the matching
required-field branches:

- `AI_ERROR` — required: `requestId`, `reason: string`. Optional:
  `code`, `details`.
- `AI_TRACE_REQUEST` — required: `requestId`. Optional: `verbosity`.
- `AI_TRACE_RESULT` — required: `requestId`, `wants`, `scored`,
  `command`, `reasoning`. Plan-10 owners.

Also:

- Run `npm run generate:enum-snapshot` and commit the diff.
- Add a per-kind reference row in
  [`docs/architecture/ai-contract.md`](../../architecture/ai-contract.md)
  § 3 (Worker Protocol) listing all 8 kinds and their owners.
- Update the description on `AI_TRACE_REQUEST` and `AI_TRACE_RESULT`
  to declare them **dev-only** (gated behind the inspector overlay
  build flag) so they cannot leak into prod.

**Acceptance criteria.**

- `worker-message.schema.json` `kind` enum has 8 values.
- `validate:enums` passes.
- Existing canonical examples under `content-schema/examples/worker-message/`
  remain valid.
- `tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md` and
  `tasks/phase-3/05-observability/02-worker-message-validation.md`
  both cite the 8-kind enum.

**Owning task.** New task
`tasks/mvp/02-content-schemas/<next>-worker-message-envelope-reconciliation.md`
(allocator-assigned slot per CF-3).

---

### CF-2 — Rebase the atlas-pipeline owned paths

**Problem.** Plan 26 deleted the `tools/` directory wholesale. Plan 09's
[`tasks/mvp/06-renderer/09-atlas-pipeline.md`](../../../tasks/mvp/06-renderer/09-atlas-pipeline.md)
still declares `tools/atlas/pack.ts`, `tools/atlas/README.md`, and
`tools/atlas/` as `Owned Paths`. The directory does not exist. When
the task is started, `tasks:start` will plant files in a deleted
location.

**Fix.** Edit `tasks/mvp/06-renderer/09-atlas-pipeline.md`:

- Replace `tools/atlas/pack.ts` → `scripts/atlas/pack.mjs` (until TS
  toolchain lands per CF-3.b; once TS lands, port in place).
- Replace `tools/atlas/README.md` → `scripts/atlas/README.md`.
- Replace `tools/atlas/` → `scripts/atlas/` in `Owned Paths`.
- Update any `Outputs` cite of `tools/atlas/...` accordingly.
- Update [`docs/architecture/atlas-pipeline.md`](../../architecture/atlas-pipeline.md)
  invocation section to reference the new path.

**Acceptance criteria.**

- `validate:tasks` passes.
- `validate:links` passes.
- A grep for `tools/` returns zero hits in `tasks/mvp/` and zero hits
  in `docs/architecture/atlas-pipeline.md`.

**Owning task.** Same file edited in place; no new task needed.

---

### CF-3 — Pin the AI broadcaster rule for wall-clock budgets

**Problem.** Plan 09 added "wall-clock-driven AI truncation is
forbidden in deterministic paths" to
[`determinism.md`](../../architecture/determinism.md). Plan 10 reconciled
this with per-turn wall-clock budgets that can fire and emit a
`Command`, arguing the chosen `Command` is logged so replay is
bit-identical. The single-player path is sound. The multiplayer path
relies on **only the broadcaster** running the search; if any future
N-peer scenario lets each peer independently run its own AI, peers
will diverge under wall-clock pressure.

**Fix.** Add an explicit normative section to
[`docs/architecture/ai-contract.md`](../../architecture/ai-contract.md)
§ 6 (Parallelism) titled **"AI Determinism Under Wall-Clock Budgets"**
declaring:

- Wall-clock budgets are permitted **only** in the broadcaster-elected
  AI worker per `tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md`.
- Non-broadcaster peers MUST NOT re-run AI search; they consume the
  broadcast `Command` from the lockstep log.
- Single-player and friendly-MP-bot paths route through the same
  broadcaster gate (the local player is "broadcaster" by definition
  in single-player).
- The rule is enforced by the existing `botRngStreamId` model from
  Plan 07 § Bot RNG Sub-Streams.

Also add a one-line cross-reference in `determinism.md` § "AI Compute
Budget" pointing at the new ai-contract section.

**Acceptance criteria.**

- `ai-contract.md` § 6 carries the normative rule.
- `determinism.md` references it.
- `validate:links` passes.

**Owning task.** New task
`tasks/phase-3/01-multiplayer/<next>-broadcaster-ai-determinism-rule.md`
covers doctrine + acceptance criterion bound to Task 07.

---

## 3. Naming / Namespace Clashes

### NC-1 — Disambiguate `validation-error` schemas

**Problem.** [`validation-error.schema.json`](../../../content-schema/schemas/validation-error.schema.json)
(Plan 06) and
[`dispatcher-validation-error.schema.json`](../../../content-schema/schemas/dispatcher-validation-error.schema.json)
(Plan 12) coexist. The names invite confusion when consumers `import`
them.

**Fix.** Author a one-page
[`docs/architecture/error-schema-map.md`](../../architecture/error-schema-map.md)
that lists every error-shaped schema (`validation-error`,
`dispatcher-validation-error`, `signaling-error`, `signature-error`,
`storage-error`, `pack-error-codes`, `error-envelope`, `provider-failure`)
with one row per schema:

| Schema | Layer | When emitted | Consumer | Owning plan |

Add a top-of-file note to each error schema linking to the map. Do
**not** rename the schemas themselves; renaming would invalidate every
canonical example and downstream task. The map is the source of truth.

**Acceptance criteria.**

- `error-schema-map.md` lists all 8 error schemas with rows filled in.
- Each error schema has a `description` pointer to the map.
- `validate:links` passes.

---

### NC-2 — Make the supersession graph machine-readable

**Problem.** Plan 26 declares `command-envelope.schema.json` superseded
by `lockstep-envelope.schema.json`. Plan 25 declares the HTTP
`/turn-credential` route superseded by the `TURN_CREDENTIALS` envelope.
Plan 25 also declares the 30-day TURN rotation superseded by the 7-day
cadence. Today these are buried in plan reports; the schemas
themselves carry no machine-readable supersession marker.

**Fix.**

- Define a JSON Schema convention: each superseded schema carries a
  top-level `"x-supersededBy": "<schema-id>"` annotation and a
  `"x-supersededReason": "<plan-id>"` annotation.
- Mark `command-envelope.schema.json` and any other landed-but-replaced
  schemas accordingly.
- Add a new validator
  [`scripts/check-supersession.mjs`](../../../scripts/check-supersession.mjs)
  that fails when:
  1. a `task.Outputs` or task `Owned Paths` cites a schema with
     `x-supersededBy` and the citing task is not itself the
     supersession authority, or
  2. a new canonical example file is authored under a superseded schema.
- Wire `validate:supersession` into `npm run validate`.

**Acceptance criteria.**

- `command-envelope.schema.json` carries the new annotations.
- `validate:supersession` passes.
- The validator is documented in
  [`docs/architecture/schema-matrix.md`](../../architecture/schema-matrix.md)
  footer.

**Owning task.** New task
`tasks/mvp/02-content-schemas/<next>-supersession-annotations-and-validator.md`.

---

### NC-3 — Fold balance corridor data into one source

**Problem.** Plan 14 explicitly flagged this. Numeric tier bounds live
in **two** places:

- [`content-schema/balance/corridor.json`](../../../content-schema/balance/corridor.json)
  (consumed by `validate:balance`).
- [`content-schema/schemas/balance-constraints.schema.json`](../../../content-schema/schemas/balance-constraints.schema.json)
  (AI-generation entry point per
  [`tasks/phase-3/02-ai-generation/00b-balance-constraints-schema.md`](../../../tasks/phase-3/02-ai-generation/00b-balance-constraints-schema.md)).

**Fix.** Pin **`corridor.json` as the single source of truth**. Modify
`balance-constraints.schema.json` so its tier-corridor block is shaped
as a `$ref` projection of `corridor.json` rather than holding the
numbers itself. The example record
[`canonical.balance-constraints.json`](../../../content-schema/examples/balance-constraints/canonical.balance-constraints.json)
becomes a thin wrapper that names a corridor file, not duplicates of
its numbers.

If a `$ref` to a non-schema JSON file is incompatible with the AJV
loader, ship a generator script
[`scripts/build-balance-constraints.mjs`](../../../scripts/build-balance-constraints.mjs)
that regenerates `canonical.balance-constraints.json` from
`corridor.json` and add a `validate:balance-corridor-parity` check.

**Acceptance criteria.**

- A grep for any tier numeric bound (e.g. `"hp": { "lo":`) in the
  schema family yields exactly one source location.
- `validate:balance` passes.
- The new parity check passes.

**Owning task.** New task
`tasks/phase-3/02-ai-generation/<next>-balance-corridor-parity.md`.

---

### NC-4 — Retire the legacy TURN rotation cadence

**Problem.** [`services/multiplayer/turn-config.md`](../../../services/multiplayer/turn-config.md)
declares 30-day rotation. [`docs/architecture/turn-credentials.md`](../../architecture/turn-credentials.md)
declares 7-day. Plan 25 says the new doc supersedes the old; the old
file's "Rotation Policy" section is left intact. Both files now state
authoritative cadences.

**Fix.** Edit `services/multiplayer/turn-config.md` to:

- Replace the "Rotation Policy" section with a single line:
  `Rotation: see turn-credentials.md § 9 (canonical, 7-day).`
- Keep the rest of the operational config intact.

No schema, no task, no validator change.

**Acceptance criteria.**

- A grep for `30-day` in `services/multiplayer/turn-config.md` returns
  zero hits.
- `validate:links` passes.

---

### NC-5 — Lock the AI search-budget table in one place

**Problem.** Plan 09 set placeholder per-difficulty
`maxNodes`/`maxDepth` constants. Plan 10 introduced a per-turn budget
table in `ai-contract.md` § 4 with an additional wall-clock dimension.
Both authors implicitly assumed the other's table is the source of
truth.

**Fix.** Pin the canonical table in
[`docs/architecture/ai-contract.md`](../../architecture/ai-contract.md)
§ 4 with all three columns
(`maxNodes` / `maxDepth` / `wallClockHardMs`). Edit
[`docs/architecture/performance.md`](../../architecture/performance.md)
§ "AI Compute Budget" to remove the duplicate numbers and link to
ai-contract § 4.

Edit
[`tasks/mvp/10-heuristic-ai/05-difficulty-levels-pawn-and-knight.md`](../../../tasks/mvp/10-heuristic-ai/05-difficulty-levels-pawn-and-knight.md)
to cite ai-contract § 4 as the **only** authoritative source for the
constants.

**Acceptance criteria.**

- A grep for `maxNodes:` in `docs/architecture/` yields exactly one
  source location (ai-contract.md § 4).
- `validate:links` passes.

---

## 4. Process Improvements

### PI-1 — Add a slot allocator for tasks / screens / diagrams

**Problem.** Plans 17, 18, 19, 20, 23, 24, 25, 27, 28 all had to
renumber their tasks / screens / diagrams because the literal slot
the plan named was already taken. This is a recurring tax on every
new plan.

**Fix.** Author a new script
[`scripts/allocate-slot.mjs`](../../../scripts/allocate-slot.mjs) with
the contract:

```
node scripts/allocate-slot.mjs --kind=task --module=tasks/mvp/08-persistence
→ prints next free 2-digit prefix (e.g. "20")
```

Supports `--kind` of `task`, `screen`, `diagram`. For `task`, accepts
`--module=<module-folder>`. For `screen`, scans
`docs/architecture/wiki/screens/`. For `diagram`, scans
`docs/architecture/diagrams/`.

Plus:

- Add a one-line `npm run allocate-slot -- <args>` script in
  `package.json`.
- Document it in
  [`CLAUDE.md`](../../../CLAUDE.md) "Workflow" section under the existing
  `tasks:start` / `tasks:done` block.

This does not retroactively renumber anything. It eliminates the
problem for plan 32+.

**Acceptance criteria.**

- The script prints the next free slot for each `kind`.
- `npm run allocate-slot -- --kind=task --module=tasks/mvp/02-content-schemas`
  prints the correct integer.
- A short usage example lives in
  [`AGENTS.md`](../../../AGENTS.md) "Engineering Guide" / Workflow.

**Owning task.** New task
`tasks/mvp/00-core-architecture/<next>-slot-allocator.md`.

---

### PI-2 — Map missing / aspirational folder names to real ones

**Problem.** Plans 12, 22, 24, 28 repeatedly referenced folders that
don't exist (`tasks/mvp/01-foundations/`, `tasks/mvp/02-rules-engine/`,
`tasks/mvp/00-foundation/`, `tasks/phase-1/<schema>/`). Each
implementer reverse-engineered the closest existing folder.

**Fix.** Add a section
**"Module-name aliases"** to
[`docs/planning/decision-log.md`](../../planning/decision-log.md) (the
existing append-only register) listing every aspirational name
encountered so far and its canonical mapping:

| Aspirational | Canonical | Rationale |
|---|---|---|
| `tasks/mvp/01-foundations/` | `tasks/mvp/00-core-architecture/` | … |
| `tasks/mvp/02-rules-engine/` | `tasks/mvp/02-content-schemas/` | … |
| `tasks/mvp/00-foundation/` | `tasks/mvp/00-core-architecture/` | … |
| `tasks/phase-1/<schema>/` | `tasks/mvp/02-content-schemas/` | … |
| `services/multiplayer/` | `src/net/webrtc/` (runtime) + `services/signaling/` (server) | … |

Add a one-line link from the implementation-plan template (if there
is one, else from
[`docs/archive/implementation-plans/README.md`](./README.md)) so plan authors
see this before naming new folders.

**Acceptance criteria.**

- `decision-log.md` carries the table.
- The implementation-plans README points at the table.

---

### PI-3 — Pin the script extension policy

**Problem.** Today `scripts/` is `.mjs` (Plans 04, 13, 28, 29 all
re-confirmed). Plan 06 already ships a `.ts` test under
`src/content-schema/migrations/` that requires
`node --experimental-strip-types`. Plan 16 created the `src/contracts/`
TS workspace. New authors don't know the rule.

**Fix.** Add a normative section to
[`docs/architecture/testing-conventions.md`](../../architecture/testing-conventions.md)
**"Script and test file extensions"** declaring:

- All scripts under `scripts/` ship as `.mjs` until Task
  `mvp.01-engine-core.02-set-up-vite-plus-typescript-strict-mode-per-module`
  (the Vite/TS bootstrap) lands.
- Tests under `src/**/__tests__/` are permitted as `.ts` and run via
  `node --experimental-strip-types --test`.
- TS test runners and script ports are out-of-scope until the
  bootstrap task lands; once it does, scripts migrate in batches per
  module under a new follow-up task.

Also add a
[`docs/architecture/script-extension-policy.md`](../../architecture/script-extension-policy.md)
single-page doc and link it from the Workflow section of
`CLAUDE.md` and `AGENTS.md`.

**Acceptance criteria.**

- The new doc exists and is linked.
- `validate:links` passes.

---

### PI-4 — Doctrine canary tasks per cluster

**Problem.** Plans 24, 25, 26, 27, 28, 29, 31 each shipped doctrine +
schema + spec stubs but deferred runtime to owning tasks. Today the
validation suite passes because nothing actually runs; semantic drift
between coupled schemas only surfaces at first runtime — when the
cost of fixing it is highest.

**Fix.** Author one **canary task per cluster** that exercises the
schema end-to-end with a tiny runtime scaffold. The canaries do not
implement the cluster; they prove the schemas can be **consumed** by
a single happy-path consumer.

Initial canary tasks (to be allocator-numbered):

- **Signaling cluster** —
  `tasks/phase-3/01-multiplayer/<next>-signaling-envelope-canary.md`:
  parses one canonical `signaling-message` example, dispatches it
  through a stub `verifySignalingEnvelope`, and asserts the closed
  failure surface fires on each malformed fixture.
- **Save cluster** —
  `tasks/mvp/08-persistence/<next>-save-envelope-canary.md`: parses
  a canonical `save-envelope` example, runs the parser-hardening cap
  table, and asserts the canonical refusal codes fire.
- **AI worker cluster** —
  `tasks/mvp/10-heuristic-ai/<next>-worker-envelope-canary.md`: round-
  trips a `COMPUTE_MOVE` and a `MOVE_RESULT`, plus an `AI_ERROR` (per
  CF-1) and asserts each is accepted.
- **Asset loader cluster** —
  `tasks/mvp/02b-asset-pipeline/<next>-asset-loader-canary.md`: runs
  one `tests/security/escape-vectors/` fixture descriptor through a
  stub loader and asserts the closed refusal code.

Each canary has `verifyCommands` that exit zero today (no runtime to
exercise) and become real once the owning cluster's first runtime
task lands. The point is to **reserve the contract** so the canary
fails loudly the moment a new schema change desyncs from its consumer.

**Acceptance criteria.**

- Four canary tasks exist and `validate:tasks` passes.
- Each canary's `verifyCommands` runs successfully (no-op today).
- Each canary lists the cluster's schemas as `Owned Paths (shared)`
  with the additive-extension acceptance bullet.

---

### PI-5 — Cluster `CLAUDE.md`'s Read-First list

**Problem.** `CLAUDE.md`'s Read-First list now has 47+ entries; it
sits over the 200-line truncation threshold for memory loading. Each
plan from 16+ added entries; the order has drifted.

**Fix.** Restructure Read-First into named clusters with stable
intra-cluster order:

```
## Read first — Determinism core (1–4)
## Read first — Content platform (5–9)
## Read first — UI surface (10–28)
## Read first — Engine support (29–34)
## Read first — Operations (35–38)
## Read first — Decision and policy registers (39–47)
```

Update [`AGENTS.md`](../../../AGENTS.md) to mirror the same clustering.

The list contents are unchanged; the integers within each cluster are
unchanged. Only cluster headers are added. New plans append within a
cluster and never need to renumber the whole list.

**Acceptance criteria.**

- `CLAUDE.md` Read-First is broken into named clusters.
- The total file length stays under 600 lines.
- `validate:links` passes.

---

### PI-6 — Single crypto-primitives reference

**Problem.** Asset integrity uses SHA-256 (Plan 13), state-hash uses
xxh64 (Plan 08), save MAC uses HMAC-SHA-256 (Plan 27), TURN credentials
use HMAC-SHA-1 (Plan 07/25), manifest `assetDigest` uses xxh64 over
canonical-JSON (Plan 27), DTLS fingerprint uses SHA-256 (Plan 24).
Each pick has a justifiable rationale, but the rationales live in
seven different docs.

**Fix.** Author
[`docs/architecture/crypto-primitives.md`](../../architecture/crypto-primitives.md)
with a single canonical table:

| Surface | Primitive | Why this primitive | Rotation | Owner doc |
|---|---|---|---|---|
| Asset bytes integrity | SHA-256 | … | … | `pack-contract.md` |
| State hash | xxh64 | speed + non-cryptographic | n/a | `determinism.md` |
| Save MAC | HMAC-SHA-256 | tamper-evident | per match | `save-envelope-mac.md` |
| TURN credentials | HMAC-SHA-1 | RFC 5766 mandate | 7 days | `turn-credentials.md` |
| Manifest digest | xxh64 over canonical-JSON | binds inner sha256s cheaply | n/a | `pack-signing.md` |
| DTLS fingerprint | SHA-256 | RFC 8122 floor | session | `dtls-fingerprint-pinning.md` |
| Pack signature | Ed25519 | small, fast, well-supported | per-key | `pack-signing.md` |
| Lockstep MAC | HMAC-SHA-256 | per-match | per-match | `lockstep-envelope.md` |

Cross-link from each owner doc back to this table. Augment
[`crypto-rules.md`](../../architecture/crypto-rules.md) (Plan 22) with a
top-of-file pointer to the new table.

**Acceptance criteria.**

- `crypto-primitives.md` exists with all current callsites enumerated.
- Each owner doc carries a one-line backlink.
- `validate:links` passes.

---

### PI-7 — Storage budget aggregator

**Problem.** Plans 21, 22, 23, 24 each added IndexedDB stores
(`hr-profile.consent`, `hr-profile.audit`, `hr-profile.knownPeers`,
`hr-profile.privacy`, …). Plan 17 set the runtime requirement at
≥ 50 MB IndexedDB. Plan 12 added the `storage-policy.md` per-store
byte-budget table. No plan totals the actual budget against the floor.

**Fix.** Author validator
[`scripts/check-storage-budget.mjs`](../../../scripts/check-storage-budget.mjs):

- Parses [`docs/architecture/storage-policy.md`](../../architecture/storage-policy.md)'s
  per-store byte caps.
- Sums them.
- Asserts the total is ≤ the floor declared in
  [`docs/architecture/runtime-requirements.md`](../../architecture/runtime-requirements.md)
  RR-05 (IndexedDB ≥ 50 MB).
- Allows a documented headroom multiplier (e.g. 1.5×) to leave slack
  for browser overhead.

Wire `validate:storage-budget` into `npm run validate`.

**Acceptance criteria.**

- `validate:storage-budget` passes today.
- A test fixture that adds a fake 1 GB store fails the validator.
- `runtime-requirements.md` and `storage-policy.md` cross-link the
  validator.

**Owning task.** New task
`tasks/mvp/08-persistence/<next>-storage-budget-validator.md`.

---

## 5. Out of Scope

The following items were considered and explicitly deferred:

- **Renaming `dispatcher-validation-error.schema.json` to a non-`validation`
  name.** Plan-12 author already chose the safe path; renaming would
  invalidate every canonical example and downstream task. The
  `error-schema-map.md` doc (NC-1) is the cheaper, equivalent-value
  fix.
- **Retroactive task renumbering.** All previously-renumbered tasks
  stay at their current slots. Allocator (PI-1) prevents future
  renumbering only.
- **Migrating scripts from `.mjs` to `.ts` now.** Out of scope until
  the Vite/TS bootstrap task lands. PI-3 codifies the rule until
  then.
- **Hosted-AI-gateway runtime artifacts** (Plan 29 § "deferred"). This
  plan does not reopen Path A.
- **N-peer multiplayer mesh.** CF-3 only documents the broadcaster
  rule; N-peer remains deferred per Plan 07 / `glossary.md` M7
  sketches.
- **Decision-log entries for every prior plan.** Plan 17 introduced
  the register; back-filling DEC entries for plans 03–16 is a
  separate cleanup.

---

## 6. Execution Order

Order is chosen so each step's gate stays green and downstream steps
don't fight rebases:

1. **CF-2** (atlas paths) — pure path edit; no dependencies.
2. **NC-4** (TURN rotation cleanup) — pure doc edit; no dependencies.
3. **CF-1** (worker envelope) — additive enum; regen enum snapshot.
4. **PI-1** (slot allocator) — used by every later step that adds tasks.
5. **PI-2** (folder-name aliases) — informational; pre-empts future
   confusion.
6. **PI-5** (CLAUDE.md clustering) — purely structural.
7. **NC-1** (error-schema-map) — single-doc add.
8. **NC-2** (supersession annotations + validator) — schema annotation
   plus new validator.
9. **NC-3** (balance corridor parity) — generator + parity check.
10. **NC-5** (AI budget table lock) — doc move.
11. **CF-3** (broadcaster rule) — doc add + cross-ref.
12. **PI-3** (script extension policy) — doc add.
13. **PI-6** (crypto primitives table) — doc add with backlinks.
14. **PI-7** (storage budget validator) — new validator + wiring.
15. **PI-4** (canary tasks) — task authoring; uses PI-1 allocator.

Each step lands in its own commit. After step 8 (the new validator
gate), `npm run validate` is green and serves as the trip-wire for
later steps.

---

## 7. Acceptance Criteria (Plan-Wide)

- All three Critical Fixes (CF-1, CF-2, CF-3) verified per their
  per-section acceptance criteria.
- All five Naming Clashes (NC-1 through NC-5) verified per their
  per-section acceptance criteria.
- All seven Process Improvements (PI-1 through PI-7) verified per
  their per-section acceptance criteria.
- `npm run all` is green: validate (with new `validate:supersession`,
  `validate:storage-budget`, `validate:balance-corridor-parity`)
  + generate:wiki + generate:task-system-report.
- `npm test` is green: 32/32 (or whatever count is current).
- A grep across `docs/`, `tasks/`, and `content-schema/` returns:
  - zero `tools/atlas` references,
  - zero `30-day` references in `services/multiplayer/turn-config.md`,
  - exactly one source for `maxNodes:` in `docs/architecture/`,
  - exactly one source for tier corridor numerics in
    `content-schema/`.
- `worker-message.schema.json` `kind` enum has 8 values.
- `error-schema-map.md` lists 8 error schemas.
- `crypto-primitives.md` lists 8 surfaces.

---

## 8. New Tasks Authored

Slots are allocator-assigned at execution time per PI-1; placeholders below.

| Slot | Path | Purpose |
|---|---|---|
| `<TBD>` | `tasks/mvp/02-content-schemas/<n>-worker-message-envelope-reconciliation.md` | CF-1 |
| `<TBD>` | `tasks/phase-3/01-multiplayer/<n>-broadcaster-ai-determinism-rule.md` | CF-3 |
| `<TBD>` | `tasks/mvp/02-content-schemas/<n>-supersession-annotations-and-validator.md` | NC-2 |
| `<TBD>` | `tasks/phase-3/02-ai-generation/<n>-balance-corridor-parity.md` | NC-3 |
| `<TBD>` | `tasks/mvp/00-core-architecture/<n>-slot-allocator.md` | PI-1 |
| `<TBD>` | `tasks/phase-3/01-multiplayer/<n>-signaling-envelope-canary.md` | PI-4 |
| `<TBD>` | `tasks/mvp/08-persistence/<n>-save-envelope-canary.md` | PI-4 |
| `<TBD>` | `tasks/mvp/10-heuristic-ai/<n>-worker-envelope-canary.md` | PI-4 |
| `<TBD>` | `tasks/mvp/02b-asset-pipeline/<n>-asset-loader-canary.md` | PI-4 |
| `<TBD>` | `tasks/mvp/08-persistence/<n>-storage-budget-validator.md` | PI-7 |

---

## 9. New Architecture Docs

- [`docs/architecture/error-schema-map.md`](../../architecture/error-schema-map.md) (NC-1)
- [`docs/architecture/crypto-primitives.md`](../../architecture/crypto-primitives.md) (PI-6)
- [`docs/architecture/script-extension-policy.md`](../../architecture/script-extension-policy.md) (PI-3)

---

## 10. New Validators

- `validate:supersession` (NC-2) — `scripts/check-supersession.mjs`.
- `validate:balance-corridor-parity` (NC-3) — embedded in or
  parallel to existing `validate:balance`.
- `validate:storage-budget` (PI-7) — `scripts/check-storage-budget.mjs`.

All wired into `npm run validate` aggregate.

---

## 11. Risk Notes

- **Enum-snapshot regen (CF-1).** Adding 3 enum values is additive,
  but the regen will produce a diff on `enums.snapshot.json`. Commit
  the diff in the same change per the existing CLAUDE.md rule.
- **Supersession annotation backfill (NC-2).** Marking
  `command-envelope.schema.json` as superseded is fine because Plan
  26 already declared it superseded. If any task still cites it as a
  consumer (verify with grep), that task gets a `Read First` redirect
  rather than failing the new validator on day one.
- **Balance-corridor parity (NC-3).** If `$ref` from a JSON Schema
  to a non-schema JSON file is rejected by AJV, fall back to the
  generator-script approach so the parity is mechanical rather than
  schematic.
- **Slot allocator semantics (PI-1).** The allocator must be
  deterministic — two parallel calls in the same registry state must
  return distinct slots only if a write happens between them. Today
  there's no concurrent write contention, so a simple "scan
  directory, return max+1" suffices. Document this limit so future
  parallelism work knows to revisit.
- **Storage-budget headroom (PI-7).** The 1.5× multiplier is a
  guess; tighten once the first runtime persistence work surfaces
  real overhead numbers from the IndexedDB wrapper.

---

## 12. Plan Score

This plan does not target an AI-readiness score. It is a
**reconciliation plan**, closing concrete gaps rather than auditing
new ones. The closest equivalent metric is "issues resolved":

- 3 confirmed conflicts (CF-1, CF-2, CF-3) → all closed.
- 5 naming clashes (NC-1 through NC-5) → all closed.
- 7 process patterns (PI-1 through PI-7) → all closed.

Net: 15 / 15 issues addressed.
