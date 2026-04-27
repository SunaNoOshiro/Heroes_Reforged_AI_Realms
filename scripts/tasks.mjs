import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { repoRoot, repoRelative, readUtf8 } from "./lib/repo-utils.mjs";
import { writeTaskRegistry } from "./generate-task-registry.mjs";
import { collectCommandOwnershipViolations } from "./check-command-coverage.mjs";
import { collectTaskCommandLiteralViolations } from "./check-task-command-literals.mjs";
import {
  hasUnsafeOwnedPathOptOut,
  ownsUiOrEditorPath,
  sharedOwnershipCriteriaMissing
} from "./lib/task-readiness.mjs";

const registryPath = path.join(repoRoot, "tasks", "task-registry.json");
const VALID_STATUSES = ["planned", "in-progress", "done", "blocked"];

async function loadRegistry() {
  const raw = await readUtf8(registryPath);
  return JSON.parse(raw);
}

function resolveDeps(task, allTasks) {
  if (Array.isArray(task.resolvedDependencies)) {
    return task.resolvedDependencies;
  }

  const raw = task.dependencies || [];
  const resolved = [];
  const tasks = Array.isArray(allTasks.tasks) ? allTasks.tasks : allTasks;
  const modules = Array.isArray(allTasks.modules) ? allTasks.modules : [];
  const moduleIds = new Set(modules.map((m) => m.id));
  const siblings = tasks.filter((t) => t.moduleId === task.moduleId);

  for (const entry of raw) {
    const parts = entry.split(/\s*,\s*|\s+and\s+/i);
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed || /^none$/i.test(trimmed)) continue;

      const taskNum = trimmed.match(/^task\s+(\d+)([a-z]?)$/i);
      if (taskNum) {
        const num = parseInt(taskNum[1], 10);
        const suffix = taskNum[2].toLowerCase();
        const match = siblings.find((t) => {
          const tail = t.id.slice(task.moduleId.length + 1);
          const head = tail.match(/^(\d+)([a-z]?)-/);
          return head && parseInt(head[1], 10) === num && head[2].toLowerCase() === suffix;
        });
        if (match) resolved.push(match.id);
        continue;
      }

      if (tasks.some((t) => t.id === trimmed)) {
        resolved.push(trimmed);
        continue;
      }

      const moduleMatch = trimmed.match(/^module:([a-z0-9.-]+)$/i);
      if (moduleMatch && moduleIds.has(moduleMatch[1])) {
        for (const dep of tasks.filter((t) => t.moduleId === moduleMatch[1])) {
          resolved.push(dep.id);
        }
      }
    }
  }
  return [...new Set(resolved)].sort();
}

function normalizePhase(value) {
  if (!value) {
    throw new Error("--phase must be mvp, phase-2, or phase-3.");
  }

  const normalized = value.toLowerCase();
  const aliases = new Map([
    ["1", "mvp"],
    ["m0", "mvp"],
    ["m1", "mvp"],
    ["phase1", "mvp"],
    ["phase-1", "mvp"],
    ["2", "phase-2"],
    ["p2", "phase-2"],
    ["phase2", "phase-2"],
    ["3", "phase-3"],
    ["p3", "phase-3"],
    ["phase3", "phase-3"]
  ]);
  const phase = aliases.get(normalized) ?? normalized;
  const validPhases = new Set(["mvp", "phase-2", "phase-3"]);
  if (!validPhases.has(phase)) {
    throw new Error(`Invalid phase "${value}". Use mvp, phase-2, or phase-3.`);
  }
  return phase;
}

function parseNextOptions(args) {
  const options = {
    limit: 5,
    phase: null,
    hot: false,
    json: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--phase") {
      if (index + 1 >= args.length) {
        throw new Error("--phase must be mvp, phase-2, or phase-3.");
      }
      options.phase = normalizePhase(args[index + 1]);
      index += 1;
      continue;
    }
    if (arg.startsWith("--phase=")) {
      options.phase = normalizePhase(arg.slice("--phase=".length));
      continue;
    }
    if (arg === "--limit") {
      options.limit = parsePositiveInteger(args[index + 1], "--limit");
      index += 1;
      continue;
    }
    if (arg.startsWith("--limit=")) {
      options.limit = parsePositiveInteger(arg.slice("--limit=".length), "--limit");
      continue;
    }
    if (arg === "--hot") {
      options.hot = true;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    throw new Error(`Unknown tasks:next option "${arg}".`);
  }

  return options;
}

