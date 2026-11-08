import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { prepareHomeBulletin } from "../src/lib/home-bulletin-client.ts";

const sunday = {
  id: "sunday-mass",
  title: "Sunday Mass",
  category: "mass",
  time: "15:30",
  date: "",
  end_date: "",
  repeat: "weekly",
  weekday: 0,
  excluded_dates: [],
  excluded_annual_ranges: [{ start: "12-15", end: "12-23" }],
  location: "Our chapel",
};
function fixture(schedules, run) {
  const dom = new JSDOM(
    `<section data-home-mass><h3 data-home-mass-title></h3><time data-home-mass-date><span data-home-mass-number></span><span data-home-mass-month></span><span data-home-mass-day></span><span data-home-mass-year></span></time><time data-home-mass-time></time><p data-home-mass-location></p><span data-home-mass-zone></span><a data-home-mass-save hidden>Save this Mass</a></section>`,
    { url: "http://localhost:4321", pretendToBeVisual: true },
  );
  const previous = globalThis.window;
  globalThis.window = dom.window;
  dom.window.document.querySelector("[data-home-mass]").dataset.schedules =
    JSON.stringify(schedules);
  try {
    run(dom.window, dom.window.document);
  } finally {
    dom.window.document.dispatchEvent(
      new dom.window.Event("astro:before-swap"),
    );
    dom.window.close();
    globalThis.window = previous;
  }
}

test("the invitation and saved event advance together after Mass, including after a hidden tab returns", () =>
  fixture([sunday], (window, document) => {
    let now = new Date("2026-11-08T06:00:00Z");
    prepareHomeBulletin(document, () => now);
    prepareHomeBulletin(document, () => now);
    const get = (name) => document.querySelector(`[data-home-mass-${name}]`);
    assert.equal(get("number").textContent, "08");
    const saved = get("save");
    assert.equal(saved.hidden, false);
    assert.ok(
      decodeURIComponent(saved.href).includes("DTSTART:20261108T073000Z"),
    );
    now = new Date("2026-11-08T08:00:00Z");
    document.dispatchEvent(new window.Event("visibilitychange"));
    assert.equal(get("number").textContent, "15");
    assert.equal(get("date").dateTime, "2026-11-15");
    assert.equal(saved.download, "chapel-mass-2026-11-15.ics");
    assert.ok(
      decodeURIComponent(saved.href).includes("DTSTART:20261115T073000Z"),
    );
    document.dispatchEvent(new window.Event("astro:before-swap"));
    now = new Date("2026-11-16T01:00:00Z");
    document.dispatchEvent(new window.Event("visibilitychange"));
    assert.equal(get("number").textContent, "15");
  }));

test("Simbang Gabi updates every visible invitation field and exports the evening start", () =>
  fixture(
    [
      sunday,
      {
        id: "simbang-gabi",
        title: "Simbang Gabi",
        category: "novena",
        is_mass: true,
        time: "19:30",
        date: "2026-12-15",
        end_date: "2026-12-23",
        repeat: "yearly",
        excluded_dates: [],
        location: "Village chapel",
      },
    ],
    (window, document) => {
      prepareHomeBulletin(document, () => new Date("2026-12-20T01:00:00Z"));
      assert.equal(
        document.querySelector("[data-home-mass-title]").textContent,
        "Simbang Gabi",
      );
      assert.equal(
        document.querySelector("[data-home-mass-time]").textContent,
        "7:30 PM",
      );
      assert.equal(
        document.querySelector("[data-home-mass-location]").textContent,
        "Village chapel",
      );
      assert.ok(
        decodeURIComponent(
          document.querySelector("[data-home-mass-save]").href,
        ).includes("DTSTART:20261220T113000Z"),
      );
    },
  ));

test("the Mass page uses an unpadded day without changing the homepage calendar tile", () =>
  fixture([sunday], (window, document) => {
    const day = document.querySelector("[data-home-mass-number]");
    day.dataset.homeMassNumberFormat = "numeric";
    prepareHomeBulletin(document, () => new Date("2026-11-08T06:00:00Z"));
    assert.equal(day.textContent, "8");
    assert.equal(
      document.querySelector("[data-home-mass-month]").textContent,
      "Nov",
    );
    assert.equal(
      document.querySelector("[data-home-mass-year]").textContent,
      "2026",
    );
  }));

test("missing or unconfirmed Masses never offer a fabricated calendar download", () => {
  for (const schedules of [[], [{ ...sunday, time: "" }]])
    fixture(schedules, (window, document) => {
      prepareHomeBulletin(document, () => new Date("2026-11-03T01:00:00Z"));
      const saved = document.querySelector("[data-home-mass-save]");
      assert.equal(saved.hidden, true);
      assert.equal(saved.hasAttribute("href"), false);
      assert.equal(
        document.querySelector("[data-home-mass-zone]").hidden,
        true,
      );
      if (!schedules.length)
        assert.equal(
          document.querySelector("[data-home-mass-number]").textContent,
          "—",
        );
    });
});
