# Status History Store

Module: [Campaign, Quest, And Status Meta Systems (P2)](../08-meta-systems.md)

Description:
Implement persistent status history for important gameplay and app
messages. The store separates deterministic game events from local UI
presentation controls such as pin, expand, collapse, and clear.

Read First:
- `docs/architecture/wiki/screens/19-status-bar/interactions.md`
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Inputs:
- Engine event stream
- Localization registry
- UI shell store

Outputs:
- `src/ui/status/status-history-store.ts`
- `src/ui/status/status-selectors.ts`
- Status history persistence adapter

Owned Paths:
- `src/ui/status/status-history-store.ts`
- `src/ui/status/status-selectors.ts`

Dependencies:
- mvp.07-ui-shell.02-zustand-store
- mvp.08-persistence.01-indexeddb-wrapper

Acceptance Criteria:
- Layout, bindings, and commands match `docs/architecture/wiki/screens/19-status-bar/interactions.md`
- Gameplay messages are derived from engine events and stable IDs
- Pin, expand, collapse, and clear remain UI-local and never enter the
  gameplay command log
- Status history survives save/load where persistence rules allow it
- Screen 19 secondary commands have explicit local-state handling
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
