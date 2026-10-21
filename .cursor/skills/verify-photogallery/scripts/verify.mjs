import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(skillDir, "../../..");
const runsDir = resolve(skillDir, "runs");
const currentPath = resolve(runsDir, "current.json");
const port = 8797;
const bucket = "photogallery-media";
const imageKey = "2024-08-02T12-00-00.png";
const videoKey = "2023-05-01T08-30-00.mp4";
const seededKeys = [imageKey, videoKey];

const png = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
  0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f,
  0x00, 0x05, 0xfe, 0x02, 0xfe, 0xdc, 0xcc, 0x59, 0xe7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
  0x44, 0xae, 0x42, 0x60, 0x82,
]);

const video = Buffer.alloc(1024, 0);
for (let i = 0; i < video.length; i++) video[i] = i % 256;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readCurrent() {
  if (!existsSync(currentPath)) return null;
  return JSON.parse(readFileSync(currentPath, "utf8"));
}

function writeCurrent(state) {
  mkdirSync(runsDir, { recursive: true });
  writeFileSync(currentPath, JSON.stringify(state, null, 2));
}

function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function listenerPids(targetPort) {
  const output = execFileSync("netstat", ["-ano"], { encoding: "utf8" });
  const pids = new Set();
  for (const line of output.split(/\r?\n/)) {
    if (!line.includes("LISTENING") || !line.includes(`:${targetPort}`)) continue;
    const pid = Number(line.trim().split(/\s+/).at(-1));
    if (Number.isInteger(pid)) pids.add(pid);
  }
  return [...pids];
}

function descendantPids(rootPid) {
  const output = execFileSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      `$queue = New-Object System.Collections.Generic.Queue[int]; $queue.Enqueue(${rootPid}); $seen = New-Object System.Collections.Generic.List[int]; while ($queue.Count -gt 0) { $id = $queue.Dequeue(); if ($seen -contains $id) { continue }; $seen.Add($id); Get-CimInstance Win32_Process -Filter "ParentProcessId=$id" | ForEach-Object { $queue.Enqueue([int]$_.ProcessId) } }; $seen -join ','`,
    ],
    { encoding: "utf8" },
  );
  return output
    .trim()
    .split(",")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value));
}

function putObject(persist, key, file, contentType) {
  execFileSync(
    "pnpm",
    [
      "exec",
      "wrangler",
      "r2",
      "object",
      "put",
      `${bucket}/${key}`,
      "--file",
      file,
      "--content-type",
      contentType,
      "--local",
      "--persist-to",
      persist,
      "--force",
    ],
    { cwd: repoRoot, stdio: "inherit" },
  );
}

async function seed(persist) {
  const { default: sharp } = await import("sharp");
  const fixtureDir = resolve(persist, "..", "fixtures");
  mkdirSync(fixtureDir, { recursive: true });
  const pngPath = resolve(fixtureDir, "verify.png");
  const videoPath = resolve(fixtureDir, "clip.mp4");
  const thumbPath = resolve(fixtureDir, "thumb.webp");
  writeFileSync(pngPath, png);
  writeFileSync(videoPath, video);
  const thumb = await sharp(png)
    .resize({ width: 320, height: 320, fit: "inside", withoutEnlargement: false })
    .webp()
    .toBuffer();
  writeFileSync(thumbPath, thumb);
  putObject(persist, imageKey, pngPath, "image/png");
  putObject(persist, "t/2024-08-02T12-00-00.webp", thumbPath, "image/webp");
  putObject(persist, videoKey, videoPath, "video/mp4");
  putObject(persist, "t/2023-05-01T08-30-00.webp", thumbPath, "image/webp");
}

