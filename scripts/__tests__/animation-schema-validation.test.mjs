// Schema-validation gate for animation + vfx fixtures. Walks every
// example record under content-schema/examples/records/animations and
// content-schema/examples/records/vfx and validates against the
// canonical schema. The repo-wide check-repo-contracts.mjs already
// covers most schemas; this test pins the animation/vfx subset
// explicitly so drift surfaces before pack-load time.

import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { collectContractViolations } from "../check-repo-contracts.mjs";
import { repoRelative } from "../lib/repo-utils.mjs";

test("animation + vfx fixtures pass repo contracts", async () => {
  const violations = await collectContractViolations();
  const animationOrVfxViolations = violations.filter((v) => {
    const message = typeof v === "string" ? v : v.message ?? String(v);
    return message.includes(".animation.json")
      || message.includes(".vfx.json");
  });
  assert.deepEqual(animationOrVfxViolations, []);
});
