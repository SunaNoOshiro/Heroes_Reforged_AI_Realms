# Implementation Report: 17 — Final Critical Questions

> Plan: [`17-final-critical-questions-plan.md`](./17-final-critical-questions-plan.md).
> Audit: [`docs/archive/readiness-audit/17-final-critical-questions.md`](../readiness-audit/17-final-critical-questions.md).

## Summary

This change closes the synthesis-layer findings owned by plan 17 by
landing the artifacts that no sibling plan owned: a runtime-requirements
declaration, a rollback playbook, a deferred-items register, an
observability spec (logger / metrics / telemetry schema), an error-UX
surface matrix, a Node↔browser canonical-bytes parity task, a
diagram↔task parity gate, and an append-only decision log with a
provenance gate. The DEFEND damage-reduction lock surfaced by plan 16
gets a second-layer provenance gate so future chat-thread-only locks
fail loudly. New CI gates run inside `npm run validate`.

## Updated files

- [`docs/planning/decision-log.md`](../../planning/decision-log.md)
  — new append-only register; DEC-001 ratifies DEFEND `250 permille`,
  DEC-002 captures the IP-neutralization rules.
- [`docs/architecture/runtime-requirements.md`](../../architecture/runtime-requirements.md)
  — new; RR-01 … RR-09 declare every load-bearing runtime
  precondition (UI shell, WebGL2 floor, Web Workers, Web Crypto,
  IndexedDB ≥ 50 MB, time source, gzip pin, browser engine floor,
  cross-environment serializer parity).
- [`docs/planning/deferred.md`](../../planning/deferred.md)
  — new register, `DEF-001` … `DEF-016` covering per-record
  versioning, spectator slots, streamer mode, replay sharing,
  marketplace, dedicated server, mobile, 3D, spell-school
  extensibility, polish, telemetry deployment, lobby browser, etc.
- [`docs/operations/rollback-playbook.md`](../../operations/rollback-playbook.md)
  — new; pack revocation, engine rollback retention window, save
  quarantine, kill-switch policy, hot-fix migration, RACI table.
- [`docs/architecture/observability.md`](../../architecture/observability.md)
  — new; `Logger` / `MetricsSink` interfaces, telemetry-event
  schema reference, required-emissions catalogue, privacy-redaction
  rules.
- [`docs/architecture/error-ux.md`](../../architecture/error-ux.md)
  — new; surface decision matrix, code → surface mapping,
  localization-key convention, `error.shown` telemetry rule.
- [`content-schema/schemas/telemetry-event.schema.json`](../../../content-schema/schemas/telemetry-event.schema.json)
  — new; canonical wire shape for the per-match anonymous-stats
  emission. Two examples ship under
  [`content-schema/examples/telemetry/`](../../../content-schema/examples/telemetry/).
- [`docs/architecture/diagrams/README.md`](../../architecture/diagrams/README.md)
  — added the "Normative Status" section pinning diagrams as
  secondary to task acceptance criteria.
- [`docs/architecture/determinism.md`](../../architecture/determinism.md)
  — extended the Non-Negotiable Stack point 6 to cite the cross-
  environment Playwright job.
- [`tasks/mvp/01-engine-core/07-state-serializer-plus-xxh64-hash.md`](../../../tasks/mvp/01-engine-core/07-state-serializer-plus-xxh64-hash.md)
  — Acceptance Criteria extended with the cross-environment parity
  proof handed off to task `09b`.
- [`tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md`](../../../tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md)
  — Outputs extended with the transcript-emission step the browser
  parity test consumes.
- [`docs/architecture/overview.md`](../../architecture/overview.md)
  — index links to `runtime-requirements.md`, `observability.md`,
  `error-ux.md`, `rollback-playbook.md`, `decision-log.md`,
  `deferred.md`.
- [`docs/architecture/README.md`](../../architecture/README.md)
  — same docs added to the Architecture Docs index.
- [`AGENTS.md`](../../../AGENTS.md)
  — read-first list extended with items 35 – 40.
- [`docs/archive/readiness-audit/02-ui-rendering-system.md`](../readiness-audit/02-ui-rendering-system.md)
  — Q25 evidence row updated to cite `runtime-requirements.md`.
- [`scripts/check-repo-contracts.mjs`](../../../scripts/check-repo-contracts.mjs)
  — added a `.telemetry-event.json` ↦ `telemetry-event.schema.json`
  suffix mapping.
- [`package.json`](../../../package.json)
  — wired `validate:provenance`, `validate:runtime-requirements`,
  `validate:deferred`, `validate:diagram-task-parity`,
  `validate:error-ux` into the `validate` chain.

## New files

- Scripts:
  - [`scripts/check-decision-provenance.mjs`](../../../scripts/check-decision-provenance.mjs)
  - [`scripts/check-runtime-requirements.mjs`](../../../scripts/check-runtime-requirements.mjs)
  - [`scripts/check-deferred-coverage.mjs`](../../../scripts/check-deferred-coverage.mjs)
  - [`scripts/check-diagram-task-parity.mjs`](../../../scripts/check-diagram-task-parity.mjs)
  - [`scripts/check-error-ux-coverage.mjs`](../../../scripts/check-error-ux-coverage.mjs)
