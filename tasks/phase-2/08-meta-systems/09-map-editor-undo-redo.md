# Map-Editor Undo / Redo Contract

Module: [Meta Systems (Phase 2)](../08-meta-systems.md)

Description:
Land the editor-only undo/redo contract in
[`docs/architecture/ui-state-contract.md` § Undo / Redo](../../../docs/architecture/ui-state-contract.md#undo--redo-map-editor):
the `state.editor.history.commandLog` and
`state.editor.history.cursor` slots, the bounded history per
`ruleset.ui.editor.maxHistory`, and the
`screen.map-editor.undo` / `screen.map-editor.redo` hotkey
bindings. Today the deterministic command-log model would
technically allow time-travel debugging, but no UI flow exposes
it; the Map Editor (`65-map-editor`) is the most natural undo
candidate and its package is silent on the topic, blocking
non-trivial authoring. In-game undo (e.g. spell-cast undo) is
explicitly deferred to a later Phase 2 / Phase 3 scope.

Read First:
- [`docs/architecture/ui-state-contract.md`](../../../docs/architecture/ui-state-contract.md)
- [`docs/architecture/ui-hotkeys.md`](../../../docs/architecture/ui-hotkeys.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- `docs/architecture/wiki/screens/65-map-editor/spec.md`
- `docs/architecture/wiki/screens/65-map-editor/interactions.md`
- `docs/architecture/wiki/screens/65-map-editor/data-contracts.md`
- `docs/architecture/wiki/screens/65-map-editor/architecture.md`

Inputs:
- The Undo / Redo section anchor in
  [`docs/architecture/ui-state-contract.md`](../../../docs/architecture/ui-state-contract.md)
- The `ui.editor.maxHistory` constant in
  [`content-schema/schemas/ruleset.schema.json`](../../../content-schema/schemas/ruleset.schema.json)

Outputs:
- Additions to
  [`docs/architecture/ui-state-contract.md` § Undo / Redo](../../../docs/architecture/ui-state-contract.md#undo--redo-map-editor)
- Updates to the map-editor screen package
  ([`docs/architecture/wiki/screens/65-map-editor/`](../../../docs/architecture/wiki/screens/65-map-editor/))
  declaring the `editor.undo` / `editor.redo` actions, the
  `Ctrl+Z` / `Ctrl+Shift+Z` bindings, and the
  `state.editor.history.*` bindings

Owned Paths (shared):
- `docs/architecture/ui-state-contract.md`
- `docs/architecture/wiki/screens/65-map-editor/spec.md`
- `docs/architecture/wiki/screens/65-map-editor/interactions.md`
- `docs/architecture/wiki/screens/65-map-editor/data-contracts.md`

Dependencies:
- mvp.07-ui-shell.12-component-state-matrix
- mvp.07-ui-shell.17-tooltip-lifecycle
- mvp.07-ui-shell.18-hotkey-registry

Acceptance Criteria:
- This task is additive: it appends the Undo / Redo subsection to
  the host doc, which remains primarily owned by
  [`12-component-state-matrix.md`](../../mvp/07-ui-shell/12-component-state-matrix.md).
  This task must not rewrite earlier sections or change the
  `ruleset.ui.editor` block (owned by
  [`17-tooltip-lifecycle.md`](../../mvp/07-ui-shell/17-tooltip-lifecycle.md)).
- The map-editor screen package edits are additive: this task adds
  the undo/redo controls, hotkeys, and state bindings without
  rewriting the existing tool ribbon, palette, or save controls
  whose primary contract is owned by the screen-curation task.
- `state.editor.history.commandLog: EditorCommand[]` and
  `state.editor.history.cursor: int` are documented as a separate
  stream from gameplay commands; editor commands MUST NOT enter
  the gameplay command log, the state hash, saves, or replays.
- `editor.undo` decrements cursor and re-applies the prefix;
  `editor.redo` increments cursor; any new edit truncates the
  forward history. The bound is
  `ruleset.ui.editor.maxHistory` (default `200`).
- `screen.map-editor.undo` defaults to `Control+Z`;
  `screen.map-editor.redo` defaults to `Control+Shift+Z`. Both
  resolve to entries in
  [`hotkey/global-default.hotkey.json`](../../../content-schema/examples/records/hotkey/global-default.hotkey.json).
- In-game undo is explicitly deferred — no in-game `state.history`
  slot is reserved by this task.

Verify:
- npm run validate:links
- npm run validate:tasks
- npm run validate

Estimated Time:
- 4 hours
