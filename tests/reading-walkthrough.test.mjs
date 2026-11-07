import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { prepareReadingWalkthrough } from "../src/lib/reading-walkthrough-client.ts";

function fixture(types, run, hash = "") {
  const dom = new JSDOM(
    `<div data-readings>
    <nav>${types.map((type) => `<a href="#reading-${type}" data-reading-section-link="${type}">${type}</a>`).join("")}</nav>
    <article data-reading-panel tabindex="-1">
      <div data-reading-toolbar hidden><p data-reading-status role="status"></p><button data-reading-action="toggle">Basahin nang buo</button></div>
      ${types.map((type) => `<section data-reading-section="${type}"><h3 id="reading-${type}">${type}</h3><p>First line\nSecond line</p>${type === "psalm" ? "<blockquote>Response</blockquote>" : ""}</section>`).join("")}
      <div data-reading-complete hidden><button data-reading-action="restart">Muli</button><button data-reading-action="all">Buong teksto</button></div>
    </article>
    <footer data-reading-controls hidden><button data-reading-action="previous">Bumalik</button><p data-reading-progress></p><button data-reading-action="next">Susunod</button></footer>
    </div>`,
    { url: `https://holyrosarychapel.com/readings/2026-11-08${hash}` },
  );
  const root = dom.window.document.querySelector("[data-readings]");
  const panel = root.querySelector("[data-reading-panel]");
  let scrolls = 0;
  panel.scrollIntoView = () => {
    scrolls++;
  };
  const cleanup = prepareReadingWalkthrough(root);
  try {
    run({
      root,
      window: dom.window,
      panel,
      scrolls: () => scrolls,
      click: (action) =>
        root.querySelector(`[data-reading-action="${action}"]`).click(),
      visible: () =>
        [...root.querySelectorAll("[data-reading-section]")]
          .filter((section) => !section.hidden)
          .map((section) => section.dataset.readingSection),
    });
  } finally {
    cleanup();
    dom.window.close();
  }
}

test("readings show one section per step with stable controls, line breaks, and Psalm responses", () => {
  const types = ["first", "psalm", "second", "acclamation", "gospel"];
  fixture(types, ({ root, window, panel, click, visible, scrolls }) => {
    const controls = root.querySelector("[data-reading-controls]");
    assert.deepEqual(visible(), ["first"]);
    assert.equal(
      root.querySelector('[data-reading-action="previous"]').disabled,
      true,
    );
    assert.equal(scrolls(), 0, "ordinary page entry stays at the top");
    click("next");
    assert.deepEqual(visible(), ["psalm"]);
    assert.equal(root.querySelector("blockquote").textContent, "Response");
    assert.equal(
      root.querySelector('[data-reading-section="psalm"] p').textContent,
      "First line\nSecond line",
    );
    assert.equal(window.document.activeElement, panel);
    assert.equal(scrolls(), 1);
    assert.equal(
      root
        .querySelector('[data-reading-section-link="psalm"]')
        .getAttribute("aria-current"),
      "step",
    );
    click("previous");
    assert.deepEqual(visible(), ["first"]);
    for (const type of types.slice(1)) {
      click("next");
      assert.deepEqual(visible(), [type]);
    }
    assert.match(
      root.querySelector('[data-reading-action="next"]').textContent,
      /Tapusin/,
    );
    click("next");
    assert.deepEqual(visible(), []);
    assert.equal(root.querySelector("[data-reading-complete]").hidden, false);
    assert.equal(controls.hidden, true);
    click("restart");
    assert.deepEqual(visible(), ["first"]);
    assert.equal(controls, root.querySelector("[data-reading-controls]"));
    assert.equal(controls.hidden, false);
  });
});

test("weekday sequence omits absent Second Reading and supports all-text mode and section shortcuts", () => {
  fixture(
    ["first", "psalm", "acclamation", "gospel"],
    ({ root, click, visible, window }) => {
      click("next");
      click("next");
      assert.deepEqual(visible(), ["acclamation"]);
      assert.match(
        root.querySelector("[data-reading-progress]").textContent,
        /3.*4/,
      );
      click("toggle");
      assert.equal(visible().length, 4);
      assert.equal(root.querySelector("[data-reading-controls]").hidden, true);
      root.querySelector('[data-reading-section-link="gospel"]').click();
      assert.deepEqual(visible(), ["gospel"]);
      assert.equal(root.querySelector("[data-reading-controls]").hidden, false);
      window.history.replaceState(null, "", "#reading-psalm");
      window.dispatchEvent(new window.Event("hashchange"));
      assert.deepEqual(visible(), ["psalm"]);
      click("toggle");
      click("toggle");
      assert.deepEqual(visible(), ["psalm"]);
    },
  );
});

test("direct section links reveal the intended reading and completion can show the entire text", () => {
  fixture(
    ["first", "gospel"],
    ({ root, visible, click, scrolls }) => {
      assert.deepEqual(visible(), ["gospel"]);
      assert.equal(scrolls(), 1);
      click("next");
      click("all");
      assert.deepEqual(visible(), ["first", "gospel"]);
      assert.equal(root.querySelector("[data-reading-complete]").hidden, true);
    },
    "#reading-gospel",
  );
});

test("unavailable readings do not create controls or throw", () => {
  const dom = new JSDOM("<div data-readings><p>Hindi pa available</p></div>");
  const root = dom.window.document.querySelector("[data-readings]");
  assert.equal(typeof prepareReadingWalkthrough(root), "function");
  assert.equal(root.dataset.readingsView, undefined);
  dom.window.close();
});
