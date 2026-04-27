import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  pathExists,
  readUtf8,
  repoRoot,
  repoRelative
} from "./lib/repo-utils.mjs";

const registryPath = path.join(repoRoot, "tasks", "task-registry.json");

function isDirectRun() {
  return (
    process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
  );
}

function isUiPath(ownedPath) {
  return /^src\/ui\//.test(ownedPath);
}

async function loadRegistry() {
  const raw = await readUtf8(registryPath);
  return JSON.parse(raw);
}

function findTask(registry, id) {
  return registry.tasks.find((task) => task.id === id);
}

async function checkFile(filePath) {
  const repoPath = repoRelative(filePath);
  if (!(await pathExists(filePath))) {
    return { repoPath, status: "missing" };
  }
  const stat = await fs.stat(filePath);
  if (!stat.isFile()) {
    return { repoPath, status: "not-a-file" };
  }
  const text = await readUtf8(filePath);
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { repoPath, status: "empty" };
  }
  if (!/^src\/ui\/.+\.(tsx?|jsx?)$/.test(repoPath)) {
    return { repoPath, status: "ok" };
  }
  if (!/\bexport\s+(default|function|const|class)/.test(text)) {
    return { repoPath, status: "no-export" };
  }
  if (/\.tsx$/.test(repoPath) && !/<[A-Za-z][^>]*>/.test(text)) {
    return { repoPath, status: "no-jsx" };
  }
  return { repoPath, status: "ok" };
}

export async function verifyUiSmoke(taskId) {
  if (!taskId) {
    return { ok: false, reason: "Missing task id." };
  }
  const registry = await loadRegistry();
  const task = findTask(registry, taskId);
  if (!task) {
    return { ok: false, reason: `Task not found: ${taskId}` };
  }
  const uiPaths = (task.ownedPaths || []).filter(isUiPath);
  if (uiPaths.length === 0) {
    return { ok: true, reason: "No UI-owned paths; skipping." };
  }
  const results = [];
  for (const ownedPath of uiPaths) {
    const absolute = path.join(repoRoot, ownedPath);
    results.push(await checkFile(absolute));
  }
  const failures = results.filter(
    (entry) => entry.status !== "ok" && entry.status !== "missing"
  );
  const missing = results.filter((entry) => entry.status === "missing");
  return {
    ok: failures.length === 0,
    results,
    failures,
    missing
  };
}

if (isDirectRun()) {
  const [, , taskId] = process.argv;
  const outcome = await verifyUiSmoke(taskId);
  if (outcome.reason && !outcome.results) {
    if (outcome.ok) {
      console.log(`UI smoke check: ${outcome.reason}`);
      process.exit(0);
    } else {
      console.error(`UI smoke check: ${outcome.reason}`);
      process.exit(1);
    }
  }
  for (const entry of outcome.results) {
    const tag = entry.status === "ok" ? "ok" : entry.status;
    console.log(`  [${tag}] ${entry.repoPath}`);
  }
  if (outcome.missing.length > 0) {
    console.log(
      `\nUI files not yet on disk (acceptable while task is in-progress): ${outcome.missing.length}`
    );
  }
  if (outcome.failures.length > 0) {
    console.error(
      `\nUI smoke check failed: ${outcome.failures
        .map((entry) => `${entry.repoPath} (${entry.status})`)
        .join(", ")}`
    );
    process.exit(1);
  }
  console.log("\nUI smoke check passed.");
}
