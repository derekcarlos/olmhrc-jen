import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { prepareReadings } from "../src/lib/readings-client.ts";

function withClock(day, entry, mode, selected, run) {
  const dom = new JSDOM(
    `<div data-readings data-entry="${entry}" data-selected="${selected}" data-mode="${mode}" data-dates='["2026-11-08"]' data-available='["2026-11-08"]'>
    <div data-readings-stale hidden><p data-readings-stale-text></p></div><div data-readings-content>Original sample content</div>
    <a data-reading-day="2026-11-02">Yesterday</a></div>`,
    { url: "http://localhost:4321/readings" },
  );
  const originals = {
    window: globalThis.window,
    document: globalThis.document,
    Date: globalThis.Date,
  };
  const RealDate = originals.Date;
  class Clock extends RealDate {
    constructor(...args) {
      super(...(args.length ? args : [day]));
    }
  }
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    Date: Clock,
  });
  try {
    prepareReadings();
    run(dom.window.document);
  } finally {
    dom.window.document.dispatchEvent(
      new dom.window.Event("astro:before-swap"),
    );
    dom.window.close();
    Object.assign(globalThis, originals);
  }
}

test("real client keeps the current Sunday visible", () => {
  withClock(
    "2026-11-08T15:59:00Z",
    true,
    "next-sunday",
    "2026-11-08",
    (document) => {
      assert.equal(
        document.querySelector("[data-readings-content]").hidden,
        false,
      );
      assert.equal(
        document.querySelector("[data-readings-stale]").hidden,
        true,
      );
    },
  );
});
test("real client hides expired Sunday after Manila midnight rather than relabeling it", () => {
  withClock(
    "2026-11-08T16:00:00Z",
    true,
    "next-sunday",
    "2026-11-08",
    (document) => {
      assert.equal(
        document.querySelector("[data-readings-content]").hidden,
        true,
      );
      assert.match(
        document.querySelector("[data-readings-stale-text]").textContent,
        /2026-11-15/,
      );
    },
  );
});
test("seven-day client hides expired date links while keeping an active selected day", () => {
  withClock(
    "2026-11-03T01:00:00Z",
    false,
    "next-seven-days",
    "2026-11-03",
    (document) => {
      assert.equal(
        document.querySelector("[data-readings-content]").hidden,
        false,
      );
      assert.equal(document.querySelector("[data-reading-day]").hidden, true);
    },
  );
});
