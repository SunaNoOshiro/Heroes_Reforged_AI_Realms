# Runtime Requirements

> Source plan:
> [`docs/implementation-plans/17-final-critical-questions-plan.md`](../implementation-plans/17-final-critical-questions-plan.md)
> (Q279). This file is the single declaration of load-bearing runtime
> preconditions. Every entry has a stable `RR-NN` ID. Tasks that depend
> on a runtime feature MUST cite an `RR-NN` from this table and not
> invent a new precondition inline.

The audit's worry: any individual subsystem-author can reach a runtime
fork (no Web Workers, no IndexedDB quota, ancient Safari) and either
invent a fallback or ship a cryptic failure. This doc names the floor
and the fallback policy in one place so an AI agent picking up any UI
or persistence task gets a deterministic answer.

CI gate: [`scripts/check-runtime-requirements.mjs`](../../scripts/check-runtime-requirements.mjs)
asserts every `RR-NN` referenced in `tasks/` and `docs/architecture/`
resolves to a heading in this file.

---

## RR Status Lifecycle

| Status | Meaning |
|---|---|
| `locked` | Decided. Tasks may rely on this exactly. |
| `pending` | Decision blocked on a sibling plan; tasks must cite the deciding plan in their `Dependencies:` section. |
| `superseded` | Replaced by a newer entry. |

Locked entries do not change without a `DEC-NNN` entry in
[`docs/planning/decision-log.md`](../planning/decision-log.md).

---

## RR-01: UI shell — DOM (React 18 + Zustand)

- **Status:** locked
- **Floor:** browsers that support ES2020 and `Element.attachShadow`.
- **Fallback policy:** none. The UI shell is canvas-adjacent DOM; a
  text-mode fallback is out of scope.
- **Owning task / source:** the shell is pinned by
  [`docs/architecture/ui-technology-choice.md`](./ui-technology-choice.md)
  and implemented by tasks under
  [`tasks/mvp/07-ui-shell/`](../../tasks/mvp/07-ui-shell/).
- **Verification:** `npm run validate:ui-components`.

## RR-02: Map renderer — WebGL2 with Canvas-2D fallback

- **Status:** locked
- **Floor:** WebGL2 (`webgl2` context) with `EXT_color_buffer_float`
  available on M-tier hardware tier in
  [`performance.md`](./performance.md).
