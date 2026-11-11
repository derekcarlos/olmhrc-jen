import test from "node:test";
import assert from "node:assert/strict";
import { readingChoice, eveningContext, weekStart } from "../src/lib/reading-selection.mjs";
import { buildUpcomingSnapshot, upcomingCalendar, upcomingReading } from "../src/lib/upcoming-readings.mjs";
import { validateSnapshot } from "../src/lib/readings.mjs";
import { buildAcclamationCalendar } from "../src/lib/gospel-acclamations.mjs";
import { acclamationView } from "../src/lib/gospel-acclamation-client.mjs";

test("upcoming first: a weekday solemnity takes precedence over the coming Sunday", async () => {
  const calendar = await upcomingCalendar([2026, 2027]);
  assert.equal(readingChoice(calendar, new Date("2026-12-07T00:00:00Z")).date, "2026-12-08");
  assert.equal(readingChoice(calendar, new Date("2026-11-11T00:00:00Z")).date, "2026-11-15");
  assert.equal(readingChoice(calendar, new Date("2027-02-09T12:00:00Z")).date, "2027-02-10");
});
test("regular Sunday retires at 6 PM; Simbang Gabi Sunday remains through midnight", async () => {
  const calendar = await upcomingCalendar([2026, 2027]);
  assert.equal(readingChoice(calendar, new Date("2026-11-15T09:59:59Z")).date, "2026-11-15");
  assert.equal(readingChoice(calendar, new Date("2026-11-15T10:00:00Z")).date, "2026-11-22");
  assert.equal(readingChoice(calendar, new Date("2026-12-20T13:30:00Z")).date, "2026-12-20");
});
test("evening contexts are explicit: Saturday, Simbang Gabi, Christmas Eve, and Vigil", () => {
  assert.equal(eveningContext(new Date("2026-11-14T09:59:59Z")), "day");
  assert.equal(eveningContext(new Date("2026-11-14T10:00:00Z")), "anticipated");
  assert.equal(eveningContext(new Date("2026-12-15T09:59:59Z")), "day");
  assert.equal(eveningContext(new Date("2026-12-15T10:00:00Z")), "anticipated");
  assert.equal(eveningContext(new Date("2026-12-20T13:30:00Z")), "day");
  assert.equal(eveningContext(new Date("2026-12-24T10:00:00Z")), "christmas-vigil");
  assert.equal(eveningContext(new Date("2027-03-27T10:00:00Z"), "holy_saturday"), "easter-vigil");
  const christmasSunday = readingChoice([{ date: "2028-12-24", id: "christmas_eve" }, { date: "2028-12-25", id: "nativity_of_the_lord" }], new Date("2028-12-24T10:00:00Z"));
  assert.deepEqual(christmasSunday, { date: "2028-12-24", mass: "christmas-vigil" });
});
test("date pages retain both daytime and anticipated Simbang Gabi readings", async () => {
  const r = await upcomingReading("2026-12-15");
  const night = r.masses.find(m => m.id === "anticipated");
  assert.equal(night.reading_date, "2026-12-16");
  assert.notEqual(night.sections[0].reference, r.masses[0].sections[0].reference);
  assert.ok(r.masses[0].sections.length >= 4);
});
test("Christmas Eve selects the proper Vigil; Holy Saturday retains every Vigil reading", async () => {
  const eve = await upcomingReading("2026-12-24");
  assert.match(eve.masses.find(m => m.id === "christmas-vigil").label, /Vigil/);
  assert.equal(eve.masses.find(m => m.id === "christmas-vigil").reading_date, "2026-12-25");
  const vigil = await upcomingReading("2027-03-27");
  assert.equal(vigil.sections.length, 17);
  const thursday = await upcomingReading("2027-03-25");
  assert.equal(thursday.masses.length, 2);
});
test("a two-week snapshot includes the upcoming and following Sunday, with valid rich readings", async () => {
  const s = await buildUpcomingSnapshot({ now: new Date("2026-12-07T00:00:00Z") });
  assert.equal(s.mode, "upcoming-celebrations");
  assert.ok(s.dates.includes("2026-12-08"));
  assert.ok(s.dates.includes("2026-12-13"));
  assert.ok(s.dates.includes("2026-12-20"));
  assert.ok(validateSnapshot(s));
  assert.equal(weekStart("2026-12-13"), "2026-12-07");
});

test("the Gospel verse uses daytime before 6 PM and the anticipated source afterward", async () => {
  const calendar = await buildAcclamationCalendar({ from: "2026-12-15", days: 10 });
  const before = acclamationView(calendar, "alleluia", new Date("2026-12-15T09:59:59Z"));
  const after = acclamationView(calendar, "alleluia", new Date("2026-12-15T10:00:00Z"));
  assert.equal(before.reading_date, "2026-12-15");
  assert.equal(after.reading_date, "2026-12-16");
  assert.notEqual(before.verse, after.verse);
  assert.equal(acclamationView(calendar, "alleluia", new Date("2026-12-20T13:30:00Z")).reading_date, "2026-12-20");
  const christmas = acclamationView(calendar, "alleluia", new Date("2026-12-24T10:00:00Z"));
  assert.equal(christmas.reading_date, "2026-12-25");
  assert.match(christmas.context, /Bisperas/);
});
