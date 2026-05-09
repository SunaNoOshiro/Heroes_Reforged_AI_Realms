# Worker CSP — Off-Main-Thread Decode Security Profile

Canonical security profile for every `Worker`, `SharedWorker`
(if ever introduced), and `AudioWorklet` instance in the codebase.
The same profile binds:

- the AI Worker
  ([`tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md`](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md))
- the image-decode Worker
  ([`tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md`](../../tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md))
- the audio-decode Worklet
  (same task — `decodeAudioData` inside `AudioWorklet`)

Companion docs:
- [`csp.md`](./csp.md) — host CSP that this profile inherits.
- [`asset-loading.md`](./asset-loading.md) — pre-flight pipeline
  the decode Workers run after.
- [`sandbox-model.md`](./sandbox-model.md) — capability matrix.
- [`ai-contract.md`](./ai-contract.md) — AI Worker latency budget;
  this profile bolts on the security half of the same contract.

---

## 1. Per-Worker CSP

Every Worker is created from a same-origin script under a
**dedicated Content Security Policy** that strips remote loads
and dynamic-code execution:

```
script-src 'self';
worker-src 'self';
connect-src 'self';
img-src 'self' blob:;
default-src 'none';
require-trusted-types-for 'script';
```

`AudioWorklet` modules are loaded via `audioCtx.audioWorklet.addModule(url)`
where `url` is always a same-origin path. The Worklet inherits
the same CSP from the host document; see
[`csp.md`](./csp.md) for the host policy that the Worklet
inherits.

**No `unsafe-eval`. No remote `importScripts()`. No `Function(…)`
or `eval(…)` ever.** The renderer ESLint config enforces
`no-restricted-globals` for `eval` and `Function` inside
`src/renderer/workers/` and `src/renderer/worklets/`. A
violation fails CI.

---

## 2. Structured-clone-only message bus

Every message that crosses the Worker boundary is **typed**
against a schema and copied via the structured-clone algorithm.
Direct `SharedArrayBuffer` aliasing is forbidden except for the
two canonical use cases:

1. The image-decode Worker's `Transferable<ArrayBuffer>` for
   incoming bytes (zero-copy by design — the bytes have already
   passed magic-byte and SHA-256 gates per
   [`asset-loading.md`](./asset-loading.md) § 2).
2. The decoded `ImageBitmap` returned via `Transferable<ImageBitmap>`.

Each message carries a `kind: string` discriminator that resolves
to a schema in `content-schema/schemas/`:

| Worker | Message kinds | Schema |
|---|---|---|
| AI Worker | `ai.request`, `ai.response`, `ai.cancel`, `ai.log` | [`renderer-event.schema.json`](../../content-schema/schemas/renderer-event.schema.json) (existing AI events bridge through this contract) |
| Image-decode Worker | `decode.request`, `decode.response`, `decode.error` | covered by the asset-loader contract; payloads carry `assetId`, `bytes`, `expectedSha256`, `kind`, `caps` |
| Audio Worklet | `audio.process`, `audio.params` | `AudioWorkletProcessor` standard surface |

Any unrecognised `kind` is **dropped on the receive side** with a
`worker.message.unknown-kind` log emission. The Worker never
throws on unknown kinds; throwing crashes the Worker and would
trigger the recovery contract below.

---

## 3. Crash recovery

Every Worker installs a top-level `onerror` and
`onunhandledrejection` handler that:

1. Emits a structured `worker.crash` log entry under the
   anonymous-stats schema (see [`observability.md`](./observability.md)).
2. Posts a `worker.crash` message back to the host with the last
   received `kind` (no payload — payloads are not preserved
   across crashes per the structured-clone-only rule).
3. Terminates itself.

The host:

1. Releases any in-flight `Result` promise as
   `Result.err("worker.crashed", { kind })`.
2. Restarts the Worker from the same script URL.
3. Re-applies the **last-known-good state** snapshot — for the
   AI Worker, that is the per-turn input view per
   [`ai-contract.md`](./ai-contract.md); for the image-decode
   Worker, that is the queue of pending decodes (each retried at
   most twice).
4. If the Worker crashes a third time within the same session
   for the same `kind`, the host stops restarting and surfaces
   `Result.err("worker.crash-loop", …)` to the caller. Caller
   policy: the asset loader falls back to the placeholder per
   [`pack-contract.md` § Asset Fallback And Placeholders](./pack-contract.md#asset-fallback-and-placeholders).

---

## 4. Responsiveness timeout

The existing AI rule (2 s per request, see
[`ai-contract.md`](./ai-contract.md)) is generalised: every
request that crosses the Worker boundary carries a
**per-Worker CPU budget** chosen by the caller, not the Worker.
The host arms a `setTimeout` at `postMessage` time; on expiry it:

1. Emits `worker.timeout` with the `kind`.
2. Sends a `cancel` message to the Worker.
3. After a 250 ms grace, applies the crash-recovery contract
   above (terminate + restart) so a CPU-pinned Worker cannot
   block subsequent requests.

Per-Worker CPU budgets:

| Worker | Per-request budget | Source |
|---|---|---|
| AI Worker | 2000 ms | [`ai-contract.md`](./ai-contract.md) |
| Image-decode Worker | 250 ms | [`asset-loading.md`](./asset-loading.md) § 1.1 caps |
| Audio Worklet | 10 ms / processing quantum | Web Audio standard |

---

## 5. React error boundary

The renderer ships a top-level React error boundary in
`src/ui/` that catches any thrown error during render or in an
async effect and:

1. Emits `ui.error` to the observability sink.
2. Renders the canonical error screen (per
   [`error-ux.md`](./error-ux.md)).
3. Offers a "reload" button that performs a soft reload (no
   `IndexedDB` wipe).

The boundary is the last-resort recovery for any Worker crash
that propagates up through `Result.err` and is not handled by
the calling component. Owning task:
[`tasks/mvp/06-renderer/`](../../tasks/mvp/06-renderer/) (acceptance
criterion for the worker-crash recovery boundary).

---

## 6. Cross-references

- [`csp.md`](./csp.md) — host CSP.
- [`asset-loading.md`](./asset-loading.md) — pre-flight pipeline.
- [`sandbox-model.md`](./sandbox-model.md) — capability matrix.
- [`ai-contract.md`](./ai-contract.md) — AI Worker latency contract.
- [`observability.md`](./observability.md) — `worker.crash`,
  `worker.timeout`, `worker.message.unknown-kind` emissions.
- [`error-ux.md`](./error-ux.md) — React error-boundary surface.