async function waitUntilReady(url, child) {
  const deadline = Date.now() + 90_000;
  let lastError = "no response";
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      fail(`dev server exited with code ${child.exitCode} before ${url} was ready`);
    }
    try {
      const response = await fetch(url);
      const html = await response.text();
      if (response.status === 200 && html.includes("フォトギャラリー")) return;
      lastError = `status ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  }
  fail(`timed out waiting for ${url} (${lastError})`);
}

async function launch() {
  const empty = process.argv.includes("--empty");
  const existing = readCurrent();
  if (existing && pidAlive(existing.pid)) {
    fail(
      `a verification server is already running as pid ${existing.pid} at ${existing.url}. Clean it up before launching another.`,
    );
  }
  if (listenerPids(port).length > 0) {
    fail(
      `127.0.0.1:${port} is already in use. Refusing to start a second server on the verification port.`,
    );
  }

  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const runDir = resolve(runsDir, runId);
  const persist = resolve(runDir, "state");
  const logPath = resolve(runDir, "dev.log");
  mkdirSync(persist, { recursive: true });
  if (!empty) await seed(persist);

  const logFd = openSync(logPath, "a");
  const child = spawn(`pnpm dev -- --host 127.0.0.1 --port ${port} --strictPort`, [], {
    cwd: repoRoot,
    env: { ...process.env, PHOTOGALLERY_PERSIST: persist },
    shell: true,
    detached: true,
    stdio: ["ignore", logFd, logFd],
    windowsHide: true,
  });
  child.unref();
  const state = {
    runId,
    pid: child.pid,
    port,
    url: `http://127.0.0.1:${port}`,
    persist,
    log: logPath,
    repoRoot,
    seeded: !empty,
  };
  writeCurrent(state);
  return waitUntilReady(state.url, child).then(() => {
    const listeners = listenerPids(port);
    const tree = descendantPids(child.pid);
    if (!listeners.some((pid) => tree.includes(pid))) {
      fail(
        `server answered ${state.url} but the listener is not in pid ${child.pid}'s process tree (${listeners.join(",") || "none"})`,
      );
    }
    console.log(JSON.stringify(state, null, 2));
    process.exit(0);
  });
}

function keysFromGroups(body) {
  if (!body || typeof body !== "object" || !Array.isArray(body.groups)) return null;
  const keys = [];
  for (const group of body.groups) {
    if (!group || typeof group !== "object" || !Array.isArray(group.items)) return null;
    for (const item of group.items) {
      if (!item || typeof item.bodyKey !== "string") return null;
      keys.push(item.bodyKey);
    }
  }
  return keys;
}

async function doctor() {
  const state = readCurrent();
  if (!state) fail("no verification server is recorded. Launch one before doctor.");
  if (!pidAlive(state.pid)) fail(`recorded pid ${state.pid} is not running`);
  const defaultPersist = resolve(repoRoot, ".wrangler", "state");
  if (resolve(state.persist) === defaultPersist) {
    fail("recorded persist path is the shared .wrangler/state directory");
  }
  const listeners = listenerPids(state.port);
  const tree = descendantPids(state.pid);
  if (!listeners.some((pid) => tree.includes(pid))) {
    fail(`port ${state.port} is not owned by pid ${state.pid}`);
  }
  const page = await fetch(state.url);
  const html = await page.text();
  if (
    page.status !== 200 ||
    !html.includes("フォトギャラリー") ||
    !html.includes("ローカルプレビュー")
  ) {
    fail(`GET / did not return the local gallery (status ${page.status})`);
  }
  const list = await fetch(`${state.url}/api/media`);
  const body = await list.json();
  const keys = keysFromGroups(body);
  if (list.status !== 200 || !keys) fail("GET /api/media did not return groups");
  if (state.seeded) {
    for (const key of seededKeys) {
      if (!keys.includes(key)) fail(`seeded bodyKey ${key} is missing from /api/media`);
    }
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        url: state.url,
        pid: state.pid,
        persist: state.persist,
        seeded: state.seeded,
        keys,
      },
      null,
      2,
    ),
  );
}

function cleanup() {
  const state = readCurrent();
  if (!state) {
    console.log("nothing to clean up");
    return;
  }
  if (pidAlive(state.pid)) {
    execFileSync("taskkill", ["/PID", String(state.pid), "/T", "/F"], { stdio: "inherit" });
  }
  const runDir = resolve(runsDir, state.runId);
  if (existsSync(runDir)) {
    let removed = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        rmSync(runDir, { recursive: true, force: true });
        removed = true;
        break;
      } catch (error) {
        if (attempt === 9) throw error;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300);
      }
    }
    if (!removed) fail(`could not remove ${runDir}`);
  }
  rmSync(currentPath, { force: true });
  console.log(
    `cleaned ${state.runId}; artifacts under ${resolve(skillDir, "artifacts")} were kept`,
  );
}

const command = process.argv[2];
if (command === "launch") {
  launch().catch((error) =>
    fail(error instanceof Error ? (error.stack ?? error.message) : String(error)),
  );
} else if (command === "doctor") {
  doctor().catch((error) => fail(error instanceof Error ? error.message : String(error)));
} else if (command === "cleanup") {
  cleanup();
} else {
  fail(
    "usage: node .cursor/skills/verify-photogallery/scripts/verify.mjs <launch|doctor|cleanup> [--empty]",
  );
}
