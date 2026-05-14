# Worker CSP — Off-Main-Thread Decode Security Profile

Canonical security profile for every `Worker`, `SharedWorker` (if
ever introduced), and `AudioWorklet` instance in the codebase. One
profile binds three concrete decoders today:

- the AI bot Worker — owned by
  [`tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md`](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md).
- the image-decode Worker — owned by
  [`tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md`](../../tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md).
- the audio-decode `AudioWorklet` — owned by the same asset-loader
  task; `decodeAudioData` runs inside an `AudioWorklet`.

Companion docs:

- [`csp.md`](./csp.md) — host CSP that this profile inherits.
- [`asset-loading.md`](./asset-loading.md) — pre-flight pipeline the
  decode Workers run after.
- [`sandbox-model.md`](./sandbox-model.md) — trust-tier capability
  matrix.
- [`ai-contract.md`](./ai-contract.md) — AI Worker runtime contract
  (input view, output, worker protocol, budgets, cancellation); this
  doc owns only the security half.
- [`observability.md`](./observability.md) — emission catalogue this
  profile writes to (`worker.crash`, `worker.timeout`,
  `worker.message.unknown-kind`).

---

## 1. Per-Worker CSP

Every Worker is created from a same-origin script under a dedicated
Content Security Policy that strips remote loads and dynamic-code
execution:

```
default-src 'none';
script-src 'self';
worker-src 'self';
connect-src 'self';
img-src 'self' blob:;
require-trusted-types-for 'script';
```

`AudioWorklet` modules are loaded via
`audioCtx.audioWorklet.addModule(url)` where `url` is always a
same-origin path. The Worklet inherits the host CSP from
[`csp.md`](./csp.md).

**No `unsafe-eval`. No remote `importScripts()`. No `Function(…)`
or `eval(…)`.** The renderer ESLint config enforces
`no-restricted-globals` for `eval` and `Function` inside every
Worker / Worklet entry-point directory; a violation fails CI.

---

## 2. Structured-clone-only message bus

Every message that crosses the Worker boundary is **typed** against
a schema and copied via the structured-clone algorithm. Direct
`SharedArrayBuffer` aliasing is forbidden except for the two
canonical use cases:

