// Plan 26 — Improvement / Draft-Preview Policy
//
// Lint gate that scans `src/ui/` for static / dynamic imports that
// resolve to functions in `src/engine/`, `src/rules/`, or
// `src/content-runtime/` whose imported binding name matches
// /^(apply|simulate|advance|step|reduce)/. Such calls let UI code
// run the canonical reducer or its rule formulas speculatively,
// turning the deterministic engine into a stochastic-outcome oracle
// per docs/architecture/draft-preview-policy.md.
//
// Allow exceptions when the call site or the import line is
// annotated with `// @deterministic-preview` on the same or
// previous line.
//
// Wired into `npm run validate:no-stochastic-preview` and into
// `npm run validate`.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleDir, "..");
const SRC_UI = path.join(repoRoot, "src", "ui");
const FORBIDDEN_BINDING_PATTERN = /^(apply|simulate|advance|step|reduce)/;
const SOURCE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs"
]);
const ENGINE_PREFIXES = ["src/engine/", "src/rules/", "src/content-runtime/"];

async function pathExists(target) {
  try {
    await fs.stat(target);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir, onFile) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "__tests__") continue;
      await walk(full, onFile);
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      await onFile(full);
    }
  }
}

function resolvesToEngineLayer(specifier) {
  if (!specifier.startsWith(".") && !specifier.startsWith("/")) return false;
  // Heuristic: relative imports are the only way `src/ui/` reaches
  // engine code. We keep the check syntactic rather than resolving
  // every TS path; full resolution would need a TS toolchain.
  const normalized = specifier.replace(/\\/g, "/");
  return ENGINE_PREFIXES.some((prefix) =>
    normalized.includes(prefix.replace(/\/$/, ""))
  );
}

function isAnnotated(source, importStartIndex) {
  // Walk back to the start of the import statement's line, then scan
  // up to two lines back for `@deterministic-preview`.
  const before = source.slice(0, importStartIndex);
  const tail = before.split("\n").slice(-3).join("\n");
  return /@deterministic-preview/.test(tail);
}

const STATIC_IMPORT_RE = /import\s+(?:type\s+)?(?:\*\s+as\s+\w+|\w+(?:\s*,\s*\{[^}]*\})?|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g;
const NAMED_IMPORT_RE = /\{\s*([^}]+)\s*\}/;
const DYNAMIC_IMPORT_RE = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const REQUIRE_RE = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function* findViolations(source) {
  for (const match of source.matchAll(STATIC_IMPORT_RE)) {
    const specifier = match[1];
    if (!resolvesToEngineLayer(specifier)) continue;
    if (isAnnotated(source, match.index)) continue;
    const namedMatch = match[0].match(NAMED_IMPORT_RE);
    if (!namedMatch) continue;
    const bindings = namedMatch[1]
      .split(",")
      .map((entry) => entry.trim().split(/\s+as\s+/)[0].trim())
      .filter(Boolean);
    for (const binding of bindings) {
      if (FORBIDDEN_BINDING_PATTERN.test(binding)) {
        yield { specifier, binding };
      }
    }
  }
  for (const match of source.matchAll(DYNAMIC_IMPORT_RE)) {
    const specifier = match[1];
    if (!resolvesToEngineLayer(specifier)) continue;
    if (isAnnotated(source, match.index)) continue;
    yield { specifier, binding: "<dynamic-import>" };
  }
  for (const match of source.matchAll(REQUIRE_RE)) {
    const specifier = match[1];
    if (!resolvesToEngineLayer(specifier)) continue;
    if (isAnnotated(source, match.index)) continue;
    yield { specifier, binding: "<require>" };
  }
}

export async function collectStochasticPreviewViolations() {
  const violations = [];
  if (!(await pathExists(SRC_UI))) return violations;
  await walk(SRC_UI, async (file) => {
    const source = await fs.readFile(file, "utf8");
    for (const v of findViolations(source)) {
      violations.push(
        `${path.relative(repoRoot, file)}: imports "${v.binding}" from "${v.specifier}" — ` +
        `forbidden by docs/architecture/draft-preview-policy.md (annotate call site with // @deterministic-preview if intentional)`
      );
    }
  });
  return violations;
}

function isDirectRun() {
  return process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

async function main() {
  const violations = await collectStochasticPreviewViolations();
  if (violations.length === 0) {
    console.log("validate:no-stochastic-preview — clean");
    return;
  }
  for (const v of violations) console.error(v);
  process.exitCode = 1;
}

if (isDirectRun()) {
  await main();
}
