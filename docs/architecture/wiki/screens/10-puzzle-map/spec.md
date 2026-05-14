# Screen 10: Puzzle Map

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Obelisk puzzle map. Reveals grail-location fragments as the active
player visits obelisks; the visible fragment mask is a deterministic
function of `(scenario.grail, obelisksVisited.length)` produced by
[`mvp.05-adventure-map.22-obelisk-visits-and-grail-state`](../../../../../tasks/mvp/05-adventure-map/22-obelisk-visits-and-grail-state.md).

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract
- Curation status: `curated-pass-3`.
- Fixed `800 × 600` layout. The adventure map and right-side command
  panel remain visible behind a centered torn-parchment modal that
  carries the fragment grid (6 rows × 8 columns), the obelisk
  progress plaque, the grail-hint status strip, and the `JUMP` /
  `CLOSE` buttons. Match `mockup.html` exactly for placement, colors,
  and button labels.
- Hidden fragments render as soot-masked `?` tiles (`slot` class);
  revealed fragments render with the `slotHot` glow and a `clue`
  label. Title plaque reads `Puzzle Map - Obelisks N / M`.
- `mockup.html` carries the visible UI only. Logic, transitions, and
  implementation notes live in the sibling Markdown files.

### Component Tree
- `PuzzleMapScreen`
  - `FragmentGrid`
  - `ObeliskProgress`
  - `GrailHintPanel`
  - `MapJumpButton`
  - `CloseButton`

### State Bindings
| Element | Bound to | Notes |
| --- | --- | --- |
| `obeliskProgress` | `state.players.active.obelisksVisited` | Visited obelisks; rendered as `visited / total` (see [`mvp.05-adventure-map.22-obelisk-visits-and-grail-state`](../../../../../tasks/mvp/05-adventure-map/22-obelisk-visits-and-grail-state.md)). `active` is shorthand for `state.players[state.currentPlayerId]`. |
| `fragmentGrid` | `selectors.grail.revealedPuzzleFragments` | Deterministic fragment mask from scenario grail metadata. |
| `selectedFragment` | `state.ui.puzzleMap.selectedFragment` | Local UI slice; transient, never persisted. |
| `grailRegionHint` | `selectors.grail.visibleRegionHint` | Text / region hint allowed by current reveal progress. |
| `mapJumpTarget` | `selectors.grail.selectedFragmentMapFocus` | Optional camera focus for the currently selected revealed fragment. |

### Mechanics Mapping
- Reveal progress is derived; the screen never grants reveal directly.
  Clicking a revealed tile only changes local focus
  (`state.ui.puzzleMap.selectedFragment`) unless the player explicitly
  requests a map jump.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and map
  objects resolve through registries and content schemas — never
  hardcoded view logic.

### Animation Contract
- New fragments peel open with a parchment curl (the `modalIn`
  keyframe in `mockup.html`); hidden fragments shimmer subtly via the
  `pulse` keyframe; the focused clue tile pulses with a gold border
  (`slotHot` + `glow` filter).
- Animation consumes selector or route results; it never decides
  gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static
  highlights and localized feedback. The
  `@media (prefers-reduced-motion: reduce)` rule in `mockup.html` is
  the canonical example.

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
- Screen slug `puzzle-map`; system group `adventure`; curation marker
  `curated-pass-3`.
- Build runtime components from this package contract — never from
  third-party captures or external product pixels.
- Resolve presentation through asset IDs and manifests; deterministic
  gameplay records carry stable IDs and scalar values only.
- All three control tokens (`puzzle.selectFragment`,
  `puzzle.jumpToMap`, `puzzle.close`) are **UI-local** — they do not
  enter the deterministic command log. See sibling
  [`interactions.md`](./interactions.md) for the per-control routing
  and [`data-contracts.md`](./data-contracts.md) for the prefix
  coverage.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree, regions (`FragmentGrid`,
  `ObeliskProgress`, `GrailHintPanel`, `JUMP`, `CLOSE`), the
  `Puzzle Map - Obelisks N / M` plaque, and the 6×8 fragment grid all
  match `mockup.html`; animation contract mirrors the `modalIn`,
  `pulse`, and `glow` rules in the mockup `<style>` block.
- **Schema: ✔** — All three `selectors.grail.*` bindings and
  `state.players[].obelisksVisited` are produced by upstream task
  [`mvp.05-adventure-map.22-obelisk-visits-and-grail-state`](../../../../../tasks/mvp/05-adventure-map/22-obelisk-visits-and-grail-state.md);
  no engine commands enter this screen, so
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json)
  is not directly referenced. See sibling
  [`data-contracts.md`](./data-contracts.md) for the schema list —
  aligned.
- **Tasks: ✔** — Owning task
  [`phase-2.07-ui-screen-backlog.10-puzzle-map-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/10-puzzle-map-screen.md)
  reads this file first and lists `src/ui/screens/PuzzleMap.tsx` as
  the sole Owned Path.

## ⚠ Issues

- **Upstream schema extensions not yet shipped.** The screen consumes
  `selectors.grail.*` and `state.players[].obelisksVisited`, all owned
  by [`mvp.05-adventure-map.22-obelisk-visits-and-grail-state`](../../../../../tasks/mvp/05-adventure-map/22-obelisk-visits-and-grail-state.md)
  (currently `planned` per
  [`tasks/task-status.json`](../../../../../tasks/task-status.json)).
  That task adds the optional `grail` block to
  [`scenario.schema.json`](../../../../../content-schema/schemas/scenario.schema.json)
  and the `"obelisk"` value to the `category` enum in
  [`map-object.schema.json`](../../../../../content-schema/schemas/map-object.schema.json).
  Per CLAUDE.md (Dependencies are scheduling constraints), the
  owning UI task
  [`phase-2.07-ui-screen-backlog.10-puzzle-map-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/10-puzzle-map-screen.md)
  already lists task 22 as a Dependency — no doc change needed, only
  flagged so an implementer knows the selectors are not yet
  resolvable in `main`.
- **`state.ui.puzzleMap.selectedFragment` not registered in
  `data-inventory.md`.** Transient UI slice, not persisted, so the
  [`data-inventory.md`](../../../data-inventory.md) contract ("every
  persisted field is registered") does not require a row. Soft
  cross-reference gap only: if the slice ever becomes session-
  persistent, the owning task
  [`phase-2.07-ui-screen-backlog.10-puzzle-map-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/10-puzzle-map-screen.md)
  must add a `low / in-memory / session` row before merge. Skill did
  not add the row itself (Hard Prohibition D).
