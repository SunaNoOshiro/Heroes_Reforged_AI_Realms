# Command Schema

Canonical reference for all game commands. Commands are the only way to mutate game state. Every command is deterministic and serializable.

**See also:** [`state-flow.md`](./state-flow.md) (how commands flow through the engine), [`event-schema.md`](./event-schema.md) (the read-only event vocabulary command handlers emit), and [`event-system.md`](./event-system.md) (the runtime contract events flow through).

Events are the read-only flip-side of commands: a command handler computes the next state and the `events: Event[]` array together, and consumers (animation timeline, sound system) iterate the array on their own clock. Events never mutate state, never veto a command, and are never serialized into saves.

---

## Contract

- Every command has a `kind` field (closed enum)
- Commands are **pure data** — no methods, no side effects
- Command dispatcher is a pure reducer: `state' = apply(state, command)`
- All commands serialize / deserialize identically
- Commands are logged in order for replay and multiplayer sync
- Every dispatched command carries a `metadata` block with a `nonce`;
  see [Deduplication](#deduplication)
- Commands enter through one bounded FIFO per engine instance; see
  [Dispatcher Queue](#dispatcher-queue)
- Cross-actor ordering follows the rule in
  [Cross-Actor Ordering](#cross-actor-ordering)
- Commands that mint new entity IDs use the deterministic allocator in
  [`id-allocator.md`](./id-allocator.md); they MUST NOT invent IDs in
  any other way
- Screen interaction tokens are checked by
  [`screen-command-coverage.json`](./screen-command-coverage.json) and
  `npm run validate:commands`. A token must be a schema command, an
  alias to one, UI-local, or explicitly out of scope with an owning task.

### AI-Emitted Commands

Gameplay-AI workers emit the same closed `Command` enum as human
players; there are no AI-only kinds. The AI consumes a projected
per-player `AdventureView` (per
[`ai-contract.md` § 1 Input View](./ai-contract.md#1-input-view))
when deciding which command to emit. The dispatcher validates
the emitted command against full `AdventureState` per the
[Validation Framework](#validation-framework) below; the
projected view is the AI's perception, not a relaxation of
legality. `MOVE_HERO`, `INITIATE_BATTLE`, and every other kind
are checked against the full state at dispatch time, regardless
of which actor emitted them.

### Command Envelope

Every example below shows only the payload fields. The dispatcher
wraps each command in the following envelope before validation,
logging, and dispatch:

```typescript
{
  ...payload,                  // kind plus the per-command fields shown below
  metadata: {
    turn: number,              // current GameState.turn at dispatch
    playerId: number,          // numeric player id of the actor
    nonce: string              // "<actorId>:<turn>:<sequence>"; see Deduplication
  }
}
```

The closed JSON schema in
[`content-schema/schemas/command.schema.json`](../../content-schema/schemas/command.schema.json)
already requires `metadata` with a pattern-checked `nonce` on every
command kind, so individual examples below omit it for brevity.

---

## Adventure Map Commands

Commands that mutate the strategic layer (`AdventureState`).

### MOVE_HERO

Move a hero along a path, consuming movement points.

```typescript
{
  kind: "MOVE_HERO",
  heroId: string,           // hero to move
  path: HexCoord[]          // target path (validated by pathfinder)
}
```

**Validation:**
- Hero exists
- Path is valid (connected, no impassable terrain)
- Hero has sufficient movement points
- No fog-of-war violations

**Effects:**
- Updates hero position to path[-1]
- Consumes movement points proportional to terrain cost
- Triggers object interactions (mine capture, town enter, artifact pickup, combat)
- Updates fog of war

**Determinism:** Pathfinding is deterministic (no RNG). MP cost is deterministic.

---

### END_HERO_TURN

Hero has finished their turn (no more moves or actions).

```typescript
{
  kind: "END_HERO_TURN",
  heroId: string
}
```

**Validation:**
- Hero is active

**Effects:**
- Marks hero as no longer active for this turn
- Advances to next hero or next day

---

### END_DAY

All heroes have finished; advance to next day.

```typescript
{
  kind: "END_DAY"
}
```

**Validation:**
- All heroes have ended turn or passed

**Effects:**
- Increments day counter
- Recalculates town creature growth
- Distributes daily resource income (from mines)
- Resets hero movement points
- Re-seeds mage guild spell offerings (deterministic per town)

---

### RECRUIT_UNITS

Recruit units from a town dwelling.

```typescript
{
  kind: "RECRUIT_UNITS",
  heroId: string,           // recruiting hero
  townId: string,           // town where recruitment happens
  dwellingUnitId: string,   // unit type to recruit (e.g. "emberwild:unit:ash-hound")
  quantity: number          // how many to recruit
}
```

**Validation:**
- Hero is in the town
- Town is friendly (owned by hero's player)
- Dwelling exists and is owned by the town
- Sufficient units available in growth pool
- Hero or town has enough resources
- Recruited units fit in hero army (up to 7 stacks) or town garrison

**Effects:**
- Deducts resources from hero or town
- Removes units from town growth pool
- Adds stack to hero army (or town garrison if army is full)
- If hero army is full, units go to town garrison

---

### BUILD_BUILDING

Construct a building in a town.

```typescript
{
  kind: "BUILD_BUILDING",
  townId: string,           // town where building is constructed
  buildingId: string        // building to construct
}
```

**Validation:**
- Town is friendly
- Building is not already built
- All prerequisites are built
- Town has enough resources
- Only one building per town per day (checked via BuildingBuiltToday flag on town)

**Effects:**
- Deducts resources
- Marks building as built in town.buildings[]
- Adds flag BuildingBuiltToday (reset at END_DAY)
- If building is a creature dwelling, it becomes available for recruitment

---

### LEARN_SPELL

Hero learns a spell from a town's mage guild.

```typescript
{
  kind: "LEARN_SPELL",
  heroId: string,           // learning hero
  townId: string,           // town with mage guild
  spellId: string           // spell to learn
}
```

**Validation:**
- Hero is in the town
- Town has a mage guild at required level
- Spell is available in the mage guild
- Hero has sufficient Knowledge stat for spell level
- Hero does not already know this spell

**Effects:**
- Adds spell to hero.spells[]
- Spell is no longer immediately available (mage guild re-rolls next day)

---

### CAPTURE_MINE

Claim a neutral mine (triggered by MOVE_HERO arrival).

```typescript
{
  kind: "CAPTURE_MINE",
  mineId: string,           // mine being captured
  heroId: string,           // hero capturing it
  playerId: number          // player owner
}
```

**Validation:**
- Mine exists
- Mine is not already owned
- Hero is at mine position
- Mine object is still on map

**Effects:**
- Transfers mine ownership to player
- Mine generates daily income for player
- Removes mine object from map

---

### INITIATE_BATTLE

Hero encounters enemy stack (triggered by MOVE_HERO arrival).

```typescript
{
  kind: "INITIATE_BATTLE",
  attackerId: string,       // attacking hero
  defenderId: string,       // defending hero or neutral stack id
  autoResolve: boolean      // true = auto-resolve, false = enter tactical battle
}
```

**Validation:**
- Attacker hero exists
- Defender hero or neutral stack exists
- Positions are adjacent or same hex

**Effects:**
- Transitions state.phase to "battle"
- If autoResolve: dispatches AUTO_RESOLVE_BATTLE command
- If not: initializes tactical battle state (nested reducer)

---

## Tactical Battle Commands

Commands that mutate tactical battle state (`BattleState`). These run in a nested reducer while `state.phase === "battle"`.

### BATTLE_ATTACK

Stack attacks another stack.

```typescript
{
  kind: "BATTLE_ATTACK",
  attackerStackId: string,
  defenderStackId: string,
  targetPosition: HexCoord  // where defender is (for validation)
}
```

**Validation:**
- Attacker stack exists and is in initiative queue
- Attacker is the current active stack
- Defender stack exists
- Distance is melee (adjacent) or valid ranged (with ranged attack possible)
- Attacker has not already attacked this turn (or has multi-strike ability)
- Defender is not in a protected state (waiting with defend active)

**Effects:**
- Calculates damage via damage formula (AST evaluated against ruleset)
- Applies luck and morale rolls
- Removes HP from defender
- If defender is killed: removes stack from battle
- If defender can retaliate: immediately applies retaliation damage
- Logs the attack event

---

### BATTLE_WAIT

Stack passes their turn, moving to end of initiative queue.

```typescript
{
  kind: "BATTLE_WAIT",
  stackId: string
}
```

**Validation:**
- Stack exists and is the current active stack
- Stack has not already waited this turn

**Effects:**
- Moves stack to end of initiative queue
- Advances to next stack's turn

---

### BATTLE_DEFEND

Stack takes a defensive stance, reducing damage taken.

```typescript
{
  kind: "BATTLE_DEFEND",
  stackId: string
}
```

**Validation:**
- Stack exists and is the current active stack

**Effects:**
- Sets stack's DEFENDING status flag
- Incoming damage while flag is set is reduced by `defendDamageReductionPermille` (locked at 250 permille = 25% reduction): `damageAfterDefend = damage × (1000 - 250) // 1000 = damage × 750 // 1000`
  - Worked example: `damage = 100` → `damageAfterDefend = 100 × 750 // 1000 = 75`
  - The constant lives in `resources/packs/baseline-ruleset/ruleset.json` and is consumed by `src/engine/defend.ts` (see [`tasks/mvp/09-tactical-combat/02a-defend-damage-reduction.md`](../../tasks/mvp/09-tactical-combat/02a-defend-damage-reduction.md)).
- Advances to next stack's turn

---

### BATTLE_SPELL

Hero casts a spell on a target.

```typescript
{
  kind: "BATTLE_SPELL",
  casterId: string,         // hero or stack id casting
  spellId: string,
  targetStackId: string,    // if damage spell
  targetPosition: HexCoord  // if area spell
}
```

**Validation:**
- Caster has spell in spellbook
- Caster has sufficient mana
- Spell is a combat spell (scope includes "combat")
- Target is valid for spell targeting rules

**Effects:**
- Deducts mana from caster
- Evaluates spell effects (damage, heal, status, etc.)
- Applies luck/critical multipliers if applicable
- Advances caster in queue or ends turn

**Note:** Spell system is Phase 2. Combat MVP does not include spells.

---

### BATTLE_SURRENDER

Hero surrenders the battle (optional, for UI only).

```typescript
{
  kind: "BATTLE_SURRENDER",
  heroId: string
}
```

**Validation:**
- Hero is a combatant in the battle

**Effects:**
- Battle ends immediately
- Surrendering hero loses 50 % of army
- Attacker gains all of defender's non-lost army

---

## Auto-Resolve Commands

### AUTO_RESOLVE_BATTLE

Instantly resolve a battle using the damage formula and fixed iterations.

```typescript
{
  kind: "AUTO_RESOLVE_BATTLE",
  attackerArmyId: string,
  defenderArmyId: string,
  attackerHeroId: string | null,
  defenderHeroId: string | null
}
```

**Validation:**
- Both armies exist

**Effects:**
- Simulates 20 rounds of deterministic combat (each side attacks once per round)
- Uses the same damage formula as tactical combat
- Returns winning side and remaining army state
- Dispatches BATTLE_RESOLVED command with results

**Determinism:** Same RNG seed + armies → exact same result every time.

---

## Game Management Commands

### SCENARIO_LOAD

Load a scenario or save file.

```typescript
{
  kind: "SCENARIO_LOAD",
  scenarioId: string,
  seed: number,             // RNG seed for this game
  contentHashes: {
    [packId]: string        // content hash for each loaded pack
  }
}
```

**Validation:**
- Scenario exists
- All referenced packs are loaded

**Effects:**
- Initializes game state from scenario
- Seeds RNG (forks every named sub-stream from
  [`rng-streams.md`](./rng-streams.md) off this `seed`)
- Pins content hashes for determinism
- Pins the resolved `seed` into the command log so replays use the same value

#### Seed Source Precedence

`SCENARIO_LOAD.seed` is resolved at session start by the first matching
rule, in this order:

1. **Explicit user input.** Tournament rooms, daily-challenge codes,
   and bug-report replays paste an explicit integer seed. UI surfaces
   that collect this value live in screens
   [`docs/architecture/wiki/screens/`](./wiki/screens/) (multiplayer
   lobby, scenario settings, replay-import dialogs).
2. **Scenario `seed` field.** Authored scenarios may pin a fixed seed
   in their JSON. Used by tutorial and balanced-fixture scenarios.
3. **`ROLL_RMG_SEED` command result.** For random-map games, the
   pre-load `ROLL_RMG_SEED` command produces a seed that
   `SCENARIO_LOAD` then consumes.
4. **Cryptographically strong fallback.** If none of the above apply, a
   single CSPRNG draw produces the seed at session start. The value is
   pinned into the command log immediately so the rest of the session
   is deterministic.

In every case the resolved integer is recorded as
`SCENARIO_LOAD.seed` and is the only RNG entropy the engine ever
consumes.

---

### BATTLE_RESOLVED

Battle has ended; return to adventure layer.

```typescript
{
  kind: "BATTLE_RESOLVED",
  winnerId: string | null,  // null = draw
  winnerArmy: ArmyStack[],
  loserArmy: ArmyStack[]
}
```

**Validation:**
- Battle is in progress

**Effects:**
- Transitions state.phase back to "adventure"
- Updates winner and loser armies
- Resolves victory conditions (if applicable)
- Continues turn sequence

---

## Save-Import & Pack-Trust Commands

Commands surfaced by screens
[`70-save-import`](./wiki/screens/70-save-import/),
[`71-pack-manager`](./wiki/screens/71-pack-manager/), and
[`72-pack-trust-prompt`](./wiki/screens/72-pack-trust-prompt/) per
[`pack-trust.md`](./pack-trust.md). These tokens drive UI flow and
persistence-side state but do not enter the deterministic engine
command log; they are dispatched against the persistence/content-runtime
adapter, never the engine reducer.

- `OPEN_SAVE_IMPORT` — opens screen 70 from screen 55. local-ui.
- `BEGIN_SAVE_IMPORT` — kick off the schema-validate / quarantine
  pipeline against the source string. Owned by
  `tasks/mvp/08-persistence/11-save-import-screen-and-quarantine.md`.
- `CONFIRM_SAVE_IMPORT` — promote a staged save into a slot after
  trust review. Owned by
  `tasks/mvp/08-persistence/11-save-import-screen-and-quarantine.md`.
- `CANCEL_SAVE_IMPORT` — drop the staged save and clear the
  in-memory quarantine. local-ui.
- `RESTORE_OVERWRITTEN_SAVE` — restore from the rolling overwrite
  ring (`selectors.persistence.recycle.savedSlots`). Owned by
  `tasks/mvp/08-persistence/11-save-import-screen-and-quarantine.md`.
- `OPEN_PACK_TRUST_PROMPT` — opens screen 72. local-ui.
- `GRANT_PACK_TRUST` — write a `decision = "trust"` entry into the
  trust store. Owned by
  `tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md`.
- `DENY_PACK_TRUST` — write a `decision = "deny"` entry. Owned by
  the same task.
- `RUN_PACK_SANDBOXED` — write `decision = "sandboxed"`. Owned by
  the same task.
- `REVOKE_PACK_TRUST` — clear or replace prior trust-store entries.
  Owned by the same task.
- `OPEN_PACK_MANAGER` — opens screen 71. local-ui.
- `INSTALL_PACK_FROM_FILE` — file-picker → traversal sanitizer →
  screen 72. Owned by
  `tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md`.
- `REMOVE_PACK` — uninstall a pack and drop trust-store entries.
  Owned by the same task.
- `ENTER_SAFE_MODE` / `EXIT_SAFE_MODE` — toggle session-wide safe
  mode per [`pack-trust.md` § Safe Mode](./pack-trust.md#5-safe-mode).
  Owned by
  `tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md`.

## UGC, Privacy & Content-Report Commands

Commands surfaced by screens
[`56-options`](./wiki/screens/56-options/),
[`73-ugc-publish-disclaimer`](./wiki/screens/73-ugc-publish-disclaimer/),
[`74-ai-provenance-detail`](./wiki/screens/74-ai-provenance-detail/),
[`75-content-report`](./wiki/screens/75-content-report/), and the
"Forget me" entry in [`54-system-menu`](./wiki/screens/54-system-menu/),
per [`ugc-safety.md`](./ugc-safety.md) and
[`data-inventory.md`](./data-inventory.md). These tokens drive UI flow
and persistence-side state but do not enter the deterministic engine
command log; they are dispatched against the persistence/content-runtime
adapter, never the engine reducer.

- `WIPE_LOCAL_DATA` — wipe local data per scope. Payload
  `{ scope: "all" | "saves" | "profile" | "chat", confirmed: boolean }`.
  Iterates the rows in [`data-inventory.md`](./data-inventory.md)
  rather than a hand-coded list. Owned by
  `tasks/mvp/08-persistence/13-wipe-local-data-handler.md`.
- `TOGGLE_HASHED_DISPLAY_NAME` — flip
  `state.privacy.options.displayNameMode`. Owned by
  `tasks/mvp/07-ui-shell/22-privacy-pane-in-options.md`.
- `TOGGLE_ANALYTICS_OPT_IN` — flip
  `state.privacy.options.analyticsOptIn`. Owned by the same task.
- `TOGGLE_MATURE_CONTENT_GATE` — flip
  `state.privacy.options.allowMatureContent`; binds the same key
  Plan 20 uses for its `contentRating` gate. Owned by the same task.
- `RESET_ANALYTICS_ID` — regenerate `analyticsClientId` if present
  (no-op until a future analytics integration lands). local-ui /
  persistence.
- `OPEN_PUBLISH_DISCLAIMER` — opens screen 73. local-ui.
- `ACCEPT_PUBLISH_DISCLAIMER` — record the per-pack ack and continue
  to the local export step. Owned by
  `tasks/phase-2/04-content-editor/10-publish-disclaimer-flow.md`.
- `EXPORT_SCENARIO_AS_PACK` — package the active editor scenario into
  a `.hrmod` (no network upload at v1). Owned by the same task.
- `OPEN_AI_PROVENANCE` — opens screen 74 with a target pack id.
  local-ui. Owned by
  `tasks/phase-2/05-mod-system/13-ai-provenance-detail-screen.md`.
- `OPEN_CONTENT_REPORT` — opens screen 75 with target metadata
  pre-filled. local-ui.
- `SUBMIT_CONTENT_REPORT` — validate against
  `content-report.schema.json`, persist to
  `state.privacy.outboundReports[]`, return to caller. Owned by
  `tasks/phase-2/05-mod-system/12-content-report-intake-and-local-queue.md`.
- `CANCEL_CONTENT_REPORT` — drop the in-progress report. local-ui.
- `REPORT_PACK` — alias of `OPEN_CONTENT_REPORT` from any UGC
  info-card affordance. Distinct from `REPORT_PEER` (chat-safety):
  this command targets content; `REPORT_PEER` targets player
  behavior.
- `OPEN_PRIVACY_POLICY` — opens an in-app modal rendering
  [`docs/architecture/privacy.md`](./privacy.md). local-ui. Bound
  by the privacy footer in screen
  [`01-main-menu`](./wiki/screens/01-main-menu/) and the "Account &
  Data" entry in [`54-system-menu`](./wiki/screens/54-system-menu/).
- `REQUEST_ERASURE_RECEIPT` — emit an
  [`erasure-receipt.schema.json`](../../content-schema/schemas/erasure-receipt.schema.json)
  and append a corresponding
  [`audit-log-entry.schema.json`](../../content-schema/schemas/audit-log-entry.schema.json)
  row with `type: "ERASURE"`. Payload: `{ scope: "all" | "saves" |
  "profile" | "chat" }`. Complements Plan 21's `WIPE_LOCAL_DATA`;
  rendered by [`54-system-menu`](./wiki/screens/54-system-menu/).
  Owned by `tasks/mvp/07-ui-shell/25-erasure-receipt-modal.md`.

## Consent, Onboarding & Destructive-UX Commands

Commands surfaced by screens
[`60-confirmation-dialog`](./wiki/screens/60-confirmation-dialog/),
[`76-onboarding-consent`](./wiki/screens/76-onboarding-consent/),
[`56-options`](./wiki/screens/56-options/) (Privacy tab),
[`55-save-load`](./wiki/screens/55-save-load/), and
[`64-network-lobby`](./wiki/screens/64-network-lobby/) per
[`onboarding.md`](./onboarding.md),
[`undo-policy.md`](./undo-policy.md), and plan 23. These tokens drive
UI flow, persistence-side state, and `state.profile.consent.*` /
`state.ui.lastDestructive` slices but do **not** enter the
deterministic engine command log; they are dispatched against the
persistence / runtime adapters, never the engine reducer.

- `REQUEST_CONFIRMATION` — opens
  [`60-confirmation-dialog`](./wiki/screens/60-confirmation-dialog/).
  Payload `{ pendingAction, promptKey, severity, callerRoute,
  payload?, confirmDelayMs?, requireType? }`. The dispatcher applies
  per-severity defaults from
  [`60-confirmation-dialog/spec.md` § Click-Through Resistance](./wiki/screens/60-confirmation-dialog/spec.md#click-through-resistance).
- `CONFIRM_PENDING_ACTION` — runs the queued `pendingAction` after the
  `ConfirmEnabled` predicate passes.
- `CANCEL_PENDING_CONFIRMATION` — clears the pending action without mutation.
- `SET_CONFIRM_TYPED_TEXT` — local-ui; updates
  `state.ui.confirmation.typedConfirmText` while the
  `RequireTypeChallenge` is mounted.
- `GRANT_CONSENT` — writes a `state: 'granted'` record into
  `state.profile.consent[scope]`. Payload `{ scope, method }`.
- `REVOKE_CONSENT` — writes `state: 'revoked'`. Payload
  `{ scope, method }`.
- `RECORD_CONSENT_AUDIT` — appends a row to
  `state.profile.consentAuditLog.entries`. Payload
  `{ scope, fromState, toState, policyVersion, method }`.
- `REQUEST_CONSENT_PROMPT` — routes the user to
  [`76-onboarding-consent`](./wiki/screens/76-onboarding-consent/)
  with `pendingScope` set. Payload `{ scope }`.
- `IMPORT_CONSENT_SNAPSHOT` — routes the user through onboarding with
  `importedSnapshot` set; never auto-grants. Payload
  `{ snapshot: ConsentSnapshot }`.
- `CANCEL_CONSENT_PROMPT` — closes onboarding without granting; the
  originating gated action is not retried.
- `SET_AGE_GATE_DRAFT` / `SET_CONSENT_DRAFT` — local-ui drafts on
  `76-onboarding-consent`.
- `SET_AGE_GATE` — writes `config.player.ageGate`; cascades to
  `selectFeatureAvailability` per [`age-gate.md`](./age-gate.md).
- `OPEN_CONSENT_HISTORY` — local-ui; toggles the read-only
  `ConsentHistoryPanel` on the Privacy tab.
- `LEAVE_NETWORK_LOBBY_CONFIRMED` — runs the original disconnect after
  the `60-confirmation-dialog` chain; severity is
  `'critical'` for in-game leave and `'warning'` for waiting-room.
- `CANCEL_OPTIONS_CONFIRMED` — runs the discard-draft path after the
  dirty-state confirmation.
- `UNDO_LAST_DESTRUCTIVE` — clears the tombstone (or restores the
  rolling-overwrite-ring entry) per
  [`undo-policy.md`](./undo-policy.md).
- `EXPIRE_LAST_DESTRUCTIVE` — scheduled effect that runs the
  underlying file-system delete (or drops the ring entry) at TTL.
- `ADD_PEER_TO_ALLOWLIST` / `REMOVE_PEER_FROM_ALLOWLIST` — write to
  `state.profile.knownPeers` per [`peer-trust.md`](./peer-trust.md);
  gated on `consent.multiplayer === 'granted'`.
- `RECORD_PEER_CONTACT` — refreshes `lastSeenAt` on every successful
  WebRTC handshake.
- `ACK_UNSIGNED_PACKS_SESSION` — per-peer session ack for casual
  lobbies when any pack reports `trustState !== 'signed'`; appends a
  row to the consent audit log under scope `unsignedPacks`,
  `tier: 'optional'`, `method: 'session'`.
- `UNLOCK_MEDIA_AUTOPLAY` — local-ui; flips
  `state.runtime.media.unlocked = true` after the first user gesture
  per [`autoplay-policy.md`](./autoplay-policy.md).
- `REVEAL_DEVELOPER_TAB` — local-ui; chord-unlock for the Developer
  tab in [`56-options`](./wiki/screens/56-options/) per
  [`developer-mode.md`](./developer-mode.md).
- `REQUEST_PERMISSION_RATIONALE` — local-ui; opens the JIT rationale
  modal preceding any native permission prompt per
  [`permissions.md` § Just-In-Time (JIT) Rule](./permissions.md#just-in-time-jit-rule-plan-23--q448).

## Field Visibility (Desync Redaction)

Every command field declared above carries a closed
`visibility: 'public' | 'hidden'` tag (default `public` for
backwards compatibility). The tag drives the desync-report
redactor and the replay-export sanitizer; full rules and worked
examples per kind live in
[`desync-redaction.md`](./desync-redaction.md).

Quick reference (worked examples — full table in
[`desync-redaction.md` § 3](./desync-redaction.md#3-worked-examples)):

| Command | Public fields | Hidden fields |
|---|---|---|
| `MOVE_HERO` | `heroId` | `path` |
| `INITIATE_BATTLE` | `attackerHeroId`, `defenderId` | _(none)_ |
| `BATTLE_ATTACK` | `targetHeroId` | `attackerSpellChoice` |
| `CAST_SPELL` | `spellId` | `targetIds` |
| `TRANSFER_ARTIFACT` | `fromHeroId`, `toHeroId` | `artifactId` |
| `RECRUIT_UNIT` | `townId` | `unitId`, `count` |
| `SET_GUARD` | `townId`, `heroId` | `garrisonOrder` |

The redactor copies `public` fields verbatim and replaces `hidden`
fields with `sha256(canonical(field))` truncated to 12 hex chars
plus a length-class label (`<8` / `<32` / `<128` / `>=128`).

## Future Commands (Phase 2+)

These are documented for reference but not implemented in MVP:

- `SPELL_CAST` — adventure-map and combat spell casting
- `ACTIVATE_ARTIFACT` — artifact special ability
- `TRADE_RESOURCES` — marketplace resource exchange
- `RECRUIT_EXTERNAL_DWELLING_UNITS` — hire from neutral or owned dwellings
- `ATTACK_TOWN` — siege assault
- `DIPLOMACY` — alliances, gifts (multiplayer only)

The JSON schema already reserves command kinds for several phase-2
systems so UI tasks can depend on a closed command vocabulary without
inventing reducers: tavern hiring, prison rescue, creature-bank rewards,
artifact equip/unequip, retreat/surrender, war machines, university
skills, shipyards, grail structures, random-map generation, and army or
artifact transfer flows.

---

## Serialization Contract

Every command must:
1. Serialize to JSON with no functions or circular references
2. Round-trip identically (JSON → object → JSON is byte-equal)
3. Include the dispatcher-added `metadata` block:
   `{ turn: number, playerId: number, nonce: string }` (see
   [Deduplication](#deduplication) and
   [Cross-Actor Ordering](#cross-actor-ordering))

All string IDs (heroId, townId, etc.) must be stable across sessions
(defined at scenario load) or minted via the deterministic allocator
in [`id-allocator.md`](./id-allocator.md).

---

## Deduplication

Commands are intentionally **non-idempotent** — each application
mutates state. To make at-most-once delivery safe at the UI / network
boundary, every dispatched command carries a `nonce` field in its
metadata.

### Nonce Format

```
"<actorId>:<turn>:<sequence>"
```

| Segment | Meaning |
|---|---|
| `actorId` | The actor minting the command. Use a deterministic actor identifier (e.g. `p1`, `p2`, `system` for engine-only commands). Must match `^[A-Za-z0-9_-]+$`. |
| `turn` | The turn at mint time. Matches the metadata `turn` field. |
| `sequence` | A per-actor, per-turn monotonic counter starting at 0; resets at the start of each turn for that actor. |

Example: `p1:12:7` is the eighth command player 1 emitted on turn 12.
JSON Schema enforces the format with the regex
`^[A-Za-z0-9_-]+:[0-9]+:[0-9]+$`.

### Dispatcher Behavior

- The dispatcher rejects a command whose `nonce` already appears in
  the current turn's slice of the command log. Rejection emits a
  structured error `{ kind: 'duplicate_nonce', nonce }` and does NOT
  append to the log or advance state.
- The dedup window is the current turn slice only — once `END_DAY`
  rolls over, the per-actor sequence resets and earlier nonces become
  unreachable by definition.
- Replays trust the log: replaying a logged command never re-checks
  for duplicates, since duplicates were filtered at original dispatch.

### Why a Per-Actor Counter

A deterministic counter (rather than a UUID or wall-clock value)
preserves replay reproducibility: the nonce is a function of state and
order, not entropy. Multiplayer lockstep can demux a network frame
exactly because the tuple `(actorId, turn, sequence)` is total and
totally orderable.

---

## Dispatcher Queue

The engine exposes one **single FIFO queue per engine instance**.

| Property | Value |
|---|---|
| Capacity | 1024 commands (default; configurable per engine) |
| Order | FIFO (single-actor in single-player; for multi-actor see [Cross-Actor Ordering](#cross-actor-ordering)) |
| Drain | Single-threaded synchronous `apply` per dequeue |
| Dedup | At enqueue time using the `nonce` rule above |
| Overflow policy | Hard reject — never silent drop |

### Overflow Error

When enqueue would exceed capacity, the dispatcher returns the
structured error and does not append:

```jsonc
{
  "kind": "queue_overflow",
  "capacity": 1024,
  "queued": 1024
}
```

### Multiplayer Lockstep (M5)

The lockstep transport wraps the per-engine queue with a **network-frame
demuxer**: per-frame command bundles are split into per-engine
sequences ordered by the rule in
[Cross-Actor Ordering](#cross-actor-ordering), then enqueued through
this same FIFO. The per-engine queue contract is unchanged.

### AI Co-Actors and Scripted Scenarios

AI co-actors and scripted scenarios may batch-submit commands as long
as each one carries a unique nonce. Batches still respect the bounded
capacity; over-large batches are rejected with `queue_overflow` and
must be split.

---

## Cross-Actor Ordering

Within a single actor's turn, commands run in the order the actor
emits them. **Across actors**, the canonical tie-break rule is:

| Mode | Rule |
|---|---|
| Single-player | Trivial — one actor per turn. |
| Hotseat | Strict turn order from `players[].turnOrder` in the scenario file (see [`scenario.schema.json`](../../content-schema/schemas/scenario.schema.json)). No interleaving within a turn. Handoff happens through the screen package [`63-hotseat-turn-handoff`](./wiki/screens/63-hotseat-turn-handoff/). |
| AI co-actors | Treated as players with deterministic `playerId`s. Same rule as hotseat. |
| Multiplayer lockstep (M5) | Commands within one network frame are sorted by the tuple `(playerId asc, turn asc, sequence asc)` before dispatch. The `(turn, sequence)` half comes directly from the command's `nonce`. |

Commands minted by the engine itself (e.g. `BATTLE_RESOLVED`,
end-of-day book-keeping) use the literal actor id `"system"` for both
nonce generation and ordering. The `playerId asc` comparison is a
literal Unicode-codepoint compare on the `playerId` segment of the
nonce, so the resulting total order is deterministic across all peers
without any special case.

---

## Validation Framework

Commands are validated before dispatch through four ordered gates.
Cross-cutting failure semantics (typed reasons, save gating, asset
fallback, storage quota) live in
[`edge-cases-policy.md`](./edge-cases-policy.md).

```
validate(command: unknown): { valid: true, command: Command } | { valid: false, error: ValidationError }
```

### Gate 0 — Current-actor check

Before any per-command validator runs, the dispatcher rejects any
command whose `metadata.playerId` does not match
`state.currentPlayerId`. The result is
`ValidationError { code: "NOT_CURRENT_ACTOR" }`; state, command log,
and event log are unchanged. This single check prevents the entire
class of "forgot to encode ownership in this new command" bugs from
leaking past the dispatcher and into multiplayer lockstep.

#### Exempt commands

| Command | Rationale |
|---|---|
| _(none in MVP)_ | Every MVP command goes through Gate 0. |

Future engine-emitted bookkeeping (`SCENARIO_LOAD`, `BATTLE_RESOLVED`,
end-of-day commands minted under actor `"system"`) is exempt only
when the actor segment of `nonce` is literally `system`. Any
addition to this table must cite a rationale.

### Gate 1 — Closed-schema validation

JSON-Schema in
[`content-schema/schemas/command.schema.json`](../../content-schema/schemas/command.schema.json).
`additionalProperties: false`, `oneOf` over `kind`, shared numeric
`$defs` (see [Numeric invariants](#numeric-invariants)). A failure
returns `ValidationError { code: "MALFORMED_PAYLOAD", path }`.

### Gate 2 — Semantic validation

Per-command precondition checks (hero exists, resources available,
target reachable, …). Each cause maps to a typed code from
[ValidationError taxonomy](#validationerror-taxonomy) so the UI can
localize precise reasons.

### Gate 3 — Phase / state-transition legality

The transition is legal for the current `state.phase` (e.g.
`BATTLE_ATTACK` only inside `phase === "battle"`). Failure code:
`ILLEGAL_PHASE`.

## ValidationError taxonomy

Closed enum. Schema:
[`content-schema/schemas/dispatcher-validation-error.schema.json`](../../content-schema/schemas/dispatcher-validation-error.schema.json).

| Code | Meaning |
|---|---|
| `MALFORMED_PAYLOAD` | JSON-Schema / Zod failure (Gate 1). |
| `NOT_CURRENT_ACTOR` | Gate 0 rejection. |
| `ENTITY_NOT_FOUND` | Stale reference; carries `{ entityKind, id, lastKnownState? }`. |
| `INSUFFICIENT_RESOURCES` | Per-command resource precondition. |
| `ILLEGAL_PHASE` | Command dispatched outside its valid phase. |
| `OWNERSHIP_VIOLATION` | Per-command ownership precondition. |
| `UNREACHABLE_TARGET` | Pathfinder / range / line-of-sight failure. |
| `DUPLICATE_INTENT` | Single-flight rejection (see below). |

Each error carries a structured `path` (RFC 6901 JSON-pointer into
payload) when applicable.

## Single-flight commands

Two browser events can fire inside one logical tick (a click + a
hotkey both emitting `END_DAY`). The reducer is single-threaded by
contract, so engine-level concurrency is impossible — but a
non-idempotent kind dispatched twice will both be applied unless the
dispatcher gates it.

The following kinds are protected by a per-`(playerId, kind)`
single-flight gate; the second arrival within the same tick is
rejected with `DUPLICATE_INTENT`:

- `END_DAY`
- `END_BATTLE_TURN`
- `START_BATTLE`

UI-side debounce (250 ms trailing edge) on the corresponding
buttons / hotkeys reduces noise; dispatcher single-flight is the
safety net that survives any UI bug.

## Numeric invariants

Integer fields default to:

| Pattern | Constraint | Shared `$def` |
|---|---|---|
| `quantity` (recruit, transfer, split, upgrade) | `minimum: 1` | `positiveInteger` |
| `cost`, `amount` (resource deltas) | `minimum: 0` | `nonNegativeInteger` |
| Resource scalar | `minimum: 0`, `maximum: MAX_RESOURCE` | `resourceAmount` |

Free actions remain expressible (a Mysticism-discounted spell may
have `cost = 0` via the rules formula), but the *command payload*
never encodes a zero-quantity intent. Shared `$defs` live in
[`content-schema/schemas/numeric.json`](../../content-schema/schemas/numeric.json).
Every command schema `$ref`s these — see
[`edge-cases-policy.md` § 5](./edge-cases-policy.md#5-zero-resource-transactions-q209)
for rationale.

---

## Related Files

- `content-schema/schemas/command.schema.json` — JSON Schema for validation
- `src/engine/commands/` — command handler implementations
- `src/engine/dispatcher.ts` — command dispatcher reducer
- `docs/architecture/state-flow.md` — how commands fit in the game loop
- `docs/architecture/state-shape.md` — top-level `GameState` shape commands consume
- `docs/architecture/rng-streams.md` — named PCG32 sub-streams seeded by `SCENARIO_LOAD`
- `docs/architecture/id-allocator.md` — runtime entity-ID format used by minting commands
- `docs/architecture/multi-engine-harness.md` — desync detection across engine instances
- `docs/architecture/ai-contract.md` — gameplay-AI runtime contract (projected view, worker protocol, budgets, cancellation, parallelism)
