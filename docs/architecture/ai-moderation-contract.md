# AI Moderation Contract

> Companion to [`ai-generation-pipeline.md`](./ai-generation-pipeline.md),
> [`ugc-safety.md`](./ugc-safety.md),
> [`age-gate.md`](./age-gate.md), and the screens that render
> AI-generated content:
> [`02-new-game-setup`](./wiki/screens/02-new-game-setup/) (pack
> picker), [`74-ai-provenance-detail`](./wiki/screens/74-ai-provenance-detail/),
> and [`75-content-report`](./wiki/screens/75-content-report/).
>
> Scope: this file pins the **status carrier** on `GeneratedFaction`
> and the **banner contract** every UI surface must honour. The
> actual moderator (provider, pre-prompt screen, post-generation
> screen, human review, server-side queue) is out of scope and lands
> separately. The carrier + banner contract can land first because
> they are closed and additive.

## 1. Status Carrier

Every `GeneratedFaction` record SHOULD carry a `moderation` block per
[`generated-faction.schema.json`](../../content-schema/schemas/generated-faction.schema.json):

```text
moderation: {
  status: 'pending' | 'passed' | 'failed' | 'skipped',
  flaggedReasons?: string[],
  reviewedBy?: string,
  reviewedAt?: ISO 8601
}
```

`status` is the closed enum that drives the banner.

| When | Writer | Status set |
|---|---|---|
| Stage 0 (request acknowledged) | pipeline | `pending` |
| post-moderator verdict (human or provider) | moderator | `passed` or `failed` |
| dev mode / provider unavailable | pipeline | `skipped` |

`flaggedReasons[]` carries human-readable strings consumed by the
detail panels in screens 74 / 75. `reviewedBy` / `reviewedAt` are
provenance metadata and never feed gameplay determinism.

## 2. Banner Contract

Any UI surface that renders a `GeneratedFaction` MUST consult
`selectModerationBanner(record)` and render the banner unless
`status === 'passed'`:

| `status`  | Banner copy key                   | Severity |
|-----------|-----------------------------------|----------|
| `pending` | `ai.moderation.banner.unreviewed` | info     |
| `failed`  | `ai.moderation.banner.flagged`    | warning  |
| `skipped` | `ai.moderation.banner.skipped`    | info     |
| `passed`  | _(no banner)_                     | —        |

Rules:

- Non-modal, dismiss-disabled, anchored above the AI-generated
  content card.
- Localization keys live under `ai.moderation.banner.*` in
  [`localization.schema.json`](../../content-schema/schemas/localization.schema.json).
- Every consumer goes through the selector — no surface re-derives
  the predicate from `status` directly.

## 3. CoherenceReport Surface

The `coherence` stage of the pipeline emits a moderation summary
alongside the existing findings, so a stage-side validator can fail
loudly when a `failed` status reaches Stage 6 (pack materialize)
without review. See
[`ai-generation-pipeline.md`](./ai-generation-pipeline.md).

## 4. Cross-Cuts

- **Age gate.** `under13` profiles already deny `aiGeneration` per
  [`age-gate.md`](./age-gate.md), so a minor never sees the banner.
  The carrier still stays load-bearing because `over13` users may
  encounter `pending` records during streaming generation.
