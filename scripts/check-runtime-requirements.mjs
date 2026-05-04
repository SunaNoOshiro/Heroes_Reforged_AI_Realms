// Implementation Plan 17 (Q279): every RR-NN cited in tasks/ or
// docs/architecture/ must resolve to a heading in
// docs/architecture/runtime-requirements.md.
//
// The gate prevents tasks from inventing parallel runtime
// preconditions that drift away from the canonical declaration.

import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  pathExists,
  readUtf8,
  repoRoot,
  walkFiles
} from "./lib/repo-utils.mjs";

const requirementsDoc = path.join(
  repoRoot,
  "docs",
  "architecture",
  "runtime-requirements.md"
);

const RR_PATTERN = /\bRR-(\d{2,3})\b/g;
const RR_HEADING = /^##\s+RR-(\d{2,3})\b/gm;

const scanRoots = [
  path.join(repoRoot, "tasks"),
  path.join(repoRoot, "docs", "architecture"),
  path.join(repoRoot, "docs", "planning"),
  path.join(repoRoot, "docs", "operations")
];

function isDirectRun() {
  return process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

async function loadDeclaredIds() {
  if (!(await pathExists(requirementsDoc))) {
    return null;
  }
  const text = await readUtf8(requirementsDoc);
  const ids = new Set();
  for (const match of text.matchAll(RR_HEADING)) {
    ids.add(`RR-${match[1].padStart(2, "0")}`);
  }
  return ids;
}

export async function collectRuntimeRequirementViolations() {
  const declared = await loadDeclaredIds();
  if (declared === null) {
    return [
      "docs/architecture/runtime-requirements.md: missing — author it before using RR-NN tokens elsewhere"
    ];
  }
  if (declared.size === 0) {
    return [
      "docs/architecture/runtime-requirements.md: declares no `## RR-NN` headings"
    ];
  }

  const violations = [];

  for (const root of scanRoots) {
    if (!(await pathExists(root))) continue;
    const files = await walkFiles(root, (filePath) =>
      /\.(md|json|mjs|ts|tsx)$/.test(filePath)
    );
    for (const filePath of files) {
      if (filePath === requirementsDoc) continue;
      const contents = await readUtf8(filePath);
      const lines = contents.split("\n");
      for (let i = 0; i < lines.length; i += 1) {
        RR_PATTERN.lastIndex = 0;
        const line = lines[i];
        for (const match of line.matchAll(RR_PATTERN)) {
          const id = `RR-${match[1].padStart(2, "0")}`;
          if (!declared.has(id)) {
            violations.push(
              `${path.relative(repoRoot, filePath)}:${i + 1}: ${id} is not declared in docs/architecture/runtime-requirements.md`
            );
          }
        }
      }
    }
  }

  return violations;
}

if (isDirectRun()) {
  const violations = await collectRuntimeRequirementViolations();
  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(violation);
    }
    process.exitCode = 1;
  } else {
    console.log("Runtime-requirements checks passed.");
  }
}
