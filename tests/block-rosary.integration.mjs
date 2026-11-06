import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { prepareRosaryGuide } from "../src/lib/rosary-guide-client.ts";
import { blockRosaryWalkthrough } from "../src/lib/block-rosary.mjs";

const live = process.argv.includes("--live");
const readPage = async (path) =>
  live
    ? await (await fetch(`http://localhost:4321${path}`)).text()
    : readFileSync(`dist${path}/index.html`, "utf8");
const html = await readPage("/prayers/block-rosary");
const dom = new JSDOM(html, {
  url: "http://localhost:4321/prayers/block-rosary#prayer-guide",
});
const { document } = dom.window;
const root = document.querySelector(
  'rosary-guide[data-rosary-variant="block"]',
);
assert.ok(root);
assert.equal(document.querySelectorAll("h1").length, 1);
assert.equal(document.querySelector("h1").textContent.trim(), "Block Rosary");
const catalog = JSON.parse(root.dataset.rosaryCatalog);
const reference = root.querySelector("[data-rosary-reference]");
assert.equal(
  reference.open,
  true,
  "complete prayers are available without JavaScript",
);
for (const prayer of catalog.prayers) {
  const section = root.querySelector(`#rosary-${prayer.id}`).closest("section");
  assert.equal(section.querySelector(".prayer-words").textContent, prayer.text);
  if (prayer.text.includes("℟."))
    assert.ok(section.querySelector(".prayer-words strong"));
}
const ids = [...document.querySelectorAll("[id]")].map((element) => element.id);
assert.equal(
  new Set(ids).size,
  ids.length,
  "reference and guide have unique IDs",
);
let scrolled = false;
const panel = root.querySelector("[data-rosary-panel]");
panel.scrollIntoView = () => {
  scrolled = true;
};
const previousWindow = globalThis.window;
globalThis.window = dom.window;
let cleanup;
try {
  cleanup = prepareRosaryGuide(root, new Date("2026-11-06T02:00:00Z"));
  assert.equal(reference.open, false);
  assert.ok(scrolled);
  assert.equal(document.activeElement, panel);
  assert.equal(
    root
      .querySelector('[data-mystery-set="sorrowful"]')
      .getAttribute("aria-current"),
    "true",
  );
  const clickAction = (action) =>
    root.querySelector(`[data-rosary-action="${action}"]`).click();
  for (const set of catalog.mysteries) {
    root.querySelector(`[data-mystery-set="${set.id}"]`).click();
    const steps = blockRosaryWalkthrough(set);
    for (const [index, step] of steps.entries()) {
      assert.equal(Number(root.dataset.rosaryStep), index);
      assert.equal(
        root.querySelector("[data-rosary-text]").textContent,
        step.prayer
          ? catalog.prayers.find((p) => p.id === step.prayer).text
          : step.announcement,
      );
      assert.equal(
        root.querySelector("[data-rosary-skip]").hidden,
        !step.optional,
      );
      assert.equal(
        root
          .querySelector(
            `[data-rosary-phase="${step.phase === "decade" ? step.decade : step.phase}"]`,
          )
          .getAttribute("aria-current"),
        "step",
      );
      if (step.bead)
        assert.equal(
          root.querySelector("[data-rosary-control-count]").textContent,
          `${step.bead}/${step.phase === "opening" ? 3 : 10}`,
        );
      if (step.kind === "mystery") {
        assert.equal(
          root.querySelector("[data-rosary-introduction] .mystery-fruit p")
            .textContent,
          set.items[step.decade].fruit,
        );
      }
      clickAction("next");
    }
    assert.equal(root.dataset.rosaryComplete, "true");
    assert.match(
      root.querySelector("[data-rosary-title]").textContent,
      /Block Rosary prayer is complete/,
    );
    clickAction("restart");
    clickAction("skip");
    assert.match(
      root.querySelector("[data-rosary-title]").textContent,
      /Mary Comes to Our Home/,
    );
    clickAction("previous");
    assert.match(
      root.querySelector("[data-rosary-title]").textContent,
      /Acceptance Prayer/,
    );
    for (const phase of ["opening", "litany", "family", "farewell", "0", "4"]) {
      root.querySelector(`[data-rosary-phase="${phase}"]`).click();
      assert.equal(
        root
          .querySelector(`[data-rosary-phase="${phase}"]`)
          .getAttribute("aria-current"),
        "step",
      );
    }
    root.querySelector('[data-rosary-phase="farewell"]').click();
    clickAction("skip");
    assert.equal(
      root.querySelector("[data-rosary-title]").textContent,
      "Sign of the Cross",
    );
  }
} finally {
  cleanup?.();
  globalThis.window = previousWindow;
  dom.window.close();
}
const hub = new JSDOM(await readPage("/prayers"));
assert.ok(
  hub.window.document.querySelector(
    'a.devotion-card[href="/prayers/block-rosary#prayer-guide"]',
  ),
);
hub.window.close();
console.log(
  "PASS: Block Rosary, all four sets, full prayer text, shared meditations, host-only skips, phase shortcuts, bead counts, accessible deep link, and Prayers hub entry.",
);
