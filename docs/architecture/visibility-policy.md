# Visibility Policy

Canonical doc enumerating every subsystem's `visibilitychange` and
`pagehide` behavior. Cross-cutting framing in
[`edge-cases-policy.md` § 14](./edge-cases-policy.md#14-tab-backgrounding--visibilitychange).

Companion docs:
[`edge-cases-policy.md`](./edge-cases-policy.md) (cross-cutting
degraded-condition table; this file is § 14's expansion),
[`determinism.md` § Snapshot Cadence and Resync](./determinism.md#snapshot-cadence-and-resync)
(desync fallback driven on `:visible` reconciliation),
[`storage-policy.md`](./storage-policy.md) (autosave IDB wrapper that
the `:hidden` flush calls).

---

## 1. Events

The browser's
[`document.visibilityState`](https://developer.mozilla.org/docs/Web/API/Document/visibilityState)
tracks whether the tab is `visible` or `hidden`. The page also fires
`pagehide` when the document is being unloaded; the policy treats
`pagehide` as a forced `:hidden` transition.

---

## 2. Per-subsystem behavior

### 2.1 Audio

| Trigger | Action |
|---|---|
| `visibilitychange:hidden` | Mute master gain — 50 ms ramp-down. |
| `visibilitychange:visible` | Restore master gain to user-configured level — 50 ms ramp-up. |

Audio plays no role in determinism; scheduling uses
`audioContext.currentTime`, never wall-clock.

### 2.2 Renderer

| Trigger | Action |
|---|---|
| `visibilitychange:hidden` | Cancel the in-flight `requestAnimationFrame`; stop pumping the loop. The animation timeline is paused (no advance). |
| `visibilitychange:visible` | Start a fresh rAF chain; reset the delta-time clock so the first restored frame does not fast-forward. |

Owned by
[`tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md`](../../tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md).

### 2.3 Persistence (autosave)

| Trigger | Action |
|---|---|
| `visibilitychange:hidden`, `pagehide` | Best-effort tab-resume autosave. Synchronous IDB transaction where possible, wrapped in a **50 ms timeout**. |
| `visibilitychange:visible` | Does **not** re-fire the save. |

- If the 50 ms budget is exceeded the autosave is dropped silently
  and a telemetry counter is emitted. No modal is shown because the
  page is on its way out.
- Owned by
  [`tasks/mvp/08-persistence/06-autosave.md`](../../tasks/mvp/08-persistence/06-autosave.md).

### 2.4 Multiplayer heartbeat

| Trigger | Action |
|---|---|
| `visibilitychange:hidden` | Emit `WILL_BACKGROUND` transport message. Peer's heartbeat tolerance for this side extends from **6 s → 30 s** for the next **60 s**. |
| Continuous backgrounding ≥ 60 s | Normal 6 s threshold resumes — mobile sleep ≈ disconnect. |
| `visibilitychange:visible` | Emit `STATE_HASH_PROBE` to each peer. `STATE_HASH_AGREE` → resume; `STATE_HASH_DISAGREE` → standard reconnection / desync flow. |

Owned by
[`tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md`](../../tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md).

### 2.5 Sim reducer

No idle work. The reducer is event-driven; backgrounding does not
pause anything reducer-side.

---

## 3. Resume reconciliation

The state-hash comparison on `visibilitychange:visible` is the single
chokepoint for "did anything diverge while we were away?":

1. The renderer requests `state.persistence.lastKnownStateHash` from
   the local engine.
2. The multiplayer transport sends `STATE_HASH_PROBE { turn, stateHash }`
   to each peer.
3. `STATE_HASH_AGREE` → match resumes normally.
4. `STATE_HASH_DISAGREE` → hand off to the standard reconnection /
   desync flow already pinned in
   [`determinism.md` § Snapshot Cadence and Resync](./determinism.md#snapshot-cadence-and-resync).

Single-player sessions skip steps 2–4; the renderer simply restarts
the rAF loop.

---

## 4. Cross-references

- [`edge-cases-policy.md` § 14](./edge-cases-policy.md#14-tab-backgrounding--visibilitychange)
- [`determinism.md` § Snapshot Cadence and Resync](./determinism.md#snapshot-cadence-and-resync)
- [`tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md`](../../tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md)
- [`tasks/mvp/08-persistence/06-autosave.md`](../../tasks/mvp/08-persistence/06-autosave.md)
- [`tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md`](../../tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md)

---

## 🔍 Sync Check

- **UI: ✔** — No screen-spec strings asserted here; the renderer-side rAF cleanup and audio mute hooks match [`tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md` § Visibility Hooks](../../tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md). No toast / banner / modal IDs to cross-check.
- **Schema: ⚠** — Transport message types (`WILL_BACKGROUND`, `STATE_HASH_PROBE`, `STATE_HASH_AGREE`, `STATE_HASH_DISAGREE`) match the catalogue in [`task-command-token-coverage.json`](./task-command-token-coverage.json) and the owning task. No formal schema row in [`schema-matrix.md`](./schema-matrix.md); these are transport-layer messages rather than reducer commands, so the gap is not CI-blocking. Detail in `## ⚠ Issues`.
- **Tasks: ✔** — Each linked task file exists on disk and back-links to this doc (`06-renderer/08`, `08-persistence/06`, `phase-3/01-multiplayer/07`). The owning § 2.4 heartbeat task `phase-3.01-multiplayer.07` carries an explicit acceptance criterion for the `WILL_BACKGROUND` extension protocol that mirrors this file's § 2.4 windows (6 s / 30 s / 60 s).

## ⚠ Issues

- **`state.persistence.lastKnownStateHash` is referenced only here.** § 3 step 1 calls for the renderer to read `state.persistence.lastKnownStateHash` from the local engine, but no other doc (notably [`determinism.md`](./determinism.md) where snapshot / hash cadence lives, [`persistence.md`](./persistence.md), or [`data-inventory.md`](./data-inventory.md)) names that field. The neighbouring `state.persistence.*` slices that *are* registered are `hasLoadableSave`, `budgets`, `import.staging`, and `recycle.savedSlots` (see [`pack-trust.md`](./pack-trust.md), [`storage-policy.md`](./storage-policy.md), and the screen-01 data-contracts). Either § 3 should be reworded to read the existing per-turn `stateHash` ring exposed by the snapshot-resync owner ([`tasks/phase-3/01-multiplayer/09-snapshot-resync-fallback.md`](../../tasks/phase-3/01-multiplayer/09-snapshot-resync-fallback.md)), or `state.persistence.lastKnownStateHash` must be defined in [`determinism.md` § Snapshot Cadence and Resync](./determinism.md#snapshot-cadence-and-resync) and added to the engine state shape. The skill did not rewrite the field name silently because that would silently change which task owns the slice (Hard Prohibition A). Suggested values: prefer the first option — replace `state.persistence.lastKnownStateHash` with `state.net.snapshotRing.latest.stateHash` (the in-memory ring already pinned in `determinism.md`), and let `phase-3.01-multiplayer.09-snapshot-resync-fallback` own the exposed selector.
- **Transport message types absent from `schema-matrix.md`.** § 2.4 and § 3 name four wire messages (`WILL_BACKGROUND`, `STATE_HASH_PROBE`, `STATE_HASH_AGREE`, `STATE_HASH_DISAGREE`). They are documented in [`task-command-token-coverage.json`](./task-command-token-coverage.json) and described in this file, but no envelope schema (sibling to [`signaling-envelope.md`](./signaling-envelope.md) / [`lockstep-envelope.md`](./lockstep-envelope.md)) defines their payload shape. Non-CI-blocking — they are transport messages, not reducer commands — but a future schema row under the multiplayer transport namespace would let the validator catch payload drift. Owner: [`tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md`](../../tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md). Suggested values: add `mp-visibility-envelope.schema.json` (or extend the existing transport envelope) with a closed `oneOf` over the four `kind` values, then register the row in `schema-matrix.md`. Skill did not edit either file (Hard Prohibition D).
- **`visibility-policy.md` is not listed individually in [`INDEX.md`](./INDEX.md).** The index mentions "tab backgrounding" only as part of `edge-cases-policy.md`'s entry (line 14). Other arch docs that started as `edge-cases-policy.md` expansions (`storage-policy.md`) are also folded into the same entry. Non-blocking, but agents searching the index by document filename will miss this canonical doc. Owner: whoever maintains [`INDEX.md`](./INDEX.md). Suggested values: add a one-line sub-bullet under the existing § 4 entry pointing at both `visibility-policy.md` and `storage-policy.md` as canonical expansions. Skill did not edit `INDEX.md` (Hard Prohibition D).
- **Inbound `-q217` anchor in `edge-cases-policy.md § 14` fixed in place.** The pre-rewrite file linked `./edge-cases-policy.md#14-tab-backgrounding--visibilitychange-q217` (twice). The actual heading is `## 14. Tab backgrounding / \`visibilitychange\`` (no `Q217` suffix; commit `446a5a8` removed audit-question Q-IDs from arch headings). The rewrite drops the `-q217` suffix on both occurrences, matching [`runtime-requirements.md` line 134](./runtime-requirements.md) which already uses the un-suffixed form. This is the corpus-wide cleanup recommended in the `## ⚠ Issues` block of [`edge-cases-policy.md`](./edge-cases-policy.md) (Option A: fix the target file).
