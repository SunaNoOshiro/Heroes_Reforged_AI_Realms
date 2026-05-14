import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { readUtf8, repoRelative, repoRoot } from "./lib/repo-utils.mjs";

const screenRoot = path.join(repoRoot, "docs", "architecture", "wiki", "screens");
const registryExamplePath = path.join(
  repoRoot,
  "content-schema",
  "examples",
  "ui-component-registry.example.json"
);
const registrySchemaPath = path.join(
  repoRoot,
  "content-schema",
  "schemas",
  "ui-component-registry.schema.json"
);

const dataComponentPattern = /data-component="([^"]+)"/g;
const dataI18nPattern = /data-i18n="([^"]+)"/g;
const componentTreeHeaderPattern = /^#{2,}\s+(?:\d+\.\s+)?Component Tree\s*$/;
const sectionHeaderPattern = /^#{1,}\s+/;

const i18nKeyPattern = /^ui\.[a-z0-9-]+(?:\.[a-z0-9_-]+)+$/;

function isDirectRun() {
  return process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

async function listScreenDirs() {
  const entries = await fs.readdir(screenRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && /^[0-9]{2}-/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

function extractMatches(source, pattern) {
  const out = [];
  let match;
  pattern.lastIndex = 0;
  while ((match = pattern.exec(source)) !== null) {
    out.push(match[1]);
  }
  return out;
}

function extractComponentTree(specMarkdown) {
  const lines = specMarkdown.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => componentTreeHeaderPattern.test(line.trim()));
  if (startIndex === -1) return [];

  const ids = [];
  let inFence = false;
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!inFence && sectionHeaderPattern.test(line.trim())) break;
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }

    // Bullet form: "- `Id` — optional prose" or "- Id ..."
    const bulletMatch = line.match(/^\s*-\s+(.+?)\s*$/);
    if (bulletMatch) {
      const bullet = bulletMatch[1];
      const backtickMatch = bullet.match(/^`([^`]+)`/);
      if (backtickMatch) {
        ids.push(backtickMatch[1]);
        continue;
      }
      const bareMatch = bullet.match(/^([A-Za-z][A-Za-z0-9_]*)/);
      if (bareMatch) {
        ids.push(bareMatch[1]);
      }
      continue;
    }

    // ASCII tree form inside a fenced block: lines may start with
    // tree-drawing chars (├ └ ─ │) or no prefix at all (root row).
    // Trailing parenthesized notes are stripped.
    if (inFence) {
      const cleaned = line.replace(/^[\s├└─│]+/u, "").trim();
      const treeMatch = cleaned.match(/^`?([A-Z][A-Za-z0-9_]*)`?/);
      if (treeMatch) {
        ids.push(treeMatch[1]);
      }
    }
  }
  return ids;
}

export async function collectScreenComponentReferences() {
  const dirs = await listScreenDirs();
  const mockupRefs = new Map(); // componentId -> Set(screenDir)
  const specRefs = new Map();
  const i18nRefs = new Map(); // i18nKey -> Set(screenDir)

  for (const dir of dirs) {
    const mockupPath = path.join(screenRoot, dir, "mockup.html");
    const specPath = path.join(screenRoot, dir, "spec.md");

    try {
      const mockup = await readUtf8(mockupPath);
      for (const id of extractMatches(mockup, dataComponentPattern)) {
        if (!mockupRefs.has(id)) mockupRefs.set(id, new Set());
        mockupRefs.get(id).add(dir);
      }
      for (const key of extractMatches(mockup, dataI18nPattern)) {
        if (!i18nRefs.has(key)) i18nRefs.set(key, new Set());
        i18nRefs.get(key).add(dir);
      }
    } catch {
      // mockup.html may legitimately be missing on a stub; ignore.
    }

    try {
      const spec = await readUtf8(specPath);
      for (const id of extractComponentTree(spec)) {
        if (!specRefs.has(id)) specRefs.set(id, new Set());
        specRefs.get(id).add(dir);
      }
    } catch {
      // spec.md missing -> covered by other validators.
    }
  }

  return { mockupRefs, specRefs, i18nRefs };
}

export async function collectScreenComponentViolations() {
  const violations = [];

  let registry;
  try {
    registry = JSON.parse(await readUtf8(registryExamplePath));
  } catch (err) {
    return [
      `${repoRelative(registryExamplePath)}: cannot read registry example (${err.message})`
    ];
  }

  if (!Array.isArray(registry.components)) {
    return [
      `${repoRelative(registryExamplePath)}: components[] missing or not an array`
    ];
  }

  const registryById = new Map();
  for (const entry of registry.components) {
    if (!entry || typeof entry !== "object") continue;
    const id = entry.componentId;
    if (typeof id !== "string" || id.length === 0) {
      violations.push(
        `${repoRelative(registryExamplePath)}: registry entry missing componentId`
      );
      continue;
    }
    if (registryById.has(id)) {
      const prior = registryById.get(id);
      if (
        prior.module !== entry.module
        || prior.exportName !== entry.exportName
      ) {
        violations.push(
          `${repoRelative(registryExamplePath)}: duplicate componentId "${id}" with conflicting module/exportName`
        );
      } else {
        violations.push(
          `${repoRelative(registryExamplePath)}: duplicate componentId "${id}"`
        );
      }
      continue;
    }
    registryById.set(id, entry);
  }

  const { mockupRefs, specRefs, i18nRefs } = await collectScreenComponentReferences();

  for (const [id, screens] of [...mockupRefs].sort()) {
    if (!registryById.has(id)) {
      violations.push(
        `mockup data-component "${id}" referenced by ${[...screens].sort().join(", ")} but missing from ${repoRelative(registryExamplePath)}`
      );
    }
  }

  for (const [id, screens] of [...specRefs].sort()) {
    if (!registryById.has(id)) {
      violations.push(
        `spec Component Tree "${id}" referenced by ${[...screens].sort().join(", ")} but missing from ${repoRelative(registryExamplePath)}`
      );
    }
  }

  const usedIds = new Set([...mockupRefs.keys(), ...specRefs.keys()]);
  for (const id of [...registryById.keys()].sort()) {
    if (!usedIds.has(id)) {
      violations.push(
        `${repoRelative(registryExamplePath)}: registered componentId "${id}" is not referenced by any mockup or spec`
      );
    }
  }

  // data-i18n key validation: must match ui.<screen-or-namespace>.<key...>
  for (const [key, screens] of [...i18nRefs].sort()) {
    if (!i18nKeyPattern.test(key)) {
      violations.push(
        `data-i18n "${key}" referenced by ${[...screens].sort().join(", ")} does not match key pattern (expected ui.<screen>.<key>...)`
      );
    }
  }

  return violations;
}

async function ensureSchemaParses() {
  const violations = [];
  try {
    const schema = JSON.parse(await readUtf8(registrySchemaPath));
    if (!schema || typeof schema !== "object") {
      violations.push(
        `${repoRelative(registrySchemaPath)}: schema is not a JSON object`
      );
    }
  } catch (err) {
    violations.push(
      `${repoRelative(registrySchemaPath)}: cannot parse schema (${err.message})`
    );
  }
  return violations;
}

if (isDirectRun()) {
  const violations = [
    ...(await ensureSchemaParses()),
    ...(await collectScreenComponentViolations())
  ];
  if (violations.length > 0) {
    for (const violation of violations) console.error(violation);
    process.exitCode = 1;
  } else {
    console.log("Screen component coverage check passed.");
  }
}
