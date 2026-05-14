# Screen 35: Town Flyby — Spec

> Source files: [`mockup.html`](./mockup.html) ·
> [`interactions.md`](./interactions.md) ·
> [`data-contracts.md`](./data-contracts.md) ·
> [`architecture.md`](./architecture.md)

| Field | Value |
|---|---|
| System | `town` |
| Screen slug | `town-flyby` |
| Curation status | `curated-pass-4` |

## 1. Description

Optional cinematic town-entry / faction-panorama flyby that runs
before the interactive [`24-town-screen`](../24-town-screen/) becomes
available. Pure presentation — no engine command, no gameplay state
mutated.

## 2. Visual Contract

- Fixed 800×600 stage; ornate gold frame around a letterboxed
  panorama matching the classic strategy-UI archetype.
- Curated visual elements: panorama skyline with an animated
  dashed camera path, an asset-warmup progress label, a faction
  crest overlay, and a single bottom-right Skip button.
- [`mockup.html`](./mockup.html) contains visible UI only. Logic,
  routing, and timing live in the sibling Markdown files.
- Original internal UI contract; do not use third-party captures,
  copied franchise art, or external product pixels as
  implementation input.

## 3. Component Tree

- `TownFlyby`
  - `PanoramaCameraPath`
  - `FactionCrest`
  - `AssetWarmupProgress`
  - `SkipButton`

## 4. State Bindings

| Element | Bound to | Notes |
|---|---|---|
| `townId` | `state.towns.selectedTownId` | Town being entered. |
| `factionId` | `state.towns.byId[selected].factionId` | Faction visuals and music. |
| `assetWarmup` | `state.ui.assetWarmup.townScreen` | Presentation loading state; gates `COMPLETE_TOWN_FLYBY`. |
| `cameraPath` | `selectors.presentation.townFlybyPath` | Deterministic flyby path derived from `town-presentation.schema.json#presentation.flybyCameraEasing`. |
| `skipAvailable` | `config.ui.allowSkipCinematics` | Enables the Skip button. |

All five bindings are transient or read-only config; none persist,
so no [`data-inventory.md`](../../../data-inventory.md) row is
required.

## 5. Mechanics Mapping

- Presentation-only transition: loads town panorama assets, faction
  audio, and hotspot metadata **before** opening
  [`24-town-screen`](../24-town-screen/).
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and
  map objects resolve through registries and content schemas — not
  hardcoded view logic.
- UI previews stay local until the route guard accepts them; see
  [`interactions.md` § 6](./interactions.md#6-navigation-outcomes).

## 6. Animation Contract

- Camera eases across the skyline; parallax layers drift; faction
  crest fades in; Skip accelerates to the town reveal without
  gameplay mutation.
- Animation consumes the route result; it never decides gameplay
  outcomes.
- Reduced-motion mode (`config.ui.reducedMotion`) collapses the
  eased camera path to a static frame per
  [`animation-contract.md`](../../../animation-contract.md).

## 7. Acceptance Criteria

- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- Spec lists every visible region and authoritative state binding.
- [`interactions.md`](./interactions.md) covers every primary
  control, next screen, state update, animation, disabled case,
  and error path.
- [`architecture.md`](./architecture.md) contains screen-specific
  diagrams (not copied archetype diagrams).
- [`data-contracts.md`](./data-contracts.md) identifies every
  schema, config, localization, asset, sound, VFX, save, and
  replay field required to implement the screen.

## 8. AI Implementation Notes

- Build runtime components from this package contract — not from
  third-party captures or external product pixels.
- Resolve presentation through asset IDs / manifests; deterministic
  gameplay commands use stable IDs and scalar values.
- The three interaction tokens (`SKIP_TOWN_FLYBY`,
  `COMPLETE_TOWN_FLYBY`, `CANCEL_TOWN_ENTRY_AFTER_PRESENTATION_ERROR`)
  are local-ui only; do not add engine reducer behavior for them.

---

## 🔍 Sync Check

- **UI: ⚠** — Component tree, bindings, and routing match siblings [`interactions.md`](./interactions.md), [`data-contracts.md`](./data-contracts.md), and [`architecture.md`](./architecture.md). The mockup renders only the panorama, progress label, and Skip button — the documented `FactionCrest` component is not drawn (see sibling `architecture.md` § ⚠ Issues).
- **Schema: ✔** — `cameraPath` resolves through `presentation.flybyCameraEasing` in [`town-presentation.schema.json`](../../../../../content-schema/schemas/town-presentation.schema.json); other bindings are transient state or config.
- **Tasks: ✔** — Owning task [`phase-2.07-ui-screen-backlog.35-town-flyby-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/35-town-flyby-screen.md) reads this file and its three siblings plus the mockup.

## ⚠ Issues

_None — see sibling `architecture.md` § ⚠ Issues for mockup-level drift not owned by this file._
