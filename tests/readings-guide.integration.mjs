import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { prepareReadingWalkthrough } from "../src/lib/reading-walkthrough-client.ts";

const live = process.argv.includes("--live");
const snapshot = JSON.parse(
  readFileSync("src/data/readings/snapshot.json", "utf8"),
);
const readPage = async (path) => {
  if (!live) return readFileSync(`dist${path}/index.html`, "utf8");
  const response = await fetch(`http://localhost:4321${path}`);
  assert.equal(response.status, 200, path);
  return response.text();
};
const paths = [
  "/readings",
  ...snapshot.records.map((record) => `/readings/${record.date}`),
];
let enhanced = 0;
for (const path of paths) {
  const dom = new JSDOM(await readPage(path), {
    url: `http://localhost:4321${path}`,
  });
  const doc = dom.window.document;
  const root = doc.querySelector("[data-readings]");
  const sections = [...root.querySelectorAll("[data-reading-section]")];
  if (!sections.length) {
    dom.window.close();
    continue;
  }
  const record = snapshot.records.find(
    (record) => record.date === root.dataset.selected,
  );
  assert.ok(record);
  assert.equal(sections.length, record.sections.length);
  assert.equal(
    sections.filter((section) => !section.hidden).length,
    sections.length,
    "all text is available before JavaScript runs",
  );
  assert.equal(root.querySelector("[data-reading-controls]").hidden, true);
  for (const [index, section] of record.sections.entries()) {
    assert.deepEqual(
      [...sections[index].querySelectorAll(".reading-block")].map(
        (block) => block.textContent,
      ),
      section.blocks.map((block) => block.text),
    );
  }
  const original = sections.map((section) => section.outerHTML);
  const ids = [...doc.querySelectorAll("[id]")].map((node) => node.id);
  assert.equal(new Set(ids).size, ids.length);
  const panel = root.querySelector("[data-reading-panel]");
  panel.scrollIntoView = () => {};
  const cleanup = prepareReadingWalkthrough(root);
  try {
    const controls = root.querySelector("[data-reading-controls]");
    for (const [index, section] of sections.entries()) {
      assert.equal(section.hidden, false);
      assert.equal(sections.filter((section) => !section.hidden).length, 1);
      assert.equal(
        root.querySelector("[data-reading-controls]"),
        controls,
        "controls retain their node at each step",
      );
      assert.equal(controls.hidden, false);
      assert.equal(
        root.querySelector("[data-reading-progress]").textContent,
        `Bahagi ${index + 1} sa ${sections.length}`,
      );
      root.querySelector('[data-reading-action="next"]').click();
    }
    assert.equal(root.querySelector("[data-reading-complete]").hidden, false);
    assert.equal(controls.hidden, true);
    root.querySelector('[data-reading-action="all"]').click();
    assert.equal(
      sections.filter((section) => !section.hidden).length,
      sections.length,
    );
    assert.ok(root.querySelector(`a[href="${record.source_url}"]`));
    root.querySelector('[data-reading-section-link="psalm"]').click();
    assert.equal(doc.activeElement, panel);
    assert.equal(
      root.querySelector('[data-reading-section="psalm"]').hidden,
      false,
    );
    assert.equal(sections.filter((section) => !section.hidden).length, 1);
    root.querySelector('[data-reading-action="toggle"]').click();
    assert.equal(
      sections.filter((section) => !section.hidden).length,
      sections.length,
    );
    enhanced++;
  } finally {
    cleanup();
    assert.deepEqual(
      sections.map((section) => section.outerHTML),
      original,
      "enhancement leaves source sections and line breaks unchanged",
    );
    dom.window.close();
  }
}
assert.ok(enhanced > 0, "at least one available reading was checked");
console.log(
  `PASS: ${enhanced} reading pages, complete source text, no-JS fallback, stable step controls, full-text view, attribution, section shortcuts, and cleanup.`,
);
