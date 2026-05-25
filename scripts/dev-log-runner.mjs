#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");

const DEFAULT_MAX_BYTES = 25_000_000;
const DEFAULT_MAX_FILES = 5;
const DEFAULT_RETENTION_DAYS = 7;
const DEFAULT_MAX_TOTAL_BYTES = 750_000_000;

const MARKERS = [
  { prefix: "AGORA_LOAD_EVENT", envName: "AGORA_LOG_EVENT_FILE", suffix: ".events.jsonl" },
  { prefix: "AGORA_BROWSER_EVENT", envName: "AGORA_BROWSER_LOG_FILE", suffix: "-browser.jsonl" },
];

function usage() {
  console.error("Usage: dev-log-runner.mjs --service <name> -- <command> [args...]");
}

function parseArgs(argv) {
  let service;
  let separatorIndex = -1;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      separatorIndex = index;
      break;
    }
    if (arg === "--service") {
      service = argv[index + 1];
      index += 1;
    }
  }

  if (!service || separatorIndex === -1 || separatorIndex === argv.length - 1) {
    usage();
    process.exit(2);
  }

  return {
    service,
    command: argv[separatorIndex + 1],
    commandArgs: argv.slice(separatorIndex + 2),
  };
}

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

function defaultRunId() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function safeName(value) {
  return value.replace(/[^A-Za-z0-9_.-]/g, "-");
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removePath(targetPath) {
  try {
    fs.rmSync(targetPath, { force: true, recursive: true });
  } catch {
    // Best-effort cleanup only.
  }
}

function linkLatest({ sourcePath, latestPath }) {
  removePath(latestPath);
  try {
    const relativeTarget = path.relative(path.dirname(latestPath), sourcePath);
    fs.symlinkSync(relativeTarget, latestPath);
  } catch {
    // Fall back to creating the parent directory. The active log remains in runs/.
    ensureDir(path.dirname(latestPath));
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

function pruneLogs({ runsDir, currentRunDir, retentionDays, maxTotalBytes }) {
  const now = Date.now();
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
  for (const runDir of listRunDirs(runsDir)) {
    if (runDir.dirPath === currentRunDir) {
      continue;
    }
    if (now - runDir.mtimeMs > retentionMs) {
      removePath(runDir.dirPath);
    }
  }

  let total = directorySize(runsDir);
  for (const runDir of listRunDirs(runsDir)) {
    if (total <= maxTotalBytes) {
      break;
    }
    if (runDir.dirPath === currentRunDir) {
      continue;
    }
    const size = directorySize(runDir.dirPath);
    removePath(runDir.dirPath);
    total -= size;
  }
}

function stripAnsi(text) {
  return text.replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, "");
}

class RotatingLogWriter {
  constructor({ filePath, maxBytes, maxFiles }) {
    this.filePath = filePath;
    this.maxBytes = maxBytes;
    this.maxFiles = maxFiles;
    this.currentBytes = 0;
    ensureDir(path.dirname(filePath));
    if (fs.existsSync(filePath)) {
      this.rotateFiles();
    }
    this.stream = fs.createWriteStream(filePath, { flags: "a" });
  }

  write(text) {
    if (!text) {
      return;
    }
    const bytes = Buffer.byteLength(text);
    if (this.currentBytes > 0 && this.currentBytes + bytes > this.maxBytes) {
      this.rotate();
    }
    this.stream.write(text);
    this.currentBytes += bytes;
  }

  rotate() {
    if (this.stream) {
      this.stream.end();
    }
    this.rotateFiles();
    this.currentBytes = 0;
    this.stream = fs.createWriteStream(this.filePath, { flags: "a" });
  }

  rotatedPath(index) {
    const parsed = path.parse(this.filePath);
    return path.join(parsed.dir, `${parsed.name}.${index}${parsed.ext}`);
  }

  rotateFiles() {
    for (let index = this.maxFiles - 1; index >= 1; index -= 1) {
      const from = this.rotatedPath(index);
      const to = this.rotatedPath(index + 1);
      if (fs.existsSync(from)) {
        if (index + 1 > this.maxFiles) {
          removePath(from);
        } else {
          removePath(to);
          fs.renameSync(from, to);
        }
      }
    }
    if (fs.existsSync(this.filePath)) {
      const firstRotated = this.rotatedPath(1);
      removePath(firstRotated);
      fs.renameSync(this.filePath, firstRotated);
    }
  }

  close() {
    if (this.stream) {
      this.stream.end();
    }
  }
}

function extractQuotedMsg(line) {
  const match = line.match(/\bmsg="((?:\\.|[^"])*)"/);
  if (!match) {
    return undefined;
  }
  try {
    return JSON.parse(`"${match[1]}"`);
  } catch {
    return match[1];
  }
}

