import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildTaskRegistry } from "./generate-task-registry.mjs";
import { collectTaskCommandLiteralViolations } from "./check-task-command-literals.mjs";
import { repoRoot, repoRelative } from "./lib/repo-utils.mjs";
import {
  collectTaskReadinessMetrics,
  ownsUiOrEditorPath
} from "./lib/task-readiness.mjs";

const reportPath = path.join(repoRoot, "docs", "planning", "task-system-report.md");
const readinessContractPath = path.join(repoRoot, "docs", "architecture", "task-readiness-contract.json");
const screenCommandCoveragePath = path.join(repoRoot, "docs", "architecture", "screen-command-coverage.json");
const taskCommandTokenCoveragePath = path.join(repoRoot, "docs", "architecture", "task-command-token-coverage.json");

function isDirectRun() {
  return process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

async function listDirectories(relativePath, predicate) {
  const absolute = path.join(repoRoot, relativePath);
  const entries = await fs.readdir(absolute, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && predicate(entry.name))
    .map((entry) => `${relativePath}/${entry.name}`)
    .sort();
}

async function listSchemaPaths() {
  const relativePath = "content-schema/schemas";
  const entries = await fs.readdir(path.join(repoRoot, relativePath), { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".schema.json"))
    .map((entry) => `${relativePath}/${entry.name}`)
    .sort();
}

function taskLinks(tasks) {
  if (tasks.length === 0) return "MISSING";
  return tasks.map((task) => `\`${task.id}\``).join("<br>");
}

function queueLinks(tasks) {
  if (tasks.length === 0) return "none";
  const visible = tasks.slice(0, 5).map((task) => `\`${task.id}\``);
  if (tasks.length > visible.length) {
    visible.push(`and ${tasks.length - visible.length} more`);
  }
  return visible.join("<br>");
}

function taskMatchesPhase(task, phase) {
  return !phase || task.id.startsWith(`${phase}.`);
}

// A dep is satisfied by either `done` or `revalidate` — both mean the
// artifact produced by the upstream task exists. See scripts/tasks.mjs
// for the canonical SATISFIES_DEPENDENCY set.
const COMPLETED_STATUSES = new Set(["done", "revalidate"]);

function readyTasks(registry, phase = null) {
  const completed = new Set(
    registry.tasks
      .filter((task) => COMPLETED_STATUSES.has(task.status))
      .map((task) => task.id)
  );
  return registry.tasks
    .filter((task) => taskMatchesPhase(task, phase))
    .filter((task) => task.status === "planned")
    .filter((task) =>
      (task.resolvedDependencies || []).every((dependency) => completed.has(dependency))
    );
}

function dependencyCycles(registry) {
  const taskIds = new Set(registry.tasks.map((task) => task.id));
  const graph = new Map(
    registry.tasks.map((task) => [
      task.id,
      (task.resolvedDependencies || []).filter((dependency) => taskIds.has(dependency))
    ])
  );
  const state = new Map();
  const stack = [];
  const cycles = new Map();

  function canonical(cycle) {
    const nodes = cycle.slice(0, -1);
    let minIndex = 0;
    for (let index = 1; index < nodes.length; index += 1) {
      if (nodes[index] < nodes[minIndex]) minIndex = index;
    }
    const rotated = [...nodes.slice(minIndex), ...nodes.slice(0, minIndex)];
    return [...rotated, rotated[0]].join(" -> ");
  }

  function visit(id) {
    state.set(id, "visiting");
    stack.push(id);
    for (const dependency of graph.get(id) || []) {
      if (state.get(dependency) === "visiting") {
        const start = stack.indexOf(dependency);
        if (start >= 0) {
          const cycle = [...stack.slice(start), dependency];
          cycles.set(canonical(cycle), cycle);
        }
      } else if (!state.has(dependency)) {
        visit(dependency);
      }
    }
    stack.pop();
    state.set(id, "done");
  }

  for (const id of taskIds) {
    if (!state.has(id)) visit(id);
  }

  return [...cycles.values()];
}

function section(title, body) {
  return `## ${title}\n\n${body.trim()}\n`;
}

export async function generateTaskSystemReport() {
  const registry = await buildTaskRegistry();
  const readinessContract = JSON.parse(await fs.readFile(readinessContractPath, "utf8"));
  const screenCmdCoverage = JSON.parse(await fs.readFile(screenCommandCoveragePath, "utf8"));
  const taskTokenCoverage = JSON.parse(await fs.readFile(taskCommandTokenCoveragePath, "utf8"));
  const screenPackages = await listDirectories(
    "docs/architecture/wiki/screens",
    (name) => /^[0-9]{2}-/.test(name)
  );
  const schemaPaths = await listSchemaPaths();

  const uiTasks = registry.tasks.filter(ownsUiOrEditorPath);
  const taskByScreen = new Map(screenPackages.map((screen) => [screen, []]));
  for (const task of uiTasks) {
    for (const screen of task.screenPackages || []) {
      if (!taskByScreen.has(screen)) taskByScreen.set(screen, []);
      taskByScreen.get(screen).push(task);
    }
  }

  const taskBySchema = new Map(schemaPaths.map((schema) => [schema, []]));
  for (const task of registry.tasks) {
    for (const schema of task.schemaPaths || []) {
      if (!taskBySchema.has(schema)) taskBySchema.set(schema, []);
      taskBySchema.get(schema).push(task);
    }
  }

  const uiTasksWithScreens = uiTasks.filter((task) => (task.screenPackages || []).length > 0);
  const uiTasksWithDerivedSchemas = uiTasks.filter((task) => (task.screenSchemaPaths || []).length > 0);
  const uiTasksWithSchemaTraceability = uiTasks.filter((task) => (task.schemaPaths || []).length > 0);
  const unresolvedDependencies = registry.tasks.flatMap((task) =>
    (task.unresolvedDependencies || []).map((dependency) => ({ task, dependency }))
  );
  const cycles = dependencyCycles(registry);
  const missingScreens = [...taskByScreen].filter(([, tasks]) => tasks.length === 0);
  const missingSchemas = [...taskBySchema].filter(([, tasks]) => tasks.length === 0);
  const taskCommandLiteralViolations = await collectTaskCommandLiteralViolations();
  const {
    unanchoredTasks,
    unsafeOwnedPathOptOuts,
    sharedOwnershipGaps,
    secondarySkillContractReady
  } = collectTaskReadinessMetrics(registry, taskCommandLiteralViolations, readinessContract);
  const screenCmdCount = screenCmdCoverage.commands
    ? Object.keys(screenCmdCoverage.commands).length
    : Object.keys(screenCmdCoverage.commandAliases ?? {}).length
      + Object.keys(screenCmdCoverage.outOfScope ?? {}).length
      + (screenCmdCoverage.localUiPrefixes ?? []).length
      + (screenCmdCoverage.localUiTokens ?? []).length;
  const eventTokens = Object.keys(taskTokenCoverage.eventOnlyTokens ?? {}).length;
  const docTokens = Object.keys(taskTokenCoverage.documentedNonCommandTokens ?? {}).length;
  const taskTokenCount = eventTokens + docTokens;
  const readyByScope = [
    ["all", readyTasks(registry)],
    ["mvp", readyTasks(registry, "mvp")],
    ["phase-2", readyTasks(registry, "phase-2")],
    ["phase-3", readyTasks(registry, "phase-3")]
  ];

  const screenRows = [...taskByScreen]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([screen, tasks]) =>
      `| \`${screen.replace("docs/architecture/wiki/screens/", "")}\` | ${taskLinks(tasks)} |`
    )
    .join("\n");

  const schemaPathSet = new Set(schemaPaths);
  const schemaRows = [...taskBySchema]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([schema, tasks]) => {
      const label = schema.replace("content-schema/schemas/", "");
      const suffix = schemaPathSet.has(schema) ? "" : " *(produced by this task — not yet on disk)*";
      return `| \`${label}\`${suffix} | ${taskLinks(tasks)} |`;
    })
    .join("\n");

  const goalRows = [
    ["Every task is executable by AI", unresolvedDependencies.length === 0 && cycles.length === 0 ? "Yes" : "No"],
    ["Tasks align with UI + schema + architecture", missingScreens.length === 0 && missingSchemas.length === 0 && unanchoredTasks.length === 0 ? "Yes" : "No"],
    ["Backlog covers baseline mechanics and screens", missingScreens.length === 0 ? "Yes" : "No"],
    ["Registry supports automated execution", registry.tasks.every((task) => Array.isArray(task.resolvedDependencies)) && readyByScope[0][1].length > 0 ? "Yes" : "No"],
    ["Semantic readiness gates are clean", taskCommandLiteralViolations.length === 0 && unsafeOwnedPathOptOuts.length === 0 && sharedOwnershipGaps.length === 0 && secondarySkillContractReady ? "Yes" : "No"],
    ["Generated report exists", "Yes"]
  ].map(([criterion, status]) => `| ${criterion} | ${status} |`).join("\n");

  const executionQueueRows = readyByScope
    .map(([scope, tasks]) => `| \`${scope}\` | ${tasks.length} | ${queueLinks(tasks)} |`)
    .join("\n");

  const markdown = [
    "# Task System Report",
    "",
    "Generated by `npm run generate:task-system-report` from `tasks/task-registry.json`, `docs/architecture/wiki/screens/`, and `content-schema/schemas/`.",
    "",
    section("Inventory", [
      `- Tasks: ${registry.tasks.length}`,
      `- Modules: ${registry.modules.length}`,
      `- Screen packages: ${screenPackages.length}`,
      `- JSON schemas: ${schemaPaths.length}`,
      `- UI/editor tasks with screen packages: ${uiTasksWithScreens.length}/${uiTasks.length}`,
      `- UI/editor tasks with derived schema paths: ${uiTasksWithDerivedSchemas.length}/${uiTasks.length}`,
      `- UI/editor tasks with any schema traceability: ${uiTasksWithSchemaTraceability.length}/${uiTasks.length}`,
      `- Dependency cycles: ${cycles.length}`,
      `- Unresolved dependency entries: ${unresolvedDependencies.length}`,
      `- Unowned screen packages: ${missingScreens.length}`,
      `- Unreferenced schemas: ${missingSchemas.length}`,
      `- Task command literal violations: ${taskCommandLiteralViolations.length}`,
      `- Unanchored tasks: ${unanchoredTasks.length}`,
      `- Unsafe owned-path opt-outs: ${unsafeOwnedPathOptOuts.length}`,
      `- Shared ownership criteria gaps: ${sharedOwnershipGaps.length}`,
      `- Secondary skill contract split: ${secondarySkillContractReady ? "complete" : "incomplete"}`,
      `- Screen-command coverage entries: ${screenCmdCount}`,
      `- Task command-token coverage entries: ${taskTokenCount}`
    ].join("\n")),
    section("Final Goal Status", `| Criterion | Status |\n|---|---|\n${goalRows}`),
    section("Semantic Readiness", [
      `- Task command literal violations: ${taskCommandLiteralViolations.length}`,
      `- Unanchored tasks: ${unanchoredTasks.length}`,
      `- Unsafe owned-path opt-outs: ${unsafeOwnedPathOptOuts.length}`,
      `- Shared ownership criteria gaps: ${sharedOwnershipGaps.length}`,
      `- UI/editor derived schema coverage: ${uiTasksWithDerivedSchemas.length}/${uiTasks.length}`,
      `- Secondary skill contract split: ${secondarySkillContractReady ? "complete" : "incomplete"}`
    ].join("\n")),
    section("Execution Queue", `| Scope | Ready Planned Tasks | First Ready IDs |\n|---|---:|---|\n${executionQueueRows}`),
    section("Screen Ownership", `| Screen Package | Owning Task(s) |\n|---|---|\n${screenRows}`),
    section("Schema Ownership", `| Schema | Referencing Task(s) |\n|---|---|\n${schemaRows}`),
    section("Dependency Health", cycles.length === 0 && unresolvedDependencies.length === 0
      ? "No dependency cycles or unresolved dependency entries detected."
      : [
          ...cycles.map((cycle) => `- Cycle: ${cycle.join(" -> ")}`),
          ...unresolvedDependencies.map(({ task, dependency }) => `- ${task.id}: ${dependency}`)
        ].join("\n")),
    ""
  ].join("\n");

  await fs.writeFile(reportPath, markdown, "utf8");
  return reportPath;
}

if (isDirectRun()) {
  const writtenPath = await generateTaskSystemReport();
  console.log(`Wrote ${repoRelative(writtenPath)}`);
}
