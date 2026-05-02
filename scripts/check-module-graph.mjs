// Module-graph fitness check.
//
// Enforces the boundary table in docs/architecture/module-graph.md by
// scanning src/**/*.{ts,tsx,mts,cts,js,mjs,cjs} for static imports,
// dynamic imports, and re-exports, resolving them to layer paths under
// src/, and flagging forbidden cross-layer edges plus cycles.
//
// No third-party dependencies. Runs in milliseconds. Empty src/ trees
// exit 0; rules apply only once real source files land.
//
// Update this file alongside docs/architecture/module-graph.md — they
// are the same contract in two formats.

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { repoRoot, repoRelative, walkFiles } from "./lib/repo-utils.mjs";

const SRC_ROOT = path.join(repoRoot, "src");
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs"]);
const RESOLVE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs"];

// Forbidden edges as (fromGlob, toGlob, reason). Globs are matched as
// path-prefix predicates against repo-relative paths.
const FORBIDDEN_EDGES = [
  {
    from: "src/engine/",
    to: "src/renderer/",
    reason: "engine is the pure deterministic core; renderer is presentation"
  },
  {
    from: "src/engine/",
    to: "src/ui/",
    reason: "UI emits commands; engine never sees UI internals"
  },
  {
    from: "src/engine/",
    to: "src/ai/",
    reason: "AI is a co-actor; engine being AI-aware would couple bot heuristics to gameplay RNG"
  },
  {
    from: "src/engine/",
    to: "src/net/",
    reason: "multiplayer wraps the engine, not the other way around"
  },
  {
    from: "src/engine/",
    to: "src/persistence/",
    reason: "saves/replays read engine state; engine never reaches into save IO"
  },
  {
    from: "src/engine/",
    to: "src/editor/",
    reason: "editor is content-authoring; it must not pollute the deterministic core"
  },
  {
    from: "src/renderer/",
    to: "src/engine/",
    reason: "renderer is read-only via state snapshots"
  }
];

// Allowed-edges table for src/rules/. Rules may only import from itself
// and from src/content-schema/.
const RULES_ALLOWED_PREFIXES = ["src/rules/", "src/content-schema/"];

