import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { JSDOM } from "jsdom";

const { outputText } = ts.transpileModule(
  readFileSync("src/lib/novena-guide-client.ts", "utf8"),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  },
);
const { prepareNovenaGuide } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

function setup(count, hash = "") {
  const dom = new JSDOM(
    `<novena-guide><p data-novena-status hidden></p><div class="novena-prayers"><p>Common opening</p>${Array.from({ length: count }, (_, i) => `<a data-novena-day="${i + 1}" href="#araw-${i + 1}">${i + 1}</a><details class="novena-day" id="araw-${i + 1}"><summary>Mayo ${i + 1}</summary><p>Prayer ${i + 1}</p></details>`).join("")}<p>Common ending</p></div></novena-guide>`,
    { url: `https://example.test/prayers/flores-de-maria${hash}` },
  );
  globalThis.window = dom.window;
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  const root = dom.window.document.querySelector("novena-guide");
  return { dom, root, cleanup: prepareNovenaGuide(root) };
}

test("Flores supports deep links and changing between all 31 days without hiding common prayers", () => {
  const { root, cleanup } = setup(31, "#araw-22");
  const visible = () =>
    [...root.querySelectorAll(".novena-day-reading")].filter(
      (day) => !day.hidden,
    );
  assert.deepEqual(
    visible().map((day) => day.id),
    ["araw-22"],
  );
  root.querySelector('[data-novena-day="31"]').click();
  assert.deepEqual(
    visible().map((day) => day.id),
    ["araw-31"],
  );
  assert.equal(root.querySelector('[aria-current="step"]').textContent, "31");
  assert.match(
    root.querySelector("[data-novena-status]").textContent,
    /Mayo 31/,
  );
  assert.equal(root.querySelector(".novena-prayers > p").hidden, false);
  window.location.hash = "#araw-1";
  window.dispatchEvent(new window.HashChangeEvent("hashchange"));
  assert.deepEqual(
    visible().map((day) => day.id),
    ["araw-1"],
  );
  cleanup();
});

test("an invalid day falls back to day one and section links preserve the selection", () => {
  const { root, cleanup } = setup(31, "#araw-32");
  assert.equal(
    root.querySelectorAll(".novena-day-reading:not([hidden])").length,
    1,
  );
  assert.equal(
    root.querySelector(".novena-day-reading:not([hidden])").id,
    "araw-1",
  );
  root.querySelector('[data-novena-day="15"]').click();
  window.location.hash = "#memorare";
  window.dispatchEvent(new window.HashChangeEvent("hashchange"));
  assert.equal(
    root.querySelector(".novena-day-reading:not([hidden])").id,
    "araw-15",
  );
  cleanup();
});

test("the existing nine-day novena still selects a single day", () => {
  const { root, cleanup } = setup(9, "#araw-9");
  assert.equal(
    root.querySelector(".novena-day-reading:not([hidden])").id,
    "araw-9",
  );
  root.querySelector('[data-novena-day="2"]').click();
  assert.equal(
    root.querySelector(".novena-day-reading:not([hidden])").id,
    "araw-2",
  );
  cleanup();
});
