# Architecture Docs

This folder contains the design source of truth for the engine and
creator platform.

## Files

- `overview.md`
  The shortest high-signal architecture summary.
- `state-flow.md`
  Game loop, command dispatcher, and state mutation boundaries.
- `command-schema.md`
  Canonical reference for all game commands (MOVE_HERO, RECRUIT_UNITS, BATTLE_ATTACK, etc.).
- `determinism.md`
  Rules for RNG, math, replay, and desync-safe implementation.
- `content-platform.md`
  The pack/content model, extensibility rules, and update strategy.
- `pack-contract.md`
  Canonical manifest fields, pack layout, archive rules, and trust flags.
- `effect-registry.md`
  Closed gameplay-effect vocabulary and extension rules.
- `ai-integration.md`
  Provider-neutral boundary for AI generation and moderation work.
- `ai-contract.md`
  Single source of truth for the gameplay-opponent AI runtime
  (heuristic + MCTS): input view projection, worker protocol,
  per-turn budget table, cancellation, parallelism, decision
  log, BotProvider, and cheats. Provider-backed content
  generation remains in `ai-integration.md`.
- `renderer-technology-choice.md`
  WebGL2 selection rationale and implementation approach.
- `schema-matrix.md`
  Concrete schema inventory, example records, and dependency hints.
- `glossary.md`
  Stable project terms used across tasks, schemas, and docs.
- `master-plan.md`
  Compact single-file architecture summary.
- `diagrams/`
  Per-scenario Mermaid diagrams (game startup, race → castle, battle
  attack sequence, asset loading per context, localization, save/load,
  etc.). One `.md` per scenario plus `index.json`. See
  [`diagrams/README.md`](diagrams/README.md) for format and authoring
  rules. Rendered inside the architecture wiki on every build.
- `wiki/screens/`
  Numbered UI screen packages. Each package has `mockup.html` for the
  visual state, `spec.md` for components and state bindings,
  `interactions.md` for per-control behavior, `data-contracts.md` for
  schema/config/localization/asset links, and `architecture.md` for
  screen-specific logic diagrams. The sibling `index.json` assigns each
  package to one UI group. Package numbers follow that group order so
  every wiki section reads in a natural numeric sequence. The index must
  cover every screen exactly once. See
  [`wiki/README.md`](wiki/README.md) for authoring rules.
- `runtime-requirements.md`
  Load-bearing runtime preconditions (UI shell, WebGL2 floor, Web
  Workers, Web Crypto, IndexedDB quota, time source, gzip pin,
  browser engine floor, cross-environment serializer parity). Each
  precondition has a stable `RR-NN` ID; tasks must cite the ID, not
  re-author the precondition.
- `observability.md`
  `Logger` / `MetricsSink` interfaces, per-match anonymous-stats
  schema (`telemetry-event.schema.json`), required-emissions
  catalogue, and privacy redaction rules.
- `error-ux.md`
  Player-facing error surface decision matrix, code → surface
  mapping, localization-key convention, and the `error.shown`
  telemetry rule. The error *shape* (validation-error /
  dispatcher-error / storage-error schemas) is owned by
  `error-taxonomy.md`; this doc owns the surface.
- `chat-safety.md`
  Single source of truth for lobby-chat safety: dedicated
  DataChannel reservation, envelope schema, NFKC + control + bidi
  normalization, plain-text rendering contract, per-peer
  rate limit, mute / block, report bundle, retention, and the
  trust-model disclosure banner.
- `../operations/rollback-playbook.md`
  Operations-side runbook for content / engine / save rollback,
  kill-switch policy, hot-fix migration, and the incident-response
  RACI table.
- `../planning/decision-log.md`
  Register of cross-cutting locked decisions that don't have a single
  canonical source. Most decisions live inline in the file they
  govern; this log is the fallback for genuinely cross-cutting ones.
- `../planning/deferred.md`
  Single register of deferred / out-of-scope items (`DEF-NNN`).
- `architecture-wiki.html`
  **Unified read-only viewer** for architecture docs, general diagrams,
  and numbered UI screen packages. Screen pages have these tabs: Mockup,
  Spec, Interactions, Data Contracts, and Architecture Diagrams. Open
  directly via `file://` — no server needed. Run
  `npm run generate:wiki` after editing any source file to rebuild it.

## Companion Inputs

- `../../research/deep-research-report.md`
  Baseline balance corridor and numeric guardrails used by rulesets,
  faction authoring, and AI-generation checks.
- `../../content-schema/README.md`
  Canonical machine-readable contract layout and example-fixture
  layout.

## Suggested Reading Order

1. `overview.md`
2. `determinism.md`
3. `content-platform.md`
4. `pack-contract.md`
5. `schema-matrix.md`
6. `effect-registry.md`
7. `ai-integration.md`
8. `ai-contract.md`
9. `master-plan.md`
