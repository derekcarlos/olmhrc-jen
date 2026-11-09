import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  celebrationCalendar,
  celebrationReading,
  buildCelebrationSnapshot,
} from "../src/lib/readings-celebrations.mjs";
import { validateSnapshot } from "../src/lib/readings.mjs";
import { targetDates } from "../src/lib/readings.mjs";

test("calendar includes Sundays, all solemnities, Ash Wednesday and every Holy Week weekday", async () => {
  const days = await celebrationCalendar([2027]);
  for (const date of [
    "2027-01-01",
    "2027-02-10",
    "2027-03-21",
    "2027-03-22",
    "2027-03-23",
    "2027-03-24",
    "2027-03-25",
    "2027-03-26",
    "2027-03-27",
    "2027-12-08",
  ])
    assert.ok(
      days.some((d) => d.date === date),
      date,
    );
  assert.equal(
    days.some((d) => d.date === "2027-02-09"),
    false,
  );
});
test("Easter Vigil keeps seven Old Testament readings, their psalms, the Epistle and one Gospel step", async () => {
  const record = await celebrationReading("2027-03-27");
  assert.equal(record.sections.filter((s) => s.type === "gospel").length, 1);
  assert.equal(record.sections.filter((s) => s.type === "psalm").length, 8);
  assert.ok(record.sections.some((s) => s.type === "seventh"));
  assert.ok(record.sections.some((s) => s.type === "epistle"));
  assert.equal(
    new Set(record.sections.map((s) => s.id)).size,
    record.sections.length,
  );
  assert.ok(
    record.sections.some((s) => s.alternatives?.length),
    "long/short alternatives stay with their reading",
  );
});
test("distinct Christmas Masses remain selectable, with Day Mass as the default", async () => {
  const record = await celebrationReading("2026-12-25");
  assert.equal(record.masses.length, 4);
  assert.match(
    record.masses.find((m) => m.id === record.selected_mass).label,
    /During the Day/i,
  );
  assert.ok(record.masses.some((m) => /Vigil/i.test(m.label)));
});
test("Holy Thursday preserves Chrism and Lord's Supper Masses, defaulting to the Lord's Supper", async () => {
  const record = await celebrationReading("2027-03-25");
  assert.equal(record.masses.length, 2);
  assert.match(
    record.masses.find((m) => m.id === record.selected_mass).label,
    /Supper/i,
  );
});
test("next celebration can be a weekday solemnity and source dates remain historical", async () => {
  const snapshot = await buildCelebrationSnapshot({
    now: new Date("2026-12-07T00:00:00Z"),
  });
  assert.equal(snapshot.mode, "next-celebration");
  assert.deepEqual(snapshot.dates, ["2026-12-08"]);
  assert.ok(validateSnapshot(snapshot));
  const ash = await celebrationReading("2028-03-01");
  assert.equal(ash.lectionary_key, "seasonal/ash_wednesday");
  assert.notEqual(ash.source_date, ash.date);
});

test("Easter Octave weekdays have two readings despite their Romcal solemnity rank", async () => {
  const record = await celebrationReading("2027-03-29");
  assert.deepEqual(
    record.sections.map((s) => s.type),
    ["first", "psalm", "acclamation", "gospel"],
  );
});
test("Exaltation on Sunday uses the supplied Philippians option as the Second Reading", async () => {
  const record = await celebrationReading("2025-09-14");
  assert.match(
    record.sections.find((s) => s.type === "second").reference,
    /^Filipos 2/,
  );
  assert.equal(record.sections[0].alternatives?.length || 0, 0);
});

test("next celebration stays selected through the Manila day and advances after midnight", () => {
  const dates = ["2026-12-06", "2026-12-08", "2026-12-13"];
  assert.deepEqual(
    targetDates("next-celebration", new Date("2026-12-08T15:59:59Z"), dates),
    ["2026-12-08"],
  );
  assert.deepEqual(
    targetDates("next-celebration", new Date("2026-12-08T16:00:00Z"), dates),
    ["2026-12-13"],
  );
});

test("rich updater is offline and repeatable, preserves data on gaps, and legacy sync cannot flatten it", () => {
  mkdirSync(".astro", { recursive: true });
  const dir = mkdtempSync(resolve(".astro/celebration-job-test-"));
  const output = join(dir, "snapshot.json");
  const hook = join(dir, "offline.mjs");
  writeFileSync(
    hook,
    "globalThis.fetch=()=>{throw new Error('Network access forbidden')};",
  );
  const run = (...args) =>
    spawnSync(
      process.execPath,
      [
        "--import",
        hook,
        resolve("scripts/update-liturgical-readings.mjs"),
        `--output=${output}`,
        ...args,
      ],
      { encoding: "utf8" },
    );
  try {
    const result = run("--as-of=2026-11-10");
    assert.equal(result.status, 0, result.stderr);
    const before = readFileSync(output, "utf8");
    assert.ok(validateSnapshot(JSON.parse(before)));
    const same = run("--as-of=2026-11-11");
    assert.equal(same.status, 0, same.stderr);
    assert.equal(readFileSync(output, "utf8"), before);
    const missing = run("--as-of=2029-01-08");
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /Missing readings/);
    assert.equal(readFileSync(output, "utf8"), before);
    const vigil = run("--as-of=2027-03-27");
    assert.equal(vigil.status, 0, vigil.stderr);
    assert.equal(
      JSON.parse(readFileSync(output)).records[0].sections.length,
      17,
    );
    const original = readFileSync("src/data/readings/snapshot.json", "utf8");
    for (const args of [[], ["--from-lectionary"]]) {
      const legacy = spawnSync(
        process.execPath,
        ["--import", hook, "scripts/sync-readings.mjs", "--mode=next-celebration", ...args],
        { encoding: "utf8" },
      );
      assert.notEqual(legacy.status, 0);
      assert.match(legacy.stderr, /Use pnpm readings:update/);
      assert.equal(
        readFileSync("src/data/readings/snapshot.json", "utf8"),
        original,
      );
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
