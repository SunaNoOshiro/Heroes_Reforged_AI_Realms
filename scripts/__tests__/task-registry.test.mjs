import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { buildTaskRegistry } from "../generate-task-registry.mjs";
import { repoRoot } from "../lib/repo-utils.mjs";

test("task registry has unique ids and key pack-layout outputs", async () => {
  const registry = await buildTaskRegistry();
  const ids = registry.tasks.map((task) => task.id);
  const uniqueIds = new Set(ids);

  assert.ok(registry.modules.length > 0);
  assert.ok(registry.tasks.length > 0);
  assert.equal(uniqueIds.size, ids.length);

  const emberwildUnitsTask = registry.tasks.find(
    (task) =>
      task.id ===
      "mvp.04-faction-emberwild.01-emberwild-units-7-units-plus-upgrades"
  );

  assert.ok(emberwildUnitsTask);
  assert.ok(
    emberwildUnitsTask.ownedPaths.includes(
      "resources/packs/emberwild-faction/units/"
    )
  );
});

test("tasks:next supports MVP phase filtering", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/tasks.mjs", "next", "--phase=mvp"],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Ready to start \(mvp\)/);
  assert.doesNotMatch(result.stdout, /phase-3\./);
});

test("task registry estimate parsing stops before examples", async () => {
  const registry = await buildTaskRegistry();
  const affectedIds = [
    "mvp.05-adventure-map.01-strategic-game-state-model",
    "mvp.05-adventure-map.03-hero-movement",
    "mvp.10-heuristic-ai.05-difficulty-levels-pawn-and-knight",
    "phase-2.01-spells-artifacts.00-hero-leveling",
    "phase-2.01-spells-artifacts.01a-hero-skill-assignment",
    "phase-2.01-spells-artifacts.04a-baseline-skill-pack"
  ];

  for (const id of affectedIds) {
    const task = registry.tasks.find((candidate) => candidate.id === id);
    assert.ok(task, id);
    assert.match(task.estimatedTime, /^-\s+\d+\s+hours?$/);
  }
});
