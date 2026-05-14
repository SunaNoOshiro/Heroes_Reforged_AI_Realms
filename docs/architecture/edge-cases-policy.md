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

> Each section states the canonical policy plus its enforcing schema
> and task references.

---

## 1. Invalid commands

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

## 2. Current-actor gate

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
  ownership ad hoc; a single gate prevents the "forgot to add
  the ownership precondition" bug class from reaching multiplayer
  lockstep, where the nonce-based dedup is *not* a gate and
  cannot catch a non-current actor.

## 3. Stale references

Per-command existence checks return a typed `ENTITY_NOT_FOUND`
discriminant carrying `{ entityKind, id, lastKnownState? }`, so the
UI can localize precise causes ("hero died", "town captured", "mine
reverted to neutral"). Stable IDs are not recycled, so detection is
already correct; this rule pins the *typed reason* missing from
prior validators.

- **Schema.** `content-schema/schemas/dispatcher-validation-error.schema.json`.
- **Owning task.**
  [`tasks/mvp/01-engine-core/06-command-dispatcher.md`](../../tasks/mvp/01-engine-core/06-command-dispatcher.md).

## 4. Input conflicts

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

## 5. Zero-resource transactions

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

## 6. Overflow & saturation

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

## 7. Negative resources

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

## 8. Save gating

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

## 9. Mid-combat disconnect

The 30 s reconnect / 120 s forfeit window from the multiplayer
transport applies during combat with these refinements:

- **Combat clock pauses** during the reconnect window. Still-
  connected player sees a banner `mp.combat.disconnect_banner`.
- **AI does not take over** the absent player's stack during the
  reconnect window. Fairness is preferred over throughput.
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

## 10. Locale swap mid-game

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

## 12. Asset-load failure

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

## 13. Wall-clock readers

Single inventory of every subsystem allowed to read wall-clock
time. The lint rule
([`tasks/mvp/01-engine-core/11-no-wall-clock-lint.md`](../../tasks/mvp/01-engine-core/11-no-wall-clock-lint.md))
forbids it elsewhere in `src/engine/`, `src/rules/`,
`src/content-runtime/`. Full table lives in
[`determinism.md` § Wall-clock readers](./determinism.md#wall-clock-readers).

## 14. Tab backgrounding / `visibilitychange`

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

## 15. Storage quota

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

- [`command-schema.md`](./command-schema.md#validation-framework)
  — § Validation Framework,
  [§ Single-flight commands](./command-schema.md#single-flight-commands),
  [§ Numeric invariants](./command-schema.md#numeric-invariants).
- [`determinism.md`](./determinism.md#saturation-policy)
  — § Saturation policy,
  [§ State-shape invariants](./determinism.md#state-shape-invariants),
  [§ Wall-clock readers](./determinism.md#wall-clock-readers).
- [`state-flow.md`](./state-flow.md#save-eligibility) — § Save
  eligibility.
- [`content-platform.md`](./content-platform.md#asset-load-failure-policy)
  — § Asset-Load Failure Policy.
- [`effect-registry.md`](./effect-registry.md#drain-semantics) —
  § Drain semantics.
- [`visibility-policy.md`](./visibility-policy.md) — per-subsystem
  `visibilitychange` behavior referenced from § 14.
- [`storage-policy.md`](./storage-policy.md) — IDB wrapper, byte
  budgets, eviction order referenced from § 15.
- [`edge-case-policy.md`](./edge-case-policy.md) — paired
  *gameplay* corner cases (empty army, simultaneous death, HP
  overflow).

---

## 🔍 Sync Check

- **UI: ✔** — Screen citations in §§ 4, 8, 9 ([`07-adventure-map`](./wiki/screens/07-adventure-map/), [`38-combat-screen`](./wiki/screens/38-combat-screen/), [`54-system-menu`](./wiki/screens/54-system-menu/), [`55-save-load`](./wiki/screens/55-save-load/)) all resolve; the toast / banner / modal IDs (`mp.combat.disconnect_banner`, `mp.combat.forfeit_modal`, `save.disabled.*`) match [`save-eligibility.md`](../../content-schema/save-eligibility.md).
- **Schema: ⚠** — § 11 enum (8 codes) matches [`dispatcher-validation-error.schema.json`](../../content-schema/schemas/dispatcher-validation-error.schema.json) exactly; § 5 `$defs` match [`numeric.json`](../../content-schema/schemas/numeric.json); § 15 codes match [`storage-error.schema.json`](../../content-schema/schemas/storage-error.schema.json). However, neither `dispatcher-validation-error` nor `storage-error` is registered in [`schema-matrix.md`](./schema-matrix.md). Detail in `## ⚠ Issues`.
- **Tasks: ⚠** — Owning tasks in §§ 1, 3, 8, 9, 13 all exist on disk and back-link here. Section 6 fuzz target `tests/fuzz/overflow.fuzz.ts` is owned by [`tasks/phase-2/09-quality/01-overflow-fuzz.md`](../../tasks/phase-2/09-quality/01-overflow-fuzz.md), which back-links here, but that task is not named in the body. Section 14 (`WILL_BACKGROUND` + 60 s grace) and § 15 (eviction order, warning threshold) are owned by tasks ([`07-host-migration-heartbeat-election`](../../tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md), [`09-quota-handling`](../../tasks/mvp/08-persistence/09-quota-handling.md)) that are referenced from the *companion* sibling docs ([`visibility-policy.md`](./visibility-policy.md), [`storage-policy.md`](./storage-policy.md)) rather than from this file. Non-blocking; consistent with this file being the cross-cutting pointer doc.

## ⚠ Issues

- **Inbound `qNNN` anchors broken across the corpus.** Commit
  `446a5a8` ("Drop stale archived-plan links from canonical docs")
  removed audit-question Q-IDs (`Q204` … `Q218`) from the headings
  of §§ 1–10 and 12–15, but did not scrub the inbound anchors that
  reference them. As a result, ~12 sibling documents and tasks now
  point at anchors that no longer resolve in this file:
  [`command-schema.md` line 1094](./command-schema.md), [`determinism.md` lines 155, 180](./determinism.md),
  [`content-platform.md` line 132](./content-platform.md),
  [`effect-registry.md` line 165](./effect-registry.md),
  [`state-flow.md` line 134](./state-flow.md),
  [`visibility-policy.md` lines 6, 95](./visibility-policy.md),
  [`storage-policy.md` lines 14, 122](./storage-policy.md),
  [`ai-generation-pipeline.md` line 267](./ai-generation-pipeline.md),
  [`diagrams/19-locale-variants.md` line 51](./diagrams/19-locale-variants.md),
  [`diagrams/18-string-resolution.md` line 72](./diagrams/18-string-resolution.md),
  [`save-eligibility.md` line 48](../../content-schema/save-eligibility.md),
  and several files under `tasks/` (`mvp/01-engine-core/06-command-dispatcher.md`, `mvp/01-engine-core/06b-extend-command-schema-coverage-checklist.md`, `mvp/02-content-schemas/12-formula-dsl.md`, `mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md`, `mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md`, `mvp/08-persistence/02-log-only-save-format.md`, `phase-2/09-quality/01-overflow-fuzz.md`, `phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md`, plus the `task-registry.json` rows that mirror them). The owner of `446a5a8` (or whoever continues the cleanup) must close the gap by either restoring the `(QNNN)` suffixes on these headings (so anchors like `#5-zero-resource-transactions-q209` resolve again) or sweeping the inbound anchors in those files to drop the suffix. The audit did not pick a side because (a) reverting the heading change in `446a5a8` would undo a deliberate maintainer edit and (b) editing the sibling files would violate Hard Prohibition D. Suggested values: prefer the corpus-wide sweep — drop `qNNN` from inbound anchors in the listed files, leave the cleaner headings as in this rewrite. Mapping for reverse-direction repair if that is the chosen path: § 1 = Q204, § 2 = Q205, § 3 = Q206, § 4 = Q207, § 5 = Q209, § 6 = Q210, § 7 = Q211, § 8 = Q212, § 9 = Q213, § 10 = Q214, § 12 = Q215, § 13 = Q216, § 14 = Q217, § 15 = Q218 (§ 11 was never tied to a Q-ID; cross-refs to Q208 = "state-vs-UI divergence" were absorbed into § 11 + § 8 without their own section).
- **`dispatcher-validation-error.schema.json` and `storage-error.schema.json` not in `schema-matrix.md`.** § 11 names the dispatcher error taxonomy as the canonical closed enum, and § 15 names the storage error taxonomy. Both schema files exist on disk and both `$id` themselves under the `heroes-reforged/` namespace. Neither row appears in [`schema-matrix.md`](./schema-matrix.md). Per CLAUDE.md root contract on schema registration, the schema-matrix owner must add the two rows — the matrix is the index agents read to discover error envelopes. Suggested values: add a `DispatcherValidationError` row pointing at the schema and at this file § 11, and a `StorageError` row pointing at the schema and at this file § 15 (and at [`storage-policy.md` § StorageError Taxonomy](./storage-policy.md#storageerror-taxonomy)). Skill did not edit `schema-matrix.md` (Hard Prohibition D).
- **`STACK_CAP_EXCEEDED` not in the § 11 closed enum.** Already
  flagged from the gameplay companion [`edge-case-policy.md` §
  ⚠ Issues](./edge-case-policy.md). Surfacing again from this side
  because § 11 is the canonical home of the dispatcher
  validation-error taxonomy. The closed `oneOf` in
  [`dispatcher-validation-error.schema.json`](../../content-schema/schemas/dispatcher-validation-error.schema.json)
  defines exactly the eight codes listed in § 11; the gameplay
  companion's § 3 (and the parallel
  [`in-combat-stack-rules.md`](./in-combat-stack-rules.md) § 2.3)
  reference `STACK_CAP_EXCEEDED` and `BATTLEFIELD_STACK_CAP_EXCEEDED`
  as dispatcher-surfaced rejections. Either the codes belong in § 11
  (and the schema) so UIs can localize them, or those callers should
  re-classify as reducer-internal `Result` codes. Owner:
  [`mvp.05-adventure-map.01-strategic-game-state-model`](../../tasks/mvp/05-adventure-map/01-strategic-game-state-model.md)
  for the army cap and
  [`mvp.09-tactical-combat.05-retaliation-once-per-round-nullification`](../../tasks/mvp/09-tactical-combat/05-retaliation-once-per-round-nullification.md)'s
  sibling stack-cap task for the battlefield variant — or
  [`mvp.01-engine-core.06-command-dispatcher`](../../tasks/mvp/01-engine-core/06-command-dispatcher.md)
  if the gate is upstream. This skill did not edit either file
  (Hard Prohibition D).
