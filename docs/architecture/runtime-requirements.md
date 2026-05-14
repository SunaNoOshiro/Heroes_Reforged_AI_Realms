# Runtime Requirements

> Single declaration of load-bearing runtime preconditions. Every
> entry has a stable `RR-NN` ID. Tasks that rely on a runtime feature
> **must cite an `RR-NN`**; inventing a parallel precondition inside
> a task is a CI failure.

This doc is the one place where any subsystem author finds the floor
and fallback policy for a runtime fork (no Web Workers, no IndexedDB
quota, ancient Safari). It exists so an AI agent picking up any UI
or persistence task gets a deterministic answer instead of inventing
an ad-hoc fallback or shipping a cryptic failure.

CI gate:
[`scripts/check-runtime-requirements.mjs`](../../scripts/check-runtime-requirements.mjs)
(`npm run validate:runtime-requirements`) asserts every `RR-NN`
referenced under `tasks/`, `docs/architecture/`, `docs/planning/`,
or `docs/operations/` resolves to an `## RR-NN` heading in this file.

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
- **Owning task / source:** pinned by
  [`ui-technology-choice.md`](./ui-technology-choice.md); implemented
  under
  [`tasks/mvp/07-ui-shell/`](../../tasks/mvp/07-ui-shell/).
- **Verification:** `npm run validate:ui-components`.

## RR-02: Map renderer — WebGL2 with Canvas-2D fallback

- **Status:** locked
- **Floor:** WebGL2 (`webgl2` context) with `EXT_color_buffer_float`
  available on the M-tier hardware tier defined in
  [`performance.md`](./performance.md).
