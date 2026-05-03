# Zustand Store

Status: planned

Module: [UI Shell (M1)](../07-ui-shell.md)

Description:
Define the UI state store. The store holds presentation state only — selected entities, open modals, active panels. Game state lives in the sim; the store holds a snapshot for rendering.

Read First:
- [`docs/architecture/ui-technology-choice.md`](../../../docs/architecture/ui-technology-choice.md)
- [`docs/architecture/ui-component-resolver.md`](../../../docs/architecture/ui-component-resolver.md)
- [`docs/architecture/overview.md`](../../../docs/architecture/overview.md)
- `docs/architecture/wiki/screens/07-adventure-map/spec.md`
- `docs/architecture/wiki/screens/07-adventure-map/interactions.md`
- `docs/architecture/wiki/screens/07-adventure-map/data-contracts.md`
- `docs/architecture/wiki/screens/07-adventure-map/architecture.md`
- `docs/architecture/wiki/screens/07-adventure-map/mockup.html`

Inputs:
- `AdventureState` type (`05-adventure-map.md` Task 1)
- Screen package `docs/architecture/wiki/screens/07-adventure-map/`

Outputs:
- `src/ui/store.ts`

Owned Paths:
- `src/ui/store.ts`

Store shape:
```typescript
type UIStore = {
  // Sim state snapshot (updated after every command dispatch)
  gameState: AdventureState | null,

  // Selection
  selectedHeroId: string | null,
  selectedTownId: string | null,
  hoveredHex: HexCoord | null,

  // Modals
  openModal: "town" | "hero" | "battle" | "save" | null,

  // Turn info
  localPlayerId: number,

  // Actions
  setGameState: (s: AdventureState) => void,
  selectHero: (id: string | null) => void,
  selectTown: (id: string | null) => void,
  openTownScreen: (townId: string) => void,
  closModal: () => void,
}
```

Dependencies:
- mvp.07-ui-shell.01-react-18-app-shell-with-canvas-overlay

Acceptance Criteria:
- Store updates trigger React re-renders of subscribed components
- `gameState` snapshot is replaced atomically (no partial update glitch)
- No game logic inside the store — store is presentation state only
- Layout, bindings, and commands match `docs/architecture/wiki/screens/07-adventure-map/mockup.html`, `docs/architecture/wiki/screens/07-adventure-map/interactions.md`, and `docs/architecture/wiki/screens/07-adventure-map/data-contracts.md`.
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
