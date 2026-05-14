# Screen 16: View World
## Interaction Map

### Source Files
- [`mockup.html`](./mockup.html) — visual reference.
- [`spec.md`](./spec.md) — components and state bindings.
- [`data-contracts.md`](./data-contracts.md) — schemas, selectors, localization, assets.
- [`architecture.md`](./architecture.md) — screen diagrams.

### Purpose
Full-world overview for **View Air / View Earth** style spells and
strategic map scanning. All four controls are **UI-local** by
prefix; none enters the deterministic command log. Hero relocation
to a focused target still requires the adventure-map movement
pipeline owned by
[`mvp.05-adventure-map.09-map-object-dialogs`](../../../../../tasks/mvp/05-adventure-map/09-map-object-dialogs.md)
and the visibility projection owned by
[`mvp.03-map-system.05-fog-of-war`](../../../../../tasks/mvp/03-map-system/05-fog-of-war.md).

### Actions
| UI Element | Action ID | Type | Next Screen | Token | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Click revealed pin | `viewWorld.selectPin` | local-ui | Current screen | `SELECT_VIEW_WORLD_PIN` | Writes `state.ui.viewWorld.selectedObjectId`; refreshes the `FocusPlaque` with the pin's localized name and a `Legal focus` flag. | Selected pin picks up the `pulse` glow and a focus ring; sibling pins keep their idle state; `audio.ui.hover` on enter, `audio.ui.click` on select. |
| Layer tab (`Surface` \| `Under` \| `View Air`) | `viewWorld.changeLayer` | local-ui | Current screen | `SET_VIEW_WORLD_LAYER` | Writes the view-layer projection consumed by `WorldMapCanvas` and `ObjectPins`; preserves `state.adventure.camera` (no adventure-map recenter). | Cross-fade between layer plates; `FogMask` repaints with the new layer's reveal pattern; `audio.ui.click`. |
| `FOCUS` button (`data-action="viewWorld.focusSelected"`) | `viewWorld.focusSelected` | navigation | [`07-adventure-map`](../07-adventure-map/spec.md) | `FOCUS_VIEW_WORLD_TARGET` | Hands the adventure-map shell a `cameraTarget = state.ui.viewWorld.selectedObjectId` and closes the modal; clears `state.ui.viewWorld.spellContext` and `selectedObjectId` on commit. | Modal collapses with a downward zoom toward the target tile (`modalIn` reverse); selected pin's focus ring extends into the adventure-map cursor; `audio.adventure.zoom`. |
| `CLOSE` button (`data-action="viewWorld.close"`) | `viewWorld.close` | navigation | [`07-adventure-map`](../07-adventure-map/spec.md) or [`47-spell-book`](../47-spell-book/spec.md) | `CLOSE_VIEW_WORLD` | Closes the modal and returns to the caller (adventure map or spell book); clears `state.ui.viewWorld.spellContext` and `selectedObjectId`; `state.adventure.activeLayer` is unchanged. | Reverse `modalIn` fade; cloud cover reseals over the world panel; `audio.ui.click`. |

