import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { prepareRosaryGuide } from "../src/lib/rosary-guide-client.ts";
const catalog = JSON.parse(readFileSync("src/data/rosary.json", "utf8"));

function fixture(hash, run, referenceContent = "") {
  const dom = new JSDOM(
    `<rosary-guide>
    ${catalog.mysteries.map((set) => `<a data-mystery-set="${set.id}" href="#${set.id}-mysteries">${set.title}</a>`).join("")}
    <p data-rosary-suggestion></p><div data-rosary-walkthrough hidden>
    ${["opening", 0, 1, 2, 3, 4, "closing"].map((phase) => `<button data-rosary-phase="${phase}">${phase}</button>`).join("")}
    <div data-rosary-panel tabindex="-1"><p data-rosary-status></p><span data-rosary-position></span>
    <div data-rosary-reading><p data-rosary-context></p><h2 data-rosary-title></h2><span data-rosary-count></span>
    <p data-rosary-rubric></p><p data-rosary-text></p><div data-rosary-beads></div>
    <div data-rosary-introduction hidden></div>
    <details data-rosary-reflection hidden><summary>View artwork & meditation</summary><div data-rosary-reflection-content></div></details>
    <footer data-rosary-controls><button data-rosary-action="previous">Back</button><div><span data-rosary-control-count></span><span data-rosary-control-beads>${Array.from({ length: 5 }, () => '<span aria-hidden="true"></span>').join("")}</span><span data-rosary-control-label></span></div><button data-rosary-action="next" data-rosary-next>Next</button></footer>
    <button data-rosary-action="skip" data-rosary-skip hidden>Skip</button><p data-rosary-up-next></p></div>
    <div data-rosary-complete hidden><button data-rosary-action="restart">Pray again</button></div></div></div>
    <details data-rosary-reference open><summary>All prayers</summary><div data-rosary-mystery-content="annunciation">${referenceContent}</div></details></rosary-guide>`,
    { url: `https://holyrosarychapel.com/prayers/rosary${hash}` },
  );
  const root = dom.window.document.querySelector("rosary-guide");
  root.dataset.rosaryCatalog = JSON.stringify(catalog);
  root.querySelector("[data-rosary-panel]").scrollIntoView = () => {};
  const previous = globalThis.window;
  globalThis.window = dom.window;
  let cleanup;
  try {
    cleanup = prepareRosaryGuide(root, new Date("2026-11-04T02:00:00Z"));
    run(root, dom.window);
  } finally {
    cleanup?.();
    dom.window.close();
    globalThis.window = previous;
  }
}
const click = (root, action) =>
  root.querySelector(`[data-rosary-action="${action}"]`).click();

test("persistent prayer controls keep their node and show the current step or bead", () =>
  fixture("#joyful-mysteries", (root) => {
    const controls = root.querySelector("[data-rosary-controls]");
    const next = root.querySelector("[data-rosary-next]");
    const count = () =>
      root.querySelector("[data-rosary-control-count]").textContent;
    const label = () =>
      root.querySelector("[data-rosary-control-label]").textContent;
    assert.equal(count(), "");
    assert.equal(label(), "Opening");
    assert.equal(
      root.querySelector("[data-rosary-control-beads]").hidden,
      false,
    );
    for (let i = 0; i < 3; i++) click(root, "next");
    assert.equal(count(), "1/3");
    assert.equal(label(), "Hail Mary");
    root.querySelector('[data-rosary-phase="0"]').click();
    assert.equal(count(), "");
    assert.equal(label(), "Decade 1");
    assert.equal(
      root
        .querySelector("[data-rosary-control-beads] > span:first-child")
        .classList.contains("current-decade"),
      true,
    );
    click(root, "next");
    click(root, "next");
    assert.equal(count(), "1/10");
    assert.equal(
      root.querySelector("[data-rosary-control-beads]").hidden,
      true,
    );
    assert.equal(root.querySelector("[data-rosary-controls]"), controls);
    assert.equal(root.querySelector("[data-rosary-next]"), next);
    root.querySelector('[data-rosary-phase="closing"]').click();
    for (let i = 0; i < 4; i++) click(root, "next");
    assert.equal(root.dataset.rosaryComplete, "true");
    assert.ok(controls.closest("[hidden]"));
    click(root, "restart");
    assert.equal(root.dataset.rosaryComplete, "false");
    assert.equal(count(), "");
  }));

test("artwork and meditation can be revisited without advancing or resetting a bead", () =>
  fixture(
    "#joyful-mysteries",
    (root) => {
      root.querySelector('[data-rosary-phase="0"]').click();
      const intro = root.querySelector("[data-rosary-introduction]");
      assert.equal(intro.hidden, false);
      assert.equal(intro.querySelector("img").alt, "The Annunciation.");
      assert.equal(
        intro.querySelector("figcaption a").href,
        "https://commons.wikimedia.org/wiki/File:Example.jpg",
      );
      assert.equal(
        root.querySelector("[data-rosary-next]").textContent,
        "Begin this decade →",
      );
      for (let i = 0; i < 4; i++) click(root, "next");
      assert.equal(
        root.querySelector("[data-rosary-count]").textContent,
        "3 of 10",
      );
      const position = root.dataset.rosaryStep;
      const reflection = root.querySelector("[data-rosary-reflection]");
      assert.equal(intro.hidden, true);
      assert.equal(reflection.hidden, false);
      assert.equal(
        reflection.querySelector("summary").textContent,
        "View artwork & meditation",
      );
      reflection.querySelector("summary").click();
      assert.equal(reflection.open, true);
      assert.match(reflection.textContent, /A quiet reflection\./);
      assert.equal(root.dataset.rosaryStep, position);
      assert.equal(
        root.querySelector("[data-rosary-count]").textContent,
        "3 of 10",
      );
      click(root, "next");
      assert.equal(
        root.querySelector("[data-rosary-count]").textContent,
        "4 of 10",
      );
      root.querySelector('[data-rosary-phase="1"]').click();
      assert.equal(intro.hidden, true);
      assert.equal(reflection.hidden, true);
      assert.equal(intro.childElementCount, 0);
    },
    '<figure><img src="/images/rosary/example.webp" alt="The Annunciation."><figcaption>Artist · Public domain · <a href="https://commons.wikimedia.org/wiki/File:Example.jpg">Source</a></figcaption></figure><section class="mystery-meditation"><p>A quiet reflection.</p></section>',
  ));

