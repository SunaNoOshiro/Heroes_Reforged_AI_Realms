# Autosave

Module: [Persistence (M1)](../08-persistence.md)

Description:
Implement non-blocking autosave at every End-Day local turn boundary.
Three rotating slots are maintained (`auto-1`, `auto-2`, `auto-3`).
Writes never block the command pipeline; the next turn proceeds while
the IDB transaction is in flight. Failures retry once with backoff
and surface a localized toast on second failure. Multiplayer mode is
host-only; peers do not autosave.

Read First:
- [`tasks/mvp/08-persistence/01-indexeddb-wrapper.md`](./01-indexeddb-wrapper.md)
- [`tasks/mvp/08-persistence/02-log-only-save-format.md`](./02-log-only-save-format.md)
- [`tasks/mvp/08-persistence/07-snapshot-rebase.md`](./07-snapshot-rebase.md)
- [`docs/architecture/wiki/screens/55-save-load/data-contracts.md`](../../../docs/architecture/wiki/screens/55-save-load/data-contracts.md)
- [`docs/architecture/wiki/screens/56-options/data-contracts.md`](../../../docs/architecture/wiki/screens/56-options/data-contracts.md)

Inputs:
- IndexedDB wrapper transaction primitive (Task 1)
- Snapshot + rebase entry points (Task 7)
- Save format (Task 2)
- End-Day boundary token from
  `mvp.01-engine-core.06-command-dispatcher` (or equivalent)
- Options autosave on/off setting from screen 56

Outputs:
- `src/persistence/autosave.ts`
- `wireAutosave({ db, options, mp }): { dispose(): void }`

Owned Paths:
- `src/persistence/autosave.ts`

## Cadence

- Trigger: every **End-Day** local turn boundary, **after** the
  per-turn `stateHash` is computed and **before** the next turn's
  command flush.
- The setting is **binary on/off** at MVP — there is no user-tunable
  interval. The toggle lives in screen 56 (Options) under
  `config.persistence.autosaveEnabled`.

## Blocking Model

Autosave is **non-blocking**:

1. Synchronously snapshot `(commandLog, metadata, stateHash)` at the
   end-of-turn boundary. This is cheap; the log is small.
2. Dispatch the IDB write asynchronously (`07-snapshot-rebase.md` →
   gzip → `transaction()`). The next turn proceeds while the write
   is in flight.
3. A queued second autosave waits for the first to complete; queue
   depth is capped at 1 (the latest queued autosave wins).

The reducer never awaits an IDB write. Tests assert that the next
turn's first command dispatches before the prior autosave's
transaction commits.

## Rotation

Three rotating slots: `auto-1`, `auto-2`, `auto-3`. The oldest is
overwritten. Slot keys go through the shadow-key swap pattern from
`01-indexeddb-wrapper.md` so a tab kill mid-rotation cannot poison a
live slot.

## Failure UX

- First failure: silent retry once with exponential backoff
  (200ms → 400ms).
- Second failure: non-modal toast localized via
  `ui.persistence.autosave.failed`. Game state is **not** affected;
  the next end-of-turn boundary will attempt again.
- A `QuotaExceededError` from the wrapper does **not** retry — the
  Save/Load screen's "Manage saves" CTA is the remediation surface.

## Multiplayer

- During a remote match, **only the host** autosaves.
- Peers receive a "host saved" indicator only; their local autosave
  is suppressed entirely to avoid divergent libraries.
- The host's `SaveRecord` includes the optional `mp` block
  (`matchId`, `participants`, `hostPlayerId`) so a re-loaded match
  can recognize itself.

## Selectors

- `selectors.persistence.autosaveSlots` — returns the three rotating
  slots' manifests, ordered newest-first; the Save/Load screen
  surfaces them distinguishably from user slots.

## Tab-Resume Autosave (Q217)

The autosave hook also fires on `visibilitychange:hidden` and
`pagehide` to capture in-flight session state when the tab is on
its way out. The write uses a synchronous IDB transaction where
possible, wrapped in a 50 ms timeout. If the budget is exceeded
the autosave is dropped silently and a telemetry counter is
emitted; no modal is shown because the page is unloading.

Subsequent `visibilitychange:visible` does not re-fire the save.
The full visibility policy across subsystems lives in
[`docs/architecture/visibility-policy.md`](../../../docs/architecture/visibility-policy.md).

> Note: this hook is best-effort until Q160's full autosave
> cadence policy lands. The current cadence remains the End-Day
> boundary above; the tab-resume save is an additional safety net.

Dependencies:
- mvp.08-persistence.01-indexeddb-wrapper
- mvp.08-persistence.02-log-only-save-format
- mvp.08-persistence.03-save-load-ui
- mvp.08-persistence.07-snapshot-rebase

Acceptance Criteria:
- Autosave fires exactly once per End-Day boundary when the
  Options toggle is on; zero times when off.
- A unit test asserts the next turn's first reducer call dispatches
  before the prior autosave transaction commits (non-blocking).
- Three consecutive autosaves rotate `auto-1` → `auto-2` → `auto-3`,
  oldest overwritten on the fourth.
- A simulated write failure does **not** crash the next turn;
  backoff retries fire and the failure toast is dispatched only on
  second failure.
- In a mocked MP match, peer machines do **not** write autosave
  records; the host writes one per End-Day.
- `selectors.persistence.autosaveSlots` exposes the three slots with
  manifest data (no payload reads).
- The shadow-key swap pattern is exercised: aborting the
  rebase-and-write transaction mid-rotation leaves the previous live
  slot intact.

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
