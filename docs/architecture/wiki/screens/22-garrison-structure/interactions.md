# Screen 22: Garrison Structure — Interaction Map

## Source Files

- Mockup: [`mockup.html`](./mockup.html)
- Spec: [`spec.md`](./spec.md)
- Data Contracts: [`data-contracts.md`](./data-contracts.md)
- Architecture Diagrams: [`architecture.md`](./architecture.md)

## Purpose

Adventure-map garrison transfer modal. Moves stacks between a
visiting hero and a **standalone garrison structure** (a map object,
not a town).

## 1. Actions

Animation column references § 3. Tokens are resolved per
[`data-contracts.md` § Commands And Events](./data-contracts.md#commands-and-events).

| UI Element | Action ID | Type | Next Screen | Token | Data Updated |
| --- | --- | --- | --- | --- | --- |
| Drag stack | `garrison.dragStack` | local-ui | Current | `START_GARRISON_STACK_DRAG` | Creates drag draft only. |
| Drop stack | `garrison.dropStack` | command | Current | `TRANSFER_GARRISON_STACK` | Moves, merges, swaps, or rejects stack transfer. |
| Split stack | `garrison.splitStack` | navigation | [`51-split-stack-dialog`](../51-split-stack-dialog/) | `OPEN_SPLIT_STACK_DIALOG` | Creates split quantity draft. |
| Close | `garrison.close` | navigation | [`07-adventure-map`](../07-adventure-map/) | `CLOSE_GARRISON_STRUCTURE` | Returns to visited map tile. |

## 2. State Changes

- `state.heroes.byId[selected].army` refreshes `heroArmy` after the
  owning reducer or local UI draft changes.
- `state.mapObjects.byId[garrisonId].army` refreshes `garrisonArmy`
  after the owning reducer or local UI draft changes.
- `state.ui.garrisonTransfer.selectedStackRef` refreshes
  `selectedStack` on drag/click.
- `state.ui.garrisonTransfer.splitQuantity` refreshes `splitDraft`
  while the split dialog is open.
- `selectors.armies.garrisonTransferRules` recomputes `transferRules`
  whenever either army or ownership changes.
- UI-only hover, focus, selected row, drag ghost, and animation
  frame stay outside deterministic gameplay state.

## 3. Animation Contract

Drag/drop interactions only — split and close use route transitions.

- Dragged stack ghost follows the cursor.
- Legal target slots glow; illegal slots stay dim.
- Accepted swaps crossfade between source and target.
- Rejected drops snap back with a dull thud.
- Reduced-motion mode replaces continuous animation with static
  highlights and localized text feedback.

## 4. Navigation Outcomes

- `garrison.splitStack` routes to
  [`51-split-stack-dialog`](../51-split-stack-dialog/) after guard
  approval and exit animation.
- `garrison.close` routes to
  [`07-adventure-map`](../07-adventure-map/) after guard approval
  and exit animation.

## 5. Disabled And Error Cases

- Disable controls when required selectors, registry records, target
  legality, ownership, phase, or route guards fail.
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
| Drop stack (`TRANSFER_GARRISON_STACK`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 `DISPATCHER_*`; disabled control + tooltip on rejection. |

## 7. AI Implementation Notes

- This file owns behavior and timing.
- [`spec.md`](./spec.md) owns static regions and state bindings.
- [`architecture.md`](./architecture.md) diagrams mirror these
  interactions and must not introduce hidden behavior.

---

## 🔍 Sync Check

- **UI: ✔** — Action IDs and `data-action` attributes (`garrison.splitStack`, `garrison.close`) match [`mockup.html`](./mockup.html); drag/drop affordances match the modal layout. Aligned with sibling [`spec.md` § State Bindings](./spec.md#state-bindings).
- **Schema: ✔** — `TRANSFER_GARRISON_STACK` defined in [`command.schema.json` `TRANSFER_GARRISON_STACK`](../../../../../content-schema/schemas/command.schema.json); UI-local tokens covered by [`screen-command-coverage.json`](../../../screen-command-coverage.json) prefixes (`START_`, `OPEN_`, `CLOSE_`). Error code prefix `DISPATCHER_*` matches the regex in [`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs).
- **Tasks: ✔** — UI dispatch wiring owned by [`phase-2.07-ui-screen-backlog.22-garrison-structure-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/22-garrison-structure-screen.md); reducer behavior owned by [`mvp.05-adventure-map.18-transfer-stack-commands`](../../../../../tasks/mvp/05-adventure-map/18-transfer-stack-commands.md).

## ⚠ Issues

- **Code-prefix divergence inherited from `error-ux.md`.** The `DISPATCHER_REJECTED` code used in § 6 carries the `DISPATCHER_` prefix per [`error-ux.md` § 2](../../../error-ux.md#2-code--surface-mapping), but [`dispatcher-validation-error.schema.json`](../../../../../content-schema/schemas/dispatcher-validation-error.schema.json) defines bare codes (`NOT_CURRENT_ACTOR`, `MALFORMED_PAYLOAD`, …) without the prefix. Already flagged on the `error-ux.md` trailer; surfaced again here so the screen-level table is not silently rewritten. Owner: [`mvp.00-core-architecture.22-01-error-formatter-contract`](../../../../../tasks/mvp/00-core-architecture/22-01-error-formatter-contract.md).