test("empty mystery content never produces an empty artwork or meditation panel", () =>
  fixture("#joyful-mysteries", (root) => {
    root.querySelector('[data-rosary-phase="0"]').click();
    assert.equal(root.querySelector("[data-rosary-introduction]").hidden, true);
    click(root, "next");
    assert.equal(root.querySelector("[data-rosary-reflection]").hidden, true);
  }));

for (const [content, label] of [
  [
    '<figure><img src="/images/rosary/example.webp" alt="Test artwork"></figure>',
    "View artwork",
  ],
  [
    '<section class="mystery-meditation"><p>A reflection.</p></section>',
    "View meditation",
  ],
]) {
  test(`optional content uses the label: ${label}`, () =>
    fixture(
      "#joyful-mysteries",
      (root) => {
        root.querySelector('[data-rosary-phase="0"]').click();
        click(root, "next");
        assert.equal(
          root.querySelector("[data-rosary-reflection] summary").textContent,
          label,
        );
      },
      content,
    ));
}

test("opens with the full opening prayer and the Philippine-day mystery suggestion", () =>
  fixture("", (root) => {
    assert.equal(
      root.querySelector('[aria-current="true"]').dataset.mysterySet,
      "glorious",
    );
    assert.match(
      root.querySelector("[data-rosary-suggestion]").textContent,
      /Wednesday/,
    );
    assert.equal(
      root.querySelector("[data-rosary-title]").textContent,
      "Sign of the Cross",
    );
    assert.equal(
      root.querySelector("[data-rosary-text]").textContent,
      catalog.prayers[0].text,
    );
    assert.equal(root.querySelector("[data-rosary-walkthrough]").hidden, false);
    assert.equal(root.querySelector("[data-rosary-reference]").open, false);
  }));

test("walks every prayer through all ten Hail Marys in each decade and the closing", () =>
  fixture("", (root) => {
    const observed = [];
    for (let step = 0; step < 81; step++) {
      observed.push(root.querySelector("[data-rosary-title]").textContent);
      assert.ok(root.querySelector("[data-rosary-text]").textContent.trim());
      click(root, "next");
    }
    assert.equal(observed.filter((title) => title === "Hail Mary").length, 53);
    assert.equal(observed.filter((title) => title === "Our Father").length, 6);
    assert.equal(observed.at(-1), "Sign of the Cross");
    assert.equal(root.querySelector("[data-rosary-complete]").hidden, false);
    assert.equal(root.querySelector("[data-rosary-reading]").hidden, true);
    click(root, "restart");
    assert.equal(
      root.querySelector("[data-rosary-title]").textContent,
      "Sign of the Cross",
    );
  }));

test("phase navigation, bead count, optional prayer and previous preserve the sequence", () =>
  fixture("#joyful-mysteries", (root) => {
    root.querySelector('[data-rosary-phase="0"]').click();
    assert.equal(
      root.querySelector("[data-rosary-title]").textContent,
      "The Annunciation",
    );
    click(root, "next");
    click(root, "next");
    assert.equal(
      root.querySelector("[data-rosary-count]").textContent,
      "1 of 10",
    );
    for (let i = 0; i < 10; i++) click(root, "next");
    assert.equal(
      root.querySelector("[data-rosary-title]").textContent,
      "Glory Be",
    );
    click(root, "next");
    assert.equal(
      root.querySelector("[data-rosary-title]").textContent,
      "Fatima Prayer",
    );
    assert.equal(root.querySelector("[data-rosary-skip]").hidden, false);
    click(root, "skip");
    assert.equal(
      root.querySelector("[data-rosary-title]").textContent,
      "The Visitation",
    );
    click(root, "previous");
    assert.equal(
      root.querySelector("[data-rosary-title]").textContent,
      "Fatima Prayer",
    );
  }));

test("choosing another set starts at the opening, while history retains correct mysteries", () =>
  fixture("#luminous-mysteries", (root, window) => {
    root.querySelector('[data-rosary-phase="0"]').click();
    assert.equal(
      root.querySelector("[data-rosary-title]").textContent,
      "The Baptism of Jesus in the Jordan",
    );
    root.querySelector('[data-mystery-set="sorrowful"]').click();
    assert.equal(
      root.querySelector("[data-rosary-title]").textContent,
      "Sign of the Cross",
    );
    assert.equal(window.location.hash, "#sorrowful-mysteries");
    window.history.replaceState({}, "", "#joyful-mysteries");
    window.dispatchEvent(new window.PopStateEvent("popstate"));
    root.querySelector('[data-rosary-phase="0"]').click();
    assert.equal(
      root.querySelector("[data-rosary-title]").textContent,
      "The Annunciation",
    );
  }));
