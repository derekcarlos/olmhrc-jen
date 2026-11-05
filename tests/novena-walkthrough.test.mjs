import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { marked } from "marked";
import { JSDOM } from "jsdom";
import sharedCatalog from "../src/data/rosary-tl.json" with { type: "json" };
import {
  createNovenaSteps,
  prepareNovenaWalkthrough,
  suggestedNovenaDay,
} from "../src/lib/novena-walkthrough-client.ts";

const catalog = JSON.parse(readFileSync("src/data/rosary-tl.json", "utf8"));
const markdown = readFileSync(
  "src/content/prayers/novena-to-our-lady-of-the-most-holy-rosary.mdx",
  "utf8",
)
  .replace(/^---[\s\S]*?---\s*/, "")
  .replace(/^import .*;\n/gm, "")
  .replace(/<TagalogRosaryPrayer id="([^"]+)"([^>]*)\/>/g, (_, id, props) => {
    const prayer = catalog.prayers.find((prayer) => prayer.id === id);
    const repetitions = Number(/repetitions=\{(\d+)\}/.exec(props)?.[1] || 1);
    return `${props.includes("heading") ? `<h3>${prayer.title}</h3>` : ""}${prayer.instruction ? `<p><em>${prayer.instruction}</em></p>` : ""}${Array.from({ length: repetitions }, () => `<p data-shared-rosary-prayer="${id}">${prayer.text.replace(/\n/g, "<br>")}</p>`).join("")}`;
  })
  .replace(
    /<TagalogRosaryMysteries\s*\/>/g,
    catalog.mysteries
      .map(
        (set) =>
          `<h3>${set.title}</h3><ol>${set.items.map((item) => `<li>${item.title}</li>`).join("")}</ol>`,
      )
      .join(""),
  );
function setup(hash = "") {
  const dom = new JSDOM(
    `<devotion-guide><select data-flores-day>${Array.from({ length: 9 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("")}</select><select data-flores-mystery>${["joyful", "sorrowful", "luminous", "glorious"].map((id) => `<option value="${id}">${id}</option>`).join("")}</select><div data-flores-workspace hidden><article data-flores-panel tabindex="-1">${["title", "status", "position", "reading", "up-next", "complete", "beads", "bead-count"].map((name) => `<div data-flores-${name}></div>`).join("")}</article>${["previous", "next", "restart"].map((action) => `<button data-flores-action="${action}"></button>`).join("")}${["opening", "common", "daily", "mysteries", "after", "litany", "dalit", "closing"].map((phase) => `<button data-flores-phase="${phase}"></button>`).join("")}</div><details data-flores-reference open><div data-flores-source>${marked.parse(markdown)}</div></details></devotion-guide>`,
    { url: `https://example.test/prayers/novena${hash}` },
  );
  globalThis.window = dom.window;
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  return dom.window.document.querySelector("devotion-guide");
}

test("all nine novena days include their own prayer, all common parts, and a complete Rosary", () => {
  const root = setup();
  const source = root.querySelector("[data-flores-source]");
  for (let day = 1; day <= 9; day++)
    for (const set of ["joyful", "sorrowful", "luminous", "glorious"]) {
      const steps = createNovenaSteps(source, day, set);
      assert.equal(steps[0].title, "Mga pambungad na panalangin");
      assert.equal(steps.filter((s) => s.phase === "daily").length, 1);
      assert.equal(
        steps.find((s) => s.phase === "daily").title,
        source.querySelector(`#araw-${day} summary`).textContent,
      );
      assert.equal(steps.filter((s) => s.bead).length, 53);
      assert.equal(
        steps.filter((s) => s.phase === "mysteries" && s.bead).length,
        50,
      );
      assert.equal(
        steps.filter((s) => s.phase === "mysteries" && s.title === "Ama Namin")
          .length,
        5,
      );
      assert.equal(steps.filter((s) => s.phase === "litany").length, 4);
      assert.equal(steps.filter((s) => s.phase === "dalit").length, 10);
      assert.equal(steps.at(-1).title, "Ang Tanda ng Krus");
      assert(
        steps.every(
          (s) =>
            s.nodes.length && s.nodes.some((node) => node.textContent.trim()),
        ),
      );
      const dayText = source.querySelector(`#araw-${day} > p`).textContent;
      assert(
        steps
          .find((s) => s.phase === "daily")
          .nodes.some((node) => node.textContent === dayText),
      );
      assert(
        !steps
          .filter((s) => s.bead)
          .some((s) => s.nodes.some((n) => n.textContent.includes("..."))),
      );
    }
});

