import path from "node:path";
import { pathToFileURL } from "node:url";
import { readUtf8, repoRelative, repoRoot, walkFiles } from "./lib/repo-utils.mjs";

const catalogPath = path.join(
  repoRoot,
  "docs",
  "architecture",
  "pack-error-codes.md"
);

function isDirectRun() {
  return process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

const CODE_PATTERN = /pack\.error\.[a-z]+\.[a-z][a-zA-Z0-9-]*/g;

function extractCatalogCodes(markdown) {
  const codes = new Set();
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.startsWith("|")) continue;
    const matches = line.match(CODE_PATTERN);
    if (!matches) continue;
    for (const code of matches) codes.add(code);
  }
  return codes;
}

function isScannableTextFile(filePath) {
  if (filePath === catalogPath) return false;
  if (filePath.includes(`${path.sep}node_modules${path.sep}`)) return false;
  if (filePath.includes(`${path.sep}.git${path.sep}`)) return false;
  return /\.(md|json|mjs|ts|tsx|js)$/.test(filePath);
}

export async function collectErrorCodeViolations() {
  const catalog = await readUtf8(catalogPath);
  const known = extractCatalogCodes(catalog);
  const files = await walkFiles(repoRoot, isScannableTextFile);
  const violations = [];

  for (const filePath of files) {
    const text = await readUtf8(filePath);
    const matches = text.match(CODE_PATTERN);
    if (!matches) continue;
    const seen = new Set();
    for (const code of matches) {
      if (known.has(code)) continue;
      if (seen.has(code)) continue;
      seen.add(code);
      violations.push(`${repoRelative(filePath)}: unknown pack error code "${code}" (add it to docs/architecture/pack-error-codes.md)`);
    }
  }
  return violations;
}

if (isDirectRun()) {
  const violations = await collectErrorCodeViolations();
  if (violations.length === 0) {
    console.log("Pack error codes: 0 unknown codes referenced.");
  } else {
    for (const v of violations) console.error(v);
    console.error(`\nPack error code lint failed: ${violations.length} issue(s).`);
    process.exitCode = 1;
  }
}