1. The image-decode Worker's transferred `ArrayBuffer` of incoming
   bytes — zero-copy by design, because the bytes have already
   passed the magic-byte and SHA-256 gates in
   [`asset-loading.md` § 2](./asset-loading.md#2-pre-flight-pipeline).
2. The decoded `ImageBitmap` returned via `Transferable` back to
   the host.

Each message carries a `kind` discriminator that resolves to a
schema in `content-schema/schemas/`:

| Worker | Message kinds | Schema |
|---|---|---|
| AI bot Worker | `COMPUTE_MOVE`, `MOVE_RESULT`, `ABORT`, `PING`, `PONG`, `AI_ERROR`, `AI_TRACE_REQUEST`, `AI_TRACE_RESULT` | [`worker-message.schema.json`](../../content-schema/schemas/worker-message.schema.json); see [`ai-contract.md` § 3](./ai-contract.md#3-worker-protocol). The two `AI_TRACE_*` tokens are dev-only and MUST NOT be emitted in production builds. |
| Image-decode Worker | `decode.request`, `decode.response`, `decode.error` | Covered by the asset-loader contract; payloads carry `assetId`, `bytes`, `expectedSha256`, `kind`, `caps`. |
| Audio Worklet | `audio.process`, `audio.params` | `AudioWorkletProcessor` standard surface. |

Any unrecognised `kind` is **dropped on the receive side** with a
`worker.message.unknown-kind` log emission. The Worker never throws
on unknown kinds; throwing crashes the Worker and would trigger the
recovery contract in § 3.

---

## 3. Crash recovery

Every Worker installs a top-level `onerror` and
`onunhandledrejection` handler that:

1. Emits a structured `worker.crash` log entry under the anonymous
   telemetry schema (see
   [`observability.md`](./observability.md)).
2. Posts a `worker.crash` message back to the host with the last
   received `kind` (no payload — payloads are not preserved across
   crashes per the structured-clone-only rule above).
3. Terminates itself.

The host then:

1. Releases any in-flight `Result` promise as
   `Result.err("worker.crashed", { kind })`.
2. Restarts the Worker from the same script URL.
3. Re-applies the **last-known-good state** snapshot — for the AI
   Worker, the per-turn input view per
   [`ai-contract.md` § 1](./ai-contract.md#1-input-view--aiplayerviewstate-playerid-cheats);
   for the image-decode Worker, the queue of pending decodes (each
   retried at most twice).
4. If the Worker crashes a third time within the same session for
   the same `kind`, the host stops restarting and surfaces
   `Result.err("worker.crash-loop", …)` to the caller. Caller
   policy for the asset loader is the placeholder fallback per
   [`pack-contract.md` § Asset Fallback And Placeholders](./pack-contract.md#asset-fallback-and-placeholders);
   the AI client returns the per-difficulty no-action fallback per
   [`ai-contract.md` § 4](./ai-contract.md#4-per-turn-budget-table).

---

## 4. Responsiveness timeout

The AI worker's 2 s hard cap (see [`ai-contract.md` § 4](./ai-contract.md#4-per-turn-budget-table))
is generalised: every request that crosses the Worker boundary
carries a **per-Worker CPU budget** chosen by the caller, not the
Worker. The host arms a `setTimeout` at `postMessage` time; on
expiry it:

1. Emits `worker.timeout` with the `kind`.
2. Sends a cancel message to the Worker — `ABORT` for the AI
   Worker per [`ai-contract.md` § 5](./ai-contract.md#5-cancellation);
   the image-decode Worker's cancel surface is part of the
   asset-loader contract.
3. After a 250 ms grace, applies the § 3 crash-recovery contract
   (terminate + restart) so a CPU-pinned Worker cannot block
   subsequent requests.

Per-Worker CPU budgets:

| Worker | Per-request budget | Source |
|---|---|---|
| AI bot Worker | per-difficulty (Pawn 500 ms → Immortal 6 000 ms) | [`ai-contract.md` § 4](./ai-contract.md#4-per-turn-budget-table) |
| Image-decode Worker | 250 ms | [`asset-loading.md` § 1.1](./asset-loading.md#1-cap-table) |
| Audio Worklet | 10 ms per processing quantum | Web Audio standard |

---

## 5. React error boundary

The renderer ships a top-level React error boundary in `src/ui/`
that catches any error thrown during render or in an async effect
and:

1. Emits `ui.error` to the observability sink.
2. Renders the canonical error screen per
   [`error-ux.md`](./error-ux.md).
3. Offers a "reload" button that performs a soft reload (no
   `IndexedDB` wipe).

The boundary is the last-resort recovery for any Worker crash that
propagates up through `Result.err` and is not handled by the
calling component. Owning task cluster:
[`tasks/mvp/06-renderer/`](../../tasks/mvp/06-renderer/) — the
acceptance criterion for the worker-crash recovery boundary does
not yet have a dedicated task file (see `## ⚠ Issues`).

---

## 6. Cross-references

- [`csp.md`](./csp.md) — host CSP.
- [`asset-loading.md`](./asset-loading.md) — pre-flight pipeline.
- [`sandbox-model.md`](./sandbox-model.md) — capability matrix.
- [`ai-contract.md`](./ai-contract.md) — AI Worker runtime contract.
- [`observability.md`](./observability.md) — `worker.crash`,
  `worker.timeout`, `worker.message.unknown-kind` emissions.
- [`error-ux.md`](./error-ux.md) — React error-boundary surface.
- [`worker-message.schema.json`](../../content-schema/schemas/worker-message.schema.json)
  — closed AI worker envelope.

---

## 🔍 Sync Check

- **UI: ✔** — React error boundary surface matches [`error-ux.md`](./error-ux.md) (canonical full-screen error + soft-reload CTA); no screen-package copy strings are claimed by this file.
- **Schema: ⚠** — AI worker `kind` enum now points at [`worker-message.schema.json`](../../content-schema/schemas/worker-message.schema.json) and matches its 8-value enum and [`ai-contract.md` § 3](./ai-contract.md#3-worker-protocol). Image-decode and `AudioWorklet` message kinds have no `content-schema/schemas/*.schema.json` counterpart; the contract is informal in the asset-loader task. See `## ⚠ Issues`.
- **Tasks: ⚠** — Owning tasks `mvp.10-heuristic-ai.06-run-ai-in-web-worker` and `mvp.02b-asset-pipeline.05-async-asset-loader-with-caching` both back-reference this doc under Read First. The React error-boundary task is referenced only as the renderer cluster directory; no concrete task file owns it yet. See `## ⚠ Issues`.

## ⚠ Issues

- **AI Worker per-request budget was a single stale value (fixed in target).** Original § 4 budget table claimed `AI Worker | 2000 ms` citing [`ai-contract.md`](./ai-contract.md). The current [`ai-contract.md` § 4 Per-Turn Budget Table](./ai-contract.md#4-per-turn-budget-table) replaces the single 2 s cap with a per-difficulty `wallClockHardMs` row (Pawn 500 ms, Knight 1 000 ms, Grand Master 2 000 ms, Lord 4 000 ms, Immortal 6 000 ms); the AI-worker task's Acceptance Criteria already enforces the range. Per Hard Prohibition A the canonical source wins; the row was rewritten to cite the range and pin the source. No threshold in this file's own scope was changed (the 250 ms grace, the 3× crash-loop trigger, and the image-decode 250 ms / Worklet 10 ms budgets are unchanged).
- **AI worker message kinds were wrong (fixed in target).** Original § 2 listed AI Worker kinds as `ai.request`, `ai.response`, `ai.cancel`, `ai.log` and pointed at [`renderer-event.schema.json`](../../content-schema/schemas/renderer-event.schema.json). The canonical envelope is [`worker-message.schema.json`](../../content-schema/schemas/worker-message.schema.json) with the 8-value enum `COMPUTE_MOVE | MOVE_RESULT | ABORT | PING | PONG | AI_ERROR | AI_TRACE_REQUEST | AI_TRACE_RESULT` per [`ai-contract.md` § 3](./ai-contract.md#3-worker-protocol) and the AI-worker task's Outputs block (lines 46–56). Per Hard Prohibition A the canonical schema is authoritative; the target was rewritten. `renderer-event.schema.json` is the renderer ↔ UI seam and never crosses the AI worker boundary.
- **`worker.crash`, `worker.timeout`, `worker.message.unknown-kind` are not in `observability.md` § 4.** This doc declares the three emissions and lists `observability.md` as the catalogue, but [`observability.md` § 4](./observability.md#4-required-emissions-catalogue) has no `worker.*` rows. Per CLAUDE.md ("adding a new emission MUST extend the table in the same change"), the owning task for the emissions catalogue ([`phase-2.11-observability.02-required-emissions-catalogue`](../../tasks/phase-2/11-observability/02-required-emissions-catalogue.md)) must add three rows. Suggested values: `worker.crash` (event with `kind` label, fires per § 3); `worker.timeout` (event with `kind` label, fires per § 4); `worker.message.unknown-kind` (counter `worker.message.unknown-kind.count`, fires per § 2 unrecognised-kind drop). Skill did not edit `observability.md` (Hard Prohibition D).
- **`worker.crashed` / `worker.crash-loop` error codes not registered.** § 3 dispatches `Result.err("worker.crashed", { kind })` and `Result.err("worker.crash-loop", …)`, but neither code is registered in [`error-codes.md`](./error-codes.md), [`pack-error-codes.md`](./pack-error-codes.md), or [`error-taxonomy.md`](./error-taxonomy.md). Per the project root contract on closed error vocabularies these must be registered before any module can refuse with them. Owner: the AI-worker task ([`tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md`](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md), which already cites `worker.crash-loop` in its Acceptance Criteria) or the asset-loader task. Suggested values: domain `worker`, severity `error`, codes `worker.crashed`, `worker.crash-loop`. Skill did not edit the error-codes catalogue (Hard Prohibition D).
- **Image-decode and `AudioWorklet` message bus has no schema counterpart.** § 2 declares `decode.request | decode.response | decode.error` for the image-decode Worker and `audio.process | audio.params` for the `AudioWorklet`, but neither set is registered in `content-schema/schemas/`. Per [`trust-boundaries.md`](./trust-boundaries.md), worker `postMessage` bytes are adversarial input and must clear a named schema gate. The AI worker already meets that bar via `worker-message.schema.json`; the decode workers do not. Owner: [`tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md`](../../tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md). Suggested values: register `DecodeWorkerMessage` (closed envelope with `kind`, `version`, `correlationId`, `payload`) and add a row to [`schema-matrix.md`](./schema-matrix.md). `AudioWorklet` messages may inherit the `AudioWorkletProcessor` standard contract without a custom schema, but the boundary needs explicit acknowledgement in the asset-loader task.
- **React error-boundary task is unowned.** § 5 names [`tasks/mvp/06-renderer/`](../../tasks/mvp/06-renderer/) as the cluster but no task file inside that directory carries a "React error boundary" acceptance criterion (grep over `tasks/` confirms only this doc and the implementation-plans archive mention it). The recovery surface is referenced by [`csp.md` § 🔍 Sync Check](./csp.md#-sync-check) and consumed by every Worker in § 1, so the gap is structural. Suggested: add a renderer task with Owned Path `src/ui/<error-boundary>/` and Acceptance Criteria mirroring § 5 above (catch + emit `ui.error` + render canonical error screen + soft-reload CTA). Skill did not edit `tasks/` (Hard Prohibition D).
- **Worker / Worklet entry-point directories are not pinned.** § 1 invokes ESLint enforcement "inside every Worker / Worklet entry-point directory", but the only pinned Worker entry today is `src/ai/bots/ai-worker.ts` (per the AI-worker task's Outputs); image-decode and `AudioWorklet` entry paths are not declared in any task or in [`module-graph.md`](./module-graph.md). Original text named `src/renderer/workers/` and `src/renderer/worklets/` directly; those paths exist nowhere else in the repo, so the wording was generalised. The asset-loader task should pin the concrete paths so the ESLint rule has a concrete glob to bind to. Skill did not invent paths (Hard Prohibition B).