function extractMarkerPayload({ line, prefix }) {
  const quotedMsg = extractQuotedMsg(line);
  const candidates = quotedMsg ? [quotedMsg, line] : [line];

  for (const candidate of candidates) {
    const index = candidate.indexOf(prefix);
    if (index === -1) {
      continue;
    }
    const payload = candidate.slice(index + prefix.length).trim();
    if (payload.startsWith("{")) {
      try {
        return JSON.stringify(JSON.parse(payload));
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

function writeMarkerPayloads({ chunk, buffers, writers }) {
  for (const marker of MARKERS) {
    const combined = buffers.get(marker.prefix) + chunk;
    const lines = combined.split(/\r?\n/);
    buffers.set(marker.prefix, lines.pop() ?? "");
    const writer = writers.get(marker.prefix);
    if (!writer) {
      continue;
    }
    for (const line of lines) {
      const payload = extractMarkerPayload({ line, prefix: marker.prefix });
      if (payload) {
        writer.write(`${payload}\n`);
      }
    }
  }
}

const { service, command, commandArgs } = parseArgs(process.argv.slice(2));
const safeService = safeName(service);
const logRoot = path.resolve(REPO_ROOT, process.env.AGORA_LOG_DIR ?? ".local/logs");
const runsDir = path.join(logRoot, "runs");
const latestDir = path.join(logRoot, "latest");
const runId = safeName(process.env.AGORA_LOG_RUN_ID ?? defaultRunId());
const runDir = path.join(runsDir, runId);
const maxBytes = parsePositiveInteger(process.env.AGORA_LOG_MAX_BYTES, DEFAULT_MAX_BYTES);
const maxFiles = parsePositiveInteger(process.env.AGORA_LOG_MAX_FILES, DEFAULT_MAX_FILES);
const retentionDays = parsePositiveInteger(
  process.env.AGORA_LOG_RETENTION_DAYS,
  DEFAULT_RETENTION_DAYS,
);
const maxTotalBytes = parsePositiveInteger(
  process.env.AGORA_LOG_MAX_TOTAL_BYTES,
  DEFAULT_MAX_TOTAL_BYTES,
);

ensureDir(runDir);
ensureDir(latestDir);

const mainLogPath = path.join(runDir, `${safeService}.log`);
const latestMainLogPath = path.join(latestDir, `${safeService}.log`);
linkLatest({ sourcePath: mainLogPath, latestPath: latestMainLogPath });

const markerWriters = new Map();
const markerBuffers = new Map();
const markerPaths = new Map();
for (const marker of MARKERS) {
  const markerPath = path.join(runDir, `${safeService}${marker.suffix}`);
  const latestMarkerPath = path.join(latestDir, `${safeService}${marker.suffix}`);
  markerPaths.set(marker.envName, markerPath);
  markerBuffers.set(marker.prefix, "");
  markerWriters.set(
    marker.prefix,
    new RotatingLogWriter({ filePath: markerPath, maxBytes, maxFiles }),
  );
  linkLatest({ sourcePath: markerPath, latestPath: latestMarkerPath });
}

const summaryPath = path.join(runDir, `${safeService}.summary.json`);
const latestSummaryPath = path.join(latestDir, `${safeService}.summary.json`);
removePath(latestSummaryPath);

pruneLogs({ runsDir, currentRunDir: runDir, retentionDays, maxTotalBytes });

const mainWriter = new RotatingLogWriter({ filePath: mainLogPath, maxBytes, maxFiles });
const header = [
  `# service=${safeService}`,
  `# run_id=${runId}`,
  `# started_at=${new Date().toISOString()}`,
  `# command=${[command, ...commandArgs].join(" ")}`,
  "",
].join("\n");
mainWriter.write(header);

const childEnv = {
  ...process.env,
  AGORA_LOG_DIR: logRoot,
  AGORA_LOG_RUN_ID: runId,
  AGORA_LOG_RUN_DIR: runDir,
  AGORA_LOG_LATEST_DIR: latestDir,
  AGORA_LOG_SERVICE: safeService,
  AGORA_LOG_FILE: mainLogPath,
  AGORA_LOG_SUMMARY_FILE: summaryPath,
};
for (const [envName, markerPath] of markerPaths.entries()) {
  childEnv[envName] = markerPath;
}

console.error(`[dev-log] ${safeService}: ${path.relative(REPO_ROOT, mainLogPath)}`);

const child = spawn(command, commandArgs, {
  cwd: REPO_ROOT,
  env: childEnv,
  stdio: ["inherit", "pipe", "pipe"],
});

function handleChunk(stream, chunk) {
  const text = chunk.toString("utf8");
  stream.write(text);
  const plainText = stripAnsi(text);
  mainWriter.write(plainText);
  writeMarkerPayloads({ chunk: plainText, buffers: markerBuffers, writers: markerWriters });
}

child.stdout.on("data", (chunk) => handleChunk(process.stdout, chunk));
child.stderr.on("data", (chunk) => handleChunk(process.stderr, chunk));

child.on("error", (error) => {
  mainWriter.write(`\n[dev-log] failed to start child process: ${error.message}\n`);
  console.error(`[dev-log] failed to start child process: ${error.message}`);
});

child.on("close", (code, signal) => {
  const endedAt = new Date().toISOString();
  mainWriter.write(`\n# ended_at=${endedAt}\n# exit_code=${code ?? ""}\n# signal=${signal ?? ""}\n`);
  mainWriter.close();
  for (const writer of markerWriters.values()) {
    writer.close();
  }
  if (fs.existsSync(summaryPath)) {
    linkLatest({ sourcePath: summaryPath, latestPath: latestSummaryPath });
  }
  if (signal) {
    process.kill(process.pid, signal);
  }
  process.exit(code ?? 1);
});
