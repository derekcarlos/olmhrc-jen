import test from "node:test";
import assert from "node:assert/strict";
import { createLiturgicalYearLoader } from "../src/lib/calendar-data-client.mjs";

const payload = (year) => ({
  year,
  events: [
    {
      id: "romcal-all_saints",
      liturgical_id: "all_saints",
      title: "All Saints",
      date: `${year}-11-01`,
      end_date: "",
      category: "solemnity",
      description: "All Saints",
      all_day: true,
      time: "",
      location: "",
      repeat: "none",
      excluded_dates: [],
    },
  ],
});

test("year data reuses the embedded seed and shares concurrent fetches", async () => {
  let calls = 0;
  const urls = [];
  const loader = createLiturgicalYearLoader("/", payload(2026), async (url) => {
    calls++;
    urls.push(url);
    return Response.json(payload(2027));
  });
  assert.equal((await loader.load(2026)).year, 2026);
  assert.equal(calls, 0);
  const values = await Promise.all([loader.load(2027), loader.load(2027)]);
  assert.equal(values[0].events[0].date, "2027-11-01");
  assert.equal(values[1].events[0].date, "2027-11-01");
  await loader.load(2027);
  assert.equal(calls, 1);
  assert.deepEqual(urls, ["/calendar-data/2027.json"]);
});

test("failed year requests are retried, not cached as empty calendars", async () => {
  let calls = 0;
  const loader = createLiturgicalYearLoader(
    "/chapel",
    payload(2026),
    async (url) => {
      assert.equal(url, "/chapel/calendar-data/2027.json");
      calls++;
      return calls === 1
        ? new Response("Missing", { status: 404 })
        : Response.json(payload(2027));
    },
  );
  await assert.rejects(loader.load(2027), /404/);
  assert.equal((await loader.load(2027)).events.length, 1);
  assert.equal(calls, 2);
});

test("wrong-year or malformed payloads never reach the calendar", async () => {
  for (const invalid of [
    payload(2028),
    { year: 2027, events: "bad" },
    { year: 2027, events: [] },
    { year: 2027, events: [{ ...payload(2027).events[0], all_day: false }] },
    {
      year: 2027,
      events: [{ ...payload(2027).events[0], date: "2027-02-30" }],
    },
  ]) {
    let calls = 0;
    const loader = createLiturgicalYearLoader("/", payload(2026), async () => {
      calls++;
      return Response.json(calls === 1 ? invalid : payload(2027));
    });
    await assert.rejects(loader.load(2027), /Invalid/);
    assert.equal((await loader.load(2027)).year, 2027);
  }
});

test("unsupported years fail without sending a request", async () => {
  let calls = 0;
  const loader = createLiturgicalYearLoader("/", payload(2026), async () => {
    calls++;
    return Response.json(payload(2027));
  });
  for (const year of [1899, 2101, 2027.5, NaN])
    await assert.rejects(loader.load(year), RangeError);
  assert.equal(calls, 0);
});
