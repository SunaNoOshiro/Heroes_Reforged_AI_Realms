# Architecture Docs

This folder is the design source of truth for the engine and creator
platform. For the clustered, curated reading map (the recommended
entry point for implementers) see [INDEX.md](INDEX.md). This README is
a flat directory listing of the most-cited files, with one-line
descriptions.

## Files

- [`overview.md`](overview.md) — shortest high-signal architecture
  summary.
- [`state-flow.md`](state-flow.md) — game loop, command dispatcher,
  and state mutation boundaries.
- [`command-schema.md`](command-schema.md) — canonical reference for
  all game commands (`MOVE_HERO`, `RECRUIT_UNITS`, `BATTLE_ATTACK`,
  etc.).
- [`determinism.md`](determinism.md) — RNG, math, replay, and
  desync-safe implementation rules.
- [`content-platform.md`](content-platform.md) — pack/content model,
  extensibility rules, and update strategy.
- [`pack-contract.md`](pack-contract.md) — canonical manifest fields,
  pack layout, archive rules, and trust flags.
- [`effect-registry.md`](effect-registry.md) — closed gameplay-effect
  vocabulary and extension rules.
- [`ai-integration.md`](ai-integration.md) — provider-neutral boundary
  for AI generation and moderation work.
- [`ai-contract.md`](ai-contract.md) — gameplay-opponent AI runtime
  (heuristic + MCTS): input view projection, worker protocol,
  per-turn budget table, cancellation, parallelism, decision log,
  `BotProvider`, and cheats. Provider-backed content generation
  remains in [`ai-integration.md`](ai-integration.md).
- [`renderer-technology-choice.md`](renderer-technology-choice.md) —
  WebGL2 selection rationale and implementation approach.
- [`schema-matrix.md`](schema-matrix.md) — concrete schema inventory,
  example records, and dependency hints.
- [`glossary.md`](glossary.md) — stable project terms used across
  tasks, schemas, and docs.
- [`master-plan.md`](master-plan.md) — compact single-file
  architecture summary.
- [`diagrams/`](diagrams/README.md) — per-scenario Mermaid diagrams
  (game startup, race → castle, battle attack sequence, asset loading
  per context, localization, save/load, etc.). One `.md` per scenario
  plus `index.json`. See [`diagrams/README.md`](diagrams/README.md)
  for format and authoring rules. Rendered inside the architecture
  wiki on every build.
- [`wiki/screens/`](wiki/README.md) — numbered UI screen packages.
  Each package has `mockup.html` (visual state), `spec.md` (components
  and state bindings), `interactions.md` (per-control behavior),
  `data-contracts.md` (schema / config / localization / asset links),
  and `architecture.md` (screen-specific logic diagrams). The sibling
  `index.json` assigns each package to one UI group; package numbers
  follow that group order so every wiki section reads in a natural
  numeric sequence, and the index must cover every screen exactly
  once. See [`wiki/README.md`](wiki/README.md) for authoring rules.
- [`runtime-requirements.md`](runtime-requirements.md) — load-bearing
  runtime preconditions (UI shell, WebGL2 floor, Web Workers, Web
  Crypto, IndexedDB quota, time source, gzip pin, browser engine
  floor, cross-environment serializer parity). Each precondition has
  a stable `RR-NN` ID; tasks cite the ID rather than re-author the
  precondition.
- [`observability.md`](observability.md) — `Logger` / `MetricsSink`
  interfaces, per-match anonymous-stats schema
  (`telemetry-event.schema.json`), required-emissions catalogue, and
  privacy redaction rules.
- [`error-ux.md`](error-ux.md) — player-facing error surface decision
  matrix, code → surface mapping, localization-key convention, and
  the `error.shown` telemetry rule. The error *shape* (validation /
  dispatcher / storage error schemas) is owned by
  [`error-taxonomy.md`](error-taxonomy.md); this doc owns the surface.
