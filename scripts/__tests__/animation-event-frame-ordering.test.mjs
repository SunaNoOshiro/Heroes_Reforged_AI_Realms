// Verifies the null renderer's contract:
//   - all animation events fire in expected event-log order
//   - eventFrame lookups succeed for every used sequence
//   - events[].ref resolves against the relevant registry
//   - DAMAGE_FRAME never fires from the renderer side (rule 3.A-2)
//   - sound-set keys resolve

import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {
  consumeEventLog,
  PRIORITY_TABLE,
  priorityForSequence
} from "../../src/renderer/null/event-log-consumer.mjs";
import { createNullRenderer } from "../../src/renderer/null/null-renderer.mjs";
import { readUtf8, repoRoot } from "../lib/repo-utils.mjs";

async function loadFixture(rel) {
  return JSON.parse(
    await readUtf8(path.join(repoRoot, "content-schema", "examples", "records", rel))
  );
}

test("priority table follows the body-channel order in the contract", () => {
  // Higher priority interrupts lower; matches the table in
  // docs/architecture/animation-contract.md (Conflict Resolution).
  assert.equal(priorityForSequence("dying"),     9);
  assert.equal(priorityForSequence("defeated"),  8);
  assert.equal(priorityForSequence("hurt"),      7);
  assert.equal(priorityForSequence("attacking"), 6);
  assert.equal(priorityForSequence("casting"),   5);
  assert.equal(priorityForSequence("defending"), 4);
  assert.equal(priorityForSequence("waiting"),   3);
  assert.equal(priorityForSequence("walking"),   2);
  assert.equal(priorityForSequence("idle"),      1);
  assert.equal(priorityForSequence("unknown"),   0);

  // Sanity: hurt > attacking is the rule that resolves
  // "killed mid-hurt" and "retaliation mid-attack".
  assert.ok(PRIORITY_TABLE.hurt > PRIORITY_TABLE.attacking);
  assert.ok(PRIORITY_TABLE.dying > PRIORITY_TABLE.hurt);
});

test("null renderer plays event-log timelines in order", async () => {
  const ashHound = await loadFixture("animations/ash-hound.animation.json");
  const dualStrike = await loadFixture("animations/dual-strike.animation.json");

  const animations = new Map([
    [ashHound.id, ashHound],
    [dualStrike.id, dualStrike]
  ]);

  const events = [
    { kind: "UNIT_ATTACKED", animId: ashHound.id,   sequence: "attack",  damage: 47, eventFrame: 2 },
    { kind: "UNIT_ATTACKED", animId: ashHound.id,   sequence: "hit",                 eventFrame: 0 },
    { kind: "UNIT_ATTACKED", animId: dualStrike.id, sequence: "attack",  damage: 30 }
  ];

  const renderer = createNullRenderer({ animations });
  const trace = renderer.play(events);

  assert.equal(trace.timelines.length, 3, "one timeline per event");
  assert.deepEqual(
    trace.timelines.map((t) => t.eventIndex),
    [0, 1, 2],
    "timelines are in event-log order"
  );
  assert.equal(trace.timelines[0].sequenceName, "attack");
  assert.equal(trace.timelines[2].animId, dualStrike.id);
});

test("null renderer flags missing animId / sequence", async () => {
  const ashHound = await loadFixture("animations/ash-hound.animation.json");
  const animations = new Map([[ashHound.id, ashHound]]);

  const events = [
    { kind: "UNIT_ATTACKED", animId: "nope", sequence: "attack" },
    { kind: "UNIT_ATTACKED", animId: ashHound.id, sequence: "missing-seq" }
  ];

  const trace = consumeEventLog(events, { animations });
  assert.equal(trace.warnings.length, 2);
  assert.match(trace.warnings[0], /unknown animId/);
  assert.match(trace.warnings[1], /sequence "missing-seq" not found/);
});

test("null renderer never emits damage from its own side (3.A-2)", async () => {
  const ashHound = await loadFixture("animations/ash-hound.animation.json");
  const animations = new Map([[ashHound.id, ashHound]]);

  // Empty event log: no engine events, no renderer cues.
  const trace1 = consumeEventLog([], { animations });
  assert.equal(trace1.cuesEmitted.length, 0);
  assert.equal(trace1.invariants.damageEverEmittedFromRenderer, false);

  // The renderer surfaces damage cues only because the engine emitted
  // a UNIT_ATTACKED event; the cue is cosmetic, not a damage
  // application. The engine has already mutated state by the time the
  // renderer reaches the eventFrame.
  const trace2 = consumeEventLog(
    [{ kind: "UNIT_ATTACKED", animId: ashHound.id, sequence: "attack", damage: 47 }],
    { animations }
  );
  // Cosmetic damage cue is emitted, but invariant tracks renderer-side
  // mutation attempts (always false for a pure consumer).
  assert.equal(trace2.invariants.damageEverEmittedFromRenderer, false);
});

test("null renderer resolves sound + vfx + status refs", async () => {
  const dualStrike = await loadFixture("animations/dual-strike.animation.json");
  const animations = new Map([[dualStrike.id, dualStrike]]);
  const sounds = new Map([
    ["sound.combat.weapon.swing", { id: "sound.combat.weapon.swing" }]
  ]);
  const vfx = new Map([
    ["vfx:dual_strike_demo:hit_a", { id: "vfx:dual_strike_demo:hit_a" }],
    ["vfx:dual_strike_demo:hit_b", { id: "vfx:dual_strike_demo:hit_b" }]
  ]);

  const trace = consumeEventLog(
    [{ kind: "UNIT_ATTACKED", animId: dualStrike.id, sequence: "attack" }],
    { animations, sounds, vfx, statuses: new Map() }
  );

  // dual-strike attack has 6 cues: 2 sound + 2 damage + 2 vfx.
  assert.equal(trace.cuesEmitted.length, 6);

  // Missing-ref warnings: when we pass an empty registries we get
  // warnings for each unresolved cue.
  const traceMissing = consumeEventLog(
    [{ kind: "UNIT_ATTACKED", animId: dualStrike.id, sequence: "attack" }],
    { animations }
  );
  // 2 sound cues + 2 vfx cues = 4 missing-ref warnings.
  assert.equal(traceMissing.warnings.length, 4);
});
