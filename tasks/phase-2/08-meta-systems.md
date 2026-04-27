# Module: Campaign, Quest, And Status Meta Systems (P2)

Campaign flow, quest progression, cinematic playback, persistent
status history, and inter-town logistics. These systems sit above the
core adventure loop but must still use deterministic content/state
contracts when they mutate gameplay state.

**Milestone**: P2 — Meta Systems
**Total Estimate**: ~24 hours
**Exit Criteria**: Campaigns can launch scenario chains, quests can be
tracked and completed, cinematics can play from content records, the
status log persists important messages without UI-only hidden state,
and caravans can move army stacks between owned towns deterministically
across turns.

---

## Task Files

- [01-campaign-graph-schema.md](08-meta-systems/01-campaign-graph-schema.md)
  🤖 Task 1: Campaign graph schema runtime wiring (~3h)
- [02-campaign-runner.md](08-meta-systems/02-campaign-runner.md)
  🧠 Task 2: Campaign runner and carry-over (~4h)
- [03-cinematic-playback-engine.md](08-meta-systems/03-cinematic-playback-engine.md)
  🤖 Task 3: Cinematic playback engine (~3h)
- [04-quest-log-engine.md](08-meta-systems/04-quest-log-engine.md)
  🧠 Task 4: Quest log engine (~4h)
- [05-status-history-store.md](08-meta-systems/05-status-history-store.md)
  🤖 Task 5: Status history store (~3h)
- [06-caravan-transfer-command.md](08-meta-systems/06-caravan-transfer-command.md)
  🧠 Task 6: Caravan transfer command (~4h)
- [07-hotseat-turn-state-machine.md](08-meta-systems/07-hotseat-turn-state-machine.md)
  🧠 Task 7: Hotseat turn state machine (~3h)
