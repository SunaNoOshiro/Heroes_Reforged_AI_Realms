// Implementation Plan 17 (Q300, Q204): every screen package's
// `interactions.md` must include an `## Error surfaces` block once it
// names a *specific* error code (DISPATCHER_X, VALIDATION_X, etc.).
// The block must follow the shape declared in
// docs/architecture/error-ux.md § 5.
//
// Screens that only carry the generic "rejected commands fail loudly"
// boilerplate inherit the prefix-based default surface mapping in
// docs/architecture/error-ux.md § 2 and do NOT need a per-screen
// block. The block is required only when a screen wants a non-default
// surface for a specific code.

import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  pathExists,
  readUtf8,
  repoRoot,
  walkFiles
} from "./lib/repo-utils.mjs";

const screensRoot = path.join(repoRoot, "docs", "architecture", "wiki", "screens");

const STRICT = process.env.HR_ERROR_UX_STRICT !== "0";

const ERROR_BLOCK_HEADING = /^##\s+Error\s+surfaces\b/m;

// A screen requires the per-screen block when its interactions.md
// cites a *specific* error code by name — i.e. <PREFIX>_<TOKEN> where
// PREFIX is one of the taxonomy prefixes from error-taxonomy.md.
// Generic words like "rejected" or "Err" are excluded; they're the
// default-policy boilerplate every template inherits.
const SPECIFIC_CODE_PATTERN =
  /\b(?:DISPATCHER|VALIDATION|STORAGE|PACK|NET|AI|ASSET|UI)_[A-Z][A-Z0-9_]+\b/;

function isDirectRun() {
  return process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

export async function collectErrorUxViolations() {
  if (!(await pathExists(screensRoot))) return [];

  const interactionFiles = await walkFiles(
    screensRoot,
    (filePath) => path.basename(filePath) === "interactions.md"
  );

  const violations = [];

  for (const filePath of interactionFiles) {
    const text = await readUtf8(filePath);
    if (!SPECIFIC_CODE_PATTERN.test(text)) continue;
    if (ERROR_BLOCK_HEADING.test(text)) continue;
    violations.push(
      `${path.relative(repoRoot, filePath)}: names a specific error code but does not include an "## Error surfaces" block (per docs/architecture/error-ux.md § 5)`
    );
  }

  return violations;
}

if (isDirectRun()) {
  const violations = await collectErrorUxViolations();
  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(violation);
    }
    if (STRICT) {
      process.exitCode = 1;
    }
  } else {
    console.log("Error-UX coverage checks passed.");
  }
}
