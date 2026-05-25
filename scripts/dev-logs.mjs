#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_RETENTION_DAYS = 7;
const DEFAULT_MAX_TOTAL_BYTES = 750_000_000;

function parsePositiveInteger(value, fallback) {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function logRoot() {
  return path.resolve(REPO_ROOT, process.env.AGORA_LOG_DIR ?? ".local/logs");
}

function humanSize(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function removePath(targetPath) {
  try {
    fs.rmSync(targetPath, { force: true, recursive: true });
  } catch {
    // Best-effort cleanup only.
  }
}

function directorySize(dirPath) {
  let total = 0;
  if (!fs.existsSync(dirPath)) {
    return total;
  }
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      total += directorySize(entryPath);
    } else if (entry.isFile()) {
      try {
        total += fs.statSync(entryPath).size;
      } catch {
        // Ignore files that disappear during cleanup.
      }
    }
  }
  return total;
}

function listRunDirs(runsDir) {
  if (!fs.existsSync(runsDir)) {
    return [];
  }
  return fs
    .readdirSync(runsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const dirPath = path.join(runsDir, entry.name);
      let mtimeMs = 0;
      try {
        mtimeMs = fs.statSync(dirPath).mtimeMs;
      } catch {
        // Deleted concurrently.
      }
      return { dirPath, mtimeMs };
    })
    .sort((left, right) => left.mtimeMs - right.mtimeMs);
}

function listLogs() {
  const latestDir = path.join(logRoot(), "latest");
  if (!fs.existsSync(latestDir)) {
    console.log("No logs found. Run a make dev-* target first.");
    return;
  }

  for (const entry of fs.readdirSync(latestDir).sort()) {
    const latestPath = path.join(latestDir, entry);
    let targetPath = latestPath;
    try {
      const linkTarget = fs.readlinkSync(latestPath);
      targetPath = path.resolve(path.dirname(latestPath), linkTarget);
    } catch {
      // Not a symlink.
    }

    if (!fs.existsSync(targetPath)) {
      console.log(`${entry}\tmissing`);
      continue;
    }
    const stats = fs.statSync(targetPath);
    console.log(`${entry}\t${humanSize(stats.size)}\t${path.relative(REPO_ROOT, targetPath)}`);
  }
}

function parseService(argv) {
  const serviceIndex = argv.indexOf("--service");
  if (serviceIndex === -1 || !argv[serviceIndex + 1]) {
    return undefined;
  }
  return argv[serviceIndex + 1];
}

function tailLog(argv) {
  const service = parseService(argv);
  if (!service) {
    console.error("Usage: dev-logs.mjs tail --service <service>");
    process.exit(2);
  }
  const logPath = path.join(logRoot(), "latest", `${service}.log`);
  if (!fs.existsSync(logPath)) {
    console.error(`No latest log found for service: ${service}`);
    process.exit(1);
  }
  const child = spawn("tail", ["-n", "80", "-F", logPath], { stdio: "inherit" });
  child.on("close", (code) => process.exit(code ?? 0));
}

function cleanupLogs() {
  const root = logRoot();
  const runsDir = path.join(root, "runs");
  const latestDir = path.join(root, "latest");
  const retentionDays = parsePositiveInteger(
    process.env.AGORA_LOG_RETENTION_DAYS,
    DEFAULT_RETENTION_DAYS,
  );
  const maxTotalBytes = parsePositiveInteger(
    process.env.AGORA_LOG_MAX_TOTAL_BYTES,
    DEFAULT_MAX_TOTAL_BYTES,
  );
  const now = Date.now();
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
  let deleted = 0;

  for (const runDir of listRunDirs(runsDir)) {
    if (now - runDir.mtimeMs > retentionMs) {
      removePath(runDir.dirPath);
      deleted += 1;
    }
  }

  let total = directorySize(runsDir);
  for (const runDir of listRunDirs(runsDir)) {
    if (total <= maxTotalBytes) {
      break;
    }
    const size = directorySize(runDir.dirPath);
    removePath(runDir.dirPath);
    total -= size;
    deleted += 1;
  }

  if (fs.existsSync(latestDir)) {
    for (const entry of fs.readdirSync(latestDir)) {
      const latestPath = path.join(latestDir, entry);
      try {
        const targetPath = path.resolve(path.dirname(latestPath), fs.readlinkSync(latestPath));
        if (!fs.existsSync(targetPath)) {
          removePath(latestPath);
        }
      } catch {
        // Not a symlink.
      }
    }
  }

  console.log(`Deleted ${deleted} old log run(s). Current size: ${humanSize(directorySize(runsDir))}`);
}

const [command, ...args] = process.argv.slice(2);
switch (command) {
  case "list":
    listLogs();
    break;
  case "tail":
    tailLog(args);
    break;
  case "clean":
    cleanupLogs();
    break;
  default:
    console.error("Usage: dev-logs.mjs <list|tail|clean>");
    process.exit(2);
}