- **Fallback policy:** Canvas-2D for tiles + sprites only; no
  shader-based VFX. Falls back loudly with a UI banner ("running on
  reduced renderer") and disables atlas-driven VFX phases.
- **Owning task / source:**
  [`renderer-technology-choice.md`](./renderer-technology-choice.md);
  fallback owned by the renderer task under
  [`tasks/mvp/06-renderer/`](../../tasks/mvp/06-renderer/).
- **Verification:** renderer smoke test — `npm run test:ui-smoke`
  (planned target once `src/renderer/` lands).

## RR-03: AI worker — Web Workers, main-thread fallback (degraded)

- **Status:** locked
- **Floor:** `Worker` constructor + `postMessage` with structured
  clone for `ArrayBuffer`-backed payloads.
- **Fallback policy:** if `Worker` is unavailable, the AI tick runs on
  the main thread inside `requestIdleCallback` slices and the
  difficulty cap auto-clamps to `Pawn`. Determinism is preserved: the
  worker hosts the deterministic engine; the engine itself is
  worker-agnostic.
- **Owning task / source:**
  [`tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md`](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md);
  policy in [`ai-contract.md`](./ai-contract.md).
- **Verification:** the worker contract is exercised by the fuzz
  harness's `searchBudget` determinism case in
  [`tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md`](../../tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md).

## RR-04: Crypto — Web Crypto (`crypto.subtle`) with Node parity

- **Status:** locked
- **Floor:** browser Web Crypto Subtle API supporting `Ed25519`
  (`generateKey`, `sign`, `verify`).
- **Fallback policy:** none in the browser. Pack-signature
  verification fails loud on browsers that lack Ed25519 (older
  Safari). Node-side parity uses `@noble/ed25519` so signature
  verification logic is byte-identical on both sides.
- **Owning task / source:**
  [`multiplayer-security.md`](./multiplayer-security.md) and
  [`revocation.md`](./revocation.md); browser implementation in
  [`tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md`](../../tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md).
- **Verification:** pack-signature unit tests under
  `tasks/phase-2/05-mod-system/`.

## RR-05: Storage — IndexedDB ≥ 50 MB; OPFS preferred when present

- **Status:** locked
- **Floor:** IndexedDB transactional API with **at least 50 MB**
  effective quota for the origin. OPFS is used when
  `navigator.storage.getDirectory` resolves and quota is requestable;
  otherwise IndexedDB-only.
- **Fallback policy:** quota-exhaustion UX is owned by
  [`edge-cases-policy.md` § 15](./edge-cases-policy.md#15-storage-quota)
  and the screen-side surface delegates to
  [`error-ux.md`](./error-ux.md). On exhaustion the player is offered
  to remove old saves, change save slot, or export a save.
- **Owning task / source:**
  [`tasks/mvp/08-persistence/01-indexeddb-wrapper.md`](../../tasks/mvp/08-persistence/01-indexeddb-wrapper.md)
  and [`storage-policy.md`](./storage-policy.md).
- **Verification:** persistence-suite quota fixtures, plus the
  static budget gate
  [`scripts/check-storage-budget.mjs`](../../scripts/check-storage-budget.mjs)
  (`npm run validate:storage-budget`), which sums the per-store soft
  caps from `storage-policy.md` and asserts they fit within this
  floor times a documented headroom multiplier.

## RR-06: Time source — `performance.now()` monotonic, capped per frame

- **Status:** locked
- **Floor:** `performance.now()` available and monotonic across
  visibility-change events. The renderer animation timeline reads
  `deltaTime` clamped to **≤ 100 ms** before applying it to any
  timeline; a clamp event holds the current frame instead of
  fast-forwarding, so a long tab pause freezes timelines and resumes
  from the held frame rather than catching up in a burst.
- **Fallback policy:** none. Wall-clock readers are forbidden inside
  the deterministic core
  ([`determinism.md` § Forbidden In Deterministic Paths](./determinism.md#forbidden-in-deterministic-paths));
  the renderer / UI may read `performance.now()` directly.
- **Owning task / source:**
  [`animation-contract.md` § 1 Two-Clock Model](./animation-contract.md#1-two-clock-model)
  (canonical clamp value) and
  [`edge-cases-policy.md` § 14 Tab backgrounding](./edge-cases-policy.md#14-tab-backgrounding--visibilitychange).
- **Verification:** animation fixtures under
  [`scripts/__tests__/animation-snapshot-fixtures.test.mjs`](../../scripts/__tests__/animation-snapshot-fixtures.test.mjs).

## RR-07: gzip — `pako` at level 6 (deterministic)

- **Status:** locked
- **Floor:** gzip via `pako@2.x` at compression level **6**. Two
  compressions of the same canonical bytes produce byte-identical
  gzip output; this is required for save-file byte-equality across
  machines.
- **Fallback policy:** none. A different gzip implementation is a
  determinism break.
- **Owning task / source:**
  [`tasks/mvp/08-persistence/02-log-only-save-format.md`](../../tasks/mvp/08-persistence/02-log-only-save-format.md)
  ("Compression contract") and
  [`determinism.md` § Save Artifact Byte Determinism](./determinism.md#save-artifact-byte-determinism).
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
- **Fallback policy:** none. Determinism guarantees rest on stable
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
- **Fallback policy:** none. A drift here breaks the
  save / replay / multiplayer determinism contract.
- **Owning task / source:**
  [`tasks/mvp/01-engine-core/07-state-serializer-plus-xxh64-hash.md`](../../tasks/mvp/01-engine-core/07-state-serializer-plus-xxh64-hash.md)
  (canonical-bytes pin); cross-environment proof is owned by
  [`tasks/mvp/01-engine-core/09b-cross-environment-canonical-bytes-test.md`](../../tasks/mvp/01-engine-core/09b-cross-environment-canonical-bytes-test.md).
- **Verification:** the Playwright job authored under task `09b`.

---

## Adding A New Precondition

1. Pick the next `RR-NN`.
2. Add a section above with `Status:` (`locked` or `pending`).
3. Cross-link the deciding plan or task. If `pending`, the
   `Owning task / source` row **must** point at the plan that will
   lock the value.
4. Run `npm run validate:runtime-requirements`.
5. Cite `RR-NN` (not the prose) from any task that depends on the
   precondition. Inventing a parallel precondition inside a task is
   a CI failure.

---

## 🔍 Sync Check

- **UI: ✔** — RR-01 / RR-02 / RR-08 ownership lines up with [`ui-technology-choice.md`](./ui-technology-choice.md), [`renderer-technology-choice.md`](./renderer-technology-choice.md), and the `tasks/mvp/07-ui-shell/` boot-screen task. No copy-strings or component IDs are claimed inline, so no per-screen spec drift to flag.
- **Schema: ✔** — RR-NN tokens are referenced reciprocally from [`determinism.md`](./determinism.md), [`storage-policy.md`](./storage-policy.md), [`lockstep-envelope.md`](./lockstep-envelope.md), [`bisect-protocol.md`](./bisect-protocol.md), [`multi-engine-harness.md`](./multi-engine-harness.md), and [`telemetry-event.schema.json`](../../content-schema/schemas/telemetry-event.schema.json); all anchors resolve. No persistent slice is claimed here, so no [`data-inventory.md`](./data-inventory.md) row is implicated.
- **Tasks: ⚠** — Every owning task in this file resolves under `tasks/`, and the CI gate [`check-runtime-requirements.mjs`](../../scripts/check-runtime-requirements.mjs) keeps inbound `RR-NN` tokens honest. RR-04's `@noble/ed25519` callout is not corroborated by [`tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md`](../../tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md) (which only names `crypto.subtle.verify`), nor by `package.json`; flagged below.

## ⚠ Issues

- **RR-06 `deltaTime` cap was 66 ms; canonical value is 100 ms.** The
  prior text said the renderer clamps `deltaTime` "at **66 ms**
  (≈ 15 fps minimum)", but the canonical source it cites —
  [`animation-contract.md` § 1 Two-Clock Model](./animation-contract.md#1-two-clock-model)
  — defines the clamp as **≤ 100 ms** with hold-not-fast-forward
  semantics. Per § 8 of the doc-audit skill (target wrong, rest of
  the system consistent), this audit pass rewrote RR-06 to match the
  canonical 100 ms clamp and the `hold` description. No code change
  implied; tasks citing RR-06 (none currently, per
  `check-runtime-requirements.mjs` scan) inherit the corrected value.
- **RR-04 cites `@noble/ed25519` for Node-side parity but no
  task / dep records it.** This file names `@noble/ed25519` as the
  Node-parity library, yet
  [`tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md`](../../tasks/phase-2/05-mod-system/02-ed25519-signature-verification.md)
  only specifies `crypto.subtle.verify`, and
  [`package.json`](../../package.json) declares no Ed25519 library.
  Per [`dependency-policy.md`](./dependency-policy.md), a load-bearing
  dependency choice should be either pinned by an `Owning task` here
  or removed from the floor text. Suggested closer: a phase-2 mod-
  system task (or a sibling phase-3 multiplayer task) records the
  `@noble/ed25519` version pin and adds the dep, after which RR-04
  can cite it. Not silently rewritten — the claim was preserved so
  the gap remains visible.
