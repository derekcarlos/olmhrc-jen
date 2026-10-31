import test from "node:test";
import assert from "node:assert/strict";
import {
  monthDays,
  occurrencesForMonth,
  manilaToday,
  formatEventTime,
  parseCalendarMonth,
  upcomingOccurrences,
  nextSevenDays,
  liturgicalCycleForMonth,
} from "../src/lib/calendar.mjs";

test("Sunday reading cycle follows Advent rather than the civil year", () => {
  assert.equal(liturgicalCycleForMonth(2026, 0).label, "Year A");
  assert.equal(liturgicalCycleForMonth(2026, 9).label, "Year A");
  assert.equal(liturgicalCycleForMonth(2026, 10).label, "Year A → B");
  assert.match(
    liturgicalCycleForMonth(2026, 10).description,
    /November 29, 2026/,
  );
  assert.equal(liturgicalCycleForMonth(2026, 11).label, "Year B");
  assert.equal(liturgicalCycleForMonth(2027, 0).label, "Year B");
  assert.equal(liturgicalCycleForMonth(2027, 10).label, "Year B → C");
  assert.equal(liturgicalCycleForMonth(2028, 10).label, "Year C");
  assert.equal(liturgicalCycleForMonth(2028, 11).label, "Year C → A");
  assert.equal(liturgicalCycleForMonth(2029, 0).label, "Year A");
  assert.equal(liturgicalCycleForMonth(2024, 11).label, "Year C");
});

test("upcoming list excludes past days and elapsed start times in Philippine Time", () => {
  const items = [
    { day: "2026-10-31", time: "19:30" },
    { day: "2026-11-01", time: "15:30" },
    { day: "2026-11-01", time: "19:30" },
    { day: "2026-11-01", time: "" },
    { day: "2026-11-02", time: "15:30" },
  ];
  assert.deepEqual(
    upcomingOccurrences(items, new Date("2026-11-01T08:00:00Z")),
    items.slice(2),
  );
  assert.equal(
    items.length,
    5,
    "Filtering does not remove past events from the grid data",
  );
});

test("month picker validates text fallback as well as native month inputs", () => {
  assert.deepEqual(parseCalendarMonth("2026-12"), { year: 2026, month: 11 });
  assert.deepEqual(parseCalendarMonth("1900-01"), { year: 1900, month: 0 });
  assert.deepEqual(parseCalendarMonth("2100-12"), { year: 2100, month: 11 });
  for (const input of [
    "2026-00",
    "2026-13",
    "0000-01",
    "2101-01",
    "2026-1",
    "",
    "December 2026",
  ])
    assert.equal(parseCalendarMonth(input), null);
});

const event = (extra) => ({
  id: "mass",
  title: "Mass",
  time: "15:30",
  date: "",
  end_date: "",
  repeat: "weekly",
  weekday: 0,
  excluded_dates: [],
  ...extra,
});

test("a local chapel observance replaces only its matching liturgical marker on the same date", () => {
  const local = event({
    id: "chapel-feast",
    repeat: "yearly",
    date: "2026-10-07",
    replaces_liturgical_id: "our_lady_of_the_rosary",
    time: "",
    all_day: true,
  });
  const generated = event({
    id: "romcal-rosary",
    liturgical_id: "our_lady_of_the_rosary",
    repeat: "none",
    date: "2027-10-07",
    time: "",
    all_day: true,
  });
  const mass = event({
    id: "feast-mass",
    repeat: "none",
    date: "2027-10-07",
    time: "19:00",
  });
  assert.deepEqual(
    occurrencesForMonth([local, generated, mass], 2027, 9).map((e) => e.id),
    ["chapel-feast", "feast-mass"],
  );
  assert.deepEqual(
    occurrencesForMonth(
      [{ ...local, excluded_dates: ["2027-10-07"] }, generated],
      2027,
      9,
    ).map((e) => e.id),
    ["romcal-rosary"],
  );
  assert.deepEqual(
    occurrencesForMonth(
      [{ ...local, date: "2026-10-08" }, generated],
      2027,
      9,
    ).map((e) => e.id),
    ["romcal-rosary", "chapel-feast"],
  );
});

test("annual observances stay in the calendar but never enter Upcoming Events", () => {
  const observance = event({
    id: "christmas",
    title: "The Nativity of the Lord",
    repeat: "yearly",
    date: "2026-12-25",
    time: "",
    all_day: true,
  });
  const gathering = event({
    id: "gathering",
    repeat: "none",
    date: "2027-12-25",
    time: "",
    all_day: false,
  });
  for (const time of ["", "19:30"]) {
    const events = [{ ...observance, time }, gathering];
    assert(
      occurrencesForMonth(events, 2027, 11).some(
        (item) => item.id === "christmas",
      ),
    );
    for (const now of ["2027-12-22T00:00:00Z", "2027-12-25T12:00:00Z"])
      assert.deepEqual(
        nextSevenDays(events, new Date(now)).map((item) => item.id),
        ["gathering"],
      );
  }
});

test("observance labels never imply an unconfirmed Mass or scheduled time", () => {
  assert.equal(formatEventTime("", true), "All-day observance");
  assert.equal(formatEventTime("19:30", true), "All-day observance");
  assert.equal(formatEventTime("", false), "Time to be confirmed");
  assert.equal(formatEventTime("19:30", false), "7:30 PM");
});

