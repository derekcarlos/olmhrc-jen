import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { parse } from "node-html-parser";
import matter from "gray-matter";
import { occurrencesForMonth, nextSevenDays } from "../src/lib/calendar.mjs";

const html = readFileSync("dist/calendar/index.html", "utf8");
const page = parse(html);
const calendar = page.querySelector("[data-chapel-calendar]");
assert(calendar, "Calendar component is built");
const events = JSON.parse(calendar.getAttribute("data-events"));
const embeddedYear = JSON.parse(calendar.getAttribute("data-liturgical-year"));
assert(
  embeddedYear.events.length > 50,
  "Initial year contains generated observances",
);
assert.equal(calendar.getAttribute("data-liturgical-base"), "/");
assert.equal(
  readdirSync("dist/calendar-data").filter((file) => file.endsWith(".json"))
    .length,
  201,
);
for (const year of [1900, 2026, 2027, 2028, 2100]) {
  const data = JSON.parse(
    readFileSync(`dist/calendar-data/${year}.json`, "utf8"),
  );
  assert.equal(data.year, year);
  assert(data.events.length > 50);
  assert(
    data.events.every(
      (event) => event.date.startsWith(`${year}-`) && event.all_day,
    ),
  );
}
const publishedIds = readdirSync("src/content/events")
  .filter(
    (file) =>
      !matter(readFileSync(`src/content/events/${file}`, "utf8")).data.draft,
  )
  .map((file) => file.replace(/\.md$/, ""));
assert.deepEqual(events.map((event) => event.id).sort(), publishedIds.sort());
for (const attribute of [
  "data-calendar-prev",
  "data-calendar-next",
  "data-calendar-today",
  "data-calendar-month",
  "data-calendar-agenda",
  "data-calendar-fallback",
  "data-calendar-data-state",
  "data-calendar-data-retry",
])
  assert(page.querySelector(`[${attribute}]`), attribute);
assert(page.querySelector("dialog[aria-labelledby=calendar-event-title]"));
assert(
  page.querySelector(".content-page-compact"),
  "Compact Calendar heading spacing",
);
assert(
  page.querySelector(".calendar-month-card .calendar-toolbar"),
  "Controls belong to the calendar card",
);
assert.equal(page.querySelectorAll(".calendar-legend li").length, 11);
for (const [category, label] of [
  ["solemnity", "Solemnity"],
  ["memorial", "Memorial"],
]) {
  assert(
    page
      .querySelector(`.calendar-legend li[data-category="${category}"]`)
      .textContent.includes(label),
  );
  assert(page.querySelector(`template[data-calendar-icon="${category}"] svg`));
}
for (const event of events)
  assert(
    page.querySelector(`template[data-calendar-icon="${event.category}"] svg`),
    `Icon for ${event.category}`,
  );
for (const event of events)
  assert(
    page.querySelector(`template[data-event-template="${event.id}"]`),
    event.id,
  );
assert(!html.includes("calendar.google.com"));
assert(html.includes("Philippine Time"));
const liturgy2026 = JSON.parse(
  readFileSync("dist/calendar-data/2026.json", "utf8"),
).events;
const liturgy2027 = JSON.parse(
  readFileSync("dist/calendar-data/2027.json", "utf8"),
).events;
const december = occurrencesForMonth([...events, ...liturgy2026], 2026, 11);
const christmas = december.find(
  (event) => event.liturgical_id === "nativity_of_the_lord",
);
assert(christmas?.all_day, "Christmas is a calendar-only observance");
assert.equal(christmas.day, "2026-12-25");
assert(
  !nextSevenDays(events, new Date("2026-12-23T00:00:00Z")).some(
    (event) => event.liturgical_id === "nativity_of_the_lord",
  ),
);
const october = occurrencesForMonth([...events, ...liturgy2027], 2027, 9);
const rosary = october.filter(
  (event) => event.day === "2027-10-07" && /Rosary|Rosario/i.test(event.title),
);
assert.equal(rosary.length, 1, "Chapel feast replaces general Rosary memorial");
assert.equal(rosary[0].id, "our-lady-of-the-most-holy-rosary-feast");
assert(
  !nextSevenDays(
    [...events, ...liturgy2027],
    new Date("2027-11-01T00:00:00+08:00"),
  ).some((event) => event.liturgical_id),
);
assert.deepEqual(
  december
    .filter((event) => event.day === "2026-12-20")
    .map((event) => [event.id, event.time]),
  [["simbang-gabi", "19:30"]],
);
assert.equal(december.filter((event) => event.id === "simbang-gabi").length, 9);
assert(
  december.some(
    (event) =>
      event.id === "christmas-eve-mass" &&
      event.day === "2026-12-24" &&
      event.time === "19:30",
  ),
);
assert(
  december.some(
    (event) => event.id === "sunday-mass" && event.time === "15:30",
  ),
);
console.log(
  "PASS: 201 static yearly JSON files, embedded observances, local Markdown schedules, deduplication and calendar-only liturgical markers.",
);
