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
const OUTPUT = join(ARCH_DIR, "architecture-wiki.html");

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

    docs[name] = await readFile(path, "utf8");
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
        diagrams[id] = await readFile(path, "utf8");
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

    const specMd = await readFile(specPath, "utf8");
    const interactionsMd = await readFile(interactionsPath, "utf8");
    const dataContractsMd = await readFile(dataContractsPath, "utf8");
    const architectureMd = await readFile(architecturePath, "utf8");
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

function buildHtml({ docs, docOrder, diagramsIndex, diagrams, screens, screensIndex }) {
  const payload = {
    docs,
    docOrder,
    diagramsIndex,
    diagrams,
    screens,
    screensIndex,
  };
  const embedded = JSON.stringify(payload)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return HTML_TEMPLATE.replace("__PAYLOAD_PLACEHOLDER__", embedded);
}

const HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Heroes Reforged - Architecture Wiki</title>
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.esm.min.mjs';
    window.mermaidLib = mermaid;
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
    .mermaid-description {
      background: #f8f5ff;
      padding: 14px 22px;
      border-bottom: 1px solid #e0d8f0;
      font-size: 13px;
      line-height: 1.5;
      color: #2c3e50;
      max-height: 90px;
      overflow-y: auto;
      flex-shrink: 0;
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
  </style>
</head>
<body>
  <div class="mode-bar">
    <h1>Architecture Wiki</h1>
    <div class="mode-tabs">
      <button class="mode-tab active" data-mode="docs">Docs <span class="count" id="count-docs">0</span></button>
      <button class="mode-tab" data-mode="diagrams">General Diagrams <span class="count" id="count-diagrams">0</span></button>
      <button class="mode-tab" data-mode="screens">UI Screens <span class="count" id="count-screens">0</span></button>
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
        if (url.endsWith('.md') && !url.startsWith('http')) {
          const target = url.split('/').pop();
          return '<a href="#" data-md-link="' + escAttr(target) + '">' + label + '</a>';
        }
        if (url.startsWith('diagrams/') && url.endsWith('.md')) {
          const id = url.replace('diagrams/', '').replace('.md', '');
          return '<a href="#" data-diagram-link="' + escAttr(id) + '">' + label + '</a>';
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
          closeListsTo(indent + 1);
          if (!listStack.length || listStack[listStack.length - 1].indent < indent) {
            out.push('<ul>');
            listStack.push({ type: 'ul', indent });
          }
          out.push('<li>' + inlineMd(ulMatch[2]) + '</li>');
          i++;
          continue;
        }
        const olMatch = line.match(/^(\\s*)\\d+\\.\\s+(.*)$/);
        if (olMatch) {
          const indent = olMatch[1].length;
          closeListsTo(indent + 1);
          if (!listStack.length || listStack[listStack.length - 1].indent < indent) {
            out.push('<ol>');
            listStack.push({ type: 'ol', indent });
          }
          out.push('<li>' + inlineMd(olMatch[2]) + '</li>');
          i++;
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
        this.switchMode('docs');
      }
      switchMode(mode) {
        this.mode = mode;
        this.cleanupDescription();
        document.querySelectorAll('.mode-tab').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
        document.getElementById('sidebar-title').textContent =
          mode === 'docs' ? 'Architecture Docs' :
          mode === 'diagrams' ? 'General Architecture Diagrams' :
          'UI Screen Packages';
        document.getElementById('controls').classList.toggle('hidden', mode === 'docs' || (mode === 'screens' && this.screenTab !== 'mockup'));
        document.getElementById('sub-tabs').classList.toggle('hidden', mode !== 'screens');
        this.buildSidebar();

        if (mode === 'docs') {
          this.showDoc(PAYLOAD.docOrder[0] || null);
        } else if (mode === 'diagrams') {
          const first = PAYLOAD.diagramsIndex?.categories[0]?.diagrams[0];
          if (first) this.showDiagram(first);
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

        const descMatch = fm.body.match(/^([\\s\\S]*?)\`\`\`mermaid/);
        const description = descMatch ? descMatch[1].trim() : '';
        const merMatch = fm.body.match(/\`\`\`mermaid\\n([\\s\\S]*?)\\n\`\`\`/);
        const mermaidCode = merMatch ? merMatch[1] : '';
        const content = document.getElementById('content');
        content.classList.add('has-mockup');
        content.innerHTML = '';

        if (description) {
          const desc = document.createElement('div');
          desc.className = 'mermaid-description';
          desc.innerHTML = inlineMd(description.replace(/\\n+/g, ' '));
          content.parentElement.insertBefore(desc, content);
        }
        if (!mermaidCode || !window.mermaidLib) {
          content.innerHTML = '<div class="empty">No mermaid block</div>';
          return;
        }
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        content.innerHTML = '<div class="mermaid-host" id="mermaid-host"><div class="mermaid-box"><div id="mermaid-container">Rendering...</div></div></div>';
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

        if (diagrams.length === 0 || !window.mermaidLib) {
          if (diagrams.length === 0) {
            content.innerHTML = '<div class="md-rendered">' + mdToHtml(markdown) + '<div class="empty">' + escHtml(emptyMessage) + '</div></div>';
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
          if (this.mode === 'screens' && this.screenTab !== 'mockup') return;
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
          if (this.mode === 'screens' && this.screenTab !== 'mockup') return;
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
      zoomFit() {
        const target = this.currentPanTarget();
        const content = document.getElementById('content');
        if (!target || !content) return;
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
        this.scale = Math.min((content.clientWidth - padding) / w, (content.clientHeight - padding) / h, 1.5);
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
        const content = document.getElementById('content');
        if (!target || !content) return;
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
        this.scale = Math.max(content.clientWidth / w, content.clientHeight / h);
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

  const html = buildHtml({ docs, docOrder, diagramsIndex, diagrams, screens, screensIndex });
  await writeFile(OUTPUT, html, "utf8");

  const stats = await stat(OUTPUT);
  const sizeKb = (stats.size / 1024).toFixed(1);
  console.log("Built: " + repoRelative(OUTPUT) + " (" + sizeKb + " KB)");
}

main().catch((err) => {
  console.error("Build failed:", err.message);
  process.exit(1);
});
