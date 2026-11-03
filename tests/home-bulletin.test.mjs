import test from "node:test";
import assert from "node:assert/strict";
import { nextHomeMass } from "../src/lib/home-bulletin.mjs";
import { nextSevenDays } from "../src/lib/calendar.mjs";

const schedules = [
  {
    id: "sunday-mass",
    category: "mass",
    title: "Sunday Mass",
    time: "15:30",
    date: "",
    end_date: "",
    repeat: "weekly",
    weekday: 0,
    all_day: false,
    excluded_dates: [],
    excluded_annual_ranges: [{ start: "12-15", end: "12-23" }],
  },
  {
    id: "simbang-gabi",
    category: "novena",
    is_mass: true,
    title: "Simbang Gabi",
    time: "19:30",
    date: "2026-12-15",
    end_date: "2026-12-23",
    repeat: "yearly",
    all_day: false,
    excluded_dates: [],
  },
  {
    id: "christmas-eve-mass",
    category: "christmas",
    is_mass: true,
    title: "Christmas Eve Mass",
    time: "19:30",
    date: "2026-12-24",
    end_date: "",
    repeat: "yearly",
    all_day: false,
    excluded_dates: [],
  },
  {
    id: "meeting",
    title: "Meeting",
    time: "10:00",
    date: "2026-11-03",
    end_date: "",
    repeat: "none",
    all_day: false,
    excluded_dates: [],
  },
];
test("homepage shows the next actual Mass and ignores other gatherings", () => {
  const mass = nextHomeMass(schedules, new Date("2026-11-03T01:00:00Z"));
  assert.equal(mass.day, "2026-11-08");
  assert.equal(mass.time, "15:30");
});
test("after Sunday Mass the homepage advances to next Sunday", () => {
  assert.equal(
    nextHomeMass(schedules, new Date("2026-11-08T08:00:00Z")).day,
    "2026-11-15",
  );
});
test("Simbang Gabi replaces the regular Sunday time and Christmas Eve stays distinct", () => {
  const simbang = nextHomeMass(schedules, new Date("2026-12-20T01:00:00Z"));
  assert.equal(simbang.id, "simbang-gabi");
  assert.equal(simbang.time, "19:30");
  assert.equal(
    nextHomeMass(schedules, new Date("2026-12-24T01:00:00Z")).id,
    "christmas-eve-mass",
  );
});
test("an empty schedule does not invent a Mass time", () => {
  assert.equal(nextHomeMass([], new Date("2026-11-03T01:00:00Z")), null);
});

test("a new special Mass is recognized without adding its filename to code", () => {
  const now = new Date("2027-03-27T01:00:00Z");
  const special = {
    ...schedules[2],
    id: "easter-vigil-2027",
    title: "Easter Vigil Mass",
    category: "holy-week",
    is_mass: true,
    repeat: "none",
    date: "2027-03-27",
    time: "20:00",
  };
  const events = [...schedules, special];
  const mass = nextHomeMass(events, now);
  assert.equal(mass.id, special.id);
  assert.equal(mass.time, "20:00");
  const upcoming = nextSevenDays(events, now).find(
    (event) => event.id === special.id,
  );
  assert.deepEqual(mass, upcoming);
});

test("the Mass category also recognizes a newly named event without a separate flag", () => {
  const event = { ...schedules[0], id: "weekday-community-mass" };
  assert.equal(
    nextHomeMass([event], new Date("2026-11-03T01:00:00Z")).id,
    event.id,
  );
});

test("calendar markers and unmarked activities never become Masses based on their filename", () => {
  const now = new Date("2026-12-24T01:00:00Z");
  assert.equal(nextHomeMass([{ ...schedules[2], all_day: true }], now), null);
  assert.equal(nextHomeMass([{ ...schedules[2], is_mass: false }], now), null);
});
