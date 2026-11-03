import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { prepareSongPractice } from "../src/lib/song-practice-client.ts";

function fixture(run) {
  const dom = new JSDOM(
    `<style>${readFileSync("src/styles/song-practice.css", "utf8")}</style><main data-song-rehearsal><div data-lyric-controls hidden><button data-lyrics-smaller>Smaller</button><output data-lyrics-size></output><button data-lyrics-larger>Larger</button></div><div class="lyrics-copy" data-lyrics-copy>Original test prose.<div class="notice"><div class="notice-body"><p>Original notice text.</p></div></div></div><aside class="practice-rail"><details><summary>In this selection</summary></details></aside></main>`,
    { url: "http://localhost:4321/songs/example" },
  );
  const oldWindow = globalThis.window;
  globalThis.window = dom.window;
  try {
    run(dom.window, dom.window.document);
  } finally {
    dom.window.document.dispatchEvent(
      new dom.window.Event("astro:before-swap"),
    );
    dom.window.close();
    globalThis.window = oldWindow;
  }
}
test("text controls restore a preference, resize lyrics once, and enforce limits", () =>
  fixture((window, document) => {
    window.localStorage.setItem("rosarium-lyrics-size", "30");
    prepareSongPractice(document);
    prepareSongPractice(document);
    const output = document.querySelector("[data-lyrics-size]");
    const smaller = document.querySelector("[data-lyrics-smaller]");
    const larger = document.querySelector("[data-lyrics-larger]");
    assert.equal(document.querySelector("[data-lyric-controls]").hidden, false);
    assert.equal(output.textContent, "30 px");
    smaller.click();
    assert.equal(output.textContent, "28 px");
    assert.equal(
      document
        .querySelector("[data-lyrics-copy]")
        .style.getPropertyValue("--lyrics-size"),
      "28px",
    );
    for (let i = 0; i < 10; i++) larger.click();
    assert.equal(output.textContent, "36 px");
    assert.equal(larger.disabled, true);
    assert.equal(window.localStorage.getItem("rosarium-lyrics-size"), "36");
  }));
test("Notice keeps its fixed text size when lyrics are enlarged", () =>
  fixture((window, document) => {
    prepareSongPractice(document);
    for (let i = 0; i < 6; i++)
      document.querySelector("[data-lyrics-larger]").click();
    assert.equal(
      document.querySelector("[data-lyrics-size]").textContent,
      "36 px",
    );
    assert.equal(
      window.getComputedStyle(document.querySelector(".notice")).fontSize,
      "18px",
    );
  }));
test("tall sidebars stay unclipped; fitting sidebars stick and re-evaluate on resize", () =>
  fixture((window, document) => {
    Object.defineProperty(window, "innerWidth", {
      value: 1280,
      writable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: 900,
      writable: true,
    });
    const rail = document.querySelector(".practice-rail");
    let height = 850;
    rail.getBoundingClientRect = () => ({ height });
    prepareSongPractice(document);
    assert.equal(rail.dataset.stickyFit, "false");
    assert.equal(window.getComputedStyle(rail).overflow, "visible");
    height = 500;
    window.dispatchEvent(new window.Event("resize"));
    assert.equal(rail.dataset.stickyFit, "true");
    window.innerHeight = 600;
    window.dispatchEvent(new window.Event("resize"));
    assert.equal(rail.dataset.stickyFit, "false");
  }));
test("text controls remain usable when browser storage is blocked", () =>
  fixture((window, document) => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Storage blocked");
      },
    });
    prepareSongPractice(document);
    document.querySelector("[data-lyrics-larger]").click();
    assert.equal(
      document.querySelector("[data-lyrics-size]").textContent,
      "26 px",
    );
  }));
test("navigating to another song remeasures its sidebar and cleans up the previous one", () =>
  fixture((window, document) => {
    window.innerWidth = 1280;
    window.innerHeight = 900;
    const oldRoot = document.querySelector("[data-song-rehearsal]");
    const oldRail = oldRoot.querySelector(".practice-rail");
    oldRail.getBoundingClientRect = () => ({ height: 400 });
    prepareSongPractice(document);
    assert.equal(oldRail.dataset.stickyFit, "true");
    document.dispatchEvent(new window.Event("astro:before-swap"));
    const incoming = oldRoot.cloneNode(true);
    incoming.removeAttribute("data-practice-ready");
    const rail = incoming.querySelector(".practice-rail");
    rail.removeAttribute("data-rail-ready");
    rail.removeAttribute("data-sticky-fit");
    let height = 850;
    rail.getBoundingClientRect = () => ({ height });
    oldRoot.replaceWith(incoming);
    prepareSongPractice(document);
    assert.equal(rail.dataset.stickyFit, "false");
    height = 500;
    rail.querySelector("details").dispatchEvent(new window.Event("toggle"));
    assert.equal(rail.dataset.stickyFit, "true");
    window.innerHeight = 600;
    window.dispatchEvent(new window.Event("resize"));
    assert.equal(rail.dataset.stickyFit, "false");
    assert.equal(oldRail.dataset.stickyFit, "true");
  }));
