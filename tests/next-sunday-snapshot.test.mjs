import test from "node:test";
import assert from "node:assert/strict";
import {
  readFileSync,
  writeFileSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, join } from "node:path";
import { buildSundaySnapshot } from "../src/lib/next-sunday-snapshot.mjs";
import { validateSnapshot } from "../src/lib/readings.mjs";

test("Sunday-only updates skip intervening weekday solemnities", async () => {
  const snapshot = await buildSundaySnapshot({
    now: new Date("2026-12-07T00:00:00Z"),
  });
  assert.equal(snapshot.mode, "next-sunday");
  assert.deepEqual(snapshot.dates, ["2026-12-13"]);
  assert.equal(snapshot.records[0].lectionary_key, "year-b/advent_3_sunday");
});

test("Sunday target uses Manila dates and changes cycle at Advent", async () => {
  const a = await buildSundaySnapshot({
    now: new Date("2026-11-15T15:59:59Z"),
  });
  assert.deepEqual(a.dates, ["2026-11-15"]);
  assert.equal(a.records[0].lectionary_key, "year-a/ordinary_time_33_sunday");
  const next = await buildSundaySnapshot({
    now: new Date("2026-11-15T16:00:00Z"),
  });
  assert.deepEqual(next.dates, ["2026-11-22"]);
  assert.equal(
    next.records[0].lectionary_key,
    "year-a/our_lord_jesus_christ_king_of_the_universe",
  );
  const advent = await buildSundaySnapshot({
    now: new Date("2026-11-23T00:00:00Z"),
  });
  assert.equal(advent.records[0].lectionary_key, "year-b/advent_1_sunday");
});
test("reading library is reusable beyond its original years with source provenance intact", async () => {
  const snapshot = await buildSundaySnapshot({
    now: new Date("2029-11-12T00:00:00Z"),
  });
  assert.deepEqual(snapshot.dates, ["2029-11-18"]);
  const r = snapshot.records[0];
  assert.equal(r.origin, "lectionary");
  assert.equal(r.lectionary_key, "year-a/ordinary_time_33_sunday");
  assert.notEqual(r.source_date, r.date);
  assert.ok(r.source_url.startsWith("https://www.awitatpapuri.com/"));
  assert.ok(validateSnapshot(snapshot));
});
test("Philippine Santo Niño replaces the underlying Ordinary Sunday", async () => {
  const snapshot = await buildSundaySnapshot({
    now: new Date("2027-01-11T00:00:00Z"),
  });
  assert.equal(snapshot.records[0].lectionary_key, "year-b/santo_nino");
});
test("Palm Sunday includes the procession and Passion as distinct steps", async () => {
  const snapshot = await buildSundaySnapshot({
    now: new Date("2027-03-15T00:00:00Z"),
  });
  assert.equal(snapshot.records[0].sections[0].type, "procession");
  assert.match(snapshot.records[0].sections.at(-1).reference, /^Marcos 14/);
  assert.ok(validateSnapshot(snapshot));
});
test("Pentecost keeps its Sequence, and ignores alternative short readings", async () => {
  const snapshot = await buildSundaySnapshot({
    now: new Date("2027-05-10T00:00:00Z"),
  });
  const types = snapshot.records[0].sections.map((s) => s.type);
  assert.ok(types.includes("sequence"));
  assert.equal(types.filter((t) => t === "gospel").length, 1);
  assert.ok(validateSnapshot(snapshot));
});
test("a missing proper Sunday never silently becomes the ordinary weekday", async () => {
  await assert.rejects(
    buildSundaySnapshot({
      now: new Date("2026-11-09T00:00:00Z"),
      readEntry: () => undefined,
    }),
    /missing|unavailable/i,
  );
});

test("Christmas Sunday chooses the Day Mass, not the vigil or first saved option", async () => {
  const snapshot = await buildSundaySnapshot({
    now: new Date("2033-12-19T00:00:00Z"),
  });
  assert.equal(snapshot.records[0].date, "2033-12-25");
  assert.equal(snapshot.records[0].selection_rule, "christmas-day");
  assert.match(snapshot.records[0].sections.at(-1).reference, /^Juan 1/);
});

test("All Souls is resolved even though it is excluded from the visible Calendar markers", async () => {
  const snapshot = await buildSundaySnapshot({
    now: new Date("2025-10-27T00:00:00Z"),
  });
  assert.equal(snapshot.records[0].date, "2025-11-02");
  assert.equal(
    snapshot.records[0].lectionary_key,
    "saints/commemoration_of_all_the_faithful_departed",
  );
});

test("missing mandatory Easter Sequence is rejected instead of silently publishing an incomplete liturgy", async () => {
  const input = JSON.parse(
    readFileSync("src/data/readings/lectionary/seasonal.json"),
  ).entries.easter_sunday;
  const entry = structuredClone(input);
  for (const mass of entry.masses)
    mass.sections = mass.sections.filter(
      (s) => s.type !== "acclamation" || s.heading === "ALELUYA",
    );
  await assert.rejects(
    buildSundaySnapshot({
      now: new Date("2027-03-22T00:00:00Z"),
      readEntry: () => entry,
    }),
    /Sequence/i,
  );
});

test("separate CLI is offline, repeatable, dry-runnable, and preserves its prior snapshot on failure", async () => {
  mkdirSync(resolve(".astro"), { recursive: true });
  const folder = mkdtempSync(resolve(".astro/sunday-job-test-"));
  const output = join(folder, "snapshot.json");
  const script = resolve("scripts/update-sunday-readings.mjs");
  const noNetwork = join(folder, "offline.mjs");
  writeFileSync(
    noNetwork,
    "globalThis.fetch=()=>{throw new Error('Network access is forbidden in this test')};",
  );
  const run = (...args) =>
    spawnSync(
      process.execPath,
      ["--import", noNetwork, script, `--output=${output}`, ...args],
      { encoding: "utf8" },
    );
  try {
    const first = run("--as-of=2026-11-09");
    assert.equal(first.status, 0, first.stderr);
    const original = readFileSync(output, "utf8");
    const same = run("--as-of=2026-11-10");
    assert.equal(same.status, 0, same.stderr);
    assert.match(same.stdout, /Unchanged/);
    assert.equal(readFileSync(output, "utf8"), original);
    const preview = run("--as-of=2026-11-16", "--dry-run");
    assert.equal(preview.status, 0, preview.stderr);
    assert.equal(readFileSync(output, "utf8"), original);
    const missing = run("--as-of=2029-01-08");
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /Missing lectionary/);
    assert.equal(readFileSync(output, "utf8"), original);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
