# Screen 42: Victory / Defeat Cinematic
## Interaction Map

> Companion docs:
> [`spec.md`](./spec.md), [`data-contracts.md`](./data-contracts.md),
> [`architecture.md`](./architecture.md), [`mockup.html`](./mockup.html),
> [`error-formatter.md`](../../../error-formatter.md)
> (single error-text sink),
> [`fail-loud.md`](../../../fail-loud.md)
> (gameplay-record failure policy).

## 1. Purpose

Letterboxed campaign / scenario outcome screen. Routes the user from a
finalized outcome to high scores, the next mission, the main menu, or
a battle replay; never mutates deterministic gameplay state.

## 2. Actions

All three tokens are **UI-local routing events** (see sibling
[`data-contracts.md` § 3](./data-contracts.md#3-commands-and-events)).

| UI Element | Action ID | Type | Next Screen | Token | Data Updated |
| --- | --- | --- | --- | --- | --- |
| Continue | `outcome.continue` | navigation | `57-high-scores` or `01-main-menu` | `CONTINUE_FROM_OUTCOME` | Routes per `state.scenario.outcomeRoute`. |
| Skip narration | `outcome.skip` | local-ui | Current screen | `SKIP_OUTCOME_NARRATION` | Completes text typing and art pan. |
| Replay battle | `outcome.replay` | navigation | `38-combat-screen` | `REQUEST_BATTLE_REPLAY_VIEW` | Opens replay presentation when available. |

### 2.1. Shared Animation Beats

The same beats animate regardless of which control fires:

- Outcome art slowly pans behind the letterbox.
- Narration types in cue-by-cue.
- Score medallions appear one by one.
- On `outcome.continue`, the active region cross-fades to the
  destination route.

## 3. State Changes

- `state.scenario.outcome`, `state.scenario.finalScore`,
  `state.campaign.carryoverDraft`, and `state.scenario.outcomeRoute`
  refresh their bound elements after the upstream reducer or local UI
  draft changes.
- Hover, focus, selected medallion, target cursor, drag ghost, and
  animation frame stay outside deterministic gameplay state.

## 4. Navigation Outcomes

- `Continue` routes to `57-high-scores` or `01-main-menu` after the
  outcome-route guard approves and the exit animation finishes.
- `Replay battle` routes to `38-combat-screen` after guard approval
  and exit animation.

## 5. Disabled And Error Cases

- Disable controls when required selectors, registry records, resource
  costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing
  gameplay records, invalid content IDs, or rejected commands fail
  loudly per [`fail-loud.md`](../../../fail-loud.md).
- On rejection: keep the current screen open, preserve local draft
  when useful, show localized error text, and play failure feedback.
- Error text is produced by `formatUserError(err, locale)` declared in
  [`error-formatter.md`](../../../error-formatter.md); never construct
  error toast text inline.

## 6. AI Implementation Notes

- This file owns behavior and timing.
- [`spec.md`](./spec.md) owns static regions and state bindings.
- [`architecture.md`](./architecture.md) diagrams mirror these
  interactions rather than inventing new behavior.

---

## 🔍 Sync Check

- **UI: ✔** — Actions, routes, and tokens align with sibling [`spec.md`](./spec.md), [`data-contracts.md`](./data-contracts.md), and [`architecture.md`](./architecture.md). The mockup is `curated-pass-2` and currently renders only the `Continue` control; gap tracked in sibling trailers.
- **Schema: ✔** — Tokens are UI-local per [`screen-command-coverage.json`](../../../screen-command-coverage.json) § `localUiPrefixes` (`CONTINUE_` / `SKIP_` / `REQUEST_`); no [`command-schema.md`](../../../command-schema.md) row required.
- **Tasks: ⚠** — Owning UI task [`tasks/phase-2/07-ui-screen-backlog/42-victory-defeat-cinematic-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/42-victory-defeat-cinematic-screen.md) and cinematic-playback task [`tasks/phase-2/08-meta-systems/03-cinematic-playback-engine.md`](../../../../../tasks/phase-2/08-meta-systems/03-cinematic-playback-engine.md) both Read First this file; the four state selectors lack rows in [`data-inventory.md`](../../../data-inventory.md). See `## ⚠ Issues`.

## ⚠ Issues

- **Selectors not registered in `data-inventory.md`.** Same gap surfaced by sibling [`data-contracts.md`](./data-contracts.md#⚠-issues), [`architecture.md`](./architecture.md#⚠-issues), and [`spec.md`](./spec.md#⚠-issues). The scenario-resolution producer task (Phase-2) owns the fix; not added here per Hard Prohibition D.
