import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM, VirtualConsole } from "jsdom";
import { upcomingReading } from "../src/lib/upcoming-readings.mjs";
import { prepareReadings } from "../src/lib/readings-client.ts";

const live = process.argv.includes("--live");
for (const [date, tileCount] of [["2026-11-15", 0], ["2026-12-08", 2], ["2026-12-15", 6], ["2026-12-20", 6], ["2026-12-24", 6], ["2027-03-25", 8], ["2027-03-27", 8]]) {
  const path = `/readings/${date}`;
  const record = await upcomingReading(date);
  const html = live ? await (await fetch(`http://localhost:4321${path}`)).text() : readFileSync(`dist${path}/index.html`, "utf8");
  const dom = new JSDOM(html, { url: `http://localhost:4321${path}?mass=${record.selected_mass}` });
  const original = { window: globalThis.window, document: globalThis.document };
  Object.assign(globalThis, { window: dom.window, document: dom.window.document });
  try {
    const doc = dom.window.document, root = doc.querySelector("[data-readings]");
    assert.ok(root, path);
    assert.equal(root.dataset.fixed, "true", "dated pages never expire or automatically redirect");
    assert.equal(root.querySelectorAll(".reading-celebration-tile").length, tileCount);
    assert.equal(root.querySelector("[data-reading-mass-select]"), null, "Mass choices are links rather than a dropdown");
    const panels = [...root.querySelectorAll("[data-reading-mass]")];
    assert.equal(panels.length, record.masses.length);
    for (const mass of record.masses) {
      const panel = panels.find(panel => panel.dataset.readingMass === mass.id);
      assert.deepEqual([...panel.querySelectorAll(".reading-block")].map(block => block.textContent), mass.sections.flatMap(s => [s, ...(s.alternatives || [])].flatMap(option => option.blocks.map(block => block.text))), "source text, alternatives, and newlines are complete");
    }
    prepareReadings();
    assert.equal(panels.filter(panel => !panel.hidden).length, 1);
    for (const choice of root.querySelectorAll("[data-reading-mass-choice]")) {
      choice.click();
      assert.equal(choice.getAttribute("aria-current"), "true");
      assert.equal(panels.find(panel => !panel.hidden).dataset.readingMass, choice.dataset.readingMassChoice);
      assert.equal(new URL(dom.window.location.href).searchParams.get("mass"), choice.dataset.readingMassChoice);
    }
    if (date === "2027-03-27") assert.equal(panels[0].querySelectorAll("[data-reading-section]").length, 17);
    if (date === "2026-12-15") assert.match(root.querySelector("[data-reading-context]").textContent, /16/);
    doc.dispatchEvent(new dom.window.Event("visibilitychange"));
    assert.equal(root.querySelector("[data-readings-content]").hidden, false);
  } finally {
    dom.window.document.dispatchEvent(new dom.window.Event("astro:before-swap"));
    dom.window.close(); Object.assign(globalThis, original);
  }
}
console.log("PASS: 7 dated pages; normal-week simplicity, solemnity/Simbang Gabi/Holy Week tiles, stable shared links, all Mass buttons, complete source text and Vigil, and pinned manual choices.");

// A real landing-page reader follows the clock only until someone starts reading.
{
  const path = "/readings/2026-12-15";
  const html = live ? await (await fetch(`http://localhost:4321${path}`)).text() : readFileSync(`dist${path}/index.html`, "utf8");
  const navigation = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", error => { if (/navigation/i.test(error.message)) navigation.push(error); else throw error; });
  const dom = new JSDOM(html, { url: "http://localhost:4321/readings", virtualConsole });
  const root = dom.window.document.querySelector("[data-readings]");
  root.dataset.entry = "true";
  const original = { window: globalThis.window, document: globalThis.document, Date: globalThis.Date };
  let time = "2026-12-15T09:59:59Z";
  const RealDate = original.Date;
  class Clock extends RealDate { constructor(...args) { super(...(args.length ? args : [time])); } }
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, Date: Clock });
  try {
    prepareReadings();
    assert.equal(navigation.length, 0, "before 6 PM the daytime Mass remains selected");
    time = "2026-12-15T10:00:00Z";
    dom.window.dispatchEvent(new dom.window.Event("focus"));
    assert.equal(navigation.length, 1, "at 6 PM an untouched landing reader requests the anticipated Mass");
    root.querySelector('[data-reading-mass-choice="anticipated"]').click();
    time = "2026-12-16T00:00:00Z";
    dom.window.dispatchEvent(new dom.window.Event("focus"));
    assert.equal(navigation.length, 1, "manual Mass selection remains pinned across the date change");
  } finally {
    dom.window.document.dispatchEvent(new dom.window.Event("astro:before-swap"));
    dom.window.close(); Object.assign(globalThis, original);
  }
}
console.log("PASS: 6 PM automatic navigation and stable manual choices across midnight.");
