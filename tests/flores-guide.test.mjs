import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { marked } from "marked";
import { JSDOM } from "jsdom";

import {
  createFloresSteps,
  prepareFloresGuide,
} from "../src/lib/flores-guide-client.ts";
const markdown = readFileSync(
  "src/content/prayers/flores-de-maria.md",
  "utf8",
).replace(/^---[\s\S]*?---\s*/, "");
function setup(hash = "") {
  const fields = [
    "title",
    "status",
    "position",
    "reading",
    "up-next",
    "complete",
  ];
  const dom = new JSDOM(
    `<flores-guide><select data-flores-day>${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}">Mayo ${i + 1}</option>`).join("")}</select><div data-flores-workspace hidden><article data-flores-panel tabindex="-1">${fields.map((f) => `<div data-flores-${f}></div>`).join("")}</article><button data-flores-action="previous"></button><button data-flores-action="next"></button><button data-flores-action="restart"></button>${["opening", "daily", "petitions", "offering", "family", "closing"].map((p) => `<button data-flores-phase="${p}"></button>`).join("")}</div><details data-flores-reference open><div class="content" data-flores-source>${marked.parse(markdown)}</div></details></flores-guide>`,
    { url: `https://example.test/prayers/flores-de-maria${hash}` },
  );
  globalThis.window = dom.window;
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  return dom.window.document.querySelector("flores-guide");
}

test("all May days retain the complete sequence, selected reflection, rubrics and line breaks", () => {
  const root = setup();
  for (let day = 1; day <= 31; day++) {
    const steps = createFloresSteps(
      root.querySelector("[data-flores-source]"),
      day,
    );
    assert.equal(steps[0].title, "Mga pambungad na panalangin");
    assert.equal(steps.at(-1).title, "Pangwakas na Awit — Ave Maria");
    assert.equal(steps.filter((s) => s.phase === "daily").length, 3);
    assert.equal(
      steps.find((s) => s.phase === "daily").title,
      root.querySelector(`#araw-${day} summary`).textContent,
    );
    assert.deepEqual(
      [...new Set(steps.map((s) => s.phase))],
      ["opening", "daily", "petitions", "offering", "family", "closing"],
    );
    assert(steps.some((s) => s.nodes.some((n) => n.querySelector("em"))));
    assert(steps.some((s) => s.nodes.some((n) => n.querySelector("br"))));
    assert(!steps.some((s) => s.title.includes("Banal na Misa")));
  }
});

test("Next, Previous, phase jumps, day changes, completion and restart work together", () => {
  const root = setup("#araw-22");
  const stop = prepareFloresGuide(root, new Date("2026-11-05T00:00:00Z"));
  const click = (action) =>
    root.querySelector(`[data-flores-action="${action}"]`).click();
  const title = () => root.querySelector("[data-flores-title]").textContent;
  assert.equal(root.querySelector("[data-flores-day]").value, "22");
  assert(root.querySelector('[data-flores-action="previous"]').disabled);
  click("next");
  assert.equal(title(), "Pagsisisi");
  click("previous");
  assert.equal(title(), "Mga pambungad na panalangin");
  root.querySelector('[data-flores-phase="daily"]').click();
  assert.match(title(), /^Mayo 22 —/);
  const select = root.querySelector("[data-flores-day]");
  select.value = "31";
  select.dispatchEvent(new window.Event("change", { bubbles: true }));
  assert.match(title(), /^Mayo 31 —/);
  assert.equal(window.location.hash, "#araw-31");
  root.querySelector('[data-flores-phase="closing"]').click();
  assert.equal(title(), "Pangwakas na Awit — Ave Maria");
  click("next");
  assert.equal(root.dataset.complete, "true");
  click("previous");
  assert.equal(title(), "Pangwakas na Awit — Ave Maria");
  click("restart");
  assert.equal(title(), "Mga pambungad na panalangin");
  window.location.hash = "#araw-1";
  window.dispatchEvent(new window.HashChangeEvent("hashchange"));
  assert.equal(select.value, "1");
  select.value = "15";
  select.dispatchEvent(new window.Event("change", { bubbles: true }));
  window.location.hash = "";
  window.dispatchEvent(new window.PopStateEvent("popstate"));
  assert.equal(select.value, "1");
  assert.equal(root.querySelector("[data-flores-reference]").open, false);
  stop();
});

