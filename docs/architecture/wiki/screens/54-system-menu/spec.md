# Screen 54: System Menu

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Modal overlay invoked over live gameplay for save, load, options,
pack management, privacy / erasure actions, return-to-main-menu
confirmation, and resume. Gameplay state is paused for local UI only;
deterministic reducers run only after a route guard accepts a
command.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract
- Curation status: `curated-pass-6`.
- Compact stone command tablet centered over the dimmed gameplay
  backdrop, with vertical beveled command buttons.
- Dense classic fantasy strategy chrome: fixed 800×600 layout, ornate
  gold frame, red / brown / stone panels, compact icon slots, right-
  click detail affordances, and bottom status / resource feedback.
- `mockup.html` carries visible UI only; logic, transitions, and
  implementation notes live in the Markdown package files.

### Component Tree
- `SystemMenu`
  - `DimmedGameplayBackdrop`
  - `CommandTablet`
    - `SaveLoadButtons` (Save Game, Load Game)
    - `OptionsButton`
    - `ManagePacksButton`
    - `SafeModeButton`
    - `ForgetMeButton`
    - `PrivacyFooter` (Privacy policy, Processor list)
  - `ErasureReceiptModal`
  - `ConfirmRoutes` (route hand-off to `60-confirmation-dialog`)

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `callerRoute` | `state.ui.systemMenu.callerRoute` | Screen to resume on close. UI-only; not persisted. |
| `canSave` | `selectors.persistence.canSaveCurrentGame` | Save command availability per [`save-eligibility.md`](../../../../../content-schema/save-eligibility.md). |
| `canLoad` | `selectors.persistence.hasLoadableSave` | Load command availability. |
| `restartGuard` | `selectors.session.restartGuard` | Restart confirm / disabled gate. |
| `dirtyDrafts` | `state.ui.unsavedDrafts` | Local drafts requiring discard confirmation. |

### Mechanics Mapping
- Routes to save / load / options / confirmation never mutate
  gameplay. Destructive actions require confirmation and preserve
  deterministic state until accepted.
- UI previews stay local until a listed command or route guard
  accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and
  map objects resolve through registries and content schemas, not
  hardcoded view logic.

### Animation Contract
- Backdrop dims; tablet drops in; hovered command glows; route
  buttons crossfade into child dialogs.
- Animation consumes reducer or route results; it never decides
  gameplay outcomes.
- Reduced-motion mode preserves the visible state changes with
  static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen,
  state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied
  archetype diagrams.
- Data contracts identify schema / config / localization / asset /
  sound / VFX / save / replay fields required to implement the
  screen.

### AI Implementation Notes
- Screen slug `system-menu`; system group `system`; curation marker
  `curated-pass-6`.
- Build runtime components from the package contract, not from
  third-party captures or external product pixels.
- Runtime code resolves presentation through asset IDs / manifests;
  deterministic gameplay commands use stable IDs and scalar values.

---

## 🔍 Sync Check

- **UI: ⚠** — Component tree now covers every control referenced in sibling [`interactions.md` § Actions](./interactions.md#actions) (`ManagePacksButton`, `SafeModeButton`, `ForgetMeButton`, `PrivacyFooter`, `ErasureReceiptModal`). The legacy `mockup.html` still shows action IDs `system.main` / `system.quit` that the markdown contract does not — flagged in sibling [`architecture.md` § Issues](./architecture.md#-issues).
- **Schema: ✔** — Schemas referenced via sibling [`data-contracts.md`](./data-contracts.md#content-schemas-and-registries) (`asset-index`, `localization`, `audit-log-entry`, `erasure-receipt`, `ruleset`) all carry rows in [`schema-matrix.md`](../../../schema-matrix.md).
- **Tasks: ✔** — Owning task [`tasks/phase-2/07-ui-screen-backlog/54-system-menu-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/54-system-menu-screen.md) lists this file under Read First; `Owned Paths` is `src/ui/screens/SystemMenu.tsx`.

## ⚠ Issues

- **Description-vs-actions drift (resolved in this pass).** The
  prior Description listed "restart" and "quit confirmation," neither
  of which is an action ID in
  [`interactions.md`](./interactions.md#actions). Rewrote the
  Description to enumerate the actions that actually exist; the
  `restartGuard` selector remains a state binding (used to gate the
  Main Menu confirm flow), not a standalone action. No feature
  invented (Hard Prohibition B).
- **Mockup drift (cross-reference).** The mockup-vs-canonical ID
  drift is tracked in sibling
  [`architecture.md` § Issues](./architecture.md#-issues). Not
  duplicated here.
