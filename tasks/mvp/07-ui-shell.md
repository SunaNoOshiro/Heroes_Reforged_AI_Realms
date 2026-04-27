# Module: UI Shell (M1)

The React layer: app shell, HUD, town screen, hero panel. The UI never reads from sim state directly — it reads from Zustand, which is updated after each command dispatch. The UI sends commands; the sim responds.

**Milestone**: M1 — Strategic Vertical  
**Total Estimate**: ~28 hours  
**Exit Criteria**: A human can play the game using only the UI — no console commands needed.
**Lint Tags**: ui-shell

---

## Task Files

- [01-react-18-app-shell-with-canvas-overlay.md](07-ui-shell/01-react-18-app-shell-with-canvas-overlay.md)
  🤖 Task 1: React 18 app shell with canvas overlay (~2h)
- [02-zustand-store.md](07-ui-shell/02-zustand-store.md)
  🤖 Task 2: Zustand store (~2h)
- [03-hud-resource-bar-end-turn-button-mini-map-stub.md](07-ui-shell/03-hud-resource-bar-end-turn-button-mini-map-stub.md)
  🧠 Task 3: HUD — resource bar, end-turn button, mini-map stub (~4h)
- [04-town-screen-modal.md](07-ui-shell/04-town-screen-modal.md)
  🧠 Task 4: Town screen modal (~4h)
- [05-hero-info-panel.md](07-ui-shell/05-hero-info-panel.md)
  🤖 Task 5: Hero info panel (~3h)
- [06-command-hook-ui-dispatch-re-render.md](07-ui-shell/06-command-hook-ui-dispatch-re-render.md)
  🤖 Task 6: Command hook — UI → dispatch → re-render (~3h)
- [07-main-menu-screen.md](07-ui-shell/07-main-menu-screen.md)
  🤖 Task 7: Main menu screen (~3h)
- [08-new-game-setup-screen.md](07-ui-shell/08-new-game-setup-screen.md)
  🧠 Task 8: New game setup screen (~4h)
- [09-loading-screen.md](07-ui-shell/09-loading-screen.md)
  🤖 Task 9: Loading screen (~3h)
