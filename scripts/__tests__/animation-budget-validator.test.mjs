// Confirms the per-animation budget validator rejects fixtures that
// exceed the caps in
// docs/architecture/renderer-technology-choice.md (Per-Animation
// Budget). The budget-buster fixture lives at
// content-schema/examples/records/animations/budget-buster.animation.json
// and is skipped by default during npm run validate (id ends with
// :budget_buster_test) so the regular run stays green.

import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {
  validateAnimation,
  validateAnimationBudgets,
  BUDGETS
} from "../validate-animation-budgets.mjs";
import { readUtf8, repoRoot } from "../lib/repo-utils.mjs";

test("budget validator passes by default (busters are skipped)", async () => {
  const violations = await validateAnimationBudgets();
  assert.deepEqual(violations, []);
});

test("budget validator rejects budget-buster.animation.json when not skipped", async () => {
  const filePath = path.join(
    repoRoot,
    "content-schema",
    "examples",
    "records",
    "animations",
    "budget-buster.animation.json"
  );
  const json = JSON.parse(await readUtf8(filePath));
  const { violations } = validateAnimation(json, "budget-buster.animation.json", { skipBusters: false });
  assert.ok(violations.length > 0, "budget-buster must produce at least one violation");
  assert.ok(
    violations.some((v) => v.includes(`cap ${BUDGETS.spriteFramesPerSequence}`)),
    "frame-count cap violation must be reported"
  );
});

test("budget validator catches eventFrame-out-of-range", () => {
  const fixture = {
    id: "fixture:bad-event-frame",
    sequences: {
      attack: { frames: [0, 1, 2], fps: 12, eventFrame: 9 }
    }
  };
  const { violations } = validateAnimation(fixture, "<inline>");
  assert.ok(
    violations.some((v) => v.includes("eventFrame 9 is outside frames[] index range")),
    "out-of-range eventFrame must be reported"
  );
});

test("budget validator catches both eventFrame and events[] together", () => {
  const fixture = {
    id: "fixture:both-events",
    sequences: {
      attack: {
        frames: [0, 1, 2, 3],
        fps: 12,
        eventFrame: 1,
        events: [{ frame: 1, kind: "damage", ref: "primary" }]
      }
    }
  };
  const { violations } = validateAnimation(fixture, "<inline>");
  assert.ok(
    violations.some((v) => v.includes("sets both eventFrame and events[]")),
    "must reject sequences that set both"
  );
});

test("budget validator forbids damage events on non-body channels", () => {
  const fixture = {
    id: "fixture:status-damage",
    sequences: {},
    tracks: {
      status: {
        sequences: {
          burning: {
            frames: [0, 1],
            fps: 8,
            events: [{ frame: 1, kind: "damage", ref: "primary" }]
          }
        }
      }
    }
  };
  const { violations } = validateAnimation(fixture, "<inline>");
  assert.ok(
    violations.some((v) => v.includes("event \"damage\" is allowed only on the body channel")),
    "damage events must be confined to the body channel"
  );
});

test("budget validator forbids spriteSheetAssetId + spriteSheetAssetIds together", () => {
  const fixture = {
    id: "fixture:both-sheets",
    spriteSheetAssetId: "x",
    spriteSheetAssetIds: ["y"],
    sequences: {}
  };
  const { violations } = validateAnimation(fixture, "<inline>");
  assert.ok(
    violations.some((v) => v.includes("declares both spriteSheetAssetId and spriteSheetAssetIds")),
    "must reject when both single + multi-page asset ids declared"
  );
});

test("budget validator forbids frameSize + frames[] together", () => {
  const fixture = {
    id: "fixture:both-frame-modes",
    frameSize: { width: 96, height: 96 },
    frames: [{ x: 0, y: 0, w: 96, h: 96 }],
    sequences: {}
  };
  const { violations } = validateAnimation(fixture, "<inline>");
  assert.ok(
    violations.some((v) => v.includes("declares both frameSize and frames[]")),
    "must reject when both uniform + explicit frame metadata declared"
  );
});
