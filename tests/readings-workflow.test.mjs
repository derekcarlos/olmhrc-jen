import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

const env = {
  ...process.env,
  GIT_AUTHOR_NAME: "Readings test",
  GIT_AUTHOR_EMAIL: "readings@example.invalid",
  GIT_COMMITTER_NAME: "Readings test",
  GIT_COMMITTER_EMAIL: "readings@example.invalid",
};
function run(cwd, command, args, extra = {}) {
  return spawnSync(command, args, { cwd, env: { ...env, ...extra }, encoding: "utf8" });
}
function git(cwd, ...args) {
  const result = run(cwd, "git", args);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
function publicationScript() {
  const yaml = readFileSync(".github/workflows/update-sunday-readings.yml", "utf8");
  const block = yaml.split("      - name: Commit snapshot and request deployment\n")[1];
  assert.ok(block, "the publication step exists");
  return block.split("        run: |\n")[1].split("\n")
    .filter((line) => line.startsWith("          ") || !line.trim())
    .map((line) => line.slice(10)).join("\n");
}
function fixture() {
  mkdirSync(".astro", { recursive: true });
  const dir = mkdtempSync(resolve(".astro/weekly-readings-test-"));
  const repo = join(dir, "repo"), remote = join(dir, "remote.git"), bin = join(dir, "bin");
  mkdirSync(repo); mkdirSync(bin);
  git(dir, "init", "--bare", "--initial-branch=main", remote);
  git(repo, "init", "--initial-branch=main");
  git(repo, "remote", "add", "origin", remote);
  mkdirSync(join(repo, "src/data/readings"), { recursive: true });
  writeFileSync(join(repo, "src/data/readings/snapshot.json"), '{"fixture":1}\n');
  writeFileSync(join(repo, "README.md"), "Original\n");
  git(repo, "add", "."); git(repo, "commit", "-m", "Baseline");
  git(repo, "push", "origin", "main");
  writeFileSync(join(bin, "gh"), '#!/bin/bash\nset -eu\n[[ "$(git rev-parse HEAD)" == "$(git ls-remote origin refs/heads/main | cut -f1)" ]]\nprintf "%s\\n" "$*" >> "$DEPLOY_LOG"\n', { mode: 0o755 });
  const log = join(dir, "deployment.log");
  return { dir, repo, remote, log, execute: () => run(repo, "bash", ["-e", "-o", "pipefail", "-c", publicationScript()], { PATH: `${bin}:${env.PATH}`, DEPLOY_LOG: log }) };
}

test("weekly workflow publishes only the changed snapshot and dispatches deployment after pushing", () => {
  const f = fixture();
  try {
    writeFileSync(join(f.repo, "src/data/readings/snapshot.json"), '{"fixture":2}\n');
    writeFileSync(join(f.repo, "README.md"), "Unrelated pending change\n");
    const result = f.execute();
    assert.equal(result.status, 0, result.stderr);
    assert.equal(git(f.repo, "show", "--pretty=", "--name-only", "HEAD"), "src/data/readings/snapshot.json");
    assert.equal(readFileSync(f.log, "utf8").trim(), "workflow run deploy-to-github-pages.yml --ref main");
    const head = git(f.repo, "rev-parse", "HEAD");
    const repeat = f.execute();
    assert.equal(repeat.status, 0, repeat.stderr);
    assert.equal(git(f.repo, "rev-parse", "HEAD"), head);
    assert.equal(readFileSync(f.log, "utf8").trim().split("\n").length, 1);
  } finally { rmSync(f.dir, { recursive: true, force: true }); }
});

test("weekly workflow stops before deployment when the push is rejected", () => {
  const f = fixture();
  try {
    writeFileSync(join(f.remote, "hooks/pre-receive"), "#!/bin/sh\nexit 1\n", { mode: 0o755 });
    writeFileSync(join(f.repo, "src/data/readings/snapshot.json"), '{"fixture":2}\n');
    const result = f.execute();
    assert.notEqual(result.status, 0);
    assert.throws(() => readFileSync(f.log), /ENOENT/);
    assert.equal(git(f.repo, "rev-list", "--count", "origin/main"), "1");
  } finally { rmSync(f.dir, { recursive: true, force: true }); }
});
