import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { prepareFloresGuide } from "../src/lib/flores-guide-client.ts";
import { prepareNovenaWalkthrough } from "../src/lib/novena-walkthrough-client.ts";

const shared = JSON.parse(readFileSync("src/data/rosary-tl.json", "utf8"));
const compact = (text) => text.replace(/\s/g, "");
for (const [slug, mode, prepare] of [
  [
    "novena-to-our-lady-of-the-most-holy-rosary",
    "novena",
    prepareNovenaWalkthrough,
  ],
  ["flores-de-maria", "flores", prepareFloresGuide],
]) {
  const html = process.argv.includes("--live")
    ? await (await fetch(`http://localhost:4321/prayers/${slug}`)).text()
    : readFileSync(`dist/prayers/${slug}/index.html`, "utf8");
  const dom = new JSDOM(html, {
    url: `http://localhost:4321/prayers/${slug}#araw-${mode === "novena" ? 9 : 2}`,
  });
  const document = dom.window.document;
  const root = document.querySelector("devotion-guide");
  assert.equal(root?.dataset.devotion, mode);
  assert.equal(document.querySelectorAll("h1").length, 1);
  const ids = [...document.querySelectorAll("[id]")].map((node) => node.id);
  assert.equal(ids.length, new Set(ids).size, "no duplicate heading IDs");
  const reference = root.querySelector("[data-flores-reference]");
  assert.equal(
    reference.open,
    true,
    "full reference available without JavaScript",
  );
  if (mode === "novena") {
    assert.equal(root.querySelectorAll("details.novena-day").length, 9);
    for (const node of root.querySelectorAll("[data-shared-rosary-prayer]")) {
      const prayer = shared.prayers.find(
        (prayer) => prayer.id === node.dataset.sharedRosaryPrayer,
      );
      assert.equal(compact(node.textContent), compact(prayer.text), prayer.id);
    }
    assert(
      root.querySelector('a[href="/documents/pagsisiyam-santo-rosaryo.pdf"]'),
    );
  }
  globalThis.window = dom.window;
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  const stop = prepare(root, new Date("2026-11-05"));
  const controls = root.querySelector(".flores-controls");
  let steps = 0,
    beads = 0;
  while (root.dataset.complete !== "true") {
    const reading = root.querySelector("[data-flores-reading]");
    assert(
      reading.textContent.trim(),
      root.querySelector("[data-flores-title]").textContent,
    );
    assert.equal(reading.querySelectorAll("[id]").length, 0);
    if (!root.querySelector("[data-flores-bead-count]").hidden) beads++;
    assert.equal(root.querySelector(".flores-controls"), controls);
    root.querySelector('[data-flores-action="next"]').click();
    assert(++steps < 150);
  }
  assert.equal(reference.open, false);
  if (mode === "novena") assert.equal(beads, 53);
  root.querySelector('[data-flores-action="previous"]').click();
  assert.equal(
    root.querySelector("[data-flores-title]").textContent,
    mode === "novena" ? "Ang Tanda ng Krus" : "Pangwakas na Awit — Ave Maria",
  );
  stop();
  dom.window.close();
  console.log(
    `PASS ${mode}: ${steps} complete steps, stable controls, full reference, preserved prayer text.`,
  );
}
