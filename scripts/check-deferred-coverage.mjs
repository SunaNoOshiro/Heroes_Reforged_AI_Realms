// Implementation Plan 17 (Q296): warn on inline "v2 / deferred"
// references in canonical sources that don't cite a DEF-NNN entry in
// docs/planning/deferred.md.
//
// The gate is *informational* — it does not fail validate today
// because some narrative passages legitimately reference "v2" without
// pointing at a specific deferred row (e.g. design discussions inside
// implementation-plans). We surface the offenders so they can be
// converted to DEF-NNN refs over time.
//
// Set HR_DEFERRED_STRICT=1 to fail on any uncovered reference.

import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  pathExists,
  readUtf8,
  repoRoot,
  walkFiles
} from "./lib/repo-utils.mjs";

const deferredDoc = path.join(
  repoRoot,
  "docs",
  "planning",
  "deferred.md"
);

const DEF_PATTERN = /\bDEF-(\d{3,4})\b/g;
const DEF_HEADING = /\bDEF-(\d{3,4})\b/g;

const scanRoots = [
  path.join(repoRoot, "docs", "architecture"),
  path.join(repoRoot, "docs", "planning"),
  path.join(repoRoot, "docs", "operations"),
  path.join(repoRoot, "tasks")
];

const STRICT = process.env.HR_DEFERRED_STRICT === "1";

function isDirectRun() {
  return process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

async function loadDeclaredIds() {
  if (!(await pathExists(deferredDoc))) return null;
  const text = await readUtf8(deferredDoc);
  const ids = new Set();
  for (const match of text.matchAll(DEF_HEADING)) {
    ids.add(`DEF-${match[1].padStart(3, "0")}`);
  }
  return ids;
}

export async function collectDeferredViolations() {
  const declared = await loadDeclaredIds();
  if (declared === null) {
    return [
      "docs/planning/deferred.md: missing — author the deferred-items register before referencing DEF-NNN"
    ];
  }
  if (declared.size === 0) {
    return [
      "docs/planning/deferred.md: declares no DEF-NNN entries"
    ];
  }

  const violations = [];

  for (const root of scanRoots) {
    if (!(await pathExists(root))) continue;
    const files = await walkFiles(root, (filePath) => filePath.endsWith(".md"));
    for (const filePath of files) {
      if (filePath === deferredDoc) continue;
      const contents = await readUtf8(filePath);
      const lines = contents.split("\n");
      for (let i = 0; i < lines.length; i += 1) {
        DEF_PATTERN.lastIndex = 0;
        const line = lines[i];
        for (const match of line.matchAll(DEF_PATTERN)) {
          const id = `DEF-${match[1].padStart(3, "0")}`;
          if (!declared.has(id)) {
            violations.push(
              `${path.relative(repoRoot, filePath)}:${i + 1}: ${id} is not declared in docs/planning/deferred.md`
            );
          }
        }
      }
    }
  }

  return violations;
}

if (isDirectRun()) {
  const violations = await collectDeferredViolations();
  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(violation);
    }
    if (STRICT) {
      process.exitCode = 1;
    }
  } else {
    console.log("Deferred-coverage checks passed.");
  }
}