test("next seven days includes today through six days ahead across month boundaries", () => {
  const events = [
    event({}),
    event({ id: "last", repeat: "none", date: "2026-11-06", time: "19:30" }),
    event({ id: "outside", repeat: "none", date: "2026-11-07" }),
    event({
      id: "today-past",
      repeat: "none",
      date: "2026-10-31",
      time: "10:00",
    }),
  ];
  const result = nextSevenDays(events, new Date("2026-10-31T05:00:00Z"));
  assert.deepEqual(
    result.map((item) => [item.id, item.day]),
    [
      ["mass", "2026-11-01"],
      ["last", "2026-11-06"],
    ],
  );
});

test("next seven days crosses years, excludes passed times and respects recurring exceptions", () => {
  const today = event({
    id: "new-year",
    repeat: "none",
    date: "2027-01-01",
    time: "00:00",
  });
  assert(
    nextSevenDays([today], new Date("2026-12-30T12:00:00Z")).some(
      (item) => item.day === "2027-01-01",
    ),
  );
  assert.equal(
    nextSevenDays([today], new Date("2027-01-01T00:00:00Z")).length,
    0,
  );
  const sunday = event({
    excluded_annual_ranges: [{ start: "12-15", end: "12-23" }],
  });
  assert.equal(
    nextSevenDays([sunday], new Date("2026-12-18T00:00:00Z")).length,
    0,
  );
});

test("Sunday Mass is replaced by Simbang Gabi during December 15–23 every year", () => {
  const sunday = event({
    excluded_annual_ranges: [{ start: "12-15", end: "12-23" }],
  });
  const simbang = event({
    id: "simbang",
    repeat: "yearly",
    date: "2026-12-15",
    end_date: "2026-12-23",
    time: "19:30",
  });
  for (const year of [2026, 2029]) {
    const result = occurrencesForMonth([sunday, simbang], year, 11);
    for (const day of monthDays(year, 11).filter(
      (day) =>
        day.startsWith(`${year}-12`) &&
        new Date(`${day}T12:00:00Z`).getUTCDay() === 0,
    )) {
      const services = result.filter((item) => item.day === day);
      assert.equal(services.length, 1, day);
      assert.equal(
        services[0].time,
        day.slice(5) >= "12-15" && day.slice(5) <= "12-23" ? "19:30" : "15:30",
        day,
      );
    }
  }
});

test("month grid has complete Sunday-first weeks, including year and leap boundaries", () => {
  const days = monthDays(2026, 0);
  assert.equal(days[0], "2025-12-28");
  assert.equal(days.at(-1), "2026-02-07");
  assert.equal(days.length, 42);
  assert(monthDays(2028, 1).includes("2028-02-29"));
  assert(!monthDays(2027, 1).includes("2027-02-29"));
});
test("weekly Mass recurs on all Sundays and respects excluded dates", () => {
  const result = occurrencesForMonth(
    [event({ excluded_dates: ["2026-11-08"] })],
    2026,
    10,
  );
  assert.deepEqual(
    result.map((item) => item.day),
    ["2026-11-01", "2026-11-15", "2026-11-22", "2026-11-29"],
  );
});
test("annual Simbang Gabi has nine evenings in future years without duplicate Christmas Eve", () => {
  const events = [
    event({
      id: "simbang",
      repeat: "yearly",
      date: "2026-12-15",
      end_date: "2026-12-23",
      time: "19:30",
    }),
    event({ id: "eve", repeat: "yearly", date: "2026-12-24", time: "19:30" }),
  ];
  const result = occurrencesForMonth(events, 2027, 11);
  assert.equal(result.filter((item) => item.id === "simbang").length, 9);
  assert.deepEqual(
    result.filter((item) => item.id === "eve").map((item) => item.day),
    ["2027-12-24"],
  );
  assert.equal(occurrencesForMonth(events, 2027, 0).length, 0);
});
test("one-off events do not repeat; inclusive ranges cross months and years", () => {
  const single = event({ repeat: "none", date: "2026-11-02" });
  assert.equal(occurrencesForMonth([single], 2027, 10).length, 0);
  const range = event({
    repeat: "none",
    date: "2026-12-30",
    end_date: "2027-01-02",
  });
  assert.equal(occurrencesForMonth([range], 2027, 0).length, 2);
  const annual = { ...range, repeat: "yearly" };
  assert.equal(occurrencesForMonth([annual], 2028, 0).length, 2);
});
test("events sort by date and time; untimed events precede timed events", () => {
  const result = occurrencesForMonth(
    [
      event({ id: "late", repeat: "none", date: "2026-11-01", time: "19:30" }),
      event({ id: "early", repeat: "none", date: "2026-11-01", time: "" }),
      event({}),
    ],
    2026,
    10,
  );
  assert.deepEqual(
    result.slice(0, 3).map((item) => item.id),
    ["early", "mass", "late"],
  );
  assert.equal(formatEventTime("15:30"), "3:30 PM");
  assert.equal(formatEventTime(""), "Time to be confirmed");
});
test("Today is the Philippine date, even before UTC midnight", () => {
  assert.equal(manilaToday(new Date("2026-10-31T17:00:00Z")), "2026-11-01");
});