- **Fallback policy:** Canvas-2D for tiles + sprites only; no
  shader-based VFX. Falls back loudly with a UI banner ("running on
  reduced renderer") and disables atlas-driven VFX phases. Owned by
  the renderer task under
  [`tasks/mvp/06-renderer/`](../../tasks/mvp/06-renderer/).
- **Owning task / source:**
  [`renderer-technology-choice.md`](./renderer-technology-choice.md).
- **Verification:** renderer smoke test — `npm run test:ui-smoke`
  (planned target once `src/renderer/` lands).

## RR-03: AI worker — Web Workers, main-thread fallback (degraded)

- **Status:** locked
- **Floor:** `Worker` constructor + `postMessage` with structured
  clone for `ArrayBuffer`-backed payloads.
- **Fallback policy:** if `Worker` is unavailable, the AI tick runs on
  the main thread inside `requestIdleCallback` slices, with the
  difficulty cap auto-clamped to "Pawn". Determinism is preserved (the
  worker is a host for the deterministic engine; the engine itself is
  worker-agnostic).
- **Owning task / source:**
  [`tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md`](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md);
  policy lives in
  [`ai-contract.md`](./ai-contract.md).
- **Verification:** the worker contract is exercised by the fuzz
  harness's `searchBudget` determinism case in
  [`tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md`](../../tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md).

## RR-04: Crypto — Web Crypto (`crypto.subtle`) with Node parity

- **Status:** locked
- **Floor:** browser Web Crypto Subtle API supporting
  `Ed25519` (`generateKey`, `sign`, `verify`).
- **Fallback policy:** Node-side parity is provided by the same
  `@noble/ed25519` library so signature verification logic is
  byte-identical on both sides. No browser fallback to a non-WebCrypto
  implementation — pack-signature verification fails loud on browsers
  that lack Ed25519 (older Safari).
- **Owning task / source:**
  [`docs/architecture/multiplayer-security.md`](./multiplayer-security.md)
  and
  [`docs/architecture/revocation.md`](./revocation.md).
- **Verification:** pack-signature unit tests under
  `tasks/phase-2/05-mod-system/`.

## RR-05: Storage — IndexedDB ≥ 50 MB; OPFS preferred when present

- **Status:** locked
- **Floor:** IndexedDB transactional API with **at least 50 MB**
  effective quota for the origin. OPFS used when
  `navigator.storage.getDirectory` resolves and quota is requestable;
  falls back to IndexedDB otherwise.
- **Fallback policy:** quota-exhaustion UX is owned by
  [`docs/architecture/edge-cases-policy.md`](./edge-cases-policy.md)
  ("storage quota") and the screen-side surface is delegated to
  [`error-ux.md`](./error-ux.md). On exhaustion the player is offered
  to remove old saves, change save slot, or export a save.
- **Owning task / source:**
  [`tasks/mvp/08-persistence/01-indexeddb-wrapper.md`](../../tasks/mvp/08-persistence/01-indexeddb-wrapper.md)
  and
  [`docs/architecture/storage-policy.md`](./storage-policy.md).
- **Verification:** persistence-suite quota fixtures, plus the
  static budget gate
  [`scripts/check-storage-budget.mjs`](../../scripts/check-storage-budget.mjs)
  (`npm run validate:storage-budget`) which sums the per-store
  soft caps from `storage-policy.md` and asserts they fit within
  this floor times a documented headroom multiplier.

## RR-06: Time source — `performance.now()` monotonic, capped per frame

- **Status:** locked
- **Floor:** `performance.now()` available and monotonic across
  visibility-change events. The animation timeline reads `deltaTime`
  capped at **66 ms** (≈ 15 fps minimum) to prevent dt-spike
  drift after a tab background.
- **Fallback policy:** no fallback. Wall-clock readers are forbidden
  inside the deterministic core
  ([`determinism.md`](./determinism.md) "Forbidden In Deterministic
  Paths"); the renderer/UI may read `performance.now()` directly.
- **Owning task / source:**
  [`docs/architecture/animation-contract.md`](./animation-contract.md)
  ("Two-clock model") and
  [`docs/architecture/edge-cases-policy.md`](./edge-cases-policy.md)
  ("tab backgrounding").
- **Verification:** animation fixtures under
  [`scripts/__tests__/animation-snapshot-fixtures.test.mjs`](../../scripts/__tests__/animation-snapshot-fixtures.test.mjs).

## RR-07: gzip — `pako` at level 6 (deterministic)

- **Status:** locked
- **Floor:** gzip compression via `pako@2.x` at compression level
  **6**. Two compressions of the same canonical bytes produce
  byte-identical gzip output; this is required for save-file
  byte-equality across machines.
- **Fallback policy:** none. A different gzip implementation is a
  determinism break.
- **Owning task / source:**
  [`tasks/mvp/08-persistence/02-log-only-save-format.md`](../../tasks/mvp/08-persistence/02-log-only-save-format.md)
  ("Compression contract") and
  [`determinism.md`](./determinism.md) "Save Artifact Byte
  Determinism".
- **Verification:** the fuzz harness's re-save byte-equivalence
  acceptance criterion in
  [`tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md`](../../tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md).

## RR-08: Browser engine floor

- **Status:** locked
- **Floor:**
  - Chromium ≥ **120**
  - Safari ≥ **17**
  - Firefox ≥ **121**
  Older engines fail at startup with a clear "browser unsupported"
  screen pointing at this doc.
- **Fallback policy:** none. Determinism guarantees rest on a stable
  serializer behavior; a pre-floor engine's `Number.prototype.toString`
  or `TextEncoder` may diverge in edge cases (see RR-09).
- **Owning task / source:** boot screen task under
  [`tasks/mvp/07-ui-shell/`](../../tasks/mvp/07-ui-shell/).
- **Verification:** unsupported-browser screen smoke test (planned
  target once `src/ui/` lands).

## RR-09: Cross-environment serializer parity

- **Status:** locked
- **Floor:** the canonical serializer + xxh64 path produces
  byte-identical output on Node ≥ 22 and on every browser engine that
  meets RR-08.
- **Fallback policy:** none. A drift here means the
  save/replay/multiplayer determinism contract is broken.
- **Owning task / source:**
  [`tasks/mvp/01-engine-core/07-state-serializer-plus-xxh64-hash.md`](../../tasks/mvp/01-engine-core/07-state-serializer-plus-xxh64-hash.md)
  (canonical-bytes pin); cross-environment proof is owned by
  [`tasks/mvp/01-engine-core/09b-cross-environment-canonical-bytes-test.md`](../../tasks/mvp/01-engine-core/09b-cross-environment-canonical-bytes-test.md).
- **Verification:** the Playwright job authored under task `09b`.

---

## Adding A New Precondition

1. Pick the next `RR-NN`.
2. Add a section above with `Status:` (`locked` / `pending`).
3. Cross-link the deciding plan or task. If `pending`, the
   `Owning task / source` row MUST point at the plan that will lock
   the value.
4. Run `npm run validate:runtime-requirements`.
5. Cite `RR-NN` (not the prose) from any task that depends on the
   precondition. Inventing a parallel precondition inside a task is
   a CI failure.
