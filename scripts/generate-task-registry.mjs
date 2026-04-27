import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  readUtf8,
  repoRelative,
  repoRoot,
  walkFiles
} from "./lib/repo-utils.mjs";
import {
  TASK_SECTION_NAMES,
  taskSectionHeaderRegex
} from "./lib/task-markdown-contract.mjs";

const tasksRoot = path.join(repoRoot, "tasks");
const registryPath = path.join(tasksRoot, "task-registry.json");

function isDirectRun() {
  return process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function parseFirstHeading(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "";
}

function parseModuleMetadata(markdown) {
  const milestone = markdown.match(/\*\*Milestone\*\*:\s*(.+?)(?:\s{2,}|\n)/);
  const totalEstimate = markdown.match(/\*\*Total Estimate\*\*:\s*(.+?)(?:\s{2,}|\n)/);
  const exitCriteria = markdown.match(/\*\*Exit Criteria\*\*:\s*(.+?)(?:\s{2,}|\n)/);
  const lintTags = markdown.match(/\*\*Lint Tags\*\*:\s*(.+?)(?:\s{2,}|\n)/);
  const taskLinks = [
    ...markdown.matchAll(/^- \[([^\]]+)\]\(([^)]+)\)/gm)
  ].map(([, label, link]) => ({
    label,
    link
  }));

  return {
    milestone: milestone?.[1]?.trim() ?? null,
    totalEstimate: totalEstimate?.[1]?.trim() ?? null,
    exitCriteria: exitCriteria?.[1]?.trim() ?? null,
    lintTags: lintTags?.[1]
      ?.split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .sort() ?? [],
    taskLinks
  };
}

const VALID_STATUSES = new Set(["planned", "in-progress", "done", "blocked"]);

function parseStatus(markdown) {
  const match = markdown.match(/^Status:\s*(planned|in-progress|done|blocked)\s*$/mi);
  if (!match) {
    return "planned";
  }
  const value = match[1].toLowerCase();
  return VALID_STATUSES.has(value) ? value : "planned";
}

function splitSections(markdown) {
  const matches = [...markdown.matchAll(taskSectionHeaderRegex())];
  const sections = {};

  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const next = matches[index + 1];
    const contentStart = current.index + current[0].length;
    const contentLimit = next ? next.index : markdown.length;
    const fallbackBoundary = markdown
      .slice(contentStart, contentLimit)
      .search(/^(?:---+\s*|#{1,6}\s+)/m);
    const contentEnd = fallbackBoundary >= 0
      ? contentStart + fallbackBoundary
      : contentLimit;
    const name = current[1];

    if (TASK_SECTION_NAMES.includes(name)) {
      sections[name] = markdown.slice(contentStart, contentEnd).trim();
    }
  }

  return sections;
}

function parseList(sectionText) {
  if (!sectionText) {
    return [];
  }

  const lines = sectionText.split("\n");
  const items = [];
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (/^\s*-\s+/.test(rawLine)) {
      if (current) {
        items.push(normalizeWhitespace(current));
      }
      current = rawLine.replace(/^\s*-\s+/, "");
      continue;
    }

    if (/^\s*\d+\.\s+/.test(rawLine)) {
      if (current) {
        items.push(normalizeWhitespace(current));
      }
      current = rawLine.replace(/^\s*\d+\.\s+/, "");
      continue;
    }

    if (current && line.length > 0) {
      current += ` ${line.trim()}`;
      continue;
    }

    if (!current && line.length > 0) {
      items.push(normalizeWhitespace(line));
    }
  }

  if (current) {
    items.push(normalizeWhitespace(current));
  }

  return items;
}

function splitDependencyParts(rawDependencies) {
  const parts = [];
  for (const entry of rawDependencies || []) {
    for (const part of entry.split(/\s*,\s*|\s+and\s+/i)) {
      const trimmed = part.trim();
      if (trimmed && !/^none$/i.test(trimmed)) {
        parts.push(trimmed);
      }
    }
  }
  return parts;
}

function looksLikePath(value) {
  return /(^|`)(\.?\.?\/|[A-Za-z0-9_-]+\/)/.test(value)
    || /\.(md|json|ts|tsx|js|mjs|yml|yaml)$/.test(value);
}

function extractPaths(items) {
  const matches = new Set();

  for (const item of items) {
    const inlineCodeMatches = [...item.matchAll(/`([^`]+)`/g)];

    for (const match of inlineCodeMatches) {
      const candidate = match[1];
      if (looksLikePath(candidate)) {
        matches.add(candidate);
      }
    }
  }

  return [...matches];
}

