#!/usr/bin/env node
/**
 * Build the offline architecture wiki.
 *
 * Sources:
 *   1. docs/architecture/*.md
 *   2. docs/architecture/diagrams/*.md (general architecture diagrams)
 *   3. docs/architecture/wiki/screens/index.json
 *   4. docs/architecture/wiki/screens/<nn-screen>/mockup.html
 *   5. docs/architecture/wiki/screens/<nn-screen>/spec.md
 *   6. docs/architecture/wiki/screens/<nn-screen>/interactions.md
 *   7. docs/architecture/wiki/screens/<nn-screen>/data-contracts.md
 *   8. docs/architecture/wiki/screens/<nn-screen>/architecture.md
 *
 * The screen package is the UI implementation contract:
 *   Mockup = how it looks
 *   Spec = what components and state bindings exist
 *   Interactions = what every control does
 *   Data Contracts = which schemas, configs, localization, and assets apply
 *   Architecture Diagrams = how data, commands, and navigation flow
 */

import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, relative } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");
const ARCH_DIR = join(REPO_ROOT, "docs", "architecture");
const DIAGRAMS_DIR = join(ARCH_DIR, "diagrams");
const SCREEN_PACKAGES_DIR = join(ARCH_DIR, "wiki", "screens");
const TASKS_DIR = join(REPO_ROOT, "tasks");
const OUTPUT = join(ARCH_DIR, "architecture-wiki.html");

function prettifyModule(name) {
  return name.replace(/^\d+[a-z]?-/, "").split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function prettifyPhase(name) {
  if (name === "mvp") return "MVP";
  if (name === "phase-2") return "Phase 2";
  return name.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
}

const EXCLUDED_DOCS = new Set([
  "architecture-wiki.html",
  "MERMAID-ARCHITECTURE-DIAGRAMS.md",
  "ASSET-SYSTEM-QUICK-REFERENCE.md",
  "ARCHITECTURE-UML-DIAGRAMS.md",
]);

const DOC_ORDER = [
  "README.md",
  "overview.md",
  "master-plan.md",
  "state-flow.md",
  "command-schema.md",
  "determinism.md",
  "content-platform.md",
  "pack-contract.md",
  "schema-matrix.md",
  "effect-registry.md",
  "renderer-technology-choice.md",
  "ai-integration.md",
  "ai-generation-pipeline.md",
  "spells-and-mage-guild.md",
  "glossary.md",
];

function repoRelative(absPath) {
  return relative(REPO_ROOT, absPath).replaceAll("\\", "/");
}

function architectureRelative(repoPath) {
  return repoPath.startsWith("docs/architecture/")
    ? repoPath.slice("docs/architecture/".length)
    : repoPath;
}

// The wiki HTML lives at docs/architecture/architecture-wiki.html, so
// every relative URL inside a bundled markdown file is rewritten to
// be relative to docs/architecture/. The runtime client-side router
// in inlineMd then pattern-matches the rewritten URL to route to a
// doc, diagram, screen tab, or external file (e.g. tasks/).
function rewriteRelativeLinks(markdown, sourceRepoPath) {
  if (!markdown) return markdown;
  const sourceDirRepo = sourceRepoPath.includes("/")
    ? sourceRepoPath.slice(0, sourceRepoPath.lastIndexOf("/"))
    : "";
  return markdown.replace(/\]\(([^)]+)\)/g, (match, url) => {
    if (
      url.startsWith("http://")
      || url.startsWith("https://")
      || url.startsWith("mailto:")
      || url.startsWith("#")
    ) {
      return match;
    }
    if (url.startsWith("/")) return match;
    const [pathPart, hashPart] = url.split("#");
    const resolved = relative(
      "docs/architecture",
      resolve("/" + sourceDirRepo, pathPart).slice(1)
    ).replaceAll("\\", "/");
    return `](${resolved}${hashPart ? "#" + hashPart : ""})`;
  });
}

function heading(markdown, pattern, fallback) {
  return markdown.match(pattern)?.[1]?.trim() || fallback;
}

function lineValue(markdown, label, fallback = "") {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return markdown.match(new RegExp("^" + escaped + ":\\s*(.+)$", "m"))?.[1]?.trim() || fallback;
}

function numericPrefix(name) {
  return Number.parseInt(name.match(/^(\d+)/)?.[1] || "9999", 10);
}

async function readArchitectureDocs() {
  const entries = await readdir(ARCH_DIR);
  const docs = {};

  for (const name of entries) {
    if (!name.endsWith(".md")) continue;
    if (EXCLUDED_DOCS.has(name)) continue;

    const path = join(ARCH_DIR, name);
    const s = await stat(path);
    if (!s.isFile()) continue;

    docs[name] = rewriteRelativeLinks(await readFile(path, "utf8"), repoRelative(path));
  }

  return docs;
}

async function readDiagrams() {
  const indexPath = join(DIAGRAMS_DIR, "index.json");
  if (!existsSync(indexPath)) return { index: null, diagrams: {} };

  const index = JSON.parse(await readFile(indexPath, "utf8"));
  const diagrams = {};

  for (const cat of index.categories) {
    for (const id of cat.diagrams) {
      const path = join(DIAGRAMS_DIR, id + ".md");
      if (existsSync(path)) {
        diagrams[id] = rewriteRelativeLinks(await readFile(path, "utf8"), repoRelative(path));
      }
    }
  }

  return { index, diagrams };
}

