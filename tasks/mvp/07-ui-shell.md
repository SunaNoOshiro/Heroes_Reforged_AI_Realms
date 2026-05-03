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
- [10-selector-purity-lint.md](07-ui-shell/10-selector-purity-lint.md)
  🧠⚠️ Task 10: Selector purity contract + lint rule (~3h)
- [11-screen-router-fsm.md](07-ui-shell/11-screen-router-fsm.md)
  🧠⚠️ Task 11: Screen-router FSM + aggregated transition graph (~6h)
- [12-component-state-matrix.md](07-ui-shell/12-component-state-matrix.md)
  🧠⚠️ Task 12: Component-state matrix + cross-screen UI contract (~5h)
- [13-screen-package-contract-sweep.md](07-ui-shell/13-screen-package-contract-sweep.md)
  🧠 Task 13: Per-screen contract sweep (~6h)
- [14-modal-stack.md](07-ui-shell/14-modal-stack.md)
  🧠⚠️ Task 14: Modal stack schema + dismissal policy (~5h)
- [15-input-arbitration.md](07-ui-shell/15-input-arbitration.md)
  🧠⚠️ Task 15: Input arbitration contract (~4h)
- [16-gesture-taxonomy.md](07-ui-shell/16-gesture-taxonomy.md)
  🤖 Task 16: Gesture taxonomy contract (~4h)
- [17-tooltip-lifecycle.md](07-ui-shell/17-tooltip-lifecycle.md)
  🧠 Task 17: Tooltip lifecycle + numeric timing constants (~4h)
- [18-hotkey-registry.md](07-ui-shell/18-hotkey-registry.md)
  🧠⚠️ Task 18: Hotkey registry + focus order (~5h)
- [19-input-modalities.md](07-ui-shell/19-input-modalities.md)
  🤖 Task 19: Touch + keyboard + gamepad input modalities (~3h)
- [20-command-lifecycle.md](07-ui-shell/20-command-lifecycle.md)
  🧠 Task 20: Command lifecycle + in-flight UI contract (~3h)
