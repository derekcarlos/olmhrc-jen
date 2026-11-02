import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  readdirSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

process.chdir(fileURLToPath(new URL("../", import.meta.url)));
process.env.GIT_TERMINAL_PROMPT = "0";
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 18))
  throw new Error("Use Node 22.18 or newer (tested with 22.23.4).");
const snapshot = "src/data/readings/snapshot.json";
const lock = resolve(".astro/readings-publish.lock");
mkdirSync(resolve(".astro"), { recursive: true });
try {
  mkdirSync(lock);
} catch (error) {
  if (error.code === "EEXIST")
    throw new Error(
      `Another readings job may be running. Inspect ${lock} before removing a stale lock.`,
    );
  throw error;
}
writeFileSync(
  resolve(lock, "owner.json"),
  JSON.stringify({ pid: process.pid, started: new Date().toISOString() }),
);

function command(program, args, capture = false) {
  const result = spawnSync(program, args, {
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `${program} ${args.join(" ")} failed (${result.status}). ${capture ? result.stderr : "See output above."}`,
    );
  return result.stdout?.trim() || "";
}
const git = (...args) => command("git", args, true);
let previous,
  prepared = false,
  staged = false,
  committed = false;
try {
  if (git("branch", "--show-current") !== "main")
    throw new Error("The readings job must run on main.");
  if (git("status", "--porcelain", "--untracked-files=no"))
    throw new Error(
      "Tracked files have uncommitted changes. Commit or resolve them before running the readings job.",
    );
  command("git", ["fetch", "origin", "main"]);
  const aheadFiles = git("log", "--format=", "--name-only", "FETCH_HEAD..HEAD")
    .split("\n")
    .filter(Boolean);
  if (aheadFiles.some((file) => file !== snapshot))
    throw new Error(
      "Unpushed commits include unrelated files. Review and push those commits manually before using the readings job.",
    );
  command("git", ["pull", "--ff-only", "origin", "main"]);
  previous = existsSync(snapshot) ? readFileSync(snapshot) : null;
  prepared = true;
  command("pnpm", ["install", "--frozen-lockfile"]);
  command("pnpm", ["run", "readings:sync"]);
  const tests = readdirSync("tests")
    .filter((file) => file.endsWith(".test.mjs"))
    .map((file) => `tests/${file}`);
  command(process.execPath, ["--test", ...tests]);
  command("pnpm", ["run", "check"]);
  command("pnpm", ["run", "build"]);
  command(process.execPath, ["tests/readings.integration.mjs"]);
  command("git", ["add", "--", snapshot]);
  staged = true;
  const change = git("diff", "--cached", "--name-only", "--", snapshot);
  if (change) {
    command("git", [
      "commit",
      "-m",
      "Update Filipino readings snapshot",
      "--",
      snapshot,
    ]);
    committed = true;
  } else console.log("No reading content changes to commit.");
  command("git", ["push", "origin", "main"]);
  console.log("Readings job finished successfully.");
} catch (error) {
  if (prepared && !committed) {
    if (staged) command("git", ["reset", "-q", "HEAD", "--", snapshot]);
    if (previous === null) rmSync(snapshot, { force: true });
    else writeFileSync(snapshot, previous);
  }
  console.error(error.message);
  process.exitCode = 1;
} finally {
  rmSync(lock, { recursive: true, force: true });
}
