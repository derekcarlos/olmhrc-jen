import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { prepareNovenaGuide } from "../src/lib/novena-guide-client.ts";

function fixture(hash, run) {
  const dom = new JSDOM(
    `<novena-guide>
    <nav>${Array.from({ length: 9 }, (_, i) => `<a data-novena-day="${i + 1}" href="#araw-${i + 1}">Day ${i + 1}</a>`).join("")}</nav>
    <p data-novena-status hidden></p>
    <div class="novena-prayers"><p id="opening">Shared opening<br>second line</p>
    ${Array.from({ length: 9 }, (_, i) => `<details class="novena-day" id="araw-${i + 1}"><summary>Day ${i + 1}</summary><p>Prayer ${i + 1}<br>Another line</p></details>`).join("")}
    <p id="closing">Shared closing</p></div></novena-guide>`,
    {
      url: `https://holyrosarychapel.com/prayers/novena${hash}`,
    },
  );
  const previous = globalThis.window;
  globalThis.window = dom.window;
  const root = dom.window.document.querySelector("novena-guide");
  root.querySelector(".novena-prayers").scrollIntoView = () => {};
  let cleanup;
  try {
    cleanup = prepareNovenaGuide(root);
    run(root, dom.window, () => cleanup());
  } finally {
    cleanup?.();
    dom.window.close();
    globalThis.window = previous;
  }
}

test("novena starts with one complete day and shared prayers without disclosure controls", () =>
  fixture("", (root) => {
    assert.equal(root.querySelectorAll("details, summary").length, 0);
    assert.equal(
      root.querySelectorAll(".novena-day-reading:not([hidden])").length,
      1,
    );
    assert.equal(
      root.querySelector(".novena-day-reading:not([hidden])").id,
      "araw-1",
    );
    assert.equal(
      root.querySelector("#opening").textContent,
      "Shared openingsecond line",
    );
    assert.equal(
      root.querySelector("#opening").querySelectorAll("br").length,
      1,
    );
    assert.equal(root.querySelector("#closing").hidden, false);
  }));

test("a day link filters only daily prayers, preserves lines and updates the shareable URL", () =>
  fixture("#araw-4", (root, window) => {
    assert.equal(
      root.querySelector(".novena-day-reading:not([hidden])").id,
      "araw-4",
    );
    root
      .querySelector('[data-novena-day="9"]')
      .dispatchEvent(
        new window.MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    const visible = root.querySelectorAll(".novena-day-reading:not([hidden])");
    assert.equal(visible.length, 1);
    assert.equal(visible[0].id, "araw-9");
    assert.equal(
      visible[0].querySelector("p").textContent,
      "Prayer 9Another line",
    );
    assert.equal(visible[0].querySelectorAll("br").length, 1);
    assert.equal(
      root.querySelector('[aria-current="step"]').dataset.novenaDay,
      "9",
    );
    assert.equal(window.location.hash, "#araw-9");
    assert.equal(root.querySelector("[data-novena-status]").hidden, false);
    assert.equal(root.querySelector("#opening").hidden, false);
    assert.equal(root.querySelector("#closing").hidden, false);
  }));

test("history navigation changes the selected day and cleanup removes listeners", () =>
  fixture("#araw-4", (root, window, cleanup) => {
    window.history.replaceState({}, "", "#araw-2");
    window.dispatchEvent(new window.PopStateEvent("popstate"));
    assert.equal(
      root.querySelector(".novena-day-reading:not([hidden])").id,
      "araw-2",
    );
    window.history.replaceState({}, "", "#dalit");
    window.dispatchEvent(new window.HashChangeEvent("hashchange"));
    assert.equal(
      root.querySelector(".novena-day-reading:not([hidden])").id,
      "araw-2",
    );
    cleanup();
    window.history.replaceState({}, "", "#araw-8");
    window.dispatchEvent(new window.HashChangeEvent("hashchange"));
    assert.equal(
      root.querySelector(".novena-day-reading:not([hidden])").id,
      "araw-2",
    );
  }));