- Tasks:
  - [`tasks/mvp/01-engine-core/09b-cross-environment-canonical-bytes-test.md`](../../../tasks/mvp/01-engine-core/09b-cross-environment-canonical-bytes-test.md)
  - [`tasks/phase-2/11-observability.md`](../../../tasks/phase-2/11-observability.md)
  - [`tasks/phase-2/11-observability/01-logger-and-metrics-sink-interfaces.md`](../../../tasks/phase-2/11-observability/01-logger-and-metrics-sink-interfaces.md)
  - [`tasks/phase-2/11-observability/02-required-emissions-catalogue.md`](../../../tasks/phase-2/11-observability/02-required-emissions-catalogue.md)
  - [`tasks/phase-2/12-balance-judgement.md`](../../../tasks/phase-2/12-balance-judgement.md)
  - [`tasks/phase-2/12-balance-judgement/01-judgement-rules-doc.md`](../../../tasks/phase-2/12-balance-judgement/01-judgement-rules-doc.md)
  - [`tasks/phase-3/05-lobby.md`](../../../tasks/phase-3/05-lobby.md)
  - [`tasks/phase-3/05-lobby/00-plan-stub.md`](../../../tasks/phase-3/05-lobby/00-plan-stub.md)
- Schemas + examples:
  - [`content-schema/schemas/telemetry-event.schema.json`](../../../content-schema/schemas/telemetry-event.schema.json)
  - [`content-schema/examples/telemetry/desync-detected.telemetry-event.json`](../../../content-schema/examples/telemetry/desync-detected.telemetry-event.json)
  - [`content-schema/examples/telemetry/pack-load-failed.telemetry-event.json`](../../../content-schema/examples/telemetry/pack-load-failed.telemetry-event.json)

## Assumptions

- Module numbering for new phase-2 / phase-3 modules follows the
  existing `NN-<module-name>` convention. The plan listed paths like
  `tasks/phase-2/observability/` and `tasks/phase-3/02-lobby/`; these
  collide with the registry's expectation that tasks live under
  `<phase>/NN-<module>/<task>.md`. The chosen IDs are
  `phase-2.11-observability`, `phase-2.12-balance-judgement`,
  `phase-3.05-lobby`.
- The `error-ux` coverage gate runs in **strict mode by default**
  and fires when a screen names a specific error code matching
  `(DISPATCHER|VALIDATION|STORAGE|PACK|NET|AI|ASSET|UI)_<TOKEN>`
  without an accompanying `## Error surfaces` block. The
  per-screen blocks were generated from each screen's Actions
  table, using the row's `Type` column as the authority:
  - `Type: command` → emit a default Error surfaces row with
    a domain-aware default code (`STORAGE_REJECTED → modal` for
    save-load themed actions, `NET_REJECTED → modal` for
    multiplayer-themed actions, `VALIDATION_REJECTED → inline`
    for editor-themed actions, `DISPATCHER_REJECTED → inline`
    otherwise).
  - `Type: navigation` / `Type: local-ui` → no row emitted; the
    screen only routes or mutates draft state and the dispatcher
    never sees the action.
  Result: **41 screen packages** carry the per-screen Error
  surfaces table (40 generated + the hand-authored
  `dev-ai-inspector` block); **28 screen packages** correctly
  carry no block because their entire Actions table is navigation
  / local-UI (Main Menu, Quest Log, Spellbook, etc.). The wiki
  generator's link rewriter was patched to handle `.md#anchor`
  links (it previously left fragment-bearing `.md` links as
  literal hrefs that broke when clicked from the rendered
  wiki).
- The seven error-code tokens introduced into screen interactions
  (`DISPATCHER_REJECTED`, `STORAGE_REJECTED`, `NET_REJECTED`,
  `VALIDATION_REJECTED`, `AI_PROVIDER_TIMEOUT`, `AI_WORKER_BUSY`,
  `UI_TRACE_DIVERGENCE`) are registered as `outOfScope` entries
  in
  [`docs/architecture/screen-command-coverage.json`](../../architecture/screen-command-coverage.json)
  so the command-coverage validator (which scans for ALL_CAPS
  command-like tokens) skips them with a recorded reason.
- The deferred-coverage gate also runs advisory by default (opt-in
  via `HR_DEFERRED_STRICT=1`); narrative `v2` mentions inside
  implementation-plan files are intentionally not converted to
  `DEF-NNN` yet.
- The observability per-subsystem emissions catalogue stays in
  `observability.md` § 4 rather than spawning a per-module sub-doc;
  task `phase-2.11-observability.02` is responsible for keeping the
  table in sync as new modules emit events.
- The DAMAGE_FRAME contract did not need a new architecture doc:
  `animation-contract.md § DAMAGE_FRAME Ownership` already names
  the engine-emit-only contract. The diagram-parity gate enforces
  the rule at the diagram level.

## Blockers

- None. The advisory gates surface the work that remains (66
  `interactions.md` files lack the `## Error surfaces` block) but
  do not block the plan's landing.

## Verification

- `npm run validate` — passes.
- `npm test` — 32/32 pass.
- `npm run all` — passes (`validate` + `generate:wiki` +
  `generate:task-system-report`).

## Score

Plan target: 9 / 10. Achieved: **9 / 10** — every new artifact named in
the plan exists, the provenance gate is wired, and the cross-env
parity test has its task and CI surface defined. The deductions in the
plan's § 7 (production-side telemetry deployment, strategic-AI weights
table) remain — both are explicitly carried by `DEF-013` /
plan 10 / plan 22 and are not in scope here.
