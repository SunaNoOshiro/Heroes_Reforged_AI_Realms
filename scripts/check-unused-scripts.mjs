// Dead-script detector.
//
// Walks scripts/*.mjs and flags any file whose basename is not
// referenced anywhere else in the repo. "Referenced" means the
// basename appears as a literal string in: package.json,
// .github/workflows/, any other script, src, tools, tests, docs,
// tasks, services, or the top-level Markdown files (CLAUDE.md,
// AGENTS.md, README.md, CONTRIBUTING.md).
//
// Files under scripts/__tests__/ and scripts/lib/ are exempt:
// the first run via the test runner directly, the second are
// library modules consumed by basename-import.
//
// To intentionally retain a script with no caller, add an entry
// to ALLOWED_ORPHANS below with a one-line reason. The reason
// becomes the doc trail for future maintainers.
//
// Wired into `npm run validate:unused-scripts` and into
// `npm run validate`.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleDir, "..");

// Scripts intentionally orphaned. Add an entry here only after
// confirming the script has no caller via the same five checks
// the detector applies. The reason becomes the doc trail.
const ALLOWED_ORPHANS = {
};

// Roots searched for references. Anywhere in these trees that
// names the script's basename counts as a real use.
const SEARCH_ROOTS = [
  "package.json",
  ".github",
  "scripts",
  "src",
  "tools",
  "tests",
  "docs",
  "tasks",
  "services",
  "CLAUDE.md",
  "AGENTS.md",
  "README.md",
  "CONTRIBUTING.md"
];

// File extensions worth scanning. Limits the read fan-out to
// text files; binary fixtures and lock files are skipped.
const SCANNABLE_EXTENSIONS = new Set([
  ".mjs", ".js", ".cjs", ".mts", ".cts", ".ts", ".tsx",
  ".md", ".json", ".yml", ".yaml", ".html", ".toml"
]);

const SKIP_DIRECTORIES = new Set([
  "node_modules", ".git", ".turbo", ".next", "dist", "build"
]);

function isExempt(relPath) {
  return relPath.startsWith("scripts/__tests__/")
    || relPath.startsWith("scripts/lib/");
}

async function listCandidateScripts() {
  const out = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRECTORIES.has(entry.name)) continue;
        await walk(full);
      } else if (entry.name.endsWith(".mjs")) {
        const rel = path.relative(repoRoot, full);
        if (!isExempt(rel)) out.push({ rel, basename: entry.name });
      }
    }
  }
  await walk(path.join(repoRoot, "scripts"));
  return out;
}

async function scanFile(filePath, basenames, referenced, ownPaths) {
  const rel = path.relative(repoRoot, filePath);
  if (ownPaths.has(rel)) return; // never count a script's self-reference
  const ext = path.extname(filePath);
  if (!SCANNABLE_EXTENSIONS.has(ext)) return;
  let text;
  try {
    text = await fs.readFile(filePath, "utf8");
  } catch {
    return;
  }
  for (const basename of basenames) {
    if (referenced.has(basename)) continue;
    if (text.includes(basename)) referenced.add(basename);
  }
}

async function scanRoot(root, basenames, referenced, ownPaths) {
  let stat;
  try {
    stat = await fs.stat(root);
  } catch {
    return;
  }
  if (stat.isFile()) {
    await scanFile(root, basenames, referenced, ownPaths);
    return;
  }
  let entries;
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIP_DIRECTORIES.has(entry.name)) continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      await scanRoot(full, basenames, referenced, ownPaths);
    } else {
      await scanFile(full, basenames, referenced, ownPaths);
    }
  }
}

export async function collectUnusedScripts() {
  const candidates = await listCandidateScripts();
  const basenames = candidates.map((c) => c.basename);
  const referenced = new Set();
  const ownPaths = new Set(candidates.map((c) => c.rel));

  for (const root of SEARCH_ROOTS) {
    await scanRoot(path.join(repoRoot, root), basenames, referenced, ownPaths);
  }

  return candidates.filter((c) => !referenced.has(c.basename));
}

async function main() {
  const unused = await collectUnusedScripts();
  const failures = unused.filter((u) => !ALLOWED_ORPHANS[u.basename]);
  const allowed = unused.filter((u) => ALLOWED_ORPHANS[u.basename]);

  if (allowed.length > 0) {
    console.log("Allowed orphans (no callers; explicitly retained):");
    for (const { rel, basename } of allowed) {
      console.log(`  - ${rel}`);
      console.log(`    reason: ${ALLOWED_ORPHANS[basename]}`);
    }
  }

  if (failures.length === 0) {
    console.log(`validate:unused-scripts — clean (${unused.length} allowed orphan${unused.length === 1 ? "" : "s"})`);
    return;
  }

  console.error(
    "validate:unused-scripts FAIL — these scripts have no caller anywhere in the repo:"
  );
  for (const { rel } of failures) {
    console.error(`  - ${rel}`);
  }
  console.error(
    "Either wire each one into package.json / .github/workflows/ / another script / a doc, " +
    "or add an entry to ALLOWED_ORPHANS in scripts/check-unused-scripts.mjs with a one-line reason."
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
