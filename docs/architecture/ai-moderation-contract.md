# AI Moderation Contract

> Companion to [`ai-generation-pipeline.md`](./ai-generation-pipeline.md),
> [`ugc-safety.md`](./ugc-safety.md), and screen
> [`02-new-game-setup`](./wiki/screens/02-new-game-setup/) (the AI
> faction picker). Plan 23 / Q441 introduces the **status carrier** and
> **banner contract**; the actual moderation logic — provider,
> pre-screen, post-screen, human review — is owned by audit 14 / Plan 14
> and lands separately. The banner contract can land first because it
> is closed and additive.

## 1. Status Carrier

Every `GeneratedFaction` record carries a `moderation` block per
[`generated-faction.schema.json`](../../content-schema/schemas/generated-faction.schema.json):

```text
moderation: {
  status: 'pending' | 'passed' | 'failed' | 'skipped',
  flaggedReasons?: string[],
  reviewedBy?: string,
  reviewedAt?: ISO 8601
}
```

`status` is the closed enum that drives the banner. The pipeline writes
`'pending'` at Stage 0 (request acknowledged), the moderator promotes
to `'passed'` / `'failed'`, and `'skipped'` is reserved for dev mode
and provider-unavailable fallbacks.

## 2. Banner Contract

Any UI surface that renders a `GeneratedFaction` MUST consult
`selectModerationBanner(record)` and render the banner unless
`status === 'passed'`:

| `status`   | Banner copy key                       | Severity |
|------------|---------------------------------------|----------|
| `pending`  | `ai.moderation.banner.unreviewed`     | info     |
| `failed`   | `ai.moderation.banner.flagged`        | warning  |
| `skipped`  | `ai.moderation.banner.skipped`        | info     |
| `passed`   | (no banner)                            | —        |

The banner is non-modal, dismiss-disabled, and visually anchored above
the AI-generated content card. Localization keys live under
`ai.moderation.banner.*` in
[`localization.schema.json`](../../content-schema/schemas/localization.schema.json).

## 3. CoherenceReport Surface

The AI generation pipeline's `coherence` stage emits a moderation
summary alongside the existing findings, so a stage-side validator can
fail loudly when a `failed` status reaches the materializer without
review. This is documented further in
[`ai-generation-pipeline.md`](./ai-generation-pipeline.md).

## 4. Cross-Cuts

- **Age gate**: `under13` profiles already deny `aiGeneration` per
  [`age-gate.md`](./age-gate.md), so a minor never sees the banner —
  but the field stays load-bearing because `over13` users may still
  encounter `pending` records during streaming.
- **Pack manifest**: when a pack materializes from an AI run, the
  manifest's `aiProvenance` block re-asserts the moderation status so
  the loader can render the banner without re-parsing every record.
- **Reports**: screen [`75-content-report`](./wiki/screens/75-content-report/)
  remains the user-driven "this is wrong" path; the banner is a
  pre-emptive disclosure, not a substitute for reporting.

## 5. Out of Scope (here)

- The actual moderator (provider, prompt-pre-screen, post-screen,
  human review). Owned by audit 14 / Plan 14.
- Server-side moderation queue and SLA.
- Auto-redaction of failed records (today they fail loudly).
