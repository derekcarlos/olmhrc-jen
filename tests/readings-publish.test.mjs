import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
  copyFileSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

const env = {
  ...process.env,
  GIT_AUTHOR_NAME: "Readings test",
  GIT_AUTHOR_EMAIL: "readings@example.invalid",
  GIT_COMMITTER_NAME: "Readings test",
  GIT_COMMITTER_EMAIL: "readings@example.invalid",
};
function run(cwd, command, args) {
  return spawnSync(command, args, { cwd, env, encoding: "utf8" });
}
function git(cwd, ...args) {
  const r = run(cwd, "git", args);
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
}
function fixture(failBuild = false) {
  mkdirSync(resolve(".astro"), { recursive: true });
  const dir = mkdtempSync(resolve(".astro/readings-publish-test-"));
  const repo = join(dir, "repo"),
    remote = join(dir, "remote.git");
  mkdirSync(repo);
  git(dir, "init", "--bare", "--initial-branch=main", remote);
  git(repo, "init", "--initial-branch=main");
  git(repo, "remote", "add", "origin", remote);
  mkdirSync(join(repo, "scripts"));
  mkdirSync(join(repo, "tests"));
  copyFileSync(
    "scripts/publish-readings.mjs",
    join(repo, "scripts/publish-readings.mjs"),
  );
  writeFileSync(join(repo, ".gitignore"), ".astro/\nnode_modules/\n");
  writeFileSync(join(repo, "README.md"), "Original tracked file\n");
  writeFileSync(
    join(repo, "package.json"),
    JSON.stringify({
      private: true,
      type: "module",
      scripts: {
        "readings:sync": "node download.mjs",
        check: 'node -e "process.exit(0)"',
        build: `node -e "process.exit(${failBuild ? 1 : 0})"`,
      },
    }),
  );
  writeFileSync(
    join(repo, "pnpm-lock.yaml"),
    "lockfileVersion: '9.0'\nsettings:\n  autoInstallPeers: true\n  excludeLinksFromLockfile: false\nimporters:\n  .: {}\n",
  );
  writeFileSync(
    join(repo, "download.mjs"),
    'import{mkdirSync,writeFileSync}from"node:fs";mkdirSync("src/data/readings",{recursive:true});writeFileSync("src/data/readings/snapshot.json",JSON.stringify({fixture:"original test data"})+"\\n");',
  );
  writeFileSync(
    join(repo, "tests/snapshot.test.mjs"),
    'import assert from "node:assert/strict";import{readFileSync}from"node:fs";assert.equal(JSON.parse(readFileSync("src/data/readings/snapshot.json")).fixture,"original test data");',
  );
  copyFileSync(
    join(repo, "tests/snapshot.test.mjs"),
    join(repo, "tests/readings.integration.mjs"),
  );
  git(repo, "add", ".");
  git(repo, "commit", "-m", "Fixture baseline");
  git(repo, "push", "-u", "origin", "main");
  writeFileSync(join(repo, "unrelated.txt"), "Leave this untracked\n");
  return { dir, repo, remote };
}
test("local job commits only the snapshot; repeating unchanged data creates no commit", () => {
  const f = fixture();
  try {
    const result = run(f.repo, process.execPath, [
      "scripts/publish-readings.mjs",
    ]);
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.equal(
      git(f.repo, "show", "--pretty=", "--name-only", "HEAD"),
      "src/data/readings/snapshot.json",
    );
    const head = git(f.repo, "rev-parse", "HEAD");
    assert.equal(
      git(f.repo, "ls-remote", "origin", "refs/heads/main").split(/\s/)[0],
      head,
    );
    assert.ok(git(f.repo, "status", "--short").includes("?? unrelated.txt"));
    const repeat = run(f.repo, process.execPath, [
      "scripts/publish-readings.mjs",
    ]);
    assert.equal(repeat.status, 0, repeat.stderr + repeat.stdout);
    assert.equal(git(f.repo, "rev-parse", "HEAD"), head);
  } finally {
    rmSync(f.dir, { recursive: true, force: true });
  }
});
test("failed validation restores the job's snapshot and does not publish", () => {
  const f = fixture(true);
  try {
    mkdirSync(join(f.repo, "src/data/readings"), { recursive: true });
    const oldSnapshot =
      JSON.stringify({ fixture: "previous saved data" }) + "\n";
    writeFileSync(join(f.repo, "src/data/readings/snapshot.json"), oldSnapshot);
    git(f.repo, "add", "src/data/readings/snapshot.json");
    git(f.repo, "commit", "-m", "Previous snapshot");
    git(f.repo, "push", "origin", "main");
    const head = git(f.repo, "rev-parse", "HEAD");
    const result = run(f.repo, process.execPath, [
      "scripts/publish-readings.mjs",
    ]);
    assert.notEqual(result.status, 0);
    assert.equal(git(f.repo, "rev-parse", "HEAD"), head);
    assert.equal(
      readFileSync(join(f.repo, "src/data/readings/snapshot.json"), "utf8"),
      oldSnapshot,
    );
    assert.equal(
      git(f.repo, "ls-remote", "origin", "refs/heads/main").split(/\s/)[0],
      head,
    );
  } finally {
    rmSync(f.dir, { recursive: true, force: true });
  }
});
test("local job refuses tracked edits before downloading", () => {
  const f = fixture();
  try {
    writeFileSync(join(f.repo, "README.md"), "User's pending edit\n");
    const result = run(f.repo, process.execPath, [
      "scripts/publish-readings.mjs",
    ]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /tracked|uncommitted/i);
    assert.equal(
      readFileSync(join(f.repo, "README.md"), "utf8"),
      "User's pending edit\n",
    );
  } finally {
    rmSync(f.dir, { recursive: true, force: true });
  }
});
test("local job does not publish unrelated commits already ahead of origin", () => {
  const f = fixture();
  try {
    writeFileSync(join(f.repo, "README.md"), "Local documentation commit\n");
    git(f.repo, "add", "README.md");
    git(f.repo, "commit", "-m", "Unrelated local change");
    const remoteHead = git(f.repo, "ls-remote", "origin", "refs/heads/main");
    const result = run(f.repo, process.execPath, [
      "scripts/publish-readings.mjs",
    ]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /unpushed|unrelated|ahead/i);
    assert.equal(
      git(f.repo, "ls-remote", "origin", "refs/heads/main"),
      remoteHead,
    );
  } finally {
    rmSync(f.dir, { recursive: true, force: true });
  }
});
