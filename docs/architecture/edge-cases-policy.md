# Edge-Cases Policy

The single canonical reference for cross-cutting degraded-condition
behavior across the dispatcher, deterministic reducer, renderer,
persistence layer, and multiplayer transport.

This file is paired with the gameplay-only
[`edge-case-policy.md`](./edge-case-policy.md), which pins per-rule
gameplay corner cases (empty army, simultaneous death, HP overflow,
…). The present document covers the *infrastructure* edges that
upstream documents (`command-schema.md`, `determinism.md`,
`state-flow.md`, `content-platform.md`, `effect-registry.md`) imply
but do not aggregate.

> Source audit:
> [`docs/readiness-audit/12-edge-cases.md`](../readiness-audit/12-edge-cases.md).
> Section numbering follows audit questions Q204–Q218; each section
> states the canonical policy plus its enforcing schema and task
> references.

---

## 1. Invalid commands (Q204)

Commands that fail JSON-Schema or Zod validation never reach a
reducer.

- **Detection.** The dispatcher runs the closed schema in
  [`content-schema/schemas/command.schema.json`](../../content-schema/schemas/command.schema.json)
  before any per-command validator. `additionalProperties: false`,
  `oneOf` over `kind`, and `$ref`-shared numeric `$defs` (see § 5)
  catch malformed payloads.
- **Result.** A `ValidationError` of code `MALFORMED_PAYLOAD` (see
  § 11) is returned; state, command log, and event log are
  unchanged.
- **Owning surfaces.** Schema in `content-schema/schemas/`; runtime
  validator in
  [`tasks/mvp/01-engine-core/06-command-dispatcher.md`](../../tasks/mvp/01-engine-core/06-command-dispatcher.md).

## 2. Current-actor gate (Q205)

A top-level **Gate 0** check at the dispatcher entry rejects any
command whose `metadata.playerId` does not match
`state.currentPlayerId`, before any per-command validator runs.

