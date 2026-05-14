# Screen 42: Victory / Defeat Cinematic

> Companion docs:
> [`interactions.md`](./interactions.md),
> [`data-contracts.md`](./data-contracts.md),
> [`architecture.md`](./architecture.md),
> [`mockup.html`](./mockup.html),
> [`ui-technology-choice.md`](../../../ui-technology-choice.md)
> (Z-Stack Contract).

## 1. Description

Letterboxed campaign / scenario outcome screen. Renders victory or
defeat art over an already-finalized result with narration, score
medallions, carryover summary, and continue / skip / replay controls.

## 2. Visual Direction

Original internal UI contract. Never use third-party captures, copied
franchise art, or external product pixels as implementation input.

## 3. Visual Contract

- Curation status: `curated-pass-2`.
- Z-Layer: `1000` per
  [`ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
- Fixed 800×600 frame, ornate gold border, black letterbox bars top
  and bottom, a wide illustrated panel between them.
- Narration parchment and score medallions sit below the art; dense
  classic-fantasy chrome and a bottom status strip surround the panel.
- [`mockup.html`](./mockup.html) carries visible SVG geometry only.
  Logic, transitions, and timing live in the Markdown sibling files.

## 4. Component Tree

- `OutcomeCinematic`
  - `LetterboxArt` — letterboxed victory / defeat illustration.
  - `NarrationPanel` — parchment cue strip rendering localized
    narration.
  - `ScoreMedallions` — score-breakdown medallions revealed in
    sequence.
  - `CampaignCarryoverSummary` — hero / artifact carryover preview.
  - `ContinueSkipButtons` — continue, skip-narration, and (when
    available) replay-battle controls.

## 5. State Bindings

| Element | Bound To | Notes |
| --- | --- | --- |
| `outcome` | `state.scenario.outcome` | Victory / defeat / campaign outcome. |
| `score` | `state.scenario.finalScore` | Score breakdown. |
| `carryover` | `state.campaign.carryoverDraft` | Hero / artifact carryover summary. |
| `nextRoute` | `state.scenario.outcomeRoute` | High-scores, next-mission, or main-menu route token. |

UI-only hover, focus, selected medallion, target cursor, drag ghost,
and animation frame stay outside deterministic state.

## 6. Mechanics Mapping

- Displays already-finalized outcome state and routes onward; it never
  changes battle or scenario results.
- UI previews stay local until the listed routing event or route
  guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and map
  objects resolve through registries and content schemas — no
  hardcoded view logic.

## 7. Animation Contract

- Outcome art slowly pans, narration types in, score medallions appear
  one by one, then the active region cross-fades to the destination
  route.
- Animation consumes reducer / route results; it never decides
  gameplay outcomes.
- `prefers-reduced-motion` collapses the pan, typing, and reveal to
  the final still frame with static highlights and localized feedback.

## 8. Acceptance Criteria

- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- Spec lists every visible region and authoritative state binding.
- Interactions covers every primary control, next screen, state
  update, animation, disabled case, and error path.
- Architecture file carries screen-specific diagrams, not copied
  archetype diagrams.
- Data contracts identify schema, config, localization, asset, audio,
  VFX, save, and replay fields required to implement the screen.

## 9. AI Implementation Notes

- Screen slug: `victory-defeat-cinematic`; system group: `battle`;
  curation marker: `curated-pass-2`.
- Build runtime components from this package contract — not from
  third-party captures or external product pixels.
- Resolve presentation through asset IDs / manifests; gameplay reads
  use stable IDs and scalar values only.

---

## 🔍 Sync Check

- **UI: ⚠** — Components, bindings, and animation order match sibling [`interactions.md`](./interactions.md), [`data-contracts.md`](./data-contracts.md), and [`architecture.md`](./architecture.md). [`mockup.html`](./mockup.html) is `curated-pass-2` and currently renders only `LetterboxArt` + a single `Continue` button — `NarrationPanel`, `ScoreMedallions`, `CampaignCarryoverSummary`, and the skip / replay controls are not yet drawn. Tracked in `## ⚠ Issues`.
- **Schema: ✔** — Schema references resolve through sibling [`data-contracts.md`](./data-contracts.md); the three routing tokens are UI-local per [`screen-command-coverage.json`](../../../screen-command-coverage.json) prefix rules.
- **Tasks: ⚠** — Owning UI task [`tasks/phase-2/07-ui-screen-backlog/42-victory-defeat-cinematic-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/42-victory-defeat-cinematic-screen.md) Reads First this file; the four state slices lack rows in [`data-inventory.md`](../../../data-inventory.md). See `## ⚠ Issues`.

## ⚠ Issues

- **Mockup omits four of five declared components.** [`mockup.html`](./mockup.html) renders only `LetterboxArt` and a `Continue` button; `NarrationPanel`, `ScoreMedallions`, `CampaignCarryoverSummary`, and the skip / replay affordances are declared here but not drawn. Acceptable at `curated-pass-2`; flagged so the next curation pass closes the visual gap.
- **State slices not registered in `data-inventory.md`.** Same gap raised by sibling [`data-contracts.md`](./data-contracts.md#⚠-issues), [`architecture.md`](./architecture.md#⚠-issues), and [`interactions.md`](./interactions.md#⚠-issues). Owner: the scenario-resolution producer task (Phase-2). Not added here per Hard Prohibition D.
