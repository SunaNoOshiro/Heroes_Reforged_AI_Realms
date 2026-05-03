// Per-animation perf-budget validator.
//
// Walks animation and vfx fixtures and rejects records that exceed the
// caps in docs/architecture/renderer-technology-choice.md (Per-Animation
// Budget). The degradation policy in
// docs/architecture/animation-contract.md (Degradation) applies at
// runtime; this validator is the schema-time gate.
//
// Files whose `id` includes the literal `budget_buster_test` are
// skipped during npm run validate and used by
// scripts/__tests__/animation-budget-validator.test.mjs to confirm
// the validator rejects budget-busting fixtures.

import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  readUtf8,
  repoRoot,
  repoRelative,
  walkFiles
} from "./lib/repo-utils.mjs";

export const BUDGETS = Object.freeze({
  spriteFramesPerSequence: 32,
  vfxParticlesPerPhase: 200,
  vfxPhasesPerBattle: 16,
  atlasPageSizePx: 4096,
  spriteDrawCallsPerStackPerFrame: 4,
  spriteDrawCallsPerBattleFrameTotal: 200
});

const BUDGET_BUSTER_ID_MARKER = "budget_buster_test";

const ANIMATION_DIRS = [
  path.join(repoRoot, "content-schema", "examples", "records", "animations"),
  path.join(repoRoot, "content-schema", "examples", "packs"),
  path.join(repoRoot, "resources", "packs")
];

const VFX_DIRS = [
  path.join(repoRoot, "content-schema", "examples", "records", "vfx"),
  path.join(repoRoot, "content-schema", "examples", "packs"),
  path.join(repoRoot, "resources", "packs")
];

function isAnimationFile(p) {
  return p.endsWith(".animation.json");
}

function isVfxFile(p) {
  return p.endsWith(".vfx.json");
}

async function readJson(p) {
  try {
    return JSON.parse(await readUtf8(p));
  } catch (e) {
    throw new Error(`failed to parse ${repoRelative(p)}: ${e.message}`);
  }
}

function* iterSequences(animation) {
  if (animation.sequences && typeof animation.sequences === "object") {
    for (const [name, seq] of Object.entries(animation.sequences)) {
      yield { trackName: "body", sequenceName: name, sequence: seq };
    }
  }
  if (animation.tracks && typeof animation.tracks === "object") {
    for (const [trackName, track] of Object.entries(animation.tracks)) {
      if (!track || typeof track !== "object" || !track.sequences) continue;
      for (const [name, seq] of Object.entries(track.sequences)) {
        yield { trackName, sequenceName: name, sequence: seq };
      }
    }
  }
}

export function validateAnimation(animation, repoPath = "<inline>", options = {}) {
  const violations = [];
  const skipBusters = options.skipBusters ?? true;

  if (skipBusters && typeof animation.id === "string"
    && animation.id.includes(BUDGET_BUSTER_ID_MARKER)) {
    return { violations: [], skipped: true };
  }

  for (const { trackName, sequenceName, sequence } of iterSequences(animation)) {
    if (!sequence || !Array.isArray(sequence.frames)) continue;
    if (sequence.frames.length > BUDGETS.spriteFramesPerSequence) {
      violations.push(
        `${repoPath}: track "${trackName}" sequence "${sequenceName}" has ${sequence.frames.length} frames (cap ${BUDGETS.spriteFramesPerSequence})`
      );
    }
    if (sequence.eventFrame !== undefined && Array.isArray(sequence.events)) {
      violations.push(
        `${repoPath}: track "${trackName}" sequence "${sequenceName}" sets both eventFrame and events[] — pick one`
      );
    }
    if (Array.isArray(sequence.events)) {
      for (const ev of sequence.events) {
        if (typeof ev?.frame !== "number") continue;
        if (ev.frame >= sequence.frames.length) {
          violations.push(
            `${repoPath}: track "${trackName}" sequence "${sequenceName}" event frame ${ev.frame} is outside frames[] index range [0..${sequence.frames.length - 1}]`
          );
        }
        if (ev.kind === "damage" && trackName !== "body") {
          violations.push(
            `${repoPath}: track "${trackName}" sequence "${sequenceName}" event "damage" is allowed only on the body channel`
          );
        }
      }
    }
    if (sequence.eventFrame !== undefined
      && typeof sequence.eventFrame === "number"
      && sequence.eventFrame >= sequence.frames.length) {
      violations.push(
        `${repoPath}: track "${trackName}" sequence "${sequenceName}" eventFrame ${sequence.eventFrame} is outside frames[] index range [0..${sequence.frames.length - 1}]`
      );
    }
  }

  if (Array.isArray(animation.spriteSheetAssetIds)
    && animation.spriteSheetAssetId) {
    violations.push(
      `${repoPath}: declares both spriteSheetAssetId and spriteSheetAssetIds — pick one`
    );
  }
  if (animation.frameSize && Array.isArray(animation.frames)) {
    violations.push(
      `${repoPath}: declares both frameSize and frames[] — pick one`
    );
  }

  return { violations, skipped: false };
}

export function validateVfx(vfx, repoPath = "<inline>") {
  const violations = [];
  if (!vfx.phases || typeof vfx.phases !== "object") {
    return { violations };
  }
  for (const [phaseName, phase] of Object.entries(vfx.phases)) {
    if (!phase || typeof phase !== "object") continue;
    const particleSystems = Array.isArray(phase.particleSystemIds)
      ? phase.particleSystemIds.length
      : 0;
    // Each particleSystem ≈ 1 system; cap is on per-phase concurrent
    // particles, not systems. We cannot count particles statically, so
    // we surface the cap in a budget-doc warning only when a phase
    // declares more than 8 systems (rule of thumb: > 25 particles per
    // system × 8 systems = 200 particles).
    if (particleSystems > 8) {
      violations.push(
        `${repoPath}: phase "${phaseName}" declares ${particleSystems} particle systems; budget cap is 200 concurrent particles per phase, which is hard to satisfy with > 8 systems`
      );
    }
  }
  return { violations };
}

export async function validateAnimationBudgets(options = {}) {
  const allViolations = [];
  const seenAnimFiles = new Set();
  const seenVfxFiles = new Set();

  for (const dir of ANIMATION_DIRS) {
    let files;
    try {
      files = await walkFiles(dir, isAnimationFile);
    } catch {
      continue;
    }
    for (const file of files) {
      if (seenAnimFiles.has(file)) continue;
      seenAnimFiles.add(file);
      const json = await readJson(file);
      const { violations, skipped } = validateAnimation(json, repoRelative(file), options);
      if (skipped) continue;
      allViolations.push(...violations);
    }
  }

  for (const dir of VFX_DIRS) {
    let files;
    try {
      files = await walkFiles(dir, isVfxFile);
    } catch {
      continue;
    }
    for (const file of files) {
      if (seenVfxFiles.has(file)) continue;
      seenVfxFiles.add(file);
      const json = await readJson(file);
      const { violations } = validateVfx(json, repoRelative(file));
      allViolations.push(...violations);
    }
  }

  return allViolations;
}

function isDirectRun() {
  return process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

if (isDirectRun()) {
  const violations = await validateAnimationBudgets();
  if (violations.length > 0) {
    console.error("animation-budget violations:");
    for (const v of violations) console.error("  - " + v);
    process.exit(1);
  }
  console.log("animation-budget validator: ok");
}
