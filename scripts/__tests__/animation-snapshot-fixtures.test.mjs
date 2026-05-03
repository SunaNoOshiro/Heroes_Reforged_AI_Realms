// Snapshot tests for animation fixtures. For each example record under
// content-schema/examples/records/animations/, snapshot:
//   - frame count per sequence
//   - duration per sequence (frames * 1000 / fps, rounded)
//   - eventFrame (or events[].frame) per sequence
//   - track count
//
// Failures = a content authoring change without an intentional snapshot
// update; forces the author to acknowledge.
//
// The snapshot itself is computed from the fixture and compared
// against expected values pinned inline. When a fixture intentionally
// changes, update the EXPECTED block below in the same commit.

import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { readUtf8, repoRoot } from "../lib/repo-utils.mjs";

function durationMs(seq) {
  return Math.round((seq.frames.length * 1000) / seq.fps);
}

function shapeOf(animation) {
  const tracksList = animation.tracks ? Object.keys(animation.tracks) : [];
  const trackCount = (Object.keys(animation.sequences ?? {}).length > 0 ? 1 : 0)
    + tracksList.length;

  const sequences = {};
  function addSequences(prefix, seqMap) {
    for (const [name, seq] of Object.entries(seqMap ?? {})) {
      const eventFrames = Array.isArray(seq.events)
        ? seq.events.map((e) => e.frame)
        : seq.eventFrame !== undefined ? [seq.eventFrame] : [];
      sequences[`${prefix}${name}`] = {
        frameCount: seq.frames.length,
        fps: seq.fps,
        loop: seq.loop ?? false,
        durationMs: durationMs(seq),
        eventFrames
      };
    }
  }
  addSequences("body:", animation.sequences);
  for (const [trackName, track] of Object.entries(animation.tracks ?? {})) {
    addSequences(`${trackName}:`, track.sequences);
  }
  return { id: animation.id, trackCount, sequences };
}

const EXPECTED = {
  "ash-hound.animation.json": {
    id: "unit:ash_hound:animset",
    trackCount: 1,
    sequences: {
      "body:idle":   { frameCount: 4, fps: 6,  loop: true,  durationMs: 667, eventFrames: [] },
      "body:move":   { frameCount: 6, fps: 10, loop: true,  durationMs: 600, eventFrames: [] },
      "body:attack": { frameCount: 4, fps: 12, loop: false, durationMs: 333, eventFrames: [2] },
      "body:hit":    { frameCount: 2, fps: 10, loop: false, durationMs: 200, eventFrames: [] },
      "body:death":  { frameCount: 4, fps: 8,  loop: false, durationMs: 500, eventFrames: [] }
    }
  },
  "dual-strike.animation.json": {
    id: "unit:dual_strike_demo:animset",
    trackCount: 1,
    sequences: {
      "body:idle":   { frameCount: 4,  fps: 6,  loop: true,  durationMs: 667,  eventFrames: [] },
      "body:move":   { frameCount: 6,  fps: 10, loop: true,  durationMs: 600,  eventFrames: [] },
      "body:attack": { frameCount: 12, fps: 12, loop: false, durationMs: 1000, eventFrames: [4, 5, 5, 9, 10, 10] },
      "body:hit":    { frameCount: 2,  fps: 10, loop: false, durationMs: 200,  eventFrames: [] },
      "body:death":  { frameCount: 4,  fps: 8,  loop: false, durationMs: 500,  eventFrames: [] }
    }
  },
  "burning-status.animation.json": {
    id: "status:burn:overlay-animset",
    trackCount: 1,
    sequences: {
      "status:burning":         { frameCount: 6, fps: 8,  loop: true,  durationMs: 750, eventFrames: [] },
      "status:burning-fade-in": { frameCount: 3, fps: 12, loop: false, durationMs: 250, eventFrames: [] }
    }
  },
  "multi-page-attack.animation.json": {
    id: "unit:multi_page_demo:animset",
    trackCount: 1,
    sequences: {
      "body:idle":   { frameCount: 2, fps: 6,  loop: true,  durationMs: 333, eventFrames: [] },
      "body:attack": { frameCount: 6, fps: 12, loop: false, durationMs: 500, eventFrames: [4, 4] }
    }
  }
};

const animationsDir = path.join(
  repoRoot, "content-schema", "examples", "records", "animations"
);

for (const [fileName, expected] of Object.entries(EXPECTED)) {
  test(`animation snapshot — ${fileName}`, async () => {
    const filePath = path.join(animationsDir, fileName);
    const data = JSON.parse(await readUtf8(filePath));
    const shape = shapeOf(data);
    assert.deepEqual(shape, expected,
      `snapshot drift for ${fileName} — update EXPECTED if the change is intentional`);
  });
}
