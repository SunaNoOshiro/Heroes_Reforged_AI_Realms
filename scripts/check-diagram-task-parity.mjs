// Implementation Plan 17 (Q292): catch the diagram-only contracts that
// drifted away from the canonical task specs. Today the gate fires
// on the three known divergence patterns:
//
//   1. save-flow showing a `state` blob (log-only is the canonical
//      shape per tasks/mvp/08-persistence/02-log-only-save-format.md)
//   2. multiplayer-sync showing a "resync from last good state"
//      branch without the bisect → report → quit ladder
//   3. a renderer→engine DAMAGE_FRAME callback (the contract is
//      engine-emit-only per docs/architecture/animation-contract.md
//      § DAMAGE_FRAME Ownership)
//
// Add a row to `divergencePatterns` when a new known-bad pattern
// surfaces; the gate stays small on purpose.

import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  pathExists,
  readUtf8,
  repoRoot,
  walkFiles
} from "./lib/repo-utils.mjs";

const diagramsRoot = path.join(repoRoot, "docs", "architecture", "diagrams");

const divergencePatterns = [
  {
    file: "24-save-flow.md",
    forbidden: /\bstate\s*blob\b/i,
    requiredOneOf: [/\blog[- ]only\b/i, /no\s+`?state`?\s+blob/i],
    message:
      "diagram references a `state` blob; save-format is log-only per tasks/mvp/08-persistence/02-log-only-save-format.md"
  },
  {
    file: "26-multiplayer-sync.md",
    forbidden: /resync\s+from\s+last\s+good\s+state/i,
    requiredOneOf: [/bisect/i, /report\s*\+\s*quit/i, /report and quit/i],
    message:
      "diagram references 'resync from last good state' without the bisect → report → quit ladder; recovery is owned by tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md and the snapshot-resync fallback"
  },
  // The DAMAGE_FRAME divergence pattern: any diagram that shows the
  // animation/renderer mutating engine state at DAMAGE_FRAME or
  // calling back into the rules layer at the damage frame is
  // forbidden. The canonical contract is in animation-contract.md.
  {
    file: "*",
    forbidden: /(?:Anim|Renderer)[\s\S]{0,40}->>?[\s\S]{0,40}(?:DamageCalc|calculateDamage|applyReducer|engine\.apply)/i,
    requiredOneOf: [/animation-contract\.md/i],
    message:
      "diagram shows renderer/animation calling back into the engine at DAMAGE_FRAME; the contract is engine-emit-only per docs/architecture/animation-contract.md § DAMAGE_FRAME Ownership"
  }
];

function isDirectRun() {
  return process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

export async function collectDiagramParityViolations() {
  if (!(await pathExists(diagramsRoot))) {
    return [];
  }

  const violations = [];
  const allDiagramFiles = await walkFiles(
    diagramsRoot,
    (filePath) => filePath.endsWith(".md") && path.basename(filePath) !== "README.md"
  );

  for (const rule of divergencePatterns) {
    const targets = rule.file === "*"
      ? allDiagramFiles
      : [path.join(diagramsRoot, rule.file)];
    for (const target of targets) {
      if (!(await pathExists(target))) continue;
      const text = await readUtf8(target);
      if (!rule.forbidden.test(text)) continue;
      const escapeHatch = (rule.requiredOneOf || []).some((pattern) =>
        pattern.test(text)
      );
      if (escapeHatch) continue;
      violations.push(
        `${path.relative(repoRoot, target)}: ${rule.message}`
      );
    }
  }

  return violations;
}

if (isDirectRun()) {
  const violations = await collectDiagramParityViolations();
  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(violation);
    }
    process.exitCode = 1;
  } else {
    console.log("Diagram-task parity checks passed.");
  }
}