function parsePositiveInteger(value, flag) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || String(parsed) !== String(value)) {
    throw new Error(`${flag} must be a positive integer.`);
  }
  return parsed;
}

function taskMatchesPhase(task, phase) {
  return !phase || task.id.startsWith(`${phase}.`);
}

function readyTasks(registry, options = {}) {
  const phase = options.phase ?? null;
  const done = new Set(
    registry.tasks.filter((t) => t.status === "done").map((t) => t.id)
  );
  return registry.tasks
    .filter((t) => taskMatchesPhase(t, phase))
    .filter((t) => t.status === "planned")
    .filter((t) => resolveDeps(t, registry).every((d) => done.has(d)));
}

function sortReady(ready, hot) {
  if (!hot) return ready;
  return [...ready].sort((a, b) => {
    const transitiveDelta =
      (b.downstreamTransitiveCount ?? 0) - (a.downstreamTransitiveCount ?? 0);
    if (transitiveDelta !== 0) return transitiveDelta;
    const directDelta =
      (b.downstreamDirectCount ?? 0) - (a.downstreamDirectCount ?? 0);
    if (directDelta !== 0) return directDelta;
    return a.id.localeCompare(b.id);
  });
}

function printNext(registry, options = {}) {
  const limit = options.limit ?? 5;
  const phase = options.phase ?? null;
  const hot = options.hot === true;
  const json = options.json === true;
  const readyRaw = readyTasks(registry, options);
  const ready = sortReady(readyRaw, hot);
  const scopedTasks = registry.tasks.filter((t) => taskMatchesPhase(t, phase));
  const inProgress = scopedTasks.filter((t) => t.status === "in-progress");

  if (json) {
    const payload = {
      phase: phase || "all",
      hot,
      counts: {
        ready: ready.length,
        scoped: scopedTasks.length,
        inProgress: inProgress.length
      },
      inProgress: inProgress.map((t) => ({
        id: t.id,
        title: t.title,
        moduleId: t.moduleId,
        estimatedTime: t.estimatedTime || ""
      })),
      ready: ready.slice(0, limit).map((t) => ({
        id: t.id,
        title: t.title,
        moduleId: t.moduleId,
        estimatedTime: t.estimatedTime || "",
        dependencies: t.dependencies || [],
        downstreamDirectCount: t.downstreamDirectCount ?? 0,
        downstreamTransitiveCount: t.downstreamTransitiveCount ?? 0
      })),
      truncated: Math.max(0, ready.length - limit)
    };
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const scopeLabel = phase ? ` (${phase})` : "";
  const orderLabel = hot ? " [hot]" : "";

  if (inProgress.length > 0) {
    console.log(`In progress${scopeLabel} (${inProgress.length}):`);
    for (const t of inProgress) {
      console.log(`  - ${t.id}  — ${t.title}`);
    }
    console.log();
  }

  console.log(
    `Ready to start${scopeLabel}${orderLabel} (${ready.length} of ${scopedTasks.length}):`
  );
  for (const t of ready.slice(0, limit)) {
    console.log(`\n  ${t.id}`);
    console.log(`    ${t.title}  (${t.estimatedTime || "—"})`);
    console.log(`    module:   ${t.moduleId}`);
    if (hot) {
      console.log(
        `    unlocks:  ${t.downstreamDirectCount ?? 0} direct / ${t.downstreamTransitiveCount ?? 0} transitive`
      );
    }
    console.log(`    deps:     ${(t.dependencies || []).join(", ") || "none"}`);
  }
  if (ready.length > limit) {
    console.log(`\n  …and ${ready.length - limit} more.`);
  }
}

function printStatus(registry) {
  const counts = { planned: 0, "in-progress": 0, done: 0, blocked: 0 };
  for (const t of registry.tasks) counts[t.status] = (counts[t.status] || 0) + 1;

  const total = registry.tasks.length;
  console.log(
    `Overall: ${counts.done}/${total} done  |  ${counts["in-progress"]} in-progress  |  ${counts.planned} planned  |  ${counts.blocked} blocked`
  );
  console.log();

  const byModule = new Map();
  for (const t of registry.tasks) {
    if (!byModule.has(t.moduleId)) byModule.set(t.moduleId, []);
    byModule.get(t.moduleId).push(t);
  }

  for (const mod of registry.modules) {
    const ts = byModule.get(mod.id) || [];
    const doneCount = ts.filter((t) => t.status === "done").length;
    const pct = ts.length ? Math.round((doneCount / ts.length) * 100) : 0;
    console.log(`  [${String(pct).padStart(3)}%]  ${doneCount}/${ts.length}  ${mod.id}`);
  }
}

function printShow(registry, id) {
  const t = registry.tasks.find((x) => x.id === id)
    || registry.modules.find((x) => x.id === id);
  if (!t) {
    console.error(`No task or module with id "${id}".`);
    process.exit(1);
  }
  console.log(JSON.stringify(t, null, 2));
}

async function setStatus(id, newStatus) {
  if (!VALID_STATUSES.includes(newStatus)) {
    console.error(`Invalid status "${newStatus}". Use: ${VALID_STATUSES.join(", ")}.`);
    process.exit(1);
  }
  const registry = await loadRegistry();
  const task = registry.tasks.find((t) => t.id === id);
  if (!task) {
    console.error(`No task with id "${id}".`);
    process.exit(1);
  }

  const mdPath = path.join(repoRoot, task.path);
  let md = await readUtf8(mdPath);
  const line = `Status: ${newStatus}`;

  if (/^Status:\s*\S+\s*$/mi.test(md)) {
    md = md.replace(/^Status:\s*\S+\s*$/mi, line);
  } else {
    const heading = md.match(/^#\s+.+$/m);
    if (heading) {
      const at = heading.index + heading[0].length;
      md = `${md.slice(0, at)}\n\n${line}${md.slice(at)}`;
    } else {
      md = `${line}\n\n${md}`;
    }
  }

  await fs.writeFile(mdPath, md, "utf8");
  await writeTaskRegistry();
  console.log(`${id} → ${newStatus}  (updated ${repoRelative(mdPath)})`);
  return task;
}

function ownsUiSurface(task) {
  return (task.ownedPaths || []).some((entry) => /^src\/ui\//.test(entry));
}

function runVerify(task) {
  const cmds = task.verifyCommands || [];
  const uiSmokeCmd = ownsUiSurface(task)
    ? `node scripts/verify-ui-smoke.mjs "${task.id}"`
    : null;

  if (cmds.length === 0 && !uiSmokeCmd) {
    console.log("No verifyCommands listed — nothing to check.");
    return true;
  }

  const allCmds = uiSmokeCmd ? [...cmds, uiSmokeCmd] : cmds;
  for (const cmd of allCmds) {
    console.log(`\n$ ${cmd}`);
    const result = spawnSync(cmd, {
      shell: true,
      stdio: "inherit",
      cwd: repoRoot
    });
    if (result.status !== 0) {
      console.error(`\nVerify failed: ${cmd}`);
      return false;
    }
  }
  return true;
}

function appendImplementationLog(task) {
  const logPath = path.join(repoRoot, "docs", "planning", "implementation-log.md");
  const now = new Date().toISOString().slice(0, 10);
  const commit = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  const sha = commit.status === 0 ? commit.stdout.trim() : "unknown";
  const line = `- ${now}  ${task.id}  (@${sha})  — ${task.title}\n`;
  return fs.appendFile(logPath, line, "utf8");
}

async function doneCmd(id) {
  const registry = await loadRegistry();
  const task = registry.tasks.find((t) => t.id === id);
  if (!task) {
    console.error(`No task with id "${id}".`);
    process.exit(1);
  }
  const preflight = spawnSync("npm", ["run", "validate:tasks"], {
    stdio: "inherit",
    cwd: repoRoot
  });
  if (preflight.status !== 0) {
    console.error("\nPreflight failed: npm run validate:tasks. Refusing to mark done.");
    process.exit(1);
  }
  console.log(`Verifying ${id} before marking done…`);
  if (!runVerify(task)) {
    console.error("\nRefusing to mark done. Fix failures and retry.");
    process.exit(1);
  }
  await setStatus(id, "done");
  await appendImplementationLog(task);
  console.log(`\nAppended entry to docs/planning/implementation-log.md.`);
  console.log(`Next step: commit your work with a message referencing ${id}.`);
}

async function blockedCmd(id, reason) {
  if (!reason) {
    console.error("A reason is required: tasks:blocked -- <id> \"<reason>\"");
    process.exit(1);
  }
  const registry = await loadRegistry();
  const task = registry.tasks.find((t) => t.id === id);
  if (!task) {
    console.error(`No task with id "${id}".`);
    process.exit(1);
  }

  const mdPath = path.join(repoRoot, task.path);
  let md = await readUtf8(mdPath);
  md = md.replace(/^Status:\s*\S+\s*$/mi, "Status: blocked");

  const blockedHeader = /^Blocked Reason:\s*$/m;
  const newSection = `Blocked Reason:\n- ${reason}\n`;
  if (blockedHeader.test(md)) {
    md = md.replace(/^Blocked Reason:\s*$[\s\S]*?(?=^[A-Z][A-Za-z ]+:\s*$|\Z)/m, `${newSection}\n`);
  } else {
    const statusLine = md.match(/^Status:\s*\S+\s*$/m);
    if (statusLine) {
      const at = statusLine.index + statusLine[0].length;
      md = `${md.slice(0, at)}\n\n${newSection}${md.slice(at)}`;
    } else {
      md = `${newSection}\n${md}`;
    }
  }
  await fs.writeFile(mdPath, md, "utf8");
  await writeTaskRegistry();
  console.log(`${id} → blocked  (reason recorded in ${repoRelative(mdPath)})`);
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

function extractScreenRefs(items) {
  return new Set(
    items
      .join("\n")
      .match(/docs\/architecture\/wiki\/screens\/[0-9]{2}-[A-Za-z0-9-]+/g) ?? []
  );
}

function canonicalCycle(cycle) {
  const nodes = cycle.slice(0, -1);
  let minIndex = 0;
  for (let index = 1; index < nodes.length; index += 1) {
    if (nodes[index] < nodes[minIndex]) minIndex = index;
  }
  const rotated = [...nodes.slice(minIndex), ...nodes.slice(0, minIndex)];
  return [...rotated, rotated[0]].join(" -> ");
}

function dependencyCycles(registry) {
  const taskIds = new Set(registry.tasks.map((t) => t.id));
  const graph = new Map(
    registry.tasks.map((task) => [
      task.id,
      resolveDeps(task, registry).filter((dependency) => taskIds.has(dependency))
    ])
  );
  const state = new Map();
  const stack = [];
  const cycles = new Map();

  function visit(id) {
    state.set(id, "visiting");
    stack.push(id);

    for (const dependency of graph.get(id) || []) {
      const dependencyState = state.get(dependency);
      if (dependencyState === "visiting") {
        const start = stack.indexOf(dependency);
        if (start >= 0) {
          const cycle = [...stack.slice(start), dependency];
          cycles.set(canonicalCycle(cycle), cycle);
        }
        continue;
      }
      if (!dependencyState) {
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

async function listScreenPackages() {
  const screenRoot = path.join(repoRoot, "docs", "architecture", "wiki", "screens");
  const entries = await fs.readdir(screenRoot, { withFileTypes: true });
  return new Set(
    entries
      .filter((entry) => entry.isDirectory() && /^[0-9]{2}-/.test(entry.name))
      .map((entry) => `docs/architecture/wiki/screens/${entry.name}`)
  );
}

async function listSchemaPaths() {
  const schemaRoot = path.join(repoRoot, "content-schema", "schemas");
  const entries = await fs.readdir(schemaRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".schema.json"))
    .map((entry) => `content-schema/schemas/${entry.name}`)
    .sort();
}

async function lintRegistry(registry) {
  const problems = [];
  const knownIds = new Set(registry.tasks.map((t) => t.id));
  const knownModuleIds = new Set(registry.modules.map((m) => m.id));
  const tasksById = new Map(registry.tasks.map((t) => [t.id, t]));
  const modulesById = new Map(registry.modules.map((m) => [m.id, m]));
  const screenPackages = await listScreenPackages();
  const schemaPaths = await listSchemaPaths();
  const schemaMentions = new Set(
    registry.tasks.flatMap((task) => task.schemaPaths || [])
  );
  const moduleHasTag = (moduleId, tag) =>
    modulesById.get(moduleId)?.lintTags?.includes(tag) ?? false;

  for (const t of registry.tasks) {
    if ((!t.dependencies || t.dependencies.length === 0)) {
      problems.push(`${t.path}: missing Dependencies section; declare at least "None"`);
    }
    if (!t.verifyCommands || t.verifyCommands.length === 0) {
      problems.push(`${t.path}: missing Verify section`);
    }
    if ((!t.ownedPaths || t.ownedPaths.length === 0) && !t.ownedPathsOptOut) {
      problems.push(`${t.path}: missing or empty Owned Paths`);
    }
    if (t.ownedPathsOptOut && !t.ownedPathsOptOutReason) {
      problems.push(`${t.path}: Owned Paths opt-out must include a reason`);
    }
    if (hasUnsafeOwnedPathOptOut(t)) {
      problems.push(
        `${t.path}: Owned Paths opt-out is unsafe because Outputs describe concrete code/content edits`
      );
    }
    const sharedOwnershipMissing = sharedOwnershipCriteriaMissing(t);
    if (sharedOwnershipMissing.length > 0) {
      problems.push(
        `${t.path}: Owned Paths (shared) needs acceptance criteria for ${sharedOwnershipMissing
          .map((missing) => missing.lintLabel)
          .join(", ")}`
      );
    }

    for (const dep of splitDependencyParts(t.dependencies)) {
      if (knownIds.has(dep)) continue;
      const moduleMatch = dep.match(/^module:([a-z0-9.-]+)$/i);
      if (moduleMatch && knownModuleIds.has(moduleMatch[1])) continue;
      if (/^task\s+\d+[a-z]?$/i.test(dep)) {
        if (resolveDeps({ ...t, dependencies: [dep], resolvedDependencies: undefined }, registry).length > 0) continue;
      }
      if (/^all\b.*\bcomplete$/i.test(dep)) {
        problems.push(
          `${t.path}: dependency "${dep}" is not scheduler-actionable; use explicit task ids or module:<module-id>`
        );
        continue;
      }
      problems.push(`${t.path}: unresolved dependency "${dep}"`);
    }

    // Wrapper-rule: modules tagged "screen-wrapper" must declare at least
    // one dependency outside modules tagged "ui-shell" or "screen-wrapper".
    // Without such a dependency, a wrapper can ship before any engine reducer,
    // schema, or content task provides the behavior it renders.
    if (moduleHasTag(t.moduleId, "screen-wrapper")) {
      const nonShellNonWrapper = (t.taskDependencies || []).filter((dep) =>
        !moduleHasTag(tasksById.get(dep)?.moduleId, "ui-shell") &&
        !moduleHasTag(tasksById.get(dep)?.moduleId, "screen-wrapper")
      );
      if (nonShellNonWrapper.length === 0) {
        problems.push(
          `${t.path}: screen-wrapper task must depend on at least one non-shell, non-wrapper task ` +
          `(engine reducer, schema, or content task) so it cannot ship without underlying functionality`
        );
      }
    }

    // Renderer-primitive rule: some visual-fidelity tasks are low-level
    // renderer primitives, not UI surfaces. Those tasks should be anchored
    // to renderer/content architecture docs instead of screen packages.
    if (
      moduleHasTag(t.moduleId, "renderer-primitive")
      && !ownsUiOrEditorPath(t)
      && (t.screenPackages || []).length > 0
    ) {
      problems.push(
        `${t.path}: renderer-primitive task must not cite screen packages; ` +
        `anchor renderer-only work to renderer/content architecture docs instead`
      );
    }

    for (const ref of t.screenPackages || []) {
      if (!screenPackages.has(ref)) {
        problems.push(`${t.path}: unknown screen package "${ref}"`);
      }
    }

    const ownsUiPath = ownsUiOrEditorPath(t);
    if (ownsUiPath) {
      const readOrInputRefs = extractScreenRefs([
        ...(t.readFirst || []),
        ...(t.inputs || [])
      ]);
      const acceptanceRefs = extractScreenRefs(t.acceptanceCriteria || []);
      if (readOrInputRefs.size === 0) {
        problems.push(
          `${t.path}: UI/editor task must reference a docs/architecture/wiki/screens/<nn-screen>/ package in Read First or Inputs`
        );
      }
      if (acceptanceRefs.size === 0) {
        problems.push(
          `${t.path}: UI/editor task must include a screen package acceptance criterion`
        );
      }
    }
  }

  const referencedScreenPackages = new Set(
    registry.tasks
      .filter(ownsUiOrEditorPath)
      .flatMap((task) => task.screenPackages || [])
  );
  for (const screenPackage of [...screenPackages].sort()) {
    if (!referencedScreenPackages.has(screenPackage)) {
      problems.push(`${screenPackage}: no task references this screen package`);
    }
  }

  for (const cycle of dependencyCycles(registry)) {
    const paths = cycle.map((id) => registry.tasks.find((t) => t.id === id)?.path ?? id);
    problems.push(`dependency cycle: ${paths.join(" -> ")}`);
  }

  for (const schemaPath of schemaPaths) {
    if (!schemaMentions.has(schemaPath)) {
      problems.push(`${schemaPath}: no task references this schema by canonical path`);
    }
  }

  const ownershipByPath = new Map();
  for (const task of registry.tasks) {
    const sharedOwnedPaths = new Set(task.sharedOwnedPaths || []);
    for (const ownedPath of task.ownedPaths || []) {
      if (!ownershipByPath.has(ownedPath)) ownershipByPath.set(ownedPath, []);
      ownershipByPath.get(ownedPath).push({
        task,
        shared: sharedOwnedPaths.has(ownedPath)
      });
    }
  }

  for (const [ownedPath, owners] of [...ownershipByPath].sort(([a], [b]) => a.localeCompare(b))) {
    if (owners.length <= 1) continue;
    const primaryOwners = owners.filter((owner) => !owner.shared);
    if (primaryOwners.length <= 1) continue;
    problems.push(
      `${ownedPath}: owned by multiple tasks (${primaryOwners
        .map((owner) => owner.task.id)
        .join(", ")}); move additive claims to "Owned Paths (shared):"`
    );
  }

  problems.push(...(await collectCommandOwnershipViolations(registry)));
  problems.push(...(await collectTaskCommandLiteralViolations()));

  return problems;
}

function usage() {
  console.log(`Usage:
  npm run tasks:next [-- --phase=mvp]       List tasks whose deps are all done.
  npm run tasks:next [-- --hot]             Order ready tasks by transitive fan-out (most-unblocking first).
  npm run tasks:next [-- --json]            Emit machine-readable JSON for parallel agents.
  npm run tasks:next:mvp                    List MVP-ready tasks only.
  npm run tasks:status                      Progress per module and overall.
  npm run tasks:show -- <id>                Print one task's full record.
  npm run tasks:start -- <id>               Mark a task in-progress.
  npm run tasks:done -- <id>                Run verifyCommands; mark done on success.
  npm run tasks:blocked -- <id> "<reason>"  Mark a task blocked with a reason.
  npm run tasks:lint                        Check every task has Verify, Owned Paths, resolvable deps.`);
}

const [, , sub, ...rest] = process.argv;

switch (sub) {
  case "next": {
    const registry = await loadRegistry();
    let options;
    try {
      options = parseNextOptions(rest);
    } catch (error) {
      console.error(error.message);
      usage();
      process.exit(1);
    }
    printNext(registry, options);
    break;
  }
  case "status": {
    const registry = await loadRegistry();
    printStatus(registry);
    break;
  }
  case "show": {
    if (!rest[0]) { usage(); process.exit(1); }
    const registry = await loadRegistry();
    printShow(registry, rest[0]);
    break;
  }
  case "start": {
    if (!rest[0]) { usage(); process.exit(1); }
    await setStatus(rest[0], "in-progress");
    break;
  }
  case "blocked": {
    if (!rest[0]) { usage(); process.exit(1); }
    await blockedCmd(rest[0], rest.slice(1).join(" "));
    break;
  }
  case "lint": {
    const registry = await loadRegistry();
    const problems = await lintRegistry(registry);
    if (problems.length === 0) {
      console.log(`Task lint passed: ${registry.tasks.length} tasks, 0 issues.`);
    } else {
      for (const p of problems) console.error(p);
      console.error(`\nTask lint failed: ${problems.length} issue(s).`);
      process.exit(1);
    }
    break;
  }
  case "done": {
    if (!rest[0]) { usage(); process.exit(1); }
    await doneCmd(rest[0]);
    break;
  }
  default:
    usage();
    if (sub) process.exit(1);
}
