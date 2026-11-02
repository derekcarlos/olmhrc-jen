import test from "node:test";
import assert from "node:assert/strict";
import { refreshReadings } from "../src/lib/readings-sync.mjs";
import { reconcileSnapshot } from "../src/lib/readings.mjs";

test("failed bootstrap is an error, not a successful empty import", async () => {
  await assert.rejects(
    refreshReadings(
      null,
      "next-sunday",
      new Date("2026-11-02T01:00:00Z"),
      async () => ({ record: null, message: "Source failed" }),
    ),
    /failed/i,
  );
});
test("unpublished dates can bootstrap a truthful unavailable window", async () => {
  const result = await refreshReadings(
    null,
    "next-sunday",
    new Date("2026-11-02T01:00:00Z"),
    async () => ({ record: null, unavailable: true, message: "Not published" }),
  );
  assert.deepEqual(result.dates, ["2026-11-08"]);
  assert.equal(result.records.length, 0);
  assert.equal(result.errors[0].date, "2026-11-08");
});
test("source outage retains an evaluated baseline and reports failures per date", async () => {
  const previous = reconcileSnapshot(
    null,
    [],
    "next-seven-days",
    new Date("2026-11-02T01:00:00Z"),
  );
  const calls = [];
  const result = await refreshReadings(
    previous,
    "next-seven-days",
    new Date("2026-11-03T01:00:00Z"),
    async (date) => {
      calls.push(date);
      return { record: null, message: "Failed" };
    },
  );
  assert.equal(calls.length, 7);
  assert.equal(result.errors.length, 7);
  assert.equal(result.dates[0], "2026-11-03");
  assert.equal(result.dates[6], "2026-11-09");
});