- **Pack manifest.** When a pack materializes from an AI run, the
  manifest's `aiProvenance` block re-asserts the moderation status
  so the loader can render the banner without re-parsing every
  record. See `manifest.aiProvenance` in
  [`ai-generation-pipeline.md` § 6](./ai-generation-pipeline.md#6-pack-materialize).
- **Reports.** Screen
  [`75-content-report`](./wiki/screens/75-content-report/) remains
  the user-driven "this is wrong" path. The banner is a pre-emptive
  disclosure, not a substitute for reporting.

## 5. Out of Scope (here)

- The actual moderator (provider, prompt-pre-screen, post-screen,
  human review). Owned by the AI-moderation rollout (Plan 14 in
  [`docs/archive/implementation-plans/`](../archive/implementation-plans/)).
- Server-side moderation queue and SLA.
- Auto-redaction of `failed` records (today they fail loudly per
  [`fail-loud.md`](./fail-loud.md)).

---

## 🔍 Sync Check

- **UI: ⚠** — Banner copy keys (`ai.moderation.banner.unreviewed | flagged | skipped`)
  are not yet present in any screen package. Screens
  [`74-ai-provenance-detail`](./wiki/screens/74-ai-provenance-detail/)
  and [`75-content-report`](./wiki/screens/75-content-report/) are
  the eventual consumers; neither references `selectModerationBanner`
  or the `ai.moderation.banner.*` namespace today. Detail in `## ⚠ Issues`.
- **Schema: ⚠** — The `moderation` block is defined on
  [`generated-faction.schema.json`](../../content-schema/schemas/generated-faction.schema.json)
  with the four-state enum and matches this doc, and the row exists
  in [`schema-matrix.md`](./schema-matrix.md). However, `moderation`
  is **not** in the schema's top-level `required` array, while this
  doc says every record carries it. Detail in `## ⚠ Issues`.
- **Tasks: ⚠** — No task in `tasks/` currently owns this contract
  surface or grep-matches `ai.moderation.banner` /
  `selectModerationBanner`. The schema description points to "audit
  14 / Plan 14" (the archived AI-pipeline plan); the related
  pipeline-side moderator hooks are in
  [`tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md`](../../tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md)
  and
  [`tasks/phase-3/02-ai-generation/06b-image-moderation.md`](../../tasks/phase-3/02-ai-generation/06b-image-moderation.md),
  but neither owns the carrier / banner contract this file pins.
  Detail in `## ⚠ Issues`.

## ⚠ Issues

- **`moderation` block is optional in the schema but mandatory in
  this doc.**
  [`generated-faction.schema.json`](../../content-schema/schemas/generated-faction.schema.json)
  lists `["schemaVersion", "faction", "units", "heroes", "buildings", "abilities"]`
  as the top-level `required` set; `moderation` is absent. This doc
  previously read "Every `GeneratedFaction` record carries a
  `moderation` block" — softened to `SHOULD` here to match the
  current schema rather than silently rewriting the schema's
  contract. Per CLAUDE.md "schema evolution is additive-first; alias
  before remove", the canonical fix is to add `moderation` to the
  schema's `required` array and regenerate the snapshot. Owning
  task: a new entry in `tasks/phase-3/02-ai-generation/` (no task
  currently owns this contract surface). Skill did not edit the
  schema (Hard Prohibition D).
- **`ai.moderation.banner.*` namespace not registered in the
  reserved-namespace list.**
  [`ugc-safety.md` § 7](./ugc-safety.md#7-localization-keys)
  enumerates the reserved UGC + privacy localization namespaces
  (`ui.publish.policy.*`, `ui.report.*`, `ui.ai-provenance.*`,
  `ui.privacy.*`, `ui.ugc.warning.*`); `ai.moderation.banner.*`
  is not on the list. Either this contract should adopt one of the
  existing namespaces (e.g. `ui.ai-provenance.banner.*`) or
  `ugc-safety.md § 7` should be extended. Suggested values:
  add a sixth bullet `ai.moderation.banner.*` — banner copy for
  the moderation-status carrier. Skill did not edit `ugc-safety.md`
  (Hard Prohibition D).
- **CoherenceReport schema does not yet carry a moderation
  summary.**
  This doc § 3 asserts the coherence stage emits a moderation
  summary alongside findings, but
  [`coherence-report.schema.json`](../../content-schema/schemas/coherence-report.schema.json)
  defines only `findings` and `metrics`. The pipeline doc's own
  Issues block already flagged this drift. Resolution belongs to
  the AI-moderation rollout (Plan 14 / a future
  `phase-3.02-ai-generation` task). Suggested values: add an
  optional `moderationSummary: { status, flaggedReasons[] }` field
  to `coherence-report.schema.json`, or demote § 3 here to "future
  surface" once the rollout task is filed.
- **No owning task for the carrier / banner contract.**
  The schema description points to "audit 14 / Plan 14" (archived
  implementation plan), but no live entry in `tasks/task-registry.json`
  owns the runtime surfaces named here (`selectModerationBanner`,
  the `ai.moderation.banner.*` localization keys, the
  detail-panel render in screens 74 / 75). Per the project's task
  system rule that "every described logic has a task", a new task
  under `tasks/phase-3/02-ai-generation/` should claim this
  contract before any UI begins consuming it. Skill did not create
  the task (Hard Prohibition D).
