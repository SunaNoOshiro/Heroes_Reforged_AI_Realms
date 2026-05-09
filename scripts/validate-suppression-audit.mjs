// validate:suppression-audit — anti-cheat for `validate:smells`.
//
// ESLint suppressions are a legitimate escape hatch when the rule
// genuinely doesn't fit a particular line, but they are also the
// cheapest way to make a smell "go away" without fixing it. This
// gate makes the cheap path explicit: every `// eslint-disable*`
// MUST carry a `-- reason: <one-line>` justification on the same
// line, mirroring the `// stryker-equivalent: <proof>` convention
// in the mutation-test skill.
//
// Allowed:
//   // eslint-disable-next-line sonarjs/cognitive-complexity -- reason: state machine, splitting hides intent
//   /* eslint-disable no-control-regex -- reason: literal control-char regex is the function's purpose */
//
// Not allowed (audit fails):
//   // eslint-disable-next-line sonarjs/cognitive-complexity
//   // eslint-disable-next-line sonarjs/cognitive-complexity -- TODO
//   // eslint-disable-next-line sonarjs/cognitive-complexity -- reason:        (empty after the colon)
//
// Two design choices:
//
// 1. The check ignores files that ESLint itself ignores via
//    eslint.config.mjs `ignores` (generated contracts, migration
//    template). Disables there are unreachable by ESLint anyway.
//
// 2. Per-file `rules: { ... }` overrides inside eslint.config.mjs are
//    NOT in scope here — they're config-level decisions visible in
//    diff. This gate covers in-source-line suppressions only.

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { walkFiles, repoRoot, readUtf8 } from "./lib/repo-utils.mjs";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

const SCAN_ROOTS = [
  path.join(repoRoot, "src"),
  path.join(repoRoot, "services"),
];

const EXCLUDED_PREFIXES = [
  "src/contracts/",
  "src/content-schema/migrations/example-",
];

const SCANNABLE_EXTENSIONS = new Set([".ts", ".tsx", ".mjs", ".js"]);

const DISABLE_PATTERN = /\beslint-disable(?:-next-line|-line)?\b([^*\n]*)/g;
const REASON_PATTERN = /--\s*reason:\s*(\S.*?)\s*(?:\*\/)?\s*$/;

function relPath(absPath) {
  return path.relative(repoRoot, absPath).split(path.sep).join("/");
}

function isExcluded(rel) {
  return EXCLUDED_PREFIXES.some((p) => rel.startsWith(p));
}

function scanText(rel, text) {
  const violations = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    DISABLE_PATTERN.lastIndex = 0;
    let m;
    while ((m = DISABLE_PATTERN.exec(line)) !== null) {
      const tail = (m[1] || "").trim();
      const reasonMatch = tail.match(REASON_PATTERN);
      if (!reasonMatch) {
        violations.push({
          file: rel,
          line: i + 1,
          text: line.trim(),
          why: "missing `-- reason: <one-line>` justification",
        });
        continue;
      }
      const reason = reasonMatch[1].trim();
      if (
        reason === ""
        || /^todo\b/i.test(reason)
        || /^fixme\b/i.test(reason)
        || /^trust me\b/i.test(reason)
        || /^needed\b/i.test(reason)
      ) {
        violations.push({
          file: rel,
          line: i + 1,
          text: line.trim(),
          why: `weak reason "${reason}" — explain *why this code is correct as-is*`,
        });
      }
    }
  }
  return violations;
}

export async function collectSuppressionViolations() {
  const all = [];
  for (const root of SCAN_ROOTS) {
    let files;
    try {
      files = await walkFiles(root, (p) =>
        SCANNABLE_EXTENSIONS.has(path.extname(p)),
      );
    } catch {
      continue;
    }
    for (const file of files) {
      const rel = relPath(file);
      if (isExcluded(rel)) continue;
      const text = await readUtf8(file);
      if (!/eslint-disable/.test(text)) continue;
      all.push(...scanText(rel, text));
    }
  }
  return all;
}

async function main() {
  const violations = await collectSuppressionViolations();
  if (violations.length === 0) {
    console.log("validate:suppression-audit: OK");
    return;
  }
  console.error(
    `validate:suppression-audit FAIL — ${violations.length} unjustified ESLint suppression(s):`,
  );
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  — ${v.why}`);
    console.error(`    > ${v.text}`);
  }
  console.error(
    "\n┌─ Right fix ──────────────────────────────────────────────────────",
  );
  console.error(
    "│ Either remove the suppression and fix the code the rule flagged,",
  );
  console.error(
    "│ OR add a substantive `-- reason: <one-line>` explaining why this",
  );
  console.error(
    "│ code is correct as-is. The reason must explain *why the rule's",
  );
  console.error(
    "│ concern doesn't apply to this site*, not say \"trust me\", \"TODO\",",
  );
  console.error(
    "│ \"needed\", or \"hard to fix\".",
  );
  console.error(
    "├─ Allowed shape ──────────────────────────────────────────────────",
  );
  console.error(
    "│ // eslint-disable-next-line sonarjs/cognitive-complexity \\",
  );
  console.error(
    "│   -- reason: state machine, splitting hides intent",
  );
  console.error(
    "└──────────────────────────────────────────────────────────────────",
  );
  console.error(
    "\nDoctrine: .agents/skills/structural-checks/SKILL.md § smells, rule A",
  );
  process.exitCode = 1;
}

function isDirectRun() {
  return process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

if (isDirectRun()) {
  await main();
}