- **Result.** `ValidationError { code: "NOT_CURRENT_ACTOR" }`.
- **Exempt commands.** None in MVP. Future engine-emitted
  bookkeeping (`SCENARIO_LOAD`, `BATTLE_RESOLVED`,
  end-of-day commands minted under actor `"system"`) is exempt only
  when the metadata explicitly carries `playerId`-equivalent of
  `system`. The exempt enumeration lives in
  [`command-schema.md` § Validation Framework](./command-schema.md#validation-framework).
- **Why a separate gate.** Per-command validators encode
  ownership ad hoc. A gate prevents the entire class of
  "forgot to add the ownership precondition" bugs from leaking
  into multiplayer lockstep, where downstream sequence dedup
  (which is *not* a gate) cannot catch a non-current actor.

## 3. Stale references (Q206)

Per-command existence checks return a typed `ENTITY_NOT_FOUND`
discriminant carrying `{ entityKind, id, lastKnownState? }`, so the
UI can localize precise causes ("hero died", "town captured", "mine
reverted to neutral"). Stable IDs are not recycled, so detection is
already correct; this rule pins the *typed reason* missing from
prior validators.

- **Schema.** `content-schema/schemas/dispatcher-validation-error.schema.json`.
- **Owning task.**
  [`tasks/mvp/01-engine-core/06-command-dispatcher.md`](../../tasks/mvp/01-engine-core/06-command-dispatcher.md).

## 4. Input conflicts (Q207, cross-ref Q59)

Two complementary mechanisms keep redundant intents out of the
command log when a click + hotkey both fire `END_DAY`-like
commands inside one logical tick.

1. **Dispatcher single-flight** on `(playerId, kind)` for the
   non-idempotent kinds: `END_DAY`, `END_BATTLE_TURN`,
   `START_BATTLE`. The second arrival inside the same tick is
   rejected with `DUPLICATE_INTENT`. Replay-time dedup is already
   covered by `nonce`; single-flight protects the pre-dispatch
   path where two browser events share a tick.
2. **UI debounce.** End-day buttons and hotkeys are debounced
   250 ms (trailing edge) at the input layer. UI debounce reduces
   noise; dispatcher single-flight is the safety net.

Surfaces: [`command-schema.md` § Single-flight commands](./command-schema.md#single-flight-commands)
and `interactions.md` for the screens that surface those commands
(see [`07-adventure-map`](./wiki/screens/07-adventure-map/),
[`38-combat-screen`](./wiki/screens/38-combat-screen/),
[`54-system-menu`](./wiki/screens/54-system-menu/)).

## 5. Zero-resource transactions (Q209)

`quantity` integer fields default to `minimum: 1` in JSON-Schema;
`cost` integer fields default to `minimum: 0`. Free actions remain
expressible (a Mysticism-discounted spell may legally have zero
cost via the rules formula), but the *command payload* never
encodes a zero-quantity intent.

- **Shared `$defs`.** `content-schema/schemas/numeric.json`
  exposes `positiveInteger`, `nonNegativeInteger`,
  `resourceAmount`. Every command schema `$ref`s these.
- **Effect.** No-op zero commands (`RECRUIT_UNITS quantity: 0`,
  `BUY_FROM_MARKET amount: 0`) are rejected at schema time, before
  the dispatcher; the replay log stays clean.

## 6. Overflow & saturation (Q210)

Hard caps as named constants and a `clamp`-saturates-not-wraps
policy. JavaScript safe-integer ceiling is `2^53 − 1`; without an
intermediate cap a max-stack creature multiplier could wrap.

| Constant | Value | Scope |
|---|---|---|
| `MAX_RESOURCE` | `2_000_000_000` | per resource per player |
| `MAX_UNIT_COUNT` | `1_000_000` | per stack |
| `MAX_HERO_STAT` | ruleset-pack-driven (default `99`) | per primary stat |
| `MAX_INTERMEDIATE` | `2 ** 53 - 1` | every formula step |

- **Dev mode.** Any intermediate exceeding `MAX_INTERMEDIATE`
  raises `OverflowError`.
- **Prod mode.** Saturates to the documented cap. No silent wrap.
- **Surfaces.** [`determinism.md` § Saturation policy](./determinism.md#saturation-policy);
  `src/engine/constants.ts`; fuzz target in
  `tests/fuzz/overflow.fuzz.ts`.

## 7. Negative resources (Q211)

Every `resources[k] ≥ 0` and every `unit.count ≥ 0` after every
dispatch.

- **State serializer assertion.** Throws `InvariantViolation` in
  dev / clamps to `0` in prod.
- **Drain-against-zero policy.** Drain effects floor at `0` per
  tick; no debt accumulates. Documented in
  [`effect-registry.md` § Drain semantics](./effect-registry.md#drain-semantics).
- **Schema floor.**
  [`content-schema/schemas/game-state.schema.json`](../../content-schema/schemas/game-state.schema.json)
  references `nonNegativeInteger` (§ 5) for every resource and
  unit-count field.

## 8. Save gating (Q212)

A pure `canSaveNow(state): { allowed: boolean, reason?: string }`
predicate enumerates when Save is disabled.

| Reason ID | Triggers |
|---|---|
| `save.disabled.in_battle` | Active battle (between `START_BATTLE` and `END_BATTLE`) |
| `save.disabled.not_your_turn` | `state.currentPlayerId !== state.localPlayerId` (multiplayer turn lock) |
| `save.disabled.modal_open` | Open modal that requires a player choice (`level-up`, `creature-dilemma`, `prompt`) |
| `save.disabled.animating` | Mid-end-of-day animation (until the `END_DAY` post-animation hook fires) |

Animation rehydration: on load, the command log is replayed silently
to the saved offset. The animation timeline starts empty; re-emitted
events execute synchronously without being scheduled. The first
*post*-load command schedules animations normally.

- **Doc.** [`content-schema/save-eligibility.md`](../../content-schema/save-eligibility.md).
- **Surfaces.** [Screen 54](./wiki/screens/54-system-menu/),
  [Screen 55](./wiki/screens/55-save-load/),
  [`tasks/mvp/08-persistence/02-log-only-save-format.md`](../../tasks/mvp/08-persistence/02-log-only-save-format.md),
  [`tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md`](../../tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md).

## 9. Mid-combat disconnect (Q213)

The 30 s reconnect / 120 s forfeit window from the multiplayer
transport applies during combat with these refinements:

- **Combat clock pauses** during the reconnect window. Still-
  connected player sees a banner `mp.combat.disconnect_banner`.
- **AI does not take over** the absent player's stack during the
  reconnect window. Fairness is preferred over throughput; matches
  audit Q146 deferral.
- **At 120 s**, defender wins by forfeit (or attacker, if the
  defender disconnected — i.e., the still-present player wins).
  Combat resolves; the absent player's hero is treated as
  defeated; the still-present player resumes the adventure-map
  turn. Surface: `mp.combat.forfeit_modal`.
- **No per-combat checkpoint** in MVP. Reconnecting peer replays
  the full pre-combat state plus commands; deterministic reducer
  guarantees identical state. Phase-3 may revisit if reconnect
  time becomes problematic.

Owning files:
[`tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md`](../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md),
[Screen 38 Combat](./wiki/screens/38-combat-screen/).

## 10. Locale swap mid-game (Q214)

Locale change is **presentation-only**, never a deterministic
command.

- UI emits `LOCALE_CHANGED` to a side-channel observable (not the
  command log).
- All subscribed selectors re-render. Open transient surfaces
  (tooltips, popovers, hover cards) are dismissed; modals that
  require a player choice re-render in-place with new strings.
- RTL: setting `dir="rtl"` on the body element flips logical-
  property layout (margin-inline-start, etc.); the renderer uses
  logical CSS throughout. Atlases with embedded text resolve via
  the locale-variant chain (see § 12). The battle canvas does
  **not** mirror in MVP — combat layout is symmetric, document
  this exception in
  [`diagrams/19-locale-variants.md`](./diagrams/19-locale-variants.md).
- Save metadata includes `localeAtSave`; load shows no warning if
  the active locale differs (display strings re-resolve normally).

## 11. Validation-error taxonomy

Closed enum of dispatcher-emitted error codes. Schema:
[`content-schema/schemas/dispatcher-validation-error.schema.json`](../../content-schema/schemas/dispatcher-validation-error.schema.json).

| Code | Meaning |
|---|---|
| `MALFORMED_PAYLOAD` | JSON-Schema / Zod failure (§ 1). |
| `NOT_CURRENT_ACTOR` | Gate 0 rejection (§ 2). |
| `ENTITY_NOT_FOUND` | Stale reference (§ 3); carries `{ entityKind, id, lastKnownState? }`. |
| `INSUFFICIENT_RESOURCES` | Per-command resource precondition. |
| `ILLEGAL_PHASE` | Command dispatched outside its valid phase. |
| `OWNERSHIP_VIOLATION` | Per-command ownership precondition. |
| `UNREACHABLE_TARGET` | Pathfinder / range / line-of-sight failure. |
| `DUPLICATE_INTENT` | Single-flight rejection (§ 4). |

Each error carries a structured `path` (RFC 6901 JSON-pointer into
payload) when applicable.

## 12. Asset-load failure (Q215)

- **Fallback chain order.** `locale variant → faction default →
  generic placeholder`. The generic placeholder is bundled with
  the app; never absent.
- **Retry policy.** 1× retry with 500 ms backoff on first failure;
  subsequent failures within the session use placeholder without
  further retry.
- **User notification.** Non-modal toast "Some visuals couldn't
  load" shown once per session, not per asset.
- **Gameplay-vs-presentation boundary.** Any field that affects
  deterministic state (frame timing, hitbox geometry, projectile
  speed) is **gameplay** and lives in the gameplay record (loaded
  pre-session). Streamed assets carry only pixels / audio.
- **AI-pipeline records.** The pre-ingest validation in
  [`ai-generation-pipeline.md`](./ai-generation-pipeline.md)
  remains the fail-loud gate. Runtime never accepts an
  AI-generated *gameplay* record.

## 13. Wall-clock readers (Q216)

Single inventory of every subsystem allowed to read wall-clock
time. The lint rule
([`tasks/mvp/01-engine-core/11-no-wall-clock-lint.md`](../../tasks/mvp/01-engine-core/11-no-wall-clock-lint.md))
forbids it elsewhere in `src/engine/`, `src/rules/`,
`src/content-runtime/`. Full table lives in
[`determinism.md` § Wall-clock readers](./determinism.md#wall-clock-readers).

## 14. Tab backgrounding / `visibilitychange` (Q217)

Single canonical doc:
[`visibility-policy.md`](./visibility-policy.md).

- **Audio.** Mute on `visibilitychange:hidden`; restore on
  `:visible`.
- **Autosave.** Best-effort flush on `:hidden` (synchronous IDB
  write where possible, wrapped in a 50 ms timeout; falls back to
  no-save if budget exceeded).
- **Multiplayer heartbeat.** On `:hidden`, send a
  `WILL_BACKGROUND` transport message extending the peer's
  heartbeat tolerance from 6 s to 30 s for the next 60 s. After
  60 s of continuous backgrounding, normal 6 s threshold resumes
  (mobile sleep ≈ disconnect).
- **Renderer.** Existing rAF cleanup remains; restart only on
  `:visible`.
- **Resume reconciliation.** On `:visible`, request a peer
  state-hash comparison; if hashes match, resume; otherwise treat
  as desync and trigger the reconnection flow.

## 15. Storage quota (Q218)

Single canonical doc:
[`storage-policy.md`](./storage-policy.md).

- **Catch.** `QuotaExceededError` is caught at the IndexedDB
  wrapper boundary. Every write returns `Result<void, StorageError>`.
- **Per-store byte budgets.** `saves` and `scenarios` unbounded;
  `content` 100 MB soft cap, evict at 90 MB; `ai-cache` 200 MB
  soft cap, evict at 180 MB.
- **Eviction order on quota error.**
  1. Evict `ai-cache` LRU until 50 MB free.
  2. Evict `content` LRU until 50 MB free.
  3. Prune oldest `auto-N` autosave slot (if any).
  4. Surface non-modal toast "Storage full — manage saves."
  5. Throw `StorageExhausted` to caller (manual save) so the UI
     can show an actionable modal.
- **Warning threshold.** At 90 % of available quota, show a
  one-time per-session toast "Storage nearly full — consider
  exporting saves."
- **Safari 7-day eviction.** Documented but no code mitigation
  possible; rely on user-initiated "Export saves".
- **`StorageError` taxonomy.** Schema:
  [`content-schema/schemas/storage-error.schema.json`](../../content-schema/schemas/storage-error.schema.json).
  Codes: `QUOTA_EXCEEDED`, `IDB_VERSION_ERROR`, `IDB_BLOCKED`,
  `IDB_DATA_CORRUPTION`.

---

## Cross-references

This file is the canonical home of cross-cutting edge-case policy.
Other documents back-link here rather than duplicating prose:

- [`command-schema.md`](./command-schema.md) — § Validation
  Framework, § Single-flight commands, § Numeric invariants.
- [`determinism.md`](./determinism.md) — § Saturation policy,
  § State-shape invariants, § Wall-clock readers.
- [`state-flow.md`](./state-flow.md) — § Save eligibility.
- [`content-platform.md`](./content-platform.md) — § Asset
  fallback policy.
- [`effect-registry.md`](./effect-registry.md) — § Drain semantics.
