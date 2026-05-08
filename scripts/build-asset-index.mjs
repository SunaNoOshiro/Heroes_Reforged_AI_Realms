import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { pathExists, readUtf8, repoRelative, repoRoot } from "./lib/repo-utils.mjs";

function isDirectRun() {
  return process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
}

const ZERO_HASH = "0".repeat(64);

function placeholderHashFor(asset, index) {
  // Synthesised, deterministic placeholder for assets that are not on disk
  // (planning-first repo). Real builds replace this with the file digest.
  const seed = `${asset.id ?? ""}|${asset.path ?? ""}|${index}`;
  return createHash("sha256").update(seed).digest("hex");
}

async function hashFileBytes(absolutePath) {
  const handle = await fs.open(absolutePath, "r");
  try {
    const hash = createHash("sha256");
    const stream = handle.createReadStream();
    let bytes = 0;
    for await (const chunk of stream) {
      hash.update(chunk);
      bytes += chunk.length;
    }
    return { sha256: hash.digest("hex"), bytes };
  } finally {
    await handle.close();
  }
}

export async function rebuildIndex(packDir, { check = false } = {}) {
  const indexPath = path.join(packDir, "assets", "index.json");
  if (!(await pathExists(indexPath))) {
    return { changed: false, reason: "no assets/index.json" };
  }
  const before = await readUtf8(indexPath);
  const data = JSON.parse(before);
  const assets = Array.isArray(data.assets) ? data.assets : [];
  for (let index = 0; index < assets.length; index += 1) {
    const asset = assets[index];
    const absolutePath = path.join(packDir, asset.path);
    if (await pathExists(absolutePath)) {
      const { sha256, bytes } = await hashFileBytes(absolutePath);
      asset.sha256 = sha256;
      asset.bytes = bytes;
    } else {
      // Asset not yet on disk — keep an existing real hash if present,
      // otherwise emit a deterministic placeholder so the schema's
      // pattern still matches.
      if (!asset.sha256 || asset.sha256 === ZERO_HASH) {
        asset.sha256 = placeholderHashFor(asset, index);
      }
      if (typeof asset.bytes !== "number") asset.bytes = 0;
    }
  }
  const after = `${JSON.stringify(data, null, 2)}\n`;
  if (check) {
    return { changed: after !== before, indexPath };
  }
  if (after !== before) {
    await fs.writeFile(indexPath, after, "utf8");
  }
  return { changed: after !== before, indexPath };
}

async function packDirsUnder(root) {
  if (!(await pathExists(root))) return [];
  const entries = await fs.readdir(root, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(root, entry.name);
    if (await pathExists(path.join(candidate, "manifest.json"))) {
      result.push(candidate);
    }
  }
  return result;
}

export async function runFromCli(argv = process.argv.slice(2)) {
  const check = argv.includes("--check");
  const packsArg = argv.filter((arg) => !arg.startsWith("--"));
  const sources = packsArg.length > 0
    ? packsArg.map((rel) => path.resolve(repoRoot, rel))
    : [
        path.join(repoRoot, "resources", "packs"),
        path.join(repoRoot, "content-schema", "examples", "packs")
      ];

  const drift = [];
  let touched = 0;
  for (const source of sources) {
    const packs = await packDirsUnder(source);
    for (const packDir of packs) {
      const result = await rebuildIndex(packDir, { check });
      if (result.changed) {
        touched += 1;
        drift.push(repoRelative(packDir));
      }
    }
  }

  if (check && drift.length > 0) {
    console.error(
      `generate:asset-index --check failed: ${drift.length} pack(s) drift from on-disk hashes:`
    );
    for (const entry of drift) console.error(`  ${entry}`);
    return 1;
  }

  console.log(
    check
      ? "generate:asset-index --check: 0 drifted packs."
      : `generate:asset-index: rewrote ${touched} index file(s).`
  );
  return 0;
}

if (isDirectRun()) {
  process.exitCode = await runFromCli();
}
