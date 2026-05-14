# Screen 52: Artifact Combine Dialog — Interaction Map

## Source Files

- Mockup: [`mockup.html`](./mockup.html)
- Spec: [`spec.md`](./spec.md)
- Data Contracts: [`data-contracts.md`](./data-contracts.md)
- Architecture Diagrams: [`architecture.md`](./architecture.md)

## Purpose

Confirmation modal for creating a combination artifact: shows the
owned component pieces, the resulting artifact, missing pieces and
blocked slots, and the equip-or-backpack destination before the
player commits.

## 1. Actions

Animation column references § 3. Tokens are resolved per
[`data-contracts.md` § Commands And Events](./data-contracts.md#commands-and-events).

| UI Element | Action ID | Type | Next Screen | Token | Data Updated |
| --- | --- | --- | --- | --- | --- |
| Inspect component | `artifactCombine.inspectComponent` | local-ui | Current | `SELECT_COMBINE_COMPONENT` | Updates the component detail focus on `state.ui.artifactCombine.*` (in-memory draft). |
| Combine | `artifactCombine.confirm` | command | [`46-hero-screen`](../46-hero-screen/) | `COMBINE_ARTIFACTS` | Removes components from the hero, creates the result artifact, and equips it or sends it to the backpack per destination rules. |
| Cancel | `artifactCombine.cancel` | navigation | [`46-hero-screen`](../46-hero-screen/) | `CANCEL_ARTIFACT_COMBINE` | Leaves all artifacts unchanged; clears the dialog draft. |

## 2. State Changes

- `state.ui.artifactCombine.recipeId` refreshes `recipeId` when the
  dialog is opened or the owning reducer updates it.
- `selectors.artifacts.combineComponents` refreshes `components`
  after ownership, equip, or lock state changes on the hero.
- `registries.artifacts.byId[resultId]` refreshes `resultArtifact`
  when the recipe target changes (rare; usually constant for the
  lifetime of the dialog).
- `selectors.artifacts.combineDestination` refreshes `destination`
  after equip-slot / backpack state changes.
- `selectors.artifacts.combineGuard` refreshes `combineGuard`
  whenever any of the four inputs above change.
- UI-only hover, focus, focused component, drag ghost, and animation
  frame stay outside deterministic gameplay state.

## 3. Animation Contract

- **Inspect component.** Hovered or selected piece lifts and pulses;
  the focused tooltip appears next to the cursor; no gameplay state
  changes.
- **Combine.** Owned pieces orbit and fuse; missing pieces (if any)
  stay dark; the result artifact flares; components only vanish
  after the reducer accepts `COMBINE_ARTIFACTS`.
- **Cancel.** Modal exit transition; orbiting pieces snap back to
  their inventory slots; no state change.
- Reduced-motion mode replaces continuous animation with static
  highlights and localized text feedback.

## 4. Navigation Outcomes

- `artifactCombine.confirm` routes to
  [`46-hero-screen`](../46-hero-screen/) after the reducer accepts
  `COMBINE_ARTIFACTS` and the exit animation completes.
- `artifactCombine.cancel` routes to
  [`46-hero-screen`](../46-hero-screen/) after guard approval and
  exit animation.

## 5. Disabled And Error Cases

- Disable the `Combine` control when `selectors.artifacts.combineGuard`
  reports a missing component, locked / equipped component, illegal
  destination slot, insufficient backpack space, or recipe
  ineligibility.
- Missing presentation assets use resolver fallback. Missing
  gameplay records, invalid content IDs, or rejected commands fail
  loudly per [`fail-loud.md`](../../../fail-loud.md).
- On rejection, keep the modal open, preserve the local draft when
  useful, show localized error text, and play failure feedback.
- Error strings are produced by `formatUserError(err, locale)`
  declared in [`error-formatter.md`](../../../error-formatter.md);
  never construct error toast text inline.

## 6. Error Surfaces

Per [`error-ux.md` § 5](../../../error-ux.md#5-per-screen-wiring),
this screen inherits the default code → surface mapping from § 2.
The table below covers each action whose `Type` is `command`. A row
whose `Notes` reads `override` replaces the § 2 default; otherwise
the default applies. Specific error codes (e.g.
`DISPATCHER_<token>`, `STORAGE_<token>`) land alongside the engine
reducer that owns each command and trigger
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Combine (`COMBINE_ARTIFACTS`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 `DISPATCHER_*`; disabled control + tooltip on rejection. |

## 7. AI Implementation Notes

- This file owns behavior and timing.
- [`spec.md`](./spec.md) owns static regions and state bindings.
- [`architecture.md`](./architecture.md) diagrams mirror these
  interactions and must not introduce hidden behavior.

---

## 🔍 Sync Check

- **UI: ✔** — Action IDs match the `data-action` attributes wired in [`mockup.html`](./mockup.html) for `Combine` and `Cancel`; `artifactCombine.inspectComponent` is a contract-level affordance on the orbit slots (see ⚠ Issues). Aligned with sibling [`spec.md` § State Bindings](./spec.md#state-bindings) and [`architecture.md` § 3 Main Interaction Flow](./architecture.md#3-main-interaction-flow).
- **Schema: ✔** — `COMBINE_ARTIFACTS` defined in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) (line 1639); `SELECT_COMBINE_COMPONENT` and `CANCEL_ARTIFACT_COMBINE` resolve as UI-local via the `SELECT_` / `CANCEL_` `localUiPrefixes` in [`screen-command-coverage.json`](../../../screen-command-coverage.json). Error code prefix `DISPATCHER_*` matches the regex in [`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs).
- **Tasks: ✔** — UI dispatch wiring owned by [`phase-2.07-ui-screen-backlog.52-artifact-combine-dialog-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/52-artifact-combine-dialog-screen.md); reducer behavior owned by [`phase-2.01-spells-artifacts.15-combine-artifacts-command`](../../../../../tasks/phase-2/01-spells-artifacts/15-combine-artifacts-command.md). The reducer task names this file in Read First and lists `COMBINE_ARTIFACTS` in Outputs.

## ⚠ Issues

- **Mockup only wires `artifactCombine.confirm` and `artifactCombine.cancel`; `artifactCombine.inspectComponent` has no `data-action` in the SVG.** [`mockup.html`](./mockup.html) shows four orbiting component slots and a central result card, but only the COMBINE / CANCEL buttons carry `data-action`. This is a visual-reference gap, not a spec violation — inspect is a contract-level affordance and the mockup is allowed to be simpler than the spec per the package's source-files contract. Suggested follow-up for [`phase-2.07-ui-screen-backlog.52-artifact-combine-dialog-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/52-artifact-combine-dialog-screen.md): emit `data-action="artifactCombine.inspectComponent"` on each component slot so the screen-coverage extractor reports the same token set the UI dispatches at runtime.
