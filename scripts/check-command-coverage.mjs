import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { readUtf8, repoRelative, repoRoot } from "./lib/repo-utils.mjs";

const commandSchemaPath = path.join(repoRoot, "content-schema", "schemas", "command.schema.json");
const coveragePath = path.join(repoRoot, "docs", "architecture", "screen-command-coverage.json");
const screenRoot = path.join(repoRoot, "docs", "architecture", "wiki", "screens");
const registryPath = path.join(repoRoot, "tasks", "task-registry.json");

function isDirectRun() {
  return process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

export function collectKindConsts(node, out = new Set()) {
  if (Array.isArray(node)) {
    for (const item of node) collectKindConsts(item, out);
    return out;
  }
  if (!node || typeof node !== "object") return out;

  if (node.properties?.kind?.const) {
    out.add(node.properties.kind.const);
  }

  for (const value of Object.values(node)) {
    collectKindConsts(value, out);
  }
  return out;
}

function canOwnSchemaCommand(task) {
  if (task.path.includes("/07-ui-screen-backlog/")) return false;
  if (task.path.includes("/07-ui-shell/")) return false;
  if (task.path.includes("/06-visual-fidelity/")) return false;

  return (task.ownedPaths || []).some(
    (ownedPath) =>
      ownedPath.startsWith("src/engine/")
      || ownedPath.startsWith("src/rules/")
      || ownedPath.startsWith("src/persistence/")
      || ownedPath.startsWith("src/content-runtime/")
      || ownedPath.startsWith("src/ai/")
      || ownedPath.startsWith("src/net/")
  );
}

async function collectScreenTokens() {
  const entries = await fs.readdir(screenRoot, { withFileTypes: true });
  const tokens = new Map();

  for (const entry of entries) {
    if (!entry.isDirectory() || !/^[0-9]{2}-/.test(entry.name)) continue;
    const interactionsPath = path.join(screenRoot, entry.name, "interactions.md");
    let markdown;
    try {
      markdown = await readUtf8(interactionsPath);
    } catch {
      continue;
    }
    for (const match of markdown.matchAll(/\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b/g)) {
      if (!tokens.has(match[0])) tokens.set(match[0], new Set());
      tokens.get(match[0]).add(entry.name);
    }
  }

  return tokens;
}

function isLocalUiToken(token, coverage) {
  return (coverage.localUiPrefixes || []).some((prefix) => token.startsWith(prefix))
    || (coverage.localUiTokens || []).includes(token);
}

export async function collectCommandCoverageViolations() {
  const commandSchema = JSON.parse(await readUtf8(commandSchemaPath));
  const coverage = JSON.parse(await readUtf8(coveragePath));
  const schemaKinds = collectKindConsts(commandSchema);
  const screenTokens = await collectScreenTokens();
  const aliases = coverage.commandAliases || {};
  const outOfScope = coverage.outOfScope || {};
  const violations = [];

  for (const [token, target] of Object.entries(aliases)) {
    if (!screenTokens.has(token)) {
      violations.push(`${repoRelative(coveragePath)}: alias "${token}" is not referenced by any screen interactions.md`);
    }
    if (!schemaKinds.has(target)) {
      violations.push(`${repoRelative(coveragePath)}: alias "${token}" targets unknown command kind "${target}"`);
    }
  }

  for (const token of coverage.localUiTokens || []) {
    if (!screenTokens.has(token)) {
      violations.push(`${repoRelative(coveragePath)}: local UI token "${token}" is not referenced by any screen interactions.md`);
    }
  }

  for (const [token, reason] of Object.entries(outOfScope)) {
    if (!screenTokens.has(token)) {
      violations.push(`${repoRelative(coveragePath)}: out-of-scope token "${token}" is not referenced by any screen interactions.md`);
    }
    if (typeof reason !== "string" || reason.trim().length === 0) {
      violations.push(`${repoRelative(coveragePath)}: out-of-scope token "${token}" needs a reason or owning task id`);
    }
  }

  for (const [token, screens] of [...screenTokens].sort(([a], [b]) => a.localeCompare(b))) {
    if (schemaKinds.has(token)) continue;
    if (aliases[token]) continue;
    if (outOfScope[token]) continue;
    if (isLocalUiToken(token, coverage)) continue;
    violations.push(
      `${token}: referenced by ${[...screens].join(", ")} but missing from command.schema.json, commandAliases, localUiTokens, or outOfScope`
    );
  }

  return violations;
}

export async function collectCommandOwnershipViolations(registry = null) {
  const commandSchema = JSON.parse(await readUtf8(commandSchemaPath));
  const schemaKinds = [...collectKindConsts(commandSchema)].sort();
  const taskRegistry = registry ?? JSON.parse(await readUtf8(registryPath));
  const ownersByKind = new Map(schemaKinds.map((kind) => [kind, []]));

  for (const task of taskRegistry.tasks || []) {
    if (!canOwnSchemaCommand(task)) continue;

    const taskMarkdown = await readUtf8(path.join(repoRoot, task.path));
    for (const kind of schemaKinds) {
      if (taskMarkdown.includes(kind)) {
        ownersByKind.get(kind).push(task);
      }
    }
  }

  const violations = [];
  for (const [kind, owners] of ownersByKind) {
    if (owners.length === 0) {
      violations.push(
        `${repoRelative(commandSchemaPath)}: command kind "${kind}" has no non-UI owning task literal`
      );
    }
  }
  return violations;
}

if (isDirectRun()) {
  const violations = [
    ...(await collectCommandCoverageViolations()),
    ...(await collectCommandOwnershipViolations())
  ];
  if (violations.length > 0) {
    for (const violation of violations) console.error(violation);
    process.exitCode = 1;
  } else {
    console.log("Command coverage check passed.");
  }
}
