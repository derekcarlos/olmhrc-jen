import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { acclamationForDate, acclamationVerse, buildAcclamationCalendar } from "../src/lib/gospel-acclamations.mjs";

test("verse extraction removes only Alleluia refrains and preserves verse line breaks", () => {
  assert.equal(acclamationVerse([{ type: "stanza", text: "Aleluya! ALeluya!\nHalina’t kami’y dalawin.\nKapayapaan mo’y dalhin\n\nupang umiral sa amin.\nAleluya! Aleluya!" }]), "Halina’t kami’y dalawin.\nKapayapaan mo’y dalhin\n\nupang umiral sa amin.");
  assert.equal(acclamationVerse([{ type: "stanza", text: "Ang tao ay nabubuhay\nhindi lamang sa tinapay" }]), "Ang tao ay nabubuhay\nhindi lamang sa tinapay");
});

test("Sunday and weekday verses resolve independently of the Sunday snapshot", async () => {
  const sunday = await acclamationForDate("2026-11-15");
  assert.equal(sunday.setting, "alleluia");
  assert.equal(sunday.lectionary_key, "year-a/ordinary_time_33_sunday");
  assert.match(sunday.verse, /Sa Poon ay manatili/);
  assert.doesNotMatch(sunday.verse, /Aleluya/i);
  const weekday = await acclamationForDate("2026-11-10");
  assert.equal(weekday.reading_date, weekday.date);
  assert.equal(weekday.status, "available");
  assert.match(weekday.lectionary_key, /^weekday-2\//);
});

test("Simbang Gabi anticipates the next day except on Sunday evenings", async () => {
  const first = await acclamationForDate("2026-12-15");
  assert.equal(first.reading_date, "2026-12-16");
  assert.equal(first.context, "Simbang Gabi · 7:30 PM");
  assert.match(first.verse, /Halina’t kami’y dalawin/);
  const saturday = await acclamationForDate("2026-12-19");
  assert.equal(saturday.reading_date, "2026-12-20");
  assert.equal(saturday.lectionary_key, "year-b/advent_4_sunday");
  const sunday = await acclamationForDate("2026-12-20");
  assert.equal(sunday.reading_date, "2026-12-20");
  assert.equal(sunday.verse, saturday.verse);
  const last = await acclamationForDate("2026-12-23");
  assert.equal(last.reading_date, "2026-12-24");
  assert.match(last.verse, /Sinag ng bukang-liwayway/);
  assert.equal((await acclamationForDate("2026-12-14")).reading_date, "2026-12-14");
  const future = await acclamationForDate("2027-12-15");
  assert.equal(future.reading_date, "2027-12-16");
  assert.ok(future.source_date.endsWith("12-16"));
  assert.equal(future.verse, first.verse, "December 16's proper verse is reused, not a different Advent weekday");
});

test("Lent uses Misa Pasyon; Easter returns to Alleluia and never uses the Sequence as the verse", async () => {
  const ash = await acclamationForDate("2027-02-10");
  assert.equal(ash.setting, "lent");
  assert.match(ash.verse, /Kapag ngayo’y napakinggan/);
  const sunday = await acclamationForDate("2027-02-14");
  assert.equal(sunday.setting, "lent");
  assert.equal(sunday.reference, "Mateo 4, 4b");
  assert.equal((await acclamationForDate("2027-03-26")).setting, "lent");
  const easter = await acclamationForDate("2027-03-28");
  assert.equal(easter.setting, "alleluia");
  assert.doesNotMatch(easter.verse, /Aleluya|Sa piging/i);
  assert.ok(easter.verse.length > 10);
});

test("explicit Mass overrides handle distinct Christmas Masses without guessing", async () => {
  const record = await acclamationForDate("2026-12-24", { overrides: { "2026-12-24": { reading_date: "2026-12-25", mass_label: "Mass During the Midnight (White)" } } });
  assert.equal(record.reading_date, "2026-12-25");
  assert.equal(record.status, "available");
});

test("a missing source is dated unavailable, never silently another day's verse", async () => {
  const record = await acclamationForDate("2026-11-15", { readEntry: () => undefined });
  assert.equal(record.status, "unavailable");
  assert.equal(record.date, "2026-11-15");
  assert.equal(record.verse, undefined);
  const calendar = await buildAcclamationCalendar({ from: "2026-12-15", days: 10 });
  assert.equal(calendar.records.length, 10);
  assert.equal(calendar.records.at(-1).date, "2026-12-24");
});

test("manual Bash updater is offline, repeatable, supports dry runs, and preserves songs and readings snapshot", () => {
  mkdirSync(".astro", { recursive: true });
  const dir = mkdtempSync(resolve(".astro/acclamation-test-"));
  const output = join(dir, "verses.json");
  const hook = join(dir, "offline.mjs");
  writeFileSync(hook, "globalThis.fetch=()=>{throw new Error('No downloads allowed')};");
  const protectedPaths = ["src/data/readings/snapshot.json", "scripts/publish-readings.sh", "src/content/songs/gospel-acclamation-missa-magnificat.mdx", "src/content/songs/gospel-acclamation-misa-pasyon.mdx"];
  const before = protectedPaths.map(path => readFileSync(path, "utf8"));
  const run = (...args) => spawnSync("bash", ["scripts/update-gospel-acclamations.sh", `--output=${output}`, ...args], { encoding: "utf8", env: { ...process.env, NODE_OPTIONS: `--import=${hook}` } });
  try {
    let result = run("--from=2026-12-15", "--days=10");
    assert.equal(result.status, 0, result.stderr);
    const saved = readFileSync(output, "utf8");
    result = run("--from=2026-12-15", "--days=10");
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(output, "utf8"), saved);
    result = run("--from=2027-02-10", "--days=7", "--dry-run");
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(output, "utf8"), saved);
    result = run("--from=2026-02-30");
    assert.notEqual(result.status, 0);
    assert.equal(readFileSync(output, "utf8"), saved);
    assert.deepEqual(protectedPaths.map(path => readFileSync(path, "utf8")), before);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