- [`chat-safety.md`](chat-safety.md) — single source of truth for
  lobby-chat safety: dedicated DataChannel reservation, envelope
  schema, NFKC + control + bidi normalization, plain-text rendering
  contract, per-peer rate limit, mute / block, report bundle,
  retention, and the trust-model disclosure banner.
- [`../operations/rollback-playbook.md`](../operations/rollback-playbook.md) —
  operations-side runbook for content / engine / save rollback,
  kill-switch policy, hot-fix migration, and the incident-response
  RACI table.
- [`../planning/decision-log.md`](../planning/decision-log.md) —
  register of cross-cutting locked decisions that don't have a single
  canonical source. Most decisions live inline in the file they
  govern; this log is the fallback for genuinely cross-cutting ones.
- [`../planning/deferred.md`](../planning/deferred.md) — single
  register of deferred / out-of-scope items (`DEF-NNN`).
- [`architecture-wiki.html`](architecture-wiki.html) — unified
  read-only viewer for architecture docs, general diagrams, and
  numbered UI screen packages. Screen pages have these tabs: Mockup,
  Spec, Interactions, Data Contracts, and Architecture Diagrams. Open
  directly via `file://` — no server needed. Run
  `npm run generate:wiki` after editing any source file to rebuild it.

## Companion Inputs

- [`../../research/deep-research-report.md`](../../research/deep-research-report.md) —
  baseline balance corridor and numeric guardrails used by rulesets,
  faction authoring, and AI-generation checks.
- [`../../content-schema/README.md`](../../content-schema/README.md) —
  canonical machine-readable contract layout and example-fixture
  layout.

## Suggested Reading Order

1. [`overview.md`](overview.md)
2. [`determinism.md`](determinism.md)
3. [`content-platform.md`](content-platform.md)
4. [`pack-contract.md`](pack-contract.md)
5. [`schema-matrix.md`](schema-matrix.md)
6. [`effect-registry.md`](effect-registry.md)
7. [`ai-integration.md`](ai-integration.md)
8. [`ai-contract.md`](ai-contract.md)
9. [`master-plan.md`](master-plan.md)

---

## 🔍 Sync Check

- **UI: ✔** — UI-related entries (`wiki/screens/`, `architecture-wiki.html`, `error-ux.md`) resolve, and their descriptions match the canonical files (`wiki/README.md` confirms the per-package layout).
- **Schema: ✔** — Schema-related entries (`schema-matrix.md`, `command-schema.md`, `effect-registry.md`, `chat-safety.md`'s envelope reference, `observability.md`'s `telemetry-event.schema.json` reference) all resolve; this README makes no enum / field claims of its own.
- **Tasks: ✔** — No task IDs are referenced inline. All `../planning/`, `../operations/`, and `../../{research,content-schema}/` cross-doc links resolve.

## ⚠ Issues

- **Two parallel architecture indexes.** This `README.md` (a flat directory listing) and [`INDEX.md`](INDEX.md) (the clustered, curated navigation map) describe the same corpus with overlapping but non-identical coverage. `CLAUDE.md` cites only [`INDEX.md`](INDEX.md). The prior audit recorded inside `INDEX.md` itself flagged the same overlap. The audit added a top-of-file pointer to `INDEX.md` to clarify roles, but did not delete or merge either index — that is a curation decision for the docs owner. Suggested resolution: either demote this README to a one-line pointer to `INDEX.md`, or keep both and add a short canonicality declaration to both files.
- **Coverage gap (informational, not a defect).** The architecture corpus has ~140 `.md` files under `docs/architecture/`; this README lists 23 inline plus the two subfolders. Many policy / signaling / pack-* / peer-* / save-* / schema-* files are unlisted. This README is intentionally curated, but readers searching for those topics will need [`INDEX.md`](INDEX.md) (which lists ~47 entries) or a directory walk. No action implied — surfaced so the docs owner can confirm the curation is deliberate.