Token classification: all four tokens are **UI-local** by prefix.
`SELECT_`, `SET_`, `FOCUS_`, and `CLOSE_` are listed in
`localUiPrefixes` of
[`screen-command-coverage.json`](../../../screen-command-coverage.json),
so none requires a row in
[`command.schema.json`](../../../../../content-schema/schemas/command.schema.json).
View-layer switches do not enter the deterministic command log per
[`mvp.03-map-system.10-underground-layer-support`](../../../../../tasks/mvp/03-map-system/10-underground-layer-support.md)
("Screen 15 and 16 selectors can switch view layer without mutating
gameplay state").

### State Changes
- `state.ui.viewWorld.spellContext` is written by the caller
  (adventure-map spell dispatch or spell book) when the modal opens
  and cleared by `viewWorld.focusSelected` and `viewWorld.close`.
- `state.ui.viewWorld.selectedObjectId` refreshes `selectedFocus` on
  `viewWorld.selectPin` and is cleared on exit.
- `state.adventure.activeLayer` is **read** here and rewritten by
  `viewWorld.changeLayer`; the same slice is the canonical write
  surface for sibling
  [`15-underground-toggle`](../15-underground-toggle/interactions.md)
  (`SET_ADVENTURE_LAYER`). Render context only, not gameplay state.
- `selectors.spells.viewWorldVisibleObjects` and
  `selectors.spells.viewWorldManaCost` refresh `visibleWorld` and
  `manaPreview` whenever the underlying caster spell, fog, scouting,
  or active layer changes.
- UI-only hover, focus, drag ghost, and animation-frame state stay
  outside deterministic gameplay state.

### Navigation Outcomes
- `viewWorld.focusSelected` routes back to
  [`07-adventure-map`](../07-adventure-map/spec.md) after the zoom
  animation; the adventure-map shell receives the target object ID
  and recenters its own camera there. Hero movement to the target
  is a separate gesture owned by
  [`mvp.05-adventure-map.09-map-object-dialogs`](../../../../../tasks/mvp/05-adventure-map/09-map-object-dialogs.md).
- `viewWorld.close` routes back to the caller — either
  [`07-adventure-map`](../07-adventure-map/spec.md) (when the modal
  was opened from a map-targeted spell) or
  [`47-spell-book`](../47-spell-book/spec.md) (when opened from the
  hero's spell book). The caller is recorded inside
  `state.ui.viewWorld.spellContext` when the modal opens.

### Disabled And Error Cases
- `FOCUS` is disabled when `state.ui.viewWorld.selectedObjectId` is
  unset, or when the selected pin is not in
  `selectors.spells.viewWorldVisibleObjects` for the current turn
  (an illegal target slips past the spell's reveal rules); the
  disabled tooltip cites `ui.view-world.errors.no-legal-target`.
- The `Under` layer tab is disabled when
  `state.scenario.layers.underground.enabled` is `false`; the
  disabled tooltip cites
  [`15-underground-toggle`](../15-underground-toggle/interactions.md)'s
  `ui.underground-toggle.errors.no-underground` key (shared
  rationale; do not duplicate the localization key).
- Missing presentation assets may use resolver fallback per
  [`fail-loud.md`](../../../fail-loud.md). Missing gameplay records
  (unknown object ID, malformed spell context, unresolved content
  IDs) fail loudly before controls become enabled, per the same
  doc.
- On rejection, keep the modal open, preserve
  `state.ui.viewWorld.selectedObjectId` when useful, show localized
  error text, and play failure feedback.
- Errors render via `formatUserError(err, locale)` declared in
  [`docs/architecture/error-formatter.md`](../../../error-formatter.md);
  never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- [`spec.md`](./spec.md) owns static regions and state bindings.
- [`architecture.md`](./architecture.md) diagrams must mirror these
  interactions rather than inventing new behavior.
- [`data-contracts.md`](./data-contracts.md) owns the schema /
  localization / asset surface.

## Error surfaces

Per [`error-ux.md`](../../../error-ux.md) § 5, this screen inherits
the default code → surface mapping from § 2. The table below maps
each **schema-backed command** to its default surface for this
screen's dominant error domain.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |

_None._ All four control tokens are UI-local by prefix and never
reach the dispatcher. Disabled-button states (`FOCUS`, `Under` layer
tab) render their reason inline via the localization keys listed
under **Disabled And Error Cases** above.

---

## 🔍 Sync Check

- **UI: ✔** — `FOCUS` and `CLOSE` rows match the
  `data-action="viewWorld.focusSelected"` and
  `data-action="viewWorld.close"` attributes in
  [`mockup.html`](./mockup.html); the layer-tabs row and pin-click
  row describe behaviors implied by the `Layers` panel and revealed
  pins in the mockup (see sibling [`spec.md`](./spec.md) ⚠ Issues —
  `data-action` coverage is partial). Animation cues mirror the
  `pulse`, `modalIn`, and reduced-motion rules in the mockup
  `<style>` block.
- **Schema: ✔** — All four tokens
  (`SELECT_VIEW_WORLD_PIN`, `SET_VIEW_WORLD_LAYER`,
  `FOCUS_VIEW_WORLD_TARGET`, `CLOSE_VIEW_WORLD`) clear via the
  `SELECT_` / `SET_` / `FOCUS_` / `CLOSE_` UI-local prefix policy in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  (checked by `npm run validate:commands`); none requires a row in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json).
  `state.scenario.layers.underground.enabled` (gating the `Under`
  tab) is sourced from
  [`scenario.schema.json`](../../../../../content-schema/schemas/scenario.schema.json);
  `selectors.spells.viewWorldVisibleObjects` is the visibility
  projection named in
  [`security-model.md`](../../../security-model.md) and
  [`mvp.03-map-system.05-fog-of-war`](../../../../../tasks/mvp/03-map-system/05-fog-of-war.md).
- **Tasks: ✔** — Owning UI task
  [`phase-2.07-ui-screen-backlog.16-view-world-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/16-view-world-screen.md)
  reads this file first and lists
  [`mvp.03-map-system.05-fog-of-war`](../../../../../tasks/mvp/03-map-system/05-fog-of-war.md),
  [`mvp.03-map-system.10-underground-layer-support`](../../../../../tasks/mvp/03-map-system/10-underground-layer-support.md),
  and
  [`mvp.05-adventure-map.09-map-object-dialogs`](../../../../../tasks/mvp/05-adventure-map/09-map-object-dialogs.md)
  as Dependencies; the engine task `10-underground-layer-support`
  in turn reads this file first.

## ⚠ Issues

- **Per-row animation column was previously duplicated.** Prior
  revision repeated the same `Cloud/fog masks part …` string in
  every Animation / Audio cell, regardless of which control fired.
  Rewrote each row with its own cue (pin pulse, layer cross-fade,
  focus zoom, modal close) so AI implementers can ship distinct
  animations. Meaning preserved: the per-action cues are derived
  from the keyframes (`pulse`, `dash`, `modalIn`) declared in
  [`mockup.html`](./mockup.html) and the spell-context contract in
  [`spec.md`](./spec.md). No code change implied.
- **Layer-toggle token diverges from sibling 15.** This screen uses
  `SET_VIEW_WORLD_LAYER` for the layer-tabs control while sibling
  [`15-underground-toggle`](../15-underground-toggle/interactions.md)
  uses canonical `SET_ADVENTURE_LAYER` for the same
  `state.adventure.activeLayer` write surface; both clear UI-local
  by prefix. Already flagged from sibling [`spec.md`](./spec.md).
  No code change implied here.
