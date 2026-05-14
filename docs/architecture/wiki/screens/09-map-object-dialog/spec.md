# Screen 09: Map Object Dialog

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Generic adventure object visit dialog for shrines, events, guarded
rewards, signs, one-shot pickups, and choice prompts. The same screen
backs every map encounter that needs an Accept / Decline beat without
its own bespoke surface.

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
- Dialog regions, top-to-bottom: title bar (object name), object
  portrait (left), message parchment + requirement + reward-preview
  text (right), four reward icon slots (`Skill`, `XP`, `Gold`,
  `Quest`), and `ACCEPT` / `DECLINE` buttons. Match `mockup.html`
  exactly for placement, colors, and button labels.
- `mockup.html` carries the visible UI only. Logic, transitions, and
  implementation notes live in the sibling Markdown files.

### Component Tree
- `MapObjectDialog`
  - `ObjectPortrait`
  - `ObjectMessage`
  - `RequirementPanel`
  - `RewardPreview`
  - `DialogButtons`

### State Bindings
| Element | Bound to | Notes |
| --- | --- | --- |
| `objectId` | `state.ui.adventure.pendingObjectVisit.objectId` | Object selected by movement arrival or click. Transient UI slice. |
| `heroId` | `state.adventure.selectedHeroId` | Visiting hero context. |
| `visitRecord` | `state.mapObjects.byId[objectId]` | Object type, visited flags, rewards, requirements, scripts. |
| `rewardPreview` | `selectors.mapObjects.previewVisitReward` | Deterministic reward / cost preview. |
| `guardResult` | `selectors.mapObjects.visitGuard` | Eligibility, disabled reason, command availability. |

### Mechanics Mapping
- Visit resolution reads the object record, visit flags, guard
  requirement, reward table, and hero eligibility before dispatching
  the canonical `VISIT_MAP_OBJECT` command.
- UI previews stay local until a listed command or route guard
  accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and
  map objects resolve through registries and content schemas — never
  hardcoded view logic. The `category` enum
  (`reward | hazard | shrine | event | quest | utility`) and
  `interactionModel` come from
  [`map-object.schema.json`](../../../../../content-schema/schemas/map-object.schema.json).

### Animation Contract
- Dialog pops from the object's map position; portrait glows on
  hover; reward icons sparkle on accepted visits; the message
  parchment shakes on a rejected visit.
- Animation consumes reducer or route results; it never decides the
  gameplay outcome.
- Reduced-motion mode preserves visible state changes with static
  highlights and localized feedback (the `@media (prefers-reduced-motion)`
  rule in `mockup.html` is the canonical example).

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
- Screen slug `map-object-dialog`; system group `adventure`; curation
  marker `curated-pass-3`.
- Build runtime components from this package contract — never from
  third-party captures or external product pixels.
- Resolve presentation through asset IDs and manifests; deterministic
  gameplay commands carry stable IDs and scalar values only.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree, regions, and button labels (`ACCEPT` /
  `DECLINE`) match `mockup.html`; Z-Layer 1000 is the canonical
  modal-dialog row in
  [`ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
  Animation copy matches sibling `interactions.md` Actions table.
- **Schema: ✔** — `category` and `interactionModel` enums and the
  `presentation.mapSpriteId` requirement come from
  [`map-object.schema.json`](../../../../../content-schema/schemas/map-object.schema.json);
  bindings into `state.mapObjects.byId[*]` line up with the
  normalized collection registered in
  [`state-shape.md`](../../../state-shape.md).
- **Tasks: ✔** — Owning task
  [`mvp.05-adventure-map.09-map-object-dialogs`](../../../../../tasks/mvp/05-adventure-map/09-map-object-dialogs.md)
  reads this file first and lists `src/ui/components/MapObjectDialog.tsx`
  as an Owned Path.

## ⚠ Issues

- **`state.ui.adventure.pendingObjectVisit.objectId` not registered in
  `data-inventory.md`.** This slice is a transient UI state and is
  not persisted, so the
  [`data-inventory.md`](../../../data-inventory.md) contract ("every
  persisted field is registered") does not require a row. Flagged
  here as a soft cross-reference gap: if the slice ever becomes
  session-persistent (e.g. survives reload during a confirm flow),
  the owning task
  [`mvp.05-adventure-map.09-map-object-dialogs`](../../../../../tasks/mvp/05-adventure-map/09-map-object-dialogs.md)
  must add a `medium / in-memory / session` row before merge. Skill
  did not add the row itself (Hard Prohibition D).
