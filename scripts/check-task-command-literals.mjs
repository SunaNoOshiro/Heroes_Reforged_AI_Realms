import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { collectKindConsts } from "./check-command-coverage.mjs";
import { readUtf8, repoRelative, repoRoot, walkFiles } from "./lib/repo-utils.mjs";
import { taskSectionHeaderRegex } from "./lib/task-markdown-contract.mjs";

const commandSchemaPath = path.join(repoRoot, "content-schema", "schemas", "command.schema.json");
const coveragePath = path.join(repoRoot, "docs", "architecture", "screen-command-coverage.json");
const taskTokenCoveragePath = path.join(repoRoot, "docs", "architecture", "task-command-token-coverage.json");
const tasksRoot = path.join(repoRoot, "tasks");

const ALL_CAPS_TOKEN = /\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b/g;

const SECTION_HEADER = taskSectionHeaderRegex("");

function isDirectRun() {
  return process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

function isLocalUiToken(token, coverage) {
  return (coverage.localUiPrefixes || []).some((prefix) => token.startsWith(prefix))
    || (coverage.localUiTokens || []).includes(token);
}

function lineIsCommandSensitive(line, section, inFence) {
  if (/^\s*-\s+No\b.*\bcommand kind is introduced\b/i.test(line)) {
    return false;
  }
  if (section === "Outputs") return true;
  if (inFence && /"kind"\s*:/.test(line)) return true;
  return /\bcommands?\b/i.test(line)
    || /\bdispatch(?:es|ing)?\b/i.test(line)
    || /\bsends?\b/i.test(line)
    || /\breducers?\b/i.test(line)
    || /command\.schema\.json/i.test(line);
}

function taskDeclaresCommandSchemaExtension(markdown, token) {
  if (!markdown.includes("content-schema/schemas/command.schema.json")) {
    return false;
  }

  const tokenPattern = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const extensionPattern = new RegExp(
    [
      `command\\.schema\\.json[\\s\\S]{0,600}${tokenPattern}`,
      `${tokenPattern}[\\s\\S]{0,600}command\\.schema\\.json`,
      `New entries added to .*command\\.schema\\.json[\\s\\S]{0,600}${tokenPattern}`
    ].join("|"),
    "i"
  );
  return extensionPattern.test(markdown);
}

function classifyToken(token, markdown, classification) {
  if (classification.schemaKinds.has(token)) return "schema command";
  if (classification.aliases.has(token)) return "screen command alias";
  if (isLocalUiToken(token, classification.coverage)) return "local UI token";
  if (classification.outOfScope.has(token)) return "screen out-of-scope token";
  if (classification.eventOnlyTokens.has(token)) return "event-only token";
  if (classification.documentedNonCommandTokens.has(token)) return "documented non-command enum";
  if (taskDeclaresCommandSchemaExtension(markdown, token)) return "planned command-schema extension";
  return null;
}

async function loadClassification() {
  const commandSchema = JSON.parse(await readUtf8(commandSchemaPath));
  const coverage = JSON.parse(await readUtf8(coveragePath));
  const taskTokenCoverage = JSON.parse(await readUtf8(taskTokenCoveragePath));
  return {
    coverage,
    schemaKinds: collectKindConsts(commandSchema),
    aliases: new Set(Object.keys(coverage.commandAliases || {})),
    outOfScope: new Set(Object.keys(coverage.outOfScope || {})),
    eventOnlyTokens: new Set(Object.keys(taskTokenCoverage.eventOnlyTokens || {})),
    documentedNonCommandTokens: new Set(Object.keys(taskTokenCoverage.documentedNonCommandTokens || {}))
  };
}

function collectViolationsForFile(relativePath, markdown, classification) {
  const violations = [];
  let section = null;
  let inFence = false;
  const lines = markdown.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
    }

    const sectionMatch = line.match(SECTION_HEADER);
    if (sectionMatch) {
      section = sectionMatch[1];
      continue;
    }

    const tokens = [...line.matchAll(ALL_CAPS_TOKEN)].map((match) => match[0]);
    if (tokens.length === 0) continue;
    if (!lineIsCommandSensitive(line, section, inFence)) continue;

    for (const token of tokens) {
      if (classifyToken(token, markdown, classification)) continue;
      violations.push(
        `${relativePath}:${index + 1}: unknown command-like token "${token}" in ${section ?? "freeform"} context`
      );
    }
  }

  return violations;
}

export async function collectTaskCommandLiteralViolations() {
  const classification = await loadClassification();
  const taskFiles = await walkFiles(
    tasksRoot,
    (filePath) => filePath.endsWith(".md") && path.basename(filePath) !== "README.md"
  );
  const violations = [];

  for (const filePath of taskFiles) {
    const markdown = await fs.readFile(filePath, "utf8");
    violations.push(
      ...collectViolationsForFile(repoRelative(filePath), markdown, classification)
    );
  }

  return violations;
}

if (isDirectRun()) {
  const violations = await collectTaskCommandLiteralViolations();
  if (violations.length > 0) {
    for (const violation of violations) console.error(violation);
    process.exitCode = 1;
  } else {
    console.log("Task command literal check passed.");
  }
}