function hasNoOwnedPaths(items) {
  return items.some((item) => /\(none/i.test(item));
}

function extractOwnedPathOptOutReason(items) {
  const item = items.find((candidate) => /\(none/i.test(candidate));
  if (!item) return "";
  return normalizeWhitespace(
    item
      .replace(/^\(?none\s*[—:-]?\s*/i, "")
      .replace(/\)?$/, "")
  );
}

function extractScreenPackages(markdown) {
  return [
    ...new Set(
      [...markdown.matchAll(/docs\/architecture\/wiki\/screens\/([0-9]{2}-[A-Za-z0-9-]+)/g)]
        .map((match) => `docs/architecture/wiki/screens/${match[1]}`)
    )
  ].sort();
}

function extractSchemaPaths(markdown) {
  return [
    ...new Set(
      [...markdown.matchAll(/content-schema\/schemas\/[A-Za-z0-9-]+\.schema\.json/g)]
        .map((match) => match[0])
    )
  ].sort();
}

async function extractScreenSchemaPaths(screenPackages) {
  const schemaPaths = new Set();

  for (const screenPackage of screenPackages) {
    const dataContractsPath = path.join(repoRoot, screenPackage, "data-contracts.md");
    let markdown;
    try {
      markdown = await readUtf8(dataContractsPath);
    } catch {
      continue;
    }
    for (const schemaPath of extractSchemaPaths(markdown)) {
      schemaPaths.add(schemaPath);
    }
  }

  return [...schemaPaths].sort();
}

function taskIdFromRelativePath(relativePath) {
  return relativePath.replace(/^tasks\//, "").replace(/\.md$/, "").replace(/\//g, ".");
}

function findSiblingTask(task, allTasks, part) {
  const taskNum = part.match(/^task\s+(\d+)([a-z]?)$/i);
  if (!taskNum) return null;

  const num = parseInt(taskNum[1], 10);
  const suffix = taskNum[2].toLowerCase();
  const siblings = allTasks.filter((t) => t.moduleId === task.moduleId);
  return siblings.find((t) => {
    const tail = t.id.slice(task.moduleId.length + 1);
    const head = tail.match(/^(\d+)([a-z]?)-/);
    return head
      && parseInt(head[1], 10) === num
      && head[2].toLowerCase() === suffix;
  }) ?? null;
}

function hydrateTaskReferences(tasks, modules) {
  const knownTaskIds = new Set(tasks.map((task) => task.id));
  const knownModuleIds = new Set(modules.map((module) => module.id));

  for (const task of tasks) {
    const taskDependencies = new Set();
    const moduleDependencies = new Set();
    const resolvedDependencies = new Set();
    const unresolvedDependencies = [];

    for (const part of splitDependencyParts(task.dependencies)) {
      const sibling = findSiblingTask(task, tasks, part);
      if (sibling) {
        taskDependencies.add(sibling.id);
        resolvedDependencies.add(sibling.id);
        continue;
      }

      if (knownTaskIds.has(part)) {
        taskDependencies.add(part);
        resolvedDependencies.add(part);
        continue;
      }

      const moduleMatch = part.match(/^module:([a-z0-9.-]+)$/i);
      if (moduleMatch && knownModuleIds.has(moduleMatch[1])) {
        moduleDependencies.add(moduleMatch[1]);
        for (const dependency of tasks.filter((candidate) => candidate.moduleId === moduleMatch[1])) {
          resolvedDependencies.add(dependency.id);
        }
        continue;
      }

      unresolvedDependencies.push(part);
    }

    task.taskDependencies = [...taskDependencies].sort();
    task.moduleDependencies = [...moduleDependencies].sort();
    task.resolvedDependencies = [...resolvedDependencies].sort();
    task.unresolvedDependencies = unresolvedDependencies;
  }
}

function annotateDownstreamCounts(tasks) {
  const directDependents = new Map();
  for (const task of tasks) directDependents.set(task.id, new Set());
  for (const task of tasks) {
    for (const dep of task.resolvedDependencies || []) {
      const set = directDependents.get(dep);
      if (set) set.add(task.id);
    }
  }

  const transitiveCache = new Map();
  function transitiveDependents(taskId) {
    if (transitiveCache.has(taskId)) return transitiveCache.get(taskId);
    const collected = new Set();
    const queue = [...(directDependents.get(taskId) || [])];
    while (queue.length > 0) {
      const next = queue.shift();
      if (collected.has(next)) continue;
      collected.add(next);
      for (const childDependent of directDependents.get(next) || []) {
        queue.push(childDependent);
      }
    }
    transitiveCache.set(taskId, collected);
    return collected;
  }

  for (const task of tasks) {
    task.downstreamDirectCount = (directDependents.get(task.id) || new Set()).size;
    task.downstreamTransitiveCount = transitiveDependents(task.id).size;
  }
}

export async function buildTaskRegistry() {
  const markdownFiles = await walkFiles(
    tasksRoot,
    (filePath) => filePath.endsWith(".md") && path.basename(filePath) !== "README.md"
  );

  const modules = [];
  const tasks = [];

  for (const filePath of markdownFiles) {
    const markdown = await readUtf8(filePath);
    const relativePath = repoRelative(filePath);
    const pathFromTasksRoot = relativePath.replace(/^tasks\//, "");
    const depth = pathFromTasksRoot.split("/").length;
    const id = taskIdFromRelativePath(relativePath);
    const title = parseFirstHeading(markdown);

    if (depth === 2) {
      const metadata = parseModuleMetadata(markdown);
      modules.push({
        id,
        kind: "module",
        status: parseStatus(markdown),
        title,
        path: relativePath,
        milestone: metadata.milestone,
        totalEstimate: metadata.totalEstimate,
        exitCriteria: metadata.exitCriteria,
        lintTags: metadata.lintTags,
        taskLinks: metadata.taskLinks
      });
      continue;
    }

    const sections = splitSections(markdown);
    const ownedPathItems = parseList(sections["Owned Paths"]);
    const sharedOwnedPathItems = parseList(sections["Owned Paths (shared)"]);
    const primaryOwnedPaths = sections["Owned Paths"]
      ? extractPaths(ownedPathItems)
      : extractPaths(parseList(sections.Outputs));
    const sharedOwnedPaths = extractPaths(sharedOwnedPathItems);
    const parentModuleFile = path.join(
      tasksRoot,
      path.dirname(path.dirname(pathFromTasksRoot)),
      `${path.basename(path.dirname(pathFromTasksRoot))}.md`
    );
    const modulePath = repoRelative(parentModuleFile);

    const directSchemaPaths = extractSchemaPaths(markdown);
    const screenPackages = extractScreenPackages(markdown);
    const ownedPathsOptOut = Boolean(
      (sections["Owned Paths"] || sections["Owned Paths (shared)"])
        && hasNoOwnedPaths([...ownedPathItems, ...sharedOwnedPathItems])
    );

    tasks.push({
      id,
      kind: "task",
      status: parseStatus(markdown),
      title,
      path: relativePath,
      moduleId: taskIdFromRelativePath(modulePath),
      modulePath,
      description: sections.Description
        ? normalizeWhitespace(sections.Description)
        : "",
      inputs: parseList(sections.Inputs),
      outputs: parseList(sections.Outputs),
      readFirst: parseList(sections["Read First"]),
      ownedPaths: [...new Set([...primaryOwnedPaths, ...sharedOwnedPaths])],
      ownedPathsDeclared: Boolean(
        sections["Owned Paths"] || sections["Owned Paths (shared)"]
      ),
      ownedPathsOptOut,
      ownedPathsOptOutReason: ownedPathsOptOut
        ? extractOwnedPathOptOutReason([...ownedPathItems, ...sharedOwnedPathItems])
        : "",
      sharedOwnedPaths,
      dependencies: parseList(sections.Dependencies),
      acceptanceCriteria: parseList(sections["Acceptance Criteria"]),
      verifyCommands: parseList(sections.Verify),
      estimatedTime: sections["Estimated Time"]
        ? normalizeWhitespace(sections["Estimated Time"])
        : "",
      screenPackages,
      directSchemaPaths,
      screenSchemaPaths: [],
      schemaPaths: directSchemaPaths
    });
  }

  for (const task of tasks) {
    task.screenSchemaPaths = await extractScreenSchemaPaths(task.screenPackages || []);
    task.schemaPaths = [
      ...new Set([
        ...(task.directSchemaPaths || []),
        ...(task.screenSchemaPaths || [])
      ])
    ].sort();
  }

  hydrateTaskReferences(tasks, modules);
  annotateDownstreamCounts(tasks);

  return {
    schemaVersion: 1,
    generatedBy: "npm run generate:task-registry",
    modules,
    tasks
  };
}

export async function writeTaskRegistry() {
  const registry = await buildTaskRegistry();
  const serialized = `${JSON.stringify(registry, null, 2)}\n`;
  await fs.writeFile(registryPath, serialized, "utf8");
  return registry;
}

if (isDirectRun()) {
  const registry = await writeTaskRegistry();
  console.log(
    `Wrote ${registry.tasks.length} tasks and ${registry.modules.length} modules to ${repoRelative(registryPath)}`
  );
}