async function readScreenPackages() {
  if (!existsSync(SCREEN_PACKAGES_DIR)) return [];

  const dirs = (await readdir(SCREEN_PACKAGES_DIR, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => numericPrefix(a) - numericPrefix(b) || a.localeCompare(b));

  const screens = [];

  for (const dirName of dirs) {
    const dir = join(SCREEN_PACKAGES_DIR, dirName);
    const mockupPath = join(dir, "mockup.html");
    const specPath = join(dir, "spec.md");
    const interactionsPath = join(dir, "interactions.md");
    const dataContractsPath = join(dir, "data-contracts.md");
    const architecturePath = join(dir, "architecture.md");

    for (const required of [mockupPath, specPath, interactionsPath, dataContractsPath, architecturePath]) {
      if (!existsSync(required)) {
        throw new Error(repoRelative(required) + " is missing from screen package " + dirName);
      }
    }

    const specMdRaw = await readFile(specPath, "utf8");
    const interactionsMdRaw = await readFile(interactionsPath, "utf8");
    const dataContractsMdRaw = await readFile(dataContractsPath, "utf8");
    const architectureMdRaw = await readFile(architecturePath, "utf8");
    const specMd = rewriteRelativeLinks(specMdRaw, repoRelative(specPath));
    const interactionsMd = rewriteRelativeLinks(interactionsMdRaw, repoRelative(interactionsPath));
    const dataContractsMd = rewriteRelativeLinks(dataContractsMdRaw, repoRelative(dataContractsPath));
    const architectureMd = rewriteRelativeLinks(architectureMdRaw, repoRelative(architecturePath));
    const order = numericPrefix(dirName);
    const title = heading(specMd, /^#\s+Screen\s+\d+:\s+(.+)$/m, dirName.slice(3).replaceAll("-", " "));
    const system = lineValue(architectureMd, "System", "unknown");

    screens.push({
      id: dirName,
      order,
      title,
      system,
      mockupHtml: await readFile(mockupPath, "utf8"),
      specMd,
      interactionsMd,
      dataContractsMd,
      architectureMd,
      mockupPath: repoRelative(mockupPath),
      specPath: repoRelative(specPath),
      interactionsPath: repoRelative(interactionsPath),
      dataContractsPath: repoRelative(dataContractsPath),
      architecturePath: repoRelative(architecturePath),
      mockupHref: architectureRelative(repoRelative(mockupPath)),
      specHref: architectureRelative(repoRelative(specPath)),
      interactionsHref: architectureRelative(repoRelative(interactionsPath)),
      dataContractsHref: architectureRelative(repoRelative(dataContractsPath)),
      architectureHref: architectureRelative(repoRelative(architecturePath)),
    });
  }

  return screens;
}

async function readScreenIndex(screens) {
  const screenIds = screens.map((screen) => screen.id);
  const screenIdSet = new Set(screenIds);
  const orderById = new Map(screens.map((screen) => [screen.id, screen.order]));
  const indexPath = join(SCREEN_PACKAGES_DIR, "index.json");

  if (!existsSync(indexPath)) {
    return {
      schemaVersion: 1,
      description: "Generated fallback grouping by screen package order.",
      categories: [
        {
          id: "all-screens",
          title: "All UI Screens",
          screens: screenIds,
        },
      ],
    };
  }

  const index = JSON.parse(await readFile(indexPath, "utf8"));
  if (!Array.isArray(index.categories)) {
    throw new Error(repoRelative(indexPath) + " must define a categories array");
  }

  const seen = new Set();
  for (const cat of index.categories) {
    if (!cat.id || !cat.title || !Array.isArray(cat.screens)) {
      throw new Error(repoRelative(indexPath) + " category entries require id, title, and screens");
    }
    for (const id of cat.screens) {
      if (!screenIdSet.has(id)) {
        throw new Error(repoRelative(indexPath) + " references missing screen package " + id);
      }
      if (seen.has(id)) {
        throw new Error(repoRelative(indexPath) + " references screen package more than once: " + id);
      }
      seen.add(id);
    }
  }

  const missing = screenIds.filter((id) => !seen.has(id));
  if (missing.length > 0) {
    throw new Error(repoRelative(indexPath) + " is missing screen packages: " + missing.join(", "));
  }

  return {
    ...index,
    categories: index.categories
      .map((cat) => ({
        ...cat,
        screens: [...cat.screens].sort((a, b) => orderById.get(a) - orderById.get(b) || a.localeCompare(b)),
      }))
      .sort((a, b) => {
        const aFirst = Math.min(...a.screens.map((id) => orderById.get(id)));
        const bFirst = Math.min(...b.screens.map((id) => orderById.get(id)));
        return aFirst - bFirst || a.title.localeCompare(b.title);
      }),
  };
}

async function readSourceFiles() {
  const refs = new Set();
  const linkRe = /\]\(([^)]+)\)/g;
  const sourceExtRe = /\.(ts|tsx|js|mjs)$/;

  async function harvest(absPath, sourceDirRepo) {
    let raw;
    try { raw = await readFile(absPath, "utf8"); } catch { return; }
    for (const match of raw.matchAll(linkRe)) {
      const rawUrl = match[1].split("#")[0];
      if (!sourceExtRe.test(rawUrl)) continue;
      if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) continue;
      if (rawUrl.startsWith("/")) continue;
      const resolved = relative(
        "docs/architecture",
        resolve("/" + sourceDirRepo, rawUrl).slice(1)
      ).replaceAll("\\", "/");
      refs.add(resolved);
    }
  }

  async function walkMd(absRoot, repoRoot) {
    const entries = await readdir(absRoot, { withFileTypes: true });
    for (const entry of entries) {
      const abs = join(absRoot, entry.name);
      const rel = repoRoot + "/" + entry.name;
      if (entry.isDirectory()) {
        await walkMd(abs, rel);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        const sourceDir = rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : "";
        await harvest(abs, sourceDir);
      }
    }
  }

  if (existsSync(ARCH_DIR)) await walkMd(ARCH_DIR, "docs/architecture");
  if (existsSync(TASKS_DIR)) await walkMd(TASKS_DIR, "tasks");

  const sourceFiles = {};
  for (const archRel of refs) {
    const repoRel = relative(REPO_ROOT, resolve(REPO_ROOT, "docs/architecture", archRel))
      .replaceAll("\\", "/");
    const absPath = join(REPO_ROOT, repoRel);
    if (existsSync(absPath)) {
      sourceFiles[archRel] = await readFile(absPath, "utf8");
    }
  }
  return sourceFiles;
}

async function readJsonFiles() {
  const jsonFiles = {};

  async function walk(absDir, archRel) {
    const entries = await readdir(absDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(absDir, entry.name);
      const entryArchRel = archRel ? archRel + "/" + entry.name : entry.name;
      if (entry.isDirectory()) {
        await walk(fullPath, entryArchRel);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        jsonFiles[entryArchRel] = await readFile(fullPath, "utf8");
      }
    }
  }

  // Architecture-relative paths matching what rewriteRelativeLinks produces.
  if (existsSync(ARCH_DIR)) {
    for (const name of await readdir(ARCH_DIR)) {
      if (name.endsWith(".json")) {
        jsonFiles[name] = await readFile(join(ARCH_DIR, name), "utf8");
      }
    }
  }

  const contentSchemaDir = join(REPO_ROOT, "content-schema");
  if (existsSync(contentSchemaDir)) {
    await walk(contentSchemaDir, "../../content-schema");
  }

  return jsonFiles;
}

async function readTasks() {
  if (!existsSync(TASKS_DIR)) return { tasks: {}, tasksIndex: { schemaVersion: 1, categories: [] } };

  const tasks = {};
  const categoriesMap = new Map();
  const ensureCategory = (categoryId, title) => {
    if (!categoriesMap.has(categoryId)) {
      categoriesMap.set(categoryId, { id: categoryId, title, tasks: [] });
    }
    return categoriesMap.get(categoryId);
  };

  const phases = (await readdir(TASKS_DIR, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));

  for (const phase of phases) {
    const phaseDir = join(TASKS_DIR, phase);
    const entries = (await readdir(phaseDir, { withFileTypes: true }))
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const entryPath = join(phaseDir, entry.name);

      if (entry.isFile() && entry.name.endsWith(".md")) {
        const moduleName = entry.name.slice(0, -3);
        const categoryId = phase + "/" + moduleName;
        const categoryTitle = prettifyPhase(phase) + " - " + prettifyModule(moduleName);
        const id = categoryId;
        const taskRepoPath = "tasks/" + phase + "/" + entry.name;
        tasks[id] = rewriteRelativeLinks(await readFile(entryPath, "utf8"), taskRepoPath);
        const cat = ensureCategory(categoryId, categoryTitle);
        if (!cat.tasks.includes(id)) cat.tasks.unshift(id);
      } else if (entry.isDirectory()) {
        const moduleName = entry.name;
        const categoryId = phase + "/" + moduleName;
        const categoryTitle = prettifyPhase(phase) + " - " + prettifyModule(moduleName);
        const cat = ensureCategory(categoryId, categoryTitle);

        const taskFiles = (await readdir(entryPath))
          .filter((name) => name.endsWith(".md"))
          .sort((a, b) => a.localeCompare(b));

        for (const taskFile of taskFiles) {
          const id = phase + "/" + moduleName + "/" + taskFile.slice(0, -3);
          const taskRepoPath = "tasks/" + phase + "/" + moduleName + "/" + taskFile;
          tasks[id] = rewriteRelativeLinks(await readFile(join(entryPath, taskFile), "utf8"), taskRepoPath);
          cat.tasks.push(id);
        }
      }
    }
  }

  return {
    tasks,
    tasksIndex: {
      schemaVersion: 1,
      categories: Array.from(categoriesMap.values()),
    },
  };
}

function orderedDocList(docs) {
  const all = Object.keys(docs);
  const ordered = [];
  for (const name of DOC_ORDER) {
    if (all.includes(name)) ordered.push(name);
  }
  for (const name of all.sort()) {
    if (!ordered.includes(name)) ordered.push(name);
  }
  return ordered;
}

function buildHtml({ docs, docOrder, diagramsIndex, diagrams, screens, screensIndex, tasks, tasksIndex, jsonFiles, sourceFiles }) {
  const payload = {
    docs,
    docOrder,
    diagramsIndex,
    diagrams,
    screens,
    screensIndex,
    tasks,
    tasksIndex,
    jsonFiles,
    sourceFiles,
  };
  const embedded = JSON.stringify(payload)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return HTML_TEMPLATE.replace("__PAYLOAD_PLACEHOLDER__", () => embedded);
}

const HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Heroes Reforged - Architecture Wiki</title>
  <script src="../../scripts/lib/mermaid.min.js"></script>
  <script>
    window.mermaidLib = window.mermaid;
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      flowchart: { curve: 'basis', htmlLabels: true, useMaxWidth: true },
      sequence: { useMaxWidth: true },
      stateDiagram: { useMaxWidth: true }
    });
  </script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-family: "Segoe UI", Tahoma, sans-serif;
    }
    body {
      background: #1a1a2e;
      color: #e8e8e8;
      display: flex;
      flex-direction: column;
    }
    .mode-bar {
      background: linear-gradient(135deg, #2c3e50 0%, #4a3f7a 100%);
      padding: 12px 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      flex-shrink: 0;
      z-index: 10;
    }
    .mode-bar h1 {
      font-size: 16px;
      letter-spacing: 2px;
      color: #ffd97a;
      margin-right: 8px;
    }
    .mode-tabs { display: flex; gap: 6px; }
    .mode-tab {
      background: rgba(255,255,255,0.08);
      border: 1px solid transparent;
      color: #ddd;
      padding: 8px 16px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 13px;
      letter-spacing: 1px;
      transition: all 0.2s;
    }
    .mode-tab:hover { background: rgba(255,255,255,0.18); color: #fff; }
    .mode-tab.active {
      background: rgba(255,217,122,0.25);
      border-color: #ffd97a;
      color: #ffd97a;
      font-weight: 600;
    }
    .mode-tab .count {
      display: inline-block;
      background: rgba(0,0,0,0.3);
      padding: 1px 7px;
      border-radius: 10px;
      font-size: 10px;
      margin-left: 6px;
      font-family: monospace;
    }
    .build-info {
      margin-left: auto;
      font-family: monospace;
      font-size: 10px;
      color: rgba(255,255,255,0.5);
    }
    .workspace {
      flex: 1;
      min-height: 0;
      display: flex;
    }
    .sidebar {
      width: 320px;
      height: 100%;
      min-height: 0;
      background: #fff;
      color: #333;
      overflow-y: auto;
      padding: 16px;
      flex-shrink: 0;
      box-shadow: 2px 0 10px rgba(0,0,0,0.2);
    }
    .sidebar h2 {
      font-size: 12px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #4a3f7a;
      margin-bottom: 12px;
      font-weight: 700;
    }
    .nav-section-title {
      font-size: 10px;
      color: #2c3e50;
      letter-spacing: 2px;
      text-transform: uppercase;
      font-weight: 700;
      border-bottom: 1px solid #4a3f7a;
      padding: 12px 4px 6px;
      margin-bottom: 4px;
    }
    .nav-btn {
      display: block;
      width: 100%;
      text-align: left;
      background: none;
      border: none;
      color: #444;
      padding: 7px 10px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
      line-height: 1.35;
      margin: 1px 0;
    }
    .nav-btn:hover { background: #f0eaff; color: #4a3f7a; }
    .nav-btn.active { background: #4a3f7a; color: #fff; font-weight: 600; }
    .nav-id {
      font-family: monospace;
      font-size: 11px;
      color: #888;
      margin-right: 8px;
    }
    .nav-btn.active .nav-id { color: #ffd97a; }
    .nav-system {
      display: block;
      margin-left: 31px;
      margin-top: 2px;
      color: #888;
      font-size: 10px;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .nav-btn.active .nav-system { color: rgba(255,255,255,0.72); }
    .main {
      flex: 1;
      min-width: 0;
      background: #fff;
      color: #2c3e50;
      display: flex;
      flex-direction: column;
    }
    .main-header {
      background: linear-gradient(135deg, #2c3e50, #4a3f7a);
      color: #fff;
      padding: 14px 22px;
      flex-shrink: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 18px;
    }
    .main-header h3 { font-size: 17px; }
    .main-header p {
      font-size: 12px;
      opacity: 0.85;
      margin-top: 2px;
      word-break: break-word;
    }
    .source-link {
      background: rgba(255,255,255,0.18);
      color: #fff;
      padding: 5px 12px;
      border-radius: 4px;
      text-decoration: none;
      font-size: 11px;
      font-family: monospace;
      white-space: nowrap;
    }
    .source-link:hover { background: rgba(255,255,255,0.3); }
    .sub-tabs {
      background: #f5f5f7;
      padding: 0 20px;
      display: flex;
      border-bottom: 1px solid #ddd;
      flex-shrink: 0;
    }
    .sub-tabs.hidden { display: none; }
    .sub-tab {
      background: none;
      border: none;
      padding: 10px 18px;
      cursor: pointer;
      font-size: 12px;
      color: #666;
      font-weight: 500;
      border-bottom: 3px solid transparent;
    }
    .sub-tab:hover { color: #4a3f7a; }
    .sub-tab.active {
      color: #4a3f7a;
      border-bottom-color: #4a3f7a;
      font-weight: 700;
    }
    .content {
      flex: 1;
      overflow: auto;
      background: #fafafa;
      min-height: 0;
      position: relative;
    }
    .content.has-mockup {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .md-rendered {
      max-width: 960px;
      margin: 0 auto;
      padding: 32px 40px;
      line-height: 1.7;
      color: #2c3e50;
    }
    .md-rendered h1 {
      font-size: 28px;
      color: #4a3f7a;
      margin: 0 0 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid #e8e0ff;
    }
    .md-rendered h2 {
      font-size: 21px;
      color: #2c3e50;
      margin: 28px 0 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e0e0e0;
    }
    .md-rendered h3 { font-size: 16px; color: #4a3f7a; margin: 20px 0 8px; }
    .md-rendered h4 { font-size: 14px; color: #2c3e50; margin: 16px 0 6px; }
    .md-rendered p { margin: 0 0 14px; font-size: 14.5px; }
    .md-rendered ul, .md-rendered ol { margin: 6px 0 14px 28px; }
    .md-rendered li { margin-bottom: 4px; font-size: 14.5px; line-height: 1.6; }
    .md-rendered code {
      background: #f0eaff;
      color: #4a3f7a;
      padding: 2px 7px;
      border-radius: 3px;
      font-family: "SF Mono", Monaco, monospace;
      font-size: 13px;
    }
    .md-rendered pre {
      background: #1e1e2e;
      color: #f0e8d8;
      padding: 14px 18px;
      border-radius: 5px;
      overflow-x: auto;
      margin: 12px 0;
      font-family: "SF Mono", Monaco, monospace;
      font-size: 12.5px;
      line-height: 1.55;
    }
    .md-rendered pre code { background: none; color: inherit; padding: 0; }
    .md-rendered table {
      border-collapse: collapse;
      margin: 12px 0;
      width: 100%;
      font-size: 13px;
    }
    .md-rendered th {
      background: #4a3f7a;
      color: #fff;
      text-align: left;
      padding: 8px 12px;
      font-weight: 600;
    }
    .md-rendered td {
      border-bottom: 1px solid #e0e0e0;
      padding: 8px 12px;
      vertical-align: top;
    }
    .md-rendered tr:nth-child(even) td { background: #f8f6ff; }
    .md-rendered blockquote {
      border-left: 4px solid #4a3f7a;
      background: #f5f0ff;
      padding: 10px 18px;
      margin: 12px 0;
      font-style: italic;
      color: #4a3f7a;
    }
    .md-rendered a { color: #4a3f7a; text-decoration: underline; }
    .md-rendered a:hover { color: #2c3e50; background: #f0eaff; }
    .md-rendered hr { border: none; border-top: 1px solid #ddd; margin: 24px 0; }
    .md-rendered strong { color: #2c3e50; }
    .screen-diagram {
      background: #fff;
      border: 1px solid #e0d8f0;
      border-radius: 6px;
      padding: 18px;
      margin: 0 0 22px;
      overflow-x: auto;
      box-shadow: 0 2px 10px rgba(0,0,0,0.06);
    }
    .screen-diagram svg { max-width: 100%; height: auto; display: block; margin: 0 auto; }
    .mermaid-host {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 30px;
      transform-origin: center center;
      transition: transform 0.2s ease-out;
      cursor: grab;
    }
    .mermaid-host.grabbing { cursor: grabbing; }
    .mermaid-box {
      background: white;
      padding: 24px;
      border-radius: 6px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .mermaid-host svg { display: block; }
    .diagram-layout { display: flex; flex-direction: column; }
    .diagram-pre, .diagram-post {
      max-width: 960px;
      margin: 0 auto;
      padding: 24px 40px;
      width: 100%;
    }
    .diagram-pre { padding-bottom: 8px; }
    .diagram-post { padding-top: 8px; }
    .diagram-viewport {
      position: relative;
      height: 60vh;
      min-height: 380px;
      background: #fff;
      border-top: 1px solid #e0d8f0;
      border-bottom: 1px solid #e0d8f0;
      overflow: hidden;
      margin: 8px 0;
    }
    .mockup-iframe {
      border: 1px solid #ccc;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      background: black;
      transform-origin: center center;
    }
    .controls {
      background: #f5f5f7;
      padding: 8px 20px;
      display: flex;
      gap: 8px;
      align-items: center;
      border-top: 1px solid #ddd;
      flex-shrink: 0;
    }
    .controls.hidden { display: none; }
    .controls button {
      background: #4a3f7a;
      color: #fff;
      border: none;
      padding: 6px 14px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
    }
    .controls button:hover { background: #2c3e50; }
    .controls .info {
      margin-left: auto;
      color: #666;
      font-size: 11px;
      font-family: monospace;
    }
    .empty {
      text-align: center;
      color: #888;
      padding: 60px 20px;
      font-style: italic;
    }
    .json-modal {
      position: fixed;
      inset: 0;
      background: rgba(20, 18, 40, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 28px;
    }
    .json-modal.hidden { display: none; }
    .json-modal-frame {
      background: #1e1e2e;
      color: #f0e8d8;
      width: 100%;
      max-width: 1100px;
      max-height: 100%;
      border-radius: 8px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .json-modal-head {
      background: linear-gradient(135deg, #2c3e50, #4a3f7a);
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .json-modal-head h4 {
      color: #ffd97a;
      font-family: monospace;
      font-size: 12px;
      word-break: break-all;
      flex: 1;
    }
    .json-modal-actions { display: flex; gap: 6px; }
    .json-modal-actions button {
      background: rgba(255,255,255,0.15);
      color: #fff;
      border: none;
      padding: 5px 11px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
    }
    .json-modal-actions button:hover { background: rgba(255,255,255,0.3); }
    .json-modal-body {
      flex: 1;
      overflow: auto;
      padding: 0;
      font-family: "SF Mono", Monaco, monospace;
      font-size: 12.5px;
      line-height: 1.55;
      display: flex;
      align-items: stretch;
    }
    .json-modal-body .gutter {
      padding: 14px 12px 14px 18px;
      background: #181822;
      color: #4d4d68;
      text-align: right;
      user-select: none;
      white-space: pre;
      border-right: 1px solid #2a2a3a;
      position: sticky;
      left: 0;
      flex-shrink: 0;
    }
    .json-modal-body .code {
      padding: 14px 20px 14px 16px;
      flex: 1;
      white-space: pre;
      min-width: 0;
    }
    .json-modal-body .jk { color: #9cdcfe; }
    .json-modal-body .js { color: #ce9178; }
    .json-modal-body .jn { color: #b5cea8; }
    .json-modal-body .jb { color: #569cd6; }
    .json-modal-body .jnull { color: #808080; }
    .json-modal-body .jerr { color: #f48771; }
    .json-modal-body .kw { color: #c586c0; }
    .json-modal-body .ty { color: #4ec9b0; }
    .json-modal-body .fn { color: #dcdcaa; }
    .json-modal-body .cm { color: #6a9955; font-style: italic; }
  </style>
</head>
<body>
  <div class="mode-bar">
    <h1>Architecture Wiki</h1>
    <div class="mode-tabs">
      <button class="mode-tab active" data-mode="docs">Docs <span class="count" id="count-docs">0</span></button>
      <button class="mode-tab" data-mode="diagrams">General Diagrams <span class="count" id="count-diagrams">0</span></button>
      <button class="mode-tab" data-mode="screens">UI Screens <span class="count" id="count-screens">0</span></button>
      <button class="mode-tab" data-mode="tasks">Tasks <span class="count" id="count-tasks">0</span></button>
    </div>
    <div class="build-info">heroes-reforged - architecture-wiki</div>
  </div>

  <div class="workspace">
    <aside class="sidebar">
      <h2 id="sidebar-title">Architecture</h2>
      <div id="nav"></div>
    </aside>

    <main class="main">
      <header class="main-header">
        <div>
          <h3 id="title">Heroes Reforged Architecture</h3>
          <p id="subtitle">Pick an item from the sidebar</p>
        </div>
        <a id="source-link" class="source-link" target="_blank" style="display:none">source</a>
      </header>

      <div class="sub-tabs hidden" id="sub-tabs">
        <button class="sub-tab active" data-screen-tab="mockup">Mockup</button>
        <button class="sub-tab" data-screen-tab="spec">Spec</button>
        <button class="sub-tab" data-screen-tab="interactions">Interactions</button>
        <button class="sub-tab" data-screen-tab="data-contracts">Data Contracts</button>
        <button class="sub-tab" data-screen-tab="architecture">Architecture Diagrams</button>
      </div>

      <div class="content" id="content">
        <div class="empty">Loading...</div>
      </div>

      <div class="controls hidden" id="controls">
        <button onclick="window.app.zoomFit()">Fit</button>
        <button onclick="window.app.zoom100()">1:1</button>
        <button onclick="window.app.zoomFill()">Fill</button>
        <span class="info" id="zoom-info">-</span>
      </div>
    </main>
  </div>

  <div class="json-modal hidden" id="json-modal">
    <div class="json-modal-frame">
      <div class="json-modal-head">
        <h4 id="json-modal-path">-</h4>
        <div class="json-modal-actions">
          <button id="json-modal-copy">Copy</button>
          <button id="json-modal-close">Close</button>
        </div>
      </div>
      <div class="json-modal-body" id="json-modal-body"></div>
    </div>
  </div>

  <script>
    const PAYLOAD = __PAYLOAD_PLACEHOLDER__;

    function escHtml(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function escAttr(s) {
      return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    }
    function parseFrontmatter(text) {
      const meta = {};
      let body = text;
      const m = text.match(/^---\\n([\\s\\S]*?)\\n---\\n([\\s\\S]*)$/);
      if (m) {
        m[1].split('\\n').forEach((line) => {
          const kv = line.match(/^(\\w+):\\s*"?([^"]*)"?$/);
          if (kv) meta[kv[1]] = kv[2];
        });
        body = m[2];
      }
      return { meta, body };
    }
    function inlineMd(text) {
      const codeSpans = [];
      text = String(text).replace(/\`([^\`]+)\`/g, (m, c) => {
        codeSpans.push(c);
        return '\\u0001CS' + (codeSpans.length - 1) + '\\u0002';
      });
      text = escHtml(text);
      text = text.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
      text = text.replace(/(^|[^*])\\*([^*]+)\\*/g, '$1<em>$2</em>');
      text = text.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, (m, label, url) => {
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')) {
          return '<a href="' + escAttr(url) + '" target="_blank">' + label + '</a>';
        }
        if (url.startsWith('#')) {
          return '<a href="' + escAttr(url) + '">' + label + '</a>';
        }
        const cleanUrl = url.split('#')[0];
        const screenMd = cleanUrl.match(/^wiki\\/screens\\/([^/]+)\\/(spec|interactions|data-contracts|architecture)\\.md$/);
        if (screenMd) {
          return '<a href="#" data-screen-link="' + escAttr(screenMd[1]) + '" data-screen-tab="' + escAttr(screenMd[2]) + '">' + label + '</a>';
        }
        const screenMockup = cleanUrl.match(/^wiki\\/screens\\/([^/]+)\\/mockup\\.html$/);
        if (screenMockup) {
          return '<a href="#" data-screen-link="' + escAttr(screenMockup[1]) + '" data-screen-tab="mockup">' + label + '</a>';
        }
        const screenFolder = cleanUrl.match(/^wiki\\/screens\\/([^/]+)\\/?$/);
        if (screenFolder) {
          return '<a href="#" data-screen-link="' + escAttr(screenFolder[1]) + '" data-screen-tab="mockup">' + label + '</a>';
        }
        const diagramMatch = cleanUrl.match(/^diagrams\\/([^/]+)\\.md$/);
        if (diagramMatch) {
          return '<a href="#" data-diagram-link="' + escAttr(diagramMatch[1]) + '">' + label + '</a>';
        }
        const taskMatch = cleanUrl.match(/^\\.\\.\\/\\.\\.\\/tasks\\/(.+)\\.md$/);
        if (taskMatch) {
          return '<a href="#" data-task-link="' + escAttr(taskMatch[1]) + '">' + label + '</a>';
        }
        if (/^[^/]+\\.md$/.test(cleanUrl)) {
          return '<a href="#" data-md-link="' + escAttr(cleanUrl) + '">' + label + '</a>';
        }
        if (/\\.json$/.test(cleanUrl) && PAYLOAD.jsonFiles && PAYLOAD.jsonFiles[cleanUrl]) {
          const jsonAnchor = url.split('#')[1] || '';
          return '<a href="#" data-json-link="' + escAttr(cleanUrl) + '" data-json-anchor="' + escAttr(jsonAnchor) + '">' + label + '</a>';
        }
        if (/\\.(ts|tsx|js|mjs)$/.test(cleanUrl) && PAYLOAD.sourceFiles && PAYLOAD.sourceFiles[cleanUrl]) {
          return '<a href="#" data-src-link="' + escAttr(cleanUrl) + '">' + label + '</a>';
        }
        return '<a href="' + escAttr(url) + '" target="_blank">' + label + '</a>';
      });
      text = text.replace(/\\u0001CS(\\d+)\\u0002/g, (m, i) => '<code>' + escHtml(codeSpans[+i]) + '</code>');
      return text;
    }
    function mdToHtml(md) {
      const lines = String(md).split('\\n');
      const out = [];
      let i = 0;
      const listStack = [];
      const closeListsTo = (indent) => {
        while (listStack.length && listStack[listStack.length - 1].indent >= indent) {
          out.push(listStack.pop().type === 'ul' ? '</ul>' : '</ol>');
        }
      };
      const closeAllLists = () => closeListsTo(-1);

      while (i < lines.length) {
        const line = lines[i];
        if (line.startsWith('\`\`\`')) {
          closeAllLists();
          const lang = line.slice(3).trim();
          const codeLines = [];
          i++;
          while (i < lines.length && !lines[i].startsWith('\`\`\`')) {
            codeLines.push(lines[i]);
            i++;
          }
          out.push('<pre><code class="lang-' + escAttr(lang) + '">' + escHtml(codeLines.join('\\n')) + '</code></pre>');
          i++;
          continue;
        }
        const hMatch = line.match(/^(#{1,6})\\s+(.*)$/);
        if (hMatch) {
          closeAllLists();
          const level = hMatch[1].length;
          out.push('<h' + level + '>' + inlineMd(hMatch[2]) + '</h' + level + '>');
          i++;
          continue;
        }
        if (/^---+$/.test(line.trim())) {
          closeAllLists();
          out.push('<hr>');
          i++;
          continue;
        }
        if (line.startsWith('|') && i + 1 < lines.length && /^\\|[-:\\s|]+\\|$/.test(lines[i + 1].trim())) {
          closeAllLists();
          const headers = line.split('|').slice(1, -1).map((c) => c.trim());
          out.push('<table><tr>' + headers.map((h) => '<th>' + inlineMd(h) + '</th>').join('') + '</tr>');
          i += 2;
          while (i < lines.length && lines[i].startsWith('|')) {
            const cells = lines[i].split('|').slice(1, -1).map((c) => c.trim());
            out.push('<tr>' + cells.map((c) => '<td>' + inlineMd(c) + '</td>').join('') + '</tr>');
            i++;
          }
          out.push('</table>');
          continue;
        }
        if (line.startsWith('> ')) {
          closeAllLists();
          const quoteLines = [];
          while (i < lines.length && lines[i].startsWith('> ')) {
            quoteLines.push(lines[i].slice(2));
            i++;
          }
          out.push('<blockquote>' + inlineMd(quoteLines.join(' ')) + '</blockquote>');
          continue;
        }
        const ulMatch = line.match(/^(\\s*)[-*+]\\s+(.*)$/);
        if (ulMatch) {
          const indent = ulMatch[1].length;
          const contentCol = line.length - ulMatch[2].length;
          closeListsTo(indent + 1);
          if (!listStack.length || listStack[listStack.length - 1].indent < indent) {
            out.push('<ul>');
            listStack.push({ type: 'ul', indent });
          }
          const buf = [ulMatch[2]];
          i++;
          while (i < lines.length) {
            const next = lines[i];
            if (next.trim() === '') break;
            if (next.match(/^(\\s*)([-*+]|\\d+\\.)\\s/)) break;
            if (next.match(/^(#{1,6}\\s|\`\`\`|>\\s|\\|)/)) break;
            const lead = next.match(/^(\\s*)/)[0].length;
            if (lead < contentCol) break;
            buf.push(next.slice(contentCol));
            i++;
          }
          out.push('<li>' + inlineMd(buf.join(' ')) + '</li>');
          continue;
        }
        const olMatch = line.match(/^(\\s*)\\d+\\.\\s+(.*)$/);
        if (olMatch) {
          const indent = olMatch[1].length;
          const contentCol = line.length - olMatch[2].length;
          closeListsTo(indent + 1);
          if (!listStack.length || listStack[listStack.length - 1].indent < indent) {
            out.push('<ol>');
            listStack.push({ type: 'ol', indent });
          }
          const buf = [olMatch[2]];
          i++;
          while (i < lines.length) {
            const next = lines[i];
            if (next.trim() === '') break;
            if (next.match(/^(\\s*)([-*+]|\\d+\\.)\\s/)) break;
            if (next.match(/^(#{1,6}\\s|\`\`\`|>\\s|\\|)/)) break;
            const lead = next.match(/^(\\s*)/)[0].length;
            if (lead < contentCol) break;
            buf.push(next.slice(contentCol));
            i++;
          }
          out.push('<li>' + inlineMd(buf.join(' ')) + '</li>');
          continue;
        }
        if (line.trim() === '') {
          closeAllLists();
          i++;
          continue;
        }
        closeAllLists();
        const paraLines = [line];
        i++;
        while (
          i < lines.length &&
          lines[i].trim() !== '' &&
          !lines[i].match(/^(#{1,6}\\s|\`\`\`|>\\s|\\|)/) &&
          !lines[i].match(/^(\\s*)([-*+]|\\d+\\.)\\s/)
        ) {
          paraLines.push(lines[i]);
          i++;
        }
        out.push('<p>' + inlineMd(paraLines.join(' ')) + '</p>');
      }
      closeAllLists();
      return out.join('\\n');
    }

    class App {
      constructor() {
        this.mode = 'docs';
        this.currentId = null;
        this.screenTab = 'mockup';
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.dragging = false;
        this.startX = 0;
        this.startY = 0;
        this.renderCount = 0;
      }
      init() {
        document.getElementById('count-docs').textContent = PAYLOAD.docOrder.length;
        let diagramCount = 0;
        if (PAYLOAD.diagramsIndex) {
          PAYLOAD.diagramsIndex.categories.forEach((c) => { diagramCount += c.diagrams.length; });
        }
        document.getElementById('count-diagrams').textContent = diagramCount;
        document.getElementById('count-screens').textContent = PAYLOAD.screens.length;
        document.getElementById('count-tasks').textContent = PAYLOAD.tasks ? Object.keys(PAYLOAD.tasks).length : 0;

        document.querySelectorAll('.mode-tab').forEach((btn) => {
          btn.onclick = () => this.switchMode(btn.dataset.mode);
        });
        document.querySelectorAll('.sub-tab').forEach((btn) => {
          btn.onclick = () => this.switchScreenTab(btn.dataset.screenTab);
        });
        this.attachPanZoom();
        window.addEventListener('resize', () => {
          if (this.mode !== 'docs') setTimeout(() => this.zoomFit(), 100);
        });
        this.attachJsonModal();
        this.switchMode('docs');
      }
      attachJsonModal() {
        const modal = document.getElementById('json-modal');
        const closeBtn = document.getElementById('json-modal-close');
        const copyBtn = document.getElementById('json-modal-copy');
        const close = () => modal.classList.add('hidden');
        closeBtn.onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) close(); });
        copyBtn.onclick = async () => {
          const text = this.currentJsonText || '';
          try { await navigator.clipboard.writeText(text); copyBtn.textContent = 'Copied'; setTimeout(() => copyBtn.textContent = 'Copy', 1200); } catch (_) {}
        };
      }
      openCodeModal(path, lang) {
        let raw;
        if (lang === 'json') raw = PAYLOAD.jsonFiles && PAYLOAD.jsonFiles[path];
        else raw = PAYLOAD.sourceFiles && PAYLOAD.sourceFiles[path];
        if (raw == null) return;

        const body = document.getElementById('json-modal-body');
        let formatted = raw;
        let highlighted;
        let errorPrefix = '';
        if (lang === 'json') {
          try {
            formatted = JSON.stringify(JSON.parse(raw), null, 2);
          } catch (e) {
            errorPrefix = '<span class="jerr">Failed to parse JSON: ' + escHtml(e.message) + '</span>\\n';
            formatted = raw;
          }
          highlighted = this.highlightJson(formatted);
        } else {
          highlighted = this.highlightTs(formatted);
        }

        this.currentJsonText = formatted;
        const lines = formatted.split('\\n');
        const gutter = lines.map((_, i) => i + 1).join('\\n');
        body.innerHTML =
          '<div class="gutter">' + gutter + '</div>' +
          '<div class="code">' + errorPrefix + highlighted + '</div>';
        document.getElementById('json-modal-path').textContent = path;
        document.getElementById('json-modal').classList.remove('hidden');
        body.scrollTop = 0;
        body.scrollLeft = 0;
      }
      openJsonModal(path) { this.openCodeModal(path, 'json'); }
      highlightJson(pretty) {
        const escaped = escHtml(pretty);
        return escaped.replace(/("(?:\\\\.|[^"\\\\])*")(\\s*:)?|\\b(true|false)\\b|\\bnull\\b|(-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)/g, (m, str, colon, bool, num) => {
          if (str) return '<span class="' + (colon ? 'jk' : 'js') + '">' + str + '</span>' + (colon || '');
          if (bool) return '<span class="jb">' + bool + '</span>';
          if (num) return '<span class="jn">' + num + '</span>';
          return '<span class="jnull">null</span>';
        });
      }
      highlightTs(src) {
        const tokens = [];
        const TOKEN_RE = /(\\/\\*[\\s\\S]*?\\*\\/)|(\\/\\/[^\\n]*)|('(?:\\\\.|[^'\\\\])*')|("(?:\\\\.|[^"\\\\])*")|(\`(?:\\\\.|[^\`\\\\])*\`)|\\b(import|export|from|default|const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|implements|interface|type|enum|namespace|public|private|protected|static|readonly|async|await|yield|throw|try|catch|finally|typeof|instanceof|in|of|void|null|undefined|true|false|this|super|as|satisfies|keyof|infer|never|unknown|any|string|number|boolean|symbol|bigint|object)\\b|(\\b[A-Z][A-Za-z0-9_]*\\b)|(\\b[a-zA-Z_$][\\w$]*)(?=\\s*\\()|(-?\\b\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b)/g;
        let lastIndex = 0;
        let out = '';
        for (const m of src.matchAll(TOKEN_RE)) {
          out += escHtml(src.slice(lastIndex, m.index));
          if (m[1] || m[2]) out += '<span class="cm">' + escHtml(m[0]) + '</span>';
          else if (m[3] || m[4] || m[5]) out += '<span class="js">' + escHtml(m[0]) + '</span>';
          else if (m[6]) {
            if (/^(true|false)$/.test(m[6])) out += '<span class="jb">' + m[6] + '</span>';
            else if (/^(null|undefined)$/.test(m[6])) out += '<span class="jnull">' + m[6] + '</span>';
            else if (/^(string|number|boolean|symbol|bigint|object|void|any|never|unknown)$/.test(m[6])) out += '<span class="ty">' + m[6] + '</span>';
            else out += '<span class="kw">' + m[6] + '</span>';
          } else if (m[7]) out += '<span class="ty">' + escHtml(m[7]) + '</span>';
          else if (m[8]) out += '<span class="fn">' + escHtml(m[8]) + '</span>';
          else if (m[9]) out += '<span class="jn">' + m[9] + '</span>';
          lastIndex = m.index + m[0].length;
        }
        out += escHtml(src.slice(lastIndex));
        return out;
      }
      switchMode(mode) {
        this.mode = mode;
        this.cleanupDescription();
        document.querySelectorAll('.mode-tab').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
        document.getElementById('sidebar-title').textContent =
          mode === 'docs' ? 'Architecture Docs' :
          mode === 'diagrams' ? 'General Architecture Diagrams' :
          mode === 'tasks' ? 'Tasks' :
          'UI Screen Packages';
        document.getElementById('controls').classList.toggle('hidden', mode === 'docs' || mode === 'tasks' || (mode === 'screens' && this.screenTab !== 'mockup'));
        document.getElementById('sub-tabs').classList.toggle('hidden', mode !== 'screens');
        this.buildSidebar();

        if (mode === 'docs') {
          this.showDoc(PAYLOAD.docOrder[0] || null);
        } else if (mode === 'diagrams') {
          const first = PAYLOAD.diagramsIndex?.categories[0]?.diagrams[0];
          if (first) this.showDiagram(first);
        } else if (mode === 'tasks') {
          const first = PAYLOAD.tasksIndex?.categories[0]?.tasks[0];
          if (first) this.showTask(first);
        } else {
          const first = PAYLOAD.screens[0]?.id;
          if (first) this.showScreen(first);
        }
      }
      switchScreenTab(tab) {
        this.screenTab = tab;
        document.querySelectorAll('.sub-tab').forEach((b) => b.classList.toggle('active', b.dataset.screenTab === tab));
        document.getElementById('controls').classList.toggle('hidden', this.mode !== 'screens' || tab !== 'mockup');
        if (this.mode === 'screens' && this.currentId) this.renderScreen();
      }
      buildSidebar() {
        const nav = document.getElementById('nav');
        nav.innerHTML = '';

        if (this.mode === 'docs') {
          PAYLOAD.docOrder.forEach((name, idx) => {
            const btn = document.createElement('button');
            btn.className = 'nav-btn';
            btn.dataset.docName = name;
            const titleMatch = PAYLOAD.docs[name]?.match(/^#\\s+(.+)$/m);
            const title = titleMatch ? titleMatch[1] : name;
            btn.innerHTML = '<span class="nav-id">' + String(idx + 1).padStart(2, '0') + '</span>' + title;
            btn.onclick = () => this.showDoc(name);
            nav.appendChild(btn);
          });
          return;
        }

        if (this.mode === 'diagrams') {
          if (!PAYLOAD.diagramsIndex) {
            nav.innerHTML = '<div class="empty">No diagrams found</div>';
            return;
          }
          PAYLOAD.diagramsIndex.categories.forEach((cat) => {
            const t = document.createElement('div');
            t.className = 'nav-section-title';
            t.textContent = cat.title;
            nav.appendChild(t);
            cat.diagrams.forEach((id) => {
              const raw = PAYLOAD.diagrams[id];
              const fm = raw ? parseFrontmatter(raw) : { meta: {} };
              const label = fm.meta.short || fm.meta.title || id;
              const btn = document.createElement('button');
              btn.className = 'nav-btn';
              btn.dataset.diagramId = id;
              btn.textContent = label;
              btn.onclick = () => this.showDiagram(id);
              nav.appendChild(btn);
            });
          });
          return;
        }

        if (this.mode === 'tasks') {
          if (!PAYLOAD.tasksIndex || PAYLOAD.tasksIndex.categories.length === 0) {
            nav.innerHTML = '<div class="empty">No tasks found</div>';
            return;
          }
          PAYLOAD.tasksIndex.categories.forEach((cat) => {
            const t = document.createElement('div');
            t.className = 'nav-section-title';
            t.textContent = cat.title;
            nav.appendChild(t);
            cat.tasks.forEach((id) => {
              const raw = PAYLOAD.tasks[id];
              const titleMatch = raw && raw.match(/^#\\s+(.+)$/m);
              const label = titleMatch ? titleMatch[1] : id.split('/').pop();
              const btn = document.createElement('button');
              btn.className = 'nav-btn';
              btn.dataset.taskId = id;
              btn.textContent = label;
              btn.onclick = () => this.showTask(id);
              nav.appendChild(btn);
            });
          });
          return;
        }

        const screenById = new Map(PAYLOAD.screens.map((screen) => [screen.id, screen]));
        const categories = PAYLOAD.screensIndex?.categories || [
          { id: 'all-screens', title: 'All UI Screens', screens: PAYLOAD.screens.map((screen) => screen.id) }
        ];

        categories.forEach((cat) => {
          const t = document.createElement('div');
          t.className = 'nav-section-title';
          t.textContent = cat.title;
          nav.appendChild(t);

          cat.screens.forEach((id) => {
            const screen = screenById.get(id);
            if (!screen) return;
            const btn = document.createElement('button');
            btn.className = 'nav-btn';
            btn.dataset.screenId = screen.id;
            btn.innerHTML =
              '<span class="nav-id">' + String(screen.order).padStart(2, '0') + '</span>' +
              escHtml(screen.title) +
              '<span class="nav-system">' + escHtml(screen.system) + '</span>';
            btn.onclick = () => this.showScreen(screen.id);
            nav.appendChild(btn);
          });
        });
      }
      markActive(attr, value) {
        document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
        const el = Array.from(document.querySelectorAll('.nav-btn')).find((btn) => btn.getAttribute(attr) === value);
        if (el) el.classList.add('active');
      }
      showDoc(name) {
        if (!name) return;
        this.currentId = name;
        this.cleanupDescription();
        this.markActive('data-doc-name', name);
        const raw = PAYLOAD.docs[name];
        if (!raw) {
          document.getElementById('content').innerHTML = '<div class="empty">Doc not found: ' + escHtml(name) + '</div>';
          return;
        }
        const titleMatch = raw.match(/^#\\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1] : name;
        document.getElementById('title').textContent = title;
        document.getElementById('subtitle').textContent = 'docs/architecture/' + name;
        const link = document.getElementById('source-link');
        link.href = name;
        link.style.display = 'inline-block';
        link.textContent = name;
        const content = document.getElementById('content');
        content.classList.remove('has-mockup');
        content.innerHTML = '<div class="md-rendered">' + mdToHtml(raw) + '</div>';
        this.attachInternalLinks(content);
      }
      attachInternalLinks(root) {
        root.querySelectorAll('a[data-md-link]').forEach((a) => {
          a.onclick = (e) => {
            e.preventDefault();
            const target = a.dataset.mdLink;
            if (PAYLOAD.docs[target]) {
              if (this.mode !== 'docs') this.switchMode('docs');
              this.showDoc(target);
            }
          };
        });
        root.querySelectorAll('a[data-diagram-link]').forEach((a) => {
          a.onclick = (e) => {
            e.preventDefault();
            const id = a.dataset.diagramLink;
            if (PAYLOAD.diagrams[id]) {
              if (this.mode !== 'diagrams') this.switchMode('diagrams');
              this.showDiagram(id);
            }
          };
        });
        root.querySelectorAll('a[data-screen-link]').forEach((a) => {
          a.onclick = (e) => {
            e.preventDefault();
            const id = a.dataset.screenLink;
            const tab = a.dataset.screenTab;
            if (!this.findScreen(id)) return;
            if (this.mode !== 'screens') this.switchMode('screens');
            this.screenTab = tab;
            document.querySelectorAll('.sub-tab').forEach((b) => b.classList.toggle('active', b.dataset.screenTab === tab));
            document.getElementById('controls').classList.toggle('hidden', tab !== 'mockup');
            this.showScreen(id);
          };
        });
        root.querySelectorAll('a[data-task-link]').forEach((a) => {
          a.onclick = (e) => {
            e.preventDefault();
            const id = a.dataset.taskLink;
            if (PAYLOAD.tasks && PAYLOAD.tasks[id]) {
              if (this.mode !== 'tasks') this.switchMode('tasks');
              this.showTask(id);
            }
          };
        });
        root.querySelectorAll('a[data-json-link]').forEach((a) => {
          a.onclick = (e) => {
            e.preventDefault();
            this.openJsonModal(a.dataset.jsonLink);
          };
        });
        root.querySelectorAll('a[data-src-link]').forEach((a) => {
          a.onclick = (e) => {
            e.preventDefault();
            this.openCodeModal(a.dataset.srcLink, 'ts');
          };
        });
      }
      showTask(id) {
        if (!id) return;
        this.currentId = id;
        this.cleanupDescription();
        this.markActive('data-task-id', id);
        const raw = PAYLOAD.tasks && PAYLOAD.tasks[id];
        if (!raw) {
          document.getElementById('content').innerHTML = '<div class="empty">Task not found: ' + escHtml(id) + '</div>';
          return;
        }
        const titleMatch = raw.match(/^#\\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1] : id;
        document.getElementById('title').textContent = title;
        document.getElementById('subtitle').textContent = 'tasks/' + id + '.md';
        const link = document.getElementById('source-link');
        link.href = '../../tasks/' + id + '.md';
        link.style.display = 'inline-block';
        link.textContent = id.split('/').pop() + '.md';
        const content = document.getElementById('content');
        content.classList.remove('has-mockup');
        content.innerHTML = '<div class="md-rendered">' + mdToHtml(raw) + '</div>';
        this.attachInternalLinks(content);
      }
      async showDiagram(id) {
        if (!id) return;
        this.currentId = id;
        this.cleanupDescription();
        this.markActive('data-diagram-id', id);
        const raw = PAYLOAD.diagrams[id];
        if (!raw) return;
        const fm = parseFrontmatter(raw);
        document.getElementById('title').textContent = fm.meta.title || id;
        document.getElementById('subtitle').textContent = 'docs/architecture/diagrams/' + id + '.md';
        const link = document.getElementById('source-link');
        link.href = 'diagrams/' + id + '.md';
        link.style.display = 'inline-block';
        link.textContent = id + '.md';

        const merMatch = fm.body.match(/\`\`\`mermaid\\n([\\s\\S]*?)\\n\`\`\`/);
        const mermaidCode = merMatch ? merMatch[1] : '';
        const preMd = merMatch ? fm.body.slice(0, merMatch.index).trim() : fm.body.trim();
        const postMd = merMatch ? fm.body.slice(merMatch.index + merMatch[0].length).trim() : '';

        const content = document.getElementById('content');
        content.classList.remove('has-mockup');
        content.innerHTML = '';
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;

        const layout = document.createElement('div');
        layout.className = 'diagram-layout';

        if (preMd) {
          const preDiv = document.createElement('div');
          preDiv.className = 'md-rendered diagram-pre';
          preDiv.innerHTML = mdToHtml(preMd);
          layout.appendChild(preDiv);
        }

        if (mermaidCode) {
          const viewport = document.createElement('div');
          viewport.className = 'diagram-viewport';
          viewport.innerHTML = '<div class="mermaid-host" id="mermaid-host"><div class="mermaid-box"><div id="mermaid-container">Rendering...</div></div></div>';
          layout.appendChild(viewport);
        }

        if (postMd) {
          const postDiv = document.createElement('div');
          postDiv.className = 'md-rendered diagram-post';
          postDiv.innerHTML = mdToHtml(postMd);
          layout.appendChild(postDiv);
        }

        content.appendChild(layout);
        this.attachInternalLinks(content);

        if (!mermaidCode || !window.mermaidLib) return;
        try {
          this.renderCount++;
          const result = await window.mermaidLib.render('mer-' + this.renderCount, mermaidCode);
          document.getElementById('mermaid-container').innerHTML = result.svg;
          requestAnimationFrame(() => requestAnimationFrame(() => this.zoomFit()));
        } catch (e) {
          document.getElementById('mermaid-container').innerHTML =
            '<div class="empty" style="color:#d32f2f">Render error: ' + escHtml(e.message) + '</div>';
        }
      }
      cleanupDescription() {
        // Legacy: older diagram view inserted .mermaid-description outside .content.
        document.querySelectorAll('.mermaid-description').forEach((d) => d.remove());
      }
      findScreen(id) {
        return PAYLOAD.screens.find((screen) => screen.id === id);
      }
      showScreen(id) {
        if (!id) return;
        this.currentId = id;
        this.cleanupDescription();
        this.markActive('data-screen-id', id);
        const screen = this.findScreen(id);
        if (!screen) return;
        document.getElementById('title').textContent = String(screen.order).padStart(2, '0') + '. ' + screen.title;
        document.getElementById('subtitle').textContent = screen.mockupPath + ' + ' + screen.specPath + ' + ' + screen.interactionsPath + ' + ' + screen.dataContractsPath + ' + ' + screen.architecturePath;
        this.renderScreen();
      }
      renderScreen() {
        const screen = this.findScreen(this.currentId);
        if (!screen) return;
        const content = document.getElementById('content');
        const link = document.getElementById('source-link');
        link.style.display = 'inline-block';

        if (this.screenTab === 'mockup') {
          link.href = screen.mockupHref;
          link.textContent = 'mockup.html';
          content.classList.add('has-mockup');
          this.scale = 1;
          this.panX = 0;
          this.panY = 0;
          content.innerHTML = '<iframe class="mockup-iframe" id="mockup-iframe" srcdoc="' + escAttr(screen.mockupHtml) + '" width="1280" height="720"></iframe>';
          setTimeout(() => this.zoomFit(), 60);
          return;
        }

        content.classList.remove('has-mockup');
        if (this.screenTab === 'spec') {
          link.href = screen.specHref;
          link.textContent = 'spec.md';
          content.innerHTML = '<div class="md-rendered">' + mdToHtml(screen.specMd) + '</div>';
          this.attachInternalLinks(content);
          return;
        }

        if (this.screenTab === 'interactions') {
          link.href = screen.interactionsHref;
          link.textContent = 'interactions.md';
          content.innerHTML = '<div class="md-rendered">' + mdToHtml(screen.interactionsMd) + '</div>';
          this.attachInternalLinks(content);
          return;
        }

        if (this.screenTab === 'data-contracts') {
          link.href = screen.dataContractsHref;
          link.textContent = 'data-contracts.md';
          content.innerHTML = '<div class="md-rendered">' + mdToHtml(screen.dataContractsMd) + '</div>';
          this.attachInternalLinks(content);
          return;
        }

        link.href = screen.architectureHref;
        link.textContent = 'architecture.md';
        this.renderScreenArchitecture(screen);
      }
      async renderMarkdownWithMermaid(markdown, emptyMessage) {
        const content = document.getElementById('content');
        const diagrams = [];
        const body = String(markdown).replace(/\`\`\`mermaid\\n([\\s\\S]*?)\\n\`\`\`/g, (match, code) => {
          const idx = diagrams.length;
          diagrams.push(code);
          return 'MERMAID_DIAGRAM_' + idx;
        });

        let html = mdToHtml(body);
        const ids = diagrams.map((_, idx) => 'screen-diagram-' + this.renderCount + '-' + idx);
        ids.forEach((id, idx) => {
          const diagramHtml = '<div class="screen-diagram" id="' + id + '">Rendering diagram...</div>';
          html = html.replace('<p>MERMAID_DIAGRAM_' + idx + '</p>', diagramHtml);
          html = html.replace('MERMAID_DIAGRAM_' + idx, diagramHtml);
        });
        content.innerHTML = '<div class="md-rendered">' + html + '</div>';
        this.attachInternalLinks(content);

        if (diagrams.length === 0 || !window.mermaidLib) {
          if (diagrams.length === 0) {
            content.innerHTML = '<div class="md-rendered">' + mdToHtml(markdown) + '<div class="empty">' + escHtml(emptyMessage) + '</div></div>';
            this.attachInternalLinks(content);
          }
          return;
        }

        for (let i = 0; i < diagrams.length; i++) {
          this.renderCount++;
          const target = document.getElementById(ids[i]);
          if (!target) continue;
          try {
            const result = await window.mermaidLib.render('screen-mer-' + this.renderCount, diagrams[i]);
            target.innerHTML = result.svg;
          } catch (e) {
            target.innerHTML = '<div class="empty" style="color:#d32f2f">Render error: ' + escHtml(e.message) + '</div>';
          }
        }
      }
      async renderScreenArchitecture(screen) {
        await this.renderMarkdownWithMermaid(screen.architectureMd, 'No screen diagrams');
      }
      attachPanZoom() {
        const content = document.getElementById('content');
        content.addEventListener('mousedown', (e) => {
          if (this.mode === 'docs') return;
          if (this.mode === 'tasks') return;
          if (this.mode === 'screens' && this.screenTab !== 'mockup') return;
          if (this.mode === 'diagrams' && !e.target.closest('.diagram-viewport')) return;
          const target = this.mode === 'diagrams'
            ? document.getElementById('mermaid-host')
            : document.getElementById('mockup-iframe');
          if (!target) return;
          this.dragging = true;
          this.startX = e.clientX - this.panX;
          this.startY = e.clientY - this.panY;
          if (target.classList) target.classList.add('grabbing');
          e.preventDefault();
        });
        window.addEventListener('mousemove', (e) => {
          if (!this.dragging) return;
          this.panX = e.clientX - this.startX;
          this.panY = e.clientY - this.startY;
          this.applyTransform();
        });
        window.addEventListener('mouseup', () => {
          this.dragging = false;
          document.querySelectorAll('.grabbing').forEach((el) => el.classList.remove('grabbing'));
        });
        content.addEventListener('wheel', (e) => {
          if (this.mode === 'docs') return;
          if (this.mode === 'tasks') return;
          if (this.mode === 'screens' && this.screenTab !== 'mockup') return;
          if (this.mode === 'diagrams' && !e.target.closest('.diagram-viewport')) return;
          e.preventDefault();
          const delta = e.deltaY < 0 ? 1.15 : 0.87;
          this.scale = Math.max(0.2, Math.min(5, this.scale * delta));
          this.applyTransform();
        }, { passive: false });
      }
      currentPanTarget() {
        if (this.mode === 'diagrams') return document.getElementById('mermaid-host');
        if (this.mode === 'screens' && this.screenTab === 'mockup') return document.getElementById('mockup-iframe');
        return null;
      }
      applyTransform() {
        const target = this.currentPanTarget();
        if (!target) return;
        target.style.transform = 'translate(' + this.panX + 'px, ' + this.panY + 'px) scale(' + this.scale + ')';
        document.getElementById('zoom-info').textContent = Math.round(this.scale * 100) + '%';
      }
      zoomViewport() {
        if (this.mode === 'diagrams') {
          const vp = document.querySelector('.diagram-viewport');
          if (vp) return vp;
        }
        return document.getElementById('content');
      }
      zoomFit() {
        const target = this.currentPanTarget();
        const viewport = this.zoomViewport();
        if (!target || !viewport) return;
        target.style.transform = '';
        let w;
        let h;
        if (this.mode === 'screens') {
          w = Number(target.getAttribute('width')) || 1280;
          h = Number(target.getAttribute('height')) || 720;
        } else {
          const r = target.querySelector('svg')?.getBoundingClientRect() || target.getBoundingClientRect();
          w = r.width;
          h = r.height;
        }
        if (!w || !h) return;
        const padding = 40;
        this.scale = Math.min((viewport.clientWidth - padding) / w, (viewport.clientHeight - padding) / h, 1.5);
        this.panX = 0;
        this.panY = 0;
        this.applyTransform();
      }
      zoom100() {
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.applyTransform();
      }
      zoomFill() {
        const target = this.currentPanTarget();
        const viewport = this.zoomViewport();
        if (!target || !viewport) return;
        target.style.transform = '';
        let w;
        let h;
        if (this.mode === 'screens') {
          w = Number(target.getAttribute('width')) || 1280;
          h = Number(target.getAttribute('height')) || 720;
        } else {
          const r = target.querySelector('svg')?.getBoundingClientRect() || target.getBoundingClientRect();
          w = r.width;
          h = r.height;
        }
        if (!w || !h) return;
        this.scale = Math.max(viewport.clientWidth / w, viewport.clientHeight / h);
        this.panX = 0;
        this.panY = 0;
        this.applyTransform();
      }
    }

    const app = new App();
    window.app = app;
    window.addEventListener('DOMContentLoaded', () => app.init());
  </script>
</body>
</html>
`;

async function main() {
  console.log("Building Heroes Reforged Architecture Wiki...");

  const docs = await readArchitectureDocs();
  const docOrder = orderedDocList(docs);
  console.log("  Loaded " + docOrder.length + " architecture docs");

  const { index: diagramsIndex, diagrams } = await readDiagrams();
  console.log("  Loaded " + Object.keys(diagrams).length + " general diagrams");

  const screens = await readScreenPackages();
  console.log("  Loaded " + screens.length + " UI screen packages");

  const screensIndex = await readScreenIndex(screens);
  console.log("  Loaded " + screensIndex.categories.length + " UI screen groups");

  const { tasks, tasksIndex } = await readTasks();
  console.log("  Loaded " + Object.keys(tasks).length + " task files in " + tasksIndex.categories.length + " modules");

  const jsonFiles = await readJsonFiles();
  console.log("  Loaded " + Object.keys(jsonFiles).length + " JSON files for in-wiki viewer");

  const sourceFiles = await readSourceFiles();
  console.log("  Loaded " + Object.keys(sourceFiles).length + " source files (TS/JS/MJS) for in-wiki viewer");

  const html = buildHtml({ docs, docOrder, diagramsIndex, diagrams, screens, screensIndex, tasks, tasksIndex, jsonFiles, sourceFiles });
  await writeFile(OUTPUT, html, "utf8");

  const stats = await stat(OUTPUT);
  const sizeKb = (stats.size / 1024).toFixed(1);
  console.log("Built: " + repoRelative(OUTPUT) + " (" + sizeKb + " KB)");
}

main().catch((err) => {
  console.error("Build failed:", err.message);
  process.exit(1);
});
