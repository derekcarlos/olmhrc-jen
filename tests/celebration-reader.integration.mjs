import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { prepareReadings } from "../src/lib/readings-client.ts";
import { celebrationReading } from "../src/lib/readings-celebrations.mjs";
const config = JSON.parse(readFileSync("src/config/readings.json", "utf8"));
if (config.mode !== "next-celebration") {
  console.log("SKIP: celebration browsing is disabled; the site uses the Sunday-only snapshot.");
  process.exit(0);
}
const live = process.argv.includes("--live");
const dates = [
  "2027-03-27",
  "2027-03-25",
  "2027-03-21",
  "2027-03-22",
  "2027-03-23",
  "2027-03-24",
  "2027-03-26",
  "2027-03-29",
  "2026-12-25",
  "2027-02-10",
  "2027-01-01",
  "2026-12-08",
  "2025-01-01",
];
let steps = 0;
for (const date of dates) {
  const path = `/readings/${date}`;
  let html;
  if (live) {
    const response = await fetch(`http://localhost:4321${path}`);
    assert.equal(response.status, 200, path);
    html = await response.text();
  } else html = readFileSync(`dist${path}/index.html`, "utf8");
  const record = await celebrationReading(date);
  const dom = new JSDOM(html, { url: `http://localhost:4321${path}` });
  const before = { window: globalThis.window, document: globalThis.document };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
  });
  try {
    const doc = dom.window.document;
    const root = doc.querySelector("[data-readings]");
    assert.equal(root.dataset.fixed, "true");
    const panels = [...root.querySelectorAll("[data-reading-mass]")];
    assert.equal(panels.length, record.masses.length);
    const ids = [...doc.querySelectorAll("[id]")].map((n) => n.id);
    assert.equal(
      new Set(ids).size,
      ids.length,
      `${date}: anchors are unique across repeated readings and Masses`,
    );
    for (const mass of record.masses) {
      const panel = panels.find((p) => p.dataset.readingMass === mass.id);
      const sections = [...panel.querySelectorAll("[data-reading-section]")];
      assert.equal(sections.length, mass.sections.length);
      sections.forEach((section, i) =>
        assert.deepEqual(
          [...section.querySelectorAll(".reading-block")].map(
            (b) => b.textContent,
          ),
          [mass.sections[i], ...(mass.sections[i].alternatives || [])].flatMap(
            (s) => s.blocks.map((b) => b.text),
          ),
          "all text and line breaks survive rendering, including alternatives",
        ),
      );
      panel.querySelector("[data-reading-panel]").scrollIntoView = () => {};
      assert.ok(
        [...panel.querySelectorAll(".reading-source a")].some(
          (a) => a.href === mass.source_url,
        ),
      );
    }
    prepareReadings();
    assert.equal(
      root.querySelector("[data-readings-content]").hidden,
      false,
      "fixed dates remain readable outside the current week",
    );
    assert.equal(panels.filter((p) => !p.hidden).length, 1);
    const active = panels.find((p) => !p.hidden);
    const mass = record.masses.find((m) => m.id === record.selected_mass);
    const controls = active.querySelector("[data-reading-controls]");
    for (let i = 0; i < mass.sections.length; i++) {
      assert.equal(
        active.querySelectorAll("[data-reading-section]:not([hidden])").length,
        1,
      );
      assert.equal(active.querySelector("[data-reading-controls]"), controls);
      active.querySelector('[data-reading-action="next"]').click();
      steps++;
    }
    assert.equal(active.querySelector("[data-reading-complete]").hidden, false);
    const psalmLinks = [
      ...active.querySelectorAll("[data-reading-section-link]"),
    ].filter((a) => a.dataset.readingSectionLink.includes("psalm"));
    psalmLinks.at(-1).click();
    assert.equal(
      active.querySelector("[data-reading-section]:not([hidden])").dataset
        .readingSection,
      psalmLinks.at(-1).dataset.readingSectionLink,
    );
    const version = active.querySelector("[data-reading-version]");
    if (version) {
      const section = version.closest("[data-reading-section]");
      version.value = "1";
      version.dispatchEvent(new dom.window.Event("change"));
      assert.equal(
        section.querySelector('[data-reading-option="0"]').hidden,
        true,
      );
      assert.equal(
        section.querySelector('[data-reading-option="1"]').hidden,
        false,
      );
    }
    const select = root.querySelector("[data-reading-mass-select]");
    if (select) {
      const other = panels.find((p) => p.hidden);
      select.value = other.dataset.readingMass;
      select.dispatchEvent(new dom.window.Event("change"));
      assert.equal(other.hidden, false);
      assert.equal(active.hidden, true);
      assert.match(dom.window.location.search, /mass=/);
    }
    const search = root.querySelector("[data-reading-calendar-filter]");
    search.value = "Theotokos";
    search.dispatchEvent(new dom.window.Event("input"));
    assert.ok(
      root.querySelectorAll("[data-reading-calendar-entry]:not([hidden])")
        .length > 0,
    );
    search.value = "no matching celebration xyz";
    search.dispatchEvent(new dom.window.Event("input"));
    assert.equal(
      root.querySelector("[data-reading-calendar-empty]").hidden,
      false,
    );
  } finally {
    dom.window.document.dispatchEvent(
      new dom.window.Event("astro:before-swap"),
    );
    dom.window.close();
    Object.assign(globalThis, before);
  }
}
console.log(
  `PASS: ${dates.length} celebration pages; ${steps} guided steps; complete Vigil readings, repeated psalm shortcuts, Mass selection, alternatives, date browsing, provenance, and no-JS source text${live ? " on localhost" : " in production HTML"}.`,
);
