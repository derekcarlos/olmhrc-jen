import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { prepareRosaryGuide } from "../src/lib/rosary-guide-client.ts";
import { rosaryWalkthrough } from "../src/lib/rosary-walkthrough.mjs";

const language = process.argv.includes("--tagalog") ? "tl" : "en";
const slug = language === "tl" ? "ang-banal-na-rosaryo" : "how-to-pray-the-holy-rosary";
const html = process.argv.includes("--live")
  ? await (
      await fetch(`http://localhost:4321/prayers/${slug}`)
    ).text()
  : readFileSync(`dist/prayers/${slug}/index.html`, "utf8");
const dom = new JSDOM(html, {
  url: `http://localhost:4321/prayers/${slug}`,
});
const document = dom.window.document;
const root = document.querySelector("rosary-guide");
assert.ok(root);
assert.equal(root.dataset.rosaryLanguage, language);
assert.equal(root.getAttribute("lang"), language);
assert.equal(root.querySelectorAll(".rosary-languages a").length, 2);
assert.equal(document.querySelectorAll("h1").length, 1);
const catalog = JSON.parse(root.dataset.rosaryCatalog);
const reference = root.querySelector("[data-rosary-reference]");
assert.equal(
  reference.open,
  true,
  "all prayers remain available without JavaScript",
);
for (const prayer of catalog.prayers) {
  assert.equal(
    root
      .querySelector(`#rosary-${prayer.id}`)
      .nextElementSibling.closest("section")
      .querySelector(".prayer-words").textContent,
    prayer.text,
  );
}
for (const set of catalog.mysteries) {
  assert.deepEqual(
    [
      ...root
        .querySelector(`#${set.id}-mysteries`)
        .parentElement.querySelectorAll("[data-rosary-mystery-title]"),
    ].map((item) => item.textContent),
    set.items.map((item) => item.title),
  );
  for (const item of set.items) {
    const content = root.querySelector(
      `[data-rosary-mystery-content="${item.id}"]`,
    );
    if (item.meditation?.trim())
      assert.equal(
        content.querySelector(".mystery-meditation > p").textContent,
        item.meditation,
      );
    if (item.fruit?.trim())
      assert.equal(
        content.querySelector(".mystery-fruit p").textContent,
        item.fruit,
      );
  }
}
assert.doesNotMatch(
  html,
  /Block Rosary|block[-%\s]rosary.*\.pdf/i,
  "source document is not mentioned or linked on the site",
);
root.querySelector("[data-rosary-panel]").scrollIntoView = () => {};
const previous = globalThis.window;
globalThis.window = dom.window;
let cleanup;
try {
  cleanup = prepareRosaryGuide(root, new Date("2026-11-04T02:00:00Z"));
  assert.equal(reference.open, false);
  for (const set of catalog.mysteries) {
    root.querySelector(`[data-mystery-set="${set.id}"]`).click();
    root.querySelector('[data-rosary-action="restart"]').click();
    const sequence = rosaryWalkthrough(set, language);
    for (const step of sequence) {
      const expected = step.prayer
        ? catalog.prayers.find((prayer) => prayer.id === step.prayer).text
        : step.announcement;
      assert.equal(
        root.querySelector("[data-rosary-text]").textContent,
        expected,
      );
      assert.equal(
        root.querySelector("[data-rosary-control-count]").textContent,
        step.bead ? `${step.bead}/${step.phase === "opening" ? 3 : 10}` : "",
      );
      const markers = root.querySelector("[data-rosary-control-beads]");
      assert.equal(markers.hidden, !!step.bead);
      if (!step.bead)
        assert.equal(
          markers.querySelectorAll(".current-decade").length,
          step.decade === null ? 0 : 1,
        );
      if (step.kind === "mystery") {
        const item = set.items[step.decade];
        const intro = root.querySelector("[data-rosary-introduction]");
        if (item.meditation?.trim())
          assert.equal(
            intro.querySelector(".mystery-meditation > p").textContent,
            item.meditation,
          );
        if (item.fruit?.trim())
          assert.equal(
            intro.querySelector(".mystery-fruit p").textContent,
            item.fruit,
          );
      }
      root.querySelector('[data-rosary-action="next"]').click();
    }
    assert.equal(root.querySelector("[data-rosary-complete]").hidden, false);
    assert.equal(root.querySelector("[data-rosary-reading]").hidden, true);
  }
  assert.equal(
    root.querySelectorAll(".walkthrough-panel a[href^=http]").length,
    0,
  );
} finally {
  cleanup?.();
  dom.window.close();
  globalThis.window = previous;
}
console.log(
  `PASS (${language}): four complete Rosary walkthroughs, full prayer texts and source line breaks, same-page reference booklet, language links and no-JS fallback.`,
);