const IMPORT_PATTERNS = [
  // import ... from "specifier"
  /\bimport\s+(?:[^'"`;]*?\s+from\s+)?["']([^"']+)["']/g,
  // export ... from "specifier"
  /\bexport\s+(?:\*|\{[^}]*\})\s+from\s+["']([^"']+)["']/g,
  // dynamic import("specifier")
  /\bimport\s*\(\s*["']([^"']+)["']/g,
  // require("specifier")
  /\brequire\s*\(\s*["']([^"']+)["']/g
];

function stripCommentsAndStrings(source) {
  // Remove // line comments and /* */ block comments. Strings are kept
  // because the import patterns themselves require quoted specifiers.
  let result = "";
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === "/" && next === "/") {
      const newline = source.indexOf("\n", i);
      i = newline === -1 ? source.length : newline;
      continue;
    }
    if (ch === "/" && next === "*") {
      const close = source.indexOf("*/", i + 2);
      i = close === -1 ? source.length : close + 2;
      continue;
    }
    result += ch;
    i += 1;
  }
  return result;
}

function relPathFromRepo(absolutePath) {
  return repoRelative(absolutePath);
}

async function fileExists(absolutePath) {
  try {
    const stat = await fs.stat(absolutePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function dirExists(absolutePath) {
  try {
    const stat = await fs.stat(absolutePath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function resolveSpecifier(fromFile, specifier) {
  // Only relative specifiers are resolved into the src/ graph.
  // External packages and bare specifiers are out of scope.
  if (!specifier.startsWith(".") && !specifier.startsWith("/")) {
    return null;
  }

  const fromDir = path.dirname(fromFile);
  const baseTarget = path.resolve(fromDir, specifier);

  // 1. Direct file with an explicit extension.
  if (await fileExists(baseTarget)) {
    return baseTarget;
  }

  // 2. NodeNext convention: source uses ".js" / ".mjs" / ".cjs" but the
  // actual file is the matching TypeScript counterpart.
  const jsToTs = { ".js": ".ts", ".jsx": ".tsx", ".mjs": ".mts", ".cjs": ".cts" };
  const ext = path.extname(baseTarget);
  if (jsToTs[ext]) {
    const tsCandidate = baseTarget.slice(0, -ext.length) + jsToTs[ext];
    if (await fileExists(tsCandidate)) {
      return tsCandidate;
    }
  }

  // 3. Try common source extensions appended.
  for (const candidateExt of RESOLVE_EXTENSIONS) {
    const candidate = baseTarget + candidateExt;
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  // 4. Directory + index.<ext>.
  if (await dirExists(baseTarget)) {
    for (const candidateExt of RESOLVE_EXTENSIONS) {
      const candidate = path.join(baseTarget, `index${candidateExt}`);
      if (await fileExists(candidate)) {
        return candidate;
      }
    }
  }

  // Unresolved. Could be an alias or a missing file; either way the
  // module-graph check ignores it (TypeScript / runtime will catch it).
  return null;
}

function detectForbiddenEdge(fromRel, toRel) {
  for (const rule of FORBIDDEN_EDGES) {
    if (fromRel.startsWith(rule.from) && toRel.startsWith(rule.to)) {
      return rule;
    }
  }
  if (fromRel.startsWith("src/rules/")) {
    const allowed = RULES_ALLOWED_PREFIXES.some((prefix) => toRel.startsWith(prefix));
    if (!allowed && toRel.startsWith("src/")) {
      return {
        from: "src/rules/",
        to: toRel,
        reason: "src/rules/ may only import from src/rules/ and src/content-schema/"
      };
    }
  }
  return null;
}

function findCycles(graph) {
  const cycles = [];
  const state = new Map();
  const stack = [];

  function visit(node) {
    state.set(node, "gray");
    stack.push(node);

    for (const neighbour of graph.get(node) || []) {
      const colour = state.get(neighbour);
      if (colour === "gray") {
        const start = stack.indexOf(neighbour);
        cycles.push(stack.slice(start).concat(neighbour));
      } else if (colour !== "black") {
        visit(neighbour);
      }
    }

    state.set(node, "black");
    stack.pop();
  }

  for (const node of graph.keys()) {
    if (!state.has(node)) visit(node);
  }
  return cycles;
}

export async function collectModuleGraphViolations() {
  if (!(await dirExists(SRC_ROOT))) {
    return [];
  }

  const sourceFiles = await walkFiles(SRC_ROOT, (absolutePath) =>
    SOURCE_EXTENSIONS.has(path.extname(absolutePath))
  );

  const violations = [];
  const graph = new Map();

  for (const filePath of sourceFiles) {
    const fromRel = relPathFromRepo(filePath);
    graph.set(fromRel, []);

    const raw = await fs.readFile(filePath, "utf8");
    const cleaned = stripCommentsAndStrings(raw);
    const specifiers = new Set();

    for (const pattern of IMPORT_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(cleaned)) !== null) {
        specifiers.add(match[1]);
      }
    }

    for (const specifier of specifiers) {
      const resolved = await resolveSpecifier(filePath, specifier);
      if (!resolved) continue;
      const toRel = relPathFromRepo(resolved);
      if (!toRel.startsWith("src/")) continue;
      graph.get(fromRel).push(toRel);

      const violation = detectForbiddenEdge(fromRel, toRel);
      if (violation) {
        violations.push(
          `${fromRel} -> ${toRel}: forbidden edge — ${violation.reason}`
        );
      }
    }
  }

  for (const cycle of findCycles(graph)) {
    violations.push(`cycle: ${cycle.join(" -> ")}`);
  }

  return violations;
}

function isDirectRun() {
  return (
    process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
  );
}

if (isDirectRun()) {
  const violations = await collectModuleGraphViolations();
  if (violations.length === 0) {
    console.log("Module-graph check passed.");
  } else {
    for (const violation of violations) {
      console.error(violation);
    }
    process.exitCode = 1;
  }
}
