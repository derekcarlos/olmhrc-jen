import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { prepareCalendars } from "../src/lib/calendar-client.ts";

const yearData = (year) =>
  JSON.parse(readFileSync(`dist/calendar-data/${year}.json`, "utf8"));
const tick = () => new Promise((resolve) => setImmediate(resolve));
async function until(check) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (check()) return;
    await tick();
  }
  assert.fail("Calendar did not reach the expected state");
}

test("real calendar DOM renders JSON observances, ignores stale years, and recovers from failed loads", async () => {
  const dom = new JSDOM(readFileSync("dist/calendar/index.html", "utf8"), {
    url: "http://localhost:4321/calendar",
  });
  const originalDocument = globalThis.document;
  const originalFetch = globalThis.fetch;
  globalThis.document = dom.window.document;
  const calls = [];
  const pending = new Map();
  let fail2030 = true;
  globalThis.fetch = async (url) => {
    const match = String(url).match(/^\/calendar-data\/(\d{4})\.json$/);
    assert(match, `Unexpected request ${url}`);
    const year = Number(match[1]);
    calls.push(year);
    if (year === 2028 || year === 2029)
      return new Promise((resolve) => pending.set(year, resolve));
    if (year === 2030 && fail2030) {
      fail2030 = false;
      return new Response("Unavailable", { status: 503 });
    }
    return Response.json(yearData(year));
  };
  try {
    const root = document.querySelector("[data-chapel-calendar]");
    const picker = root.querySelector("[data-calendar-month]");
    const state = root.querySelector("[data-calendar-data-state]");
    const retry = root.querySelector("[data-calendar-data-retry]");
    const title = root.querySelector("[data-calendar-title]");
    const dialog = root.querySelector("dialog");
    // jsdom has no native dialog UI; exercise our actual contents/rendering around that boundary.
    dialog.showModal = function () {
      this.open = true;
    };
    const navigate = (month) => {
      picker.value = month;
      picker.dispatchEvent(new dom.window.Event("change"));
    };
    const marker = (id, date) =>
      root.querySelector(`[data-occurrence="${id}:${date}"]`);
    prepareCalendars();
    const upcoming = root.querySelector("[data-calendar-agenda]").innerHTML;
    assert.equal(root.querySelector("[data-calendar-days]").children.length, 6);
    navigate("2026-11");
    await until(() => state.hidden);
    assert.equal(
      marker("romcal-our_lord_jesus_christ_king_of_the_universe", "2026-11-22")
        .dataset.category,
      "solemnity",
    );
    marker(
      "romcal-our_lord_jesus_christ_king_of_the_universe",
      "2026-11-22",
    ).click();
    assert(
      root.querySelector("[data-event-title]").textContent.includes("King"),
    );
    assert.equal(
      root.querySelector("[data-event-time]").textContent,
      "All-day observance",
    );
    navigate("2027-03");
    await until(() => state.hidden);
    assert(marker("romcal-holy_thursday", "2027-03-25"));
    assert.equal(
      marker("romcal-easter_sunday", "2027-03-28").dataset.category,
      "easter",
    );
    navigate("2027-10");
    assert(marker("our-lady-of-the-most-holy-rosary-feast", "2027-10-07"));
    assert.equal(marker("romcal-our_lady_of_the_rosary", "2027-10-07"), null);
    assert.equal(calls.filter((year) => year === 2027).length, 1);

    navigate("2028-01");
    navigate("2029-01");
    await until(() => pending.has(2028) && pending.has(2029));
    pending.get(2028)(Response.json(yearData(2028)));
    await tick();
    await tick();
    assert.equal(title.textContent, "January 2029");
    assert.equal(
      state.hidden,
      false,
      "An old response cannot hide the current loading indicator",
    );
    pending.get(2029)(Response.json(yearData(2029)));
    await until(() => state.hidden);
    assert.equal(
      marker("romcal-epiphany_of_the_lord", "2029-01-07").dataset.category,
      "solemnity",
    );

    navigate("2030-10");
    await until(() => !retry.hidden);
    assert(
      root
        .querySelector("[data-calendar-data-status]")
        .textContent.includes("could not be loaded"),
    );
    assert(
      root.querySelector('[data-occurrence^="sunday-mass:"]'),
      "Local events survive a JSON failure",
    );
    retry.click();
    await until(() => state.hidden);
    assert.equal(calls.filter((year) => year === 2030).length, 2);
    assert(
      marker("romcal-our_lady_of_the_rosary", "2030-10-07") === null,
      "Local October 7 celebration still takes precedence",
    );
    assert.equal(
      root.querySelector("[data-calendar-agenda]").innerHTML,
      upcoming,
    );
  } finally {
    globalThis.document = originalDocument;
    globalThis.fetch = originalFetch;
    dom.window.close();
  }
});
