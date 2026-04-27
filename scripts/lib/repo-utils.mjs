import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

export const repoRoot = path.resolve(moduleDir, "..", "..");

const ignoredDirectories = new Set([".git", "node_modules"]);

export async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function walkFiles(rootDir, predicate) {
  const results = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (ignoredDirectories.has(entry.name)) {
        continue;
      }

      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (!predicate || predicate(fullPath)) {
        results.push(fullPath);
      }
    }
  }

  return results.sort();
}

export function toPosixPath(targetPath) {
  return targetPath.split(path.sep).join("/");
}

export function repoRelative(targetPath) {
  return toPosixPath(path.relative(repoRoot, targetPath));
}

export async function readUtf8(targetPath) {
  return fs.readFile(targetPath, "utf8");
}