test("each invocation has its own step with the complete leader and congregation Hail Mary", () => {
  const root = setup();
  const steps = createFloresSteps(
    root.querySelector("[data-flores-source]"),
    1,
  );
  const petitions = steps.filter((step) => step.phase === "petitions");
  assert.equal(petitions.length, 6);
  const openings = [
    "Masintahing Ina",
    "Alulod ng mahal na grasya",
    "Reyna ng langit",
    "Iniibig at marilag",
    "Abogada at takbuhan",
  ];
  petitions.slice(0, 5).forEach((step, index) => {
    const text = step.nodes.map((node) => node.textContent).join(" ");
    assert.match(text, new RegExp(openings[index]));
    assert.equal((text.match(/℣\./g) || []).length, 2);
    assert.equal((text.match(/℟\./g) || []).length, 1);
    assert.match(text, /Aba Ginoong Maria, napupuno ka ng grasya/);
    assert.match(text, /Santa Maria, Ina ng Diyos/);
    assert.match(text, /ngayon at kung kami’y mamamatay\. Amen!/);
    assert.equal(
      step.nodes.filter(
        (node) => node.querySelector("strong")?.textContent === "℣.",
      ).length,
      2,
    );
  });
  assert.match(
    petitions[5].nodes.map((node) => node.textContent).join(" "),
    /Luwalhati sa Ama.*Kapara noong una,/s,
  );
  const stop = prepareFloresGuide(root);
  root.querySelector('[data-flores-phase="petitions"]').click();
  for (const opening of openings) {
    assert.match(
      root.querySelector("[data-flores-reading]").textContent,
      new RegExp(opening),
    );
    assert.match(
      root.querySelector("[data-flores-reading]").textContent,
      /Santa Maria, Ina ng Diyos/,
    );
    root.querySelector('[data-flores-action="next"]').click();
  }
  assert.match(
    root.querySelector("[data-flores-reading]").textContent,
    /Kapara noong una,/,
  );
  root.querySelector('[data-flores-action="next"]').click();
  assert.equal(
    root.querySelector("[data-flores-title]").textContent,
    "Pag-aalay ng Espirituwal na Bulaklak",
  );
  root.querySelector('[data-flores-action="previous"]').click();
  assert.match(
    root.querySelector("[data-flores-reading]").textContent,
    /Kapara noong una,/,
  );
  stop();
});

test("May 2 inline italics retain reading typography while whole-paragraph rubrics are identified", () => {
  const root = setup("#araw-2");
  const stop = prepareFloresGuide(root);
  root.querySelector('[data-flores-phase="daily"]').click();
  const reading = root.querySelector("[data-flores-reading]");
  const meditation = [...reading.querySelectorAll("p")].find((p) =>
    p.textContent.startsWith("Si Maria ay"),
  );
  assert(meditation);
  assert.equal(meditation.querySelector("em").textContent, "Theotokos");
  assert.equal(meditation.classList.contains("prayer-rubric"), false);
  const rubric = [...reading.querySelectorAll("p")].find((p) =>
    p.textContent.includes("Uupo ang lahat"),
  );
  assert(rubric.classList.contains("prayer-rubric"));
  assert(
    root
      .querySelector("#araw-2 p > em")
      .parentElement.classList.contains("prayer-rubric"),
  );
  stop();
});

test("the suggested May day follows Philippine time and defaults to day one outside May", () => {
  for (const [date, expected] of [
    ["2026-04-30T15:59:00Z", "1"],
    ["2026-05-21T16:00:00Z", "22"],
    ["2026-05-31T15:59:00Z", "31"],
    ["2026-05-31T16:00:00Z", "1"],
  ]) {
    const root = setup();
    const stop = prepareFloresGuide(root, new Date(date));
    assert.equal(root.querySelector("[data-flores-day]").value, expected);
    stop();
  }
});