test("novena dates use Philippine time and default to day one outside the season", () => {
  assert.equal(suggestedNovenaDay(new Date("2026-09-27T15:59:00Z")), 1);
  assert.equal(suggestedNovenaDay(new Date("2026-09-29T16:00:00Z")), 3);
  assert.equal(suggestedNovenaDay(new Date("2026-10-05T16:00:00Z")), 9);
  assert.equal(suggestedNovenaDay(new Date("2026-10-06T16:00:00Z")), 1);
});

test("O Hesus Ko follows the Glory Be of each mystery without an extra closing copy", () => {
  const root = setup();
  for (const set of catalog.mysteries) {
    const steps = createNovenaSteps(
      root.querySelector("[data-flores-source]"),
      1,
      set.id,
    );
    const fatima = catalog.prayers.find((prayer) => prayer.id === "fatima");
    const fatimaSteps = steps.filter((step) => step.title === fatima.title);
    assert.equal(fatimaSteps.length, 5);
    for (let mystery = 0; mystery < 5; mystery++) {
      const decade = steps.filter((step) => step.mysteryIndex === mystery);
      assert.equal(
        decade.at(-2).title,
        catalog.prayers.find((prayer) => prayer.id === "glory-be").title,
      );
      assert.equal(decade.at(-1).title, fatima.title);
      assert.equal(decade.at(-1).phase, "mysteries");
    }
    assert.equal(
      steps.find((step) => step.phase === "after").title,
      catalog.prayers.find((prayer) => prayer.id === "hail-holy-queen").title,
    );
  }
});

