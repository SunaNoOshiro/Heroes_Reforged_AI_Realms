# Screen 20: Mine Visit Dialog

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Mine capture or visit dialog showing resource type, current owner,
guard state, daily income preview, and the flagging outcome of a
successful claim. Drives the per-mine claim / fight-guard / leave
beat for screen `07-adventure-map`.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract
- Curation status: `curated-pass-3`.
- Z-Layer: **1000** (modal dialogs) per
  [`ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
- Fixed `800 × 600` layout; the adventure map stays visible behind a
  centered carved dialog.
- Regions, top-to-bottom: red title bar (mine name `Ore Pit`),
  one-line claim prompt, square portrait slot with ore disc (left),
  status panel listing `Current owner`, `Daily income`, `Guard`, and
  an effect summary (right), pulsing player-color flag below the
  portrait, and `CLAIM` / `LEAVE` buttons. Match `mockup.html` for
  placement, colors, and labels.
- Dense classic-fantasy-strategy chrome: ornate gold frame,
  red / brown / stone panels, right-click affordances for resource
  details, status / resource bar along the bottom.
- `mockup.html` carries the visible UI only. Logic, transitions, and
  implementation notes live in the sibling Markdown files.

### Component Tree
- `MineVisitDialog`
  - `MinePortrait`
  - `OwnerFlag`
  - `IncomePreview`
  - `GuardSummary`
  - `ClaimLeaveButtons`

### State Bindings
| Element | Bound to | Notes |
| --- | --- | --- |
| `mineId` | `state.ui.adventure.pendingMineVisit.mineId` | Visited mine. Transient UI slice; not persisted. |
| `mineRecord` | `state.mapObjects.byId[mineId]` | Resource type, owner, guard state, base income. |
| `activePlayer` | `state.turn.activePlayerId` | Player color used for the flag-unfurl animation. |
| `dailyIncome` | `selectors.economy.mineIncomePreview` | Income delta added on claim. |
| `guardState` | `selectors.mapObjects.mineGuardState` | One of `unfought` / `defeated` / `none`. |

### Mechanics Mapping
- Claiming a mine reads the mine record, guard state, hero position,
  and active-player ownership before dispatching the canonical
  `CAPTURE_MINE` command (surfaced here under the screen alias
  `CLAIM_MINE`).
- UI previews stay local until a listed command or route guard
  accepts them.
- Mine identity, resource type, daily yield, and visit rules resolve
  through
  [`adventure-building.schema.json`](../../../../../content-schema/schemas/adventure-building.schema.json)
  and
  [`map-object.schema.json`](../../../../../content-schema/schemas/map-object.schema.json);
  resource IDs come from
  [`resource-id.schema.json`](../../../../../content-schema/schemas/resource-id.schema.json).
  No hardcoded view logic.

### Animation Contract
- Flag cloth unfurls in `activePlayer`'s color on a successful claim;
  the portrait's resource icon sparkles, `dailyIncome` text ticks
  upward, and the map sprite recolors on dialog close.
- Animation consumes reducer or route results; it never decides the
  gameplay outcome.
- Reduced-motion mode preserves visible state changes with static
  highlights and localized feedback (the
  `@media (prefers-reduced-motion)` rule in `mockup.html` is the
  canonical example).

### Acceptance Criteria
- Mockup is visually distinct from sibling screens and follows this
  package's internal visual direction.
- Spec lists every visible region and authoritative state binding.
- `interactions.md` covers every primary control, next screen, state
  update, animation cue, disabled case, and error path.
- `architecture.md` carries screen-specific diagrams, not copied
  archetype diagrams.
- `data-contracts.md` identifies the schema, config, localization,
  asset, sound, VFX, save, and replay fields required to implement
  the screen.

### AI Implementation Notes
- Screen slug `mine-visit-dialog`; system group `adventure`; curation
  marker `curated-pass-3`.
- Build runtime components from this package contract — never from
  third-party captures or external product pixels.
- Resolve presentation through asset IDs and manifests; deterministic
  gameplay commands carry stable IDs and scalar values only.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree, regions, and button labels (`CLAIM` /
  `LEAVE`) match `mockup.html` `data-action` attributes
  (`mine.claim`, `mine.leave`); pulsing flag and status panel match
  sibling `interactions.md` § Animation Cues. Z-Layer 1000 is the
  canonical modal-dialog row in
  [`ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
- **Schema: ✔** —
  [`adventure-building.schema.json`](../../../../../content-schema/schemas/adventure-building.schema.json),
  [`map-object.schema.json`](../../../../../content-schema/schemas/map-object.schema.json),
  and
  [`resource-id.schema.json`](../../../../../content-schema/schemas/resource-id.schema.json)
  are registered in
  [`schema-matrix.md`](../../../schema-matrix.md);
  `CAPTURE_MINE` is a closed-enum kind in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json).
- **Tasks: ✔** — Owning task
  [`mvp.05-adventure-map.09-map-object-dialogs`](../../../../../tasks/mvp/05-adventure-map/09-map-object-dialogs.md)
  reads this file first and lists `src/ui/components/MineVisitDialog.tsx`
  as an Owned Path; reducer task
  [`mvp.05-adventure-map.21-map-object-visit-and-battle-initiation-commands`](../../../../../tasks/mvp/05-adventure-map/21-map-object-visit-and-battle-initiation-commands.md)
  reads sibling `interactions.md`.

## ⚠ Issues

- **`state.ui.adventure.pendingMineVisit.mineId` not registered in
  `data-inventory.md`.** This slice is a transient UI draft and is
  not persisted, so the
  [`data-inventory.md`](../../../data-inventory.md) contract ("every
  persisted field is registered") does not require a row. Flagged
  here as a soft cross-reference: if the slice ever becomes
  session-persistent (e.g. survives reload while the dialog is open),
  the owning task
  [`mvp.05-adventure-map.09-map-object-dialogs`](../../../../../tasks/mvp/05-adventure-map/09-map-object-dialogs.md)
  must add a `medium / in-memory / session` row before merge. Skill
  did not add the row itself (Hard Prohibition D).
