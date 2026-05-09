import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  pathExists,
  readUtf8,
  repoRelative,
  repoRoot,
  walkFiles
} from "./lib/repo-utils.mjs";

const markdownLinkPattern = /!?\[[^\]]*]\(([^)]+)\)/g;

function stripFencedCodeBlocks(markdown) {
  let inFence = false;
  return markdown
    .split(/\r?\n/)
    .map((line) => {
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        return "";
      }
      return inFence ? "" : line;
    })
    .join("\n");
}

function isDirectRun() {
  return process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

function shouldIgnoreLink(target) {
  return target.startsWith("#")
    || target.startsWith("http://")
    || target.startsWith("https://")
    || target.startsWith("mailto:")
    || target.startsWith("app://");
}

function normalizeTarget(rawTarget) {
  const trimmed = rawTarget.trim().replace(/^<|>$/g, "");
  return trimmed.split("#")[0];
}

function isForwardLookingDoc(filePath) {
  const relative = repoRelative(filePath);
  // Archived prep material: readiness-audit and implementation-plans were
  // upstream backlog/spec inputs and are no longer maintained. Their links
  // are frozen historical references; skipping keeps the link checker
  // focused on docs that describe current state.
  return relative.startsWith("docs/archive/implementation-plans/")
    || relative.startsWith("docs/archive/readiness-audit/");
}

export async function collectBrokenLinks() {
  const markdownFiles = await walkFiles(repoRoot, (filePath) => filePath.endsWith(".md"));
  const broken = [];

  for (const filePath of markdownFiles) {
    if (isForwardLookingDoc(filePath)) continue;
    const rawContents = await readUtf8(filePath);
    const contents = stripFencedCodeBlocks(rawContents);

    for (const match of contents.matchAll(markdownLinkPattern)) {
      const rawTarget = match[1];

      if (shouldIgnoreLink(rawTarget)) {
        continue;
      }

      const normalizedTarget = normalizeTarget(rawTarget);

      if (normalizedTarget.length === 0) {
        continue;
      }

      const resolved = path.resolve(path.dirname(filePath), normalizedTarget);
      if (await pathExists(resolved)) {
        continue;
      }

      broken.push({
        file: repoRelative(filePath),
        target: rawTarget
      });
    }
  }

  return broken;
}

if (isDirectRun()) {
  const brokenLinks = await collectBrokenLinks();

  if (brokenLinks.length > 0) {
    for (const entry of brokenLinks) {
      console.error(`${entry.file}: broken link -> ${entry.target}`);
    }
    process.exitCode = 1;
  } else {
    console.log("All Markdown links resolve.");
  }
}