test("date and mystery tiles select the day, synchronize highlights, and retain mystery shortcuts", () => {
  const root = setup();
  root.querySelector("[data-flores-day]").remove();
  root.querySelector("[data-flores-mystery]").remove();
  const choices = root.ownerDocument.createElement("div");
  choices.innerHTML = `${Array.from({ length: 9 }, (_, index) => `<button data-flores-day-choice="${index + 1}">${index + 1}</button>`).join("")}${catalog.mysteries.map((set) => `<button data-flores-mystery-choice="${set.id}">${set.title}</button>`).join("")}`;
  root.prepend(choices);
  const stop = prepareNovenaWalkthrough(root, new Date("2027-09-28T04:00:00Z"));
  assert.equal(
    root
      .querySelector('[data-flores-day-choice="1"]')
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(
    root
      .querySelector('[data-flores-mystery-choice="sorrowful"]')
      .getAttribute("aria-pressed"),
    "true",
  );
  root.querySelector('[data-flores-phase="daily"]').click();
  root.querySelector('[data-flores-day-choice="2"]').click();
  assert.match(
    root.querySelector("[data-flores-title]").textContent,
    /Ikalawang araw/,
  );
  assert.equal(window.location.hash, "#araw-2");
  assert.equal(
    root
      .querySelector('[data-flores-mystery-choice="glorious"]')
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(
    root.querySelectorAll('[data-flores-day-choice][aria-pressed="true"]')
      .length,
    1,
  );
  root.querySelector('[data-flores-phase="mysteries"]').click();
  root.querySelector('[data-flores-mystery-choice="luminous"]').click();
  assert.equal(
    root.querySelector("[data-flores-title]").textContent,
    catalog.mysteries.find((set) => set.id === "luminous").items[0].title,
  );
  assert.equal(
    root.querySelectorAll('[data-flores-mystery-choice][aria-pressed="true"]')
      .length,
    1,
  );
  stop();
});

test("mystery declarations name the ordinal and mystery set without changing their headings", () => {
  const root = setup();
  const ordinals = [
    "Unang",
    "Ikalawang",
    "Ikatlong",
    "Ikaapat na",
    "Ikalimang",
  ];
  for (const set of catalog.mysteries) {
    const steps = createNovenaSteps(
      root.querySelector("[data-flores-source]"),
      1,
      set.id,
    );
    const declarations = steps.filter(
      (step) =>
        step.phase === "mysteries" &&
        step.mysteryIndex !== undefined &&
        step.title === set.items[step.mysteryIndex]?.title,
    );
    assert.equal(declarations.length, 5);
    declarations.forEach((step, index) => {
      assert.equal(step.title, set.items[index].title);
      assert(
        step.nodes.some((node) =>
          node.textContent.startsWith(
            `Ang ${ordinals[index]} Misteryo ng ${set.title.replace("Mga Misteryo ng ", "")}:`,
          ),
        ),
      );
    });
  }
});

test("mystery shortcuts jump to declarations and track progress through the decade", () => {
  const root = setup();
  const shortcuts = root.ownerDocument.createElement("div");
  shortcuts.innerHTML = Array.from(
    { length: 5 },
    (_, index) =>
      `<button data-flores-mystery-step="${index}">${index + 1}</button>`,
  ).join("");
  root.append(shortcuts);
  const stop = prepareNovenaWalkthrough(root, new Date("2027-09-28T04:00:00Z"));
  const set = catalog.mysteries.find((set) => set.id === "sorrowful");
  root.querySelector('[data-flores-mystery-step="3"]').click();
  assert.equal(
    root.querySelector("[data-flores-title]").textContent,
    set.items[3].title,
  );
  assert(
    root
      .querySelector('[data-flores-mystery-step="3"]')
      .hasAttribute("aria-current"),
  );
  assert(
    root
      .querySelector('[data-flores-mystery-step="3"]')
      .getAttribute("aria-label")
      .includes(set.items[3].title),
  );
  root.querySelector('[data-flores-action="next"]').click();
  assert.equal(
    root.querySelector("[data-flores-title]").textContent,
    "Ama Namin",
  );
  assert(
    root
      .querySelector('[data-flores-mystery-step="3"]')
      .hasAttribute("aria-current"),
  );
  root.querySelector('[data-flores-mystery-step="4"]').click();
  root.querySelector('[data-flores-action="previous"]').click();
  assert.equal(
    root.querySelector("[data-flores-title]").textContent,
    catalog.prayers.find((prayer) => prayer.id === "fatima").title,
  );
  assert(
    root
      .querySelector('[data-flores-mystery-step="3"]')
      .hasAttribute("aria-current"),
  );
  root.querySelector('[data-flores-phase="closing"]').click();
  assert.equal(shortcuts.querySelectorAll("[aria-current]").length, 0);
  stop();
});

test("editing the shared Tagalog prayer data updates the novena's repeated Rosary prayers", () => {
  const root = setup();
  const prayer = sharedCatalog.prayers.find(
    (prayer) => prayer.id === "hail-mary",
  );
  const original = prayer.text;
  try {
    prayer.text = "Isang binagong panalangin mula sa iisang talaan.";
    const steps = createNovenaSteps(
      root.querySelector("[data-flores-source]"),
      1,
      "joyful",
    );
    const hails = steps.filter((step) => step.bead);
    assert.equal(hails.length, 53);
    assert(
      hails.every((step) =>
        step.nodes.some((node) => node.textContent === prayer.text),
      ),
    );
  } finally {
    prayer.text = original;
  }
});

test("day selection, mysteries, bead navigation, phase jumps and completion work together", () => {
  const root = setup("#araw-4");
  const stop = prepareNovenaWalkthrough(root, new Date("2026-11-05"));
  const click = (action) =>
    root.querySelector(`[data-flores-action="${action}"]`).click();
  const title = () => root.querySelector("[data-flores-title]").textContent;
  root.querySelector('[data-flores-phase="daily"]').click();
  assert.match(title(), /Ikaapat na araw/);
  const day = root.querySelector("[data-flores-day]");
  day.value = "9";
  day.dispatchEvent(new window.Event("change"));
  assert.match(title(), /Ikasiyam na araw/);
  root.querySelector('[data-flores-phase="mysteries"]').click();
  const set = root.querySelector("[data-flores-mystery]");
  set.value = "sorrowful";
  set.dispatchEvent(new window.Event("change"));
  assert.equal(
    title(),
    catalog.mysteries.find((set) => set.id === "sorrowful").items[0].title,
  );
  click("next");
  assert.equal(title(), "Ama Namin");
  click("next");
  assert.equal(
    root.querySelector("[data-flores-bead-count]").textContent,
    "1/10",
  );
  click("previous");
  assert.equal(title(), "Ama Namin");
  root.querySelector('[data-flores-phase="closing"]').click();
  let count = 0;
  while (root.dataset.complete !== "true") {
    click("next");
    assert(++count < 5);
  }
  click("previous");
  assert.equal(title(), "Ang Tanda ng Krus");
  click("restart");
  assert.equal(title(), "Mga pambungad na panalangin");
  assert.equal(root.querySelector("[data-flores-reference]").open, false);
  stop();
});
