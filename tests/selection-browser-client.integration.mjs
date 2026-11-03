import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { prepareSelectionBrowser } from "../src/lib/selection-browser.ts";

const selections = [
  { id: "saints", date: "2026-11-01", status: "published" },
  { id: "sunday", date: "2026-11-08", status: "published" },
  { id: "king", date: "2026-11-22", status: "published" },
  { id: "advent", date: "2026-11-29", status: "published" },
];
const lineup = (id) =>
  `<section data-selection-rehearsal data-selection-id="${id}" data-songs-hub data-tracks="[]"><p>${id}</p></section>`;
async function fixture(run) {
  const cards = (mode) =>
    `<section data-lineup-collection data-mode="${mode}"><span data-lineup-count></span>${selections.map((s) => `<article data-selection-card data-selection-id="${s.id}" data-selection-date="${s.date}"></article>`).join("")}<p data-lineup-empty hidden>Empty</p></section>`;
  const dom = new JSDOM(
    `<main data-selection-browser><div data-featured-rehearsal data-featured-id="sunday">${lineup("sunday")}<audio></audio><iframe></iframe></div><p data-lineup-error hidden></p><template data-empty-lineup>${lineup("")}</template>${cards("future")}${cards("past")}</main>`,
    { url: "http://localhost:4321/songs", pretendToBeVisual: true },
  );
  const old = globalThis.window;
  globalThis.window = dom.window;
  dom.window.document.querySelector(
    "[data-selection-browser]",
  ).dataset.selections = JSON.stringify(selections);
  // JSDOM has no media engine; only stub the playback side effect.
  let paused = 0;
  const audio = dom.window.document.querySelector("audio");
  Object.defineProperty(audio, "paused", { get: () => false });
  audio.pause = () => {
    paused++;
  };
  try {
    await run(dom.window, dom.window.document, () => paused);
  } finally {
    dom.window.document.dispatchEvent(
      new dom.window.Event("astro:before-swap"),
    );
    dom.window.close();
    globalThis.window = old;
  }
}
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

test("a delayed response for an older Sunday cannot replace the newly due celebration", () =>
  fixture(async (window, document) => {
    let now = new Date("2026-11-22T01:00:00Z");
    let resolve;
    const urls = [];
    const pending = prepareSelectionBrowser(
      document,
      () => now,
      (requested) => {
        urls.push(String(requested));
        return urls.length === 1
          ? new Promise((done) => {
              resolve = done;
            })
          : Promise.resolve(new Response(lineup("advent")));
      },
    );
    now = new Date("2026-11-29T01:00:00Z");
    resolve(new Response(lineup("king")));
    await pending;
    await flush();
    assert.deepEqual(urls, [
      "/songs/selections/king",
      "/songs/selections/advent",
    ]);
    assert.equal(
      document.querySelector("[data-featured-rehearsal]").dataset.featuredId,
      "advent",
    );
  }));

test("Philippine midnight archives the old Sunday and shows a missing lineup rather than the later solemnity", () =>
  fixture(async (window, document) => {
    let now = new Date("2026-11-03T01:00:00Z");
    await prepareSelectionBrowser(
      document,
      () => now,
      () => {
        throw new Error("No fetch needed");
      },
    );
    const visible = (mode) =>
      [
        ...document.querySelectorAll(
          `[data-mode="${mode}"] [data-selection-card]`,
        ),
      ]
        .filter((card) => !card.hidden)
        .map((card) => card.dataset.selectionId);
    assert.deepEqual(visible("future"), ["king", "advent"]);
    assert.deepEqual(visible("past"), ["saints"]);
    now = new Date("2026-11-08T16:00:00Z");
    document.dispatchEvent(new window.Event("visibilitychange"));
    await flush();
    assert.equal(
      document.querySelector("[data-featured-rehearsal]").dataset.featuredId,
      "",
    );

    assert.deepEqual(visible("past"), ["saints", "sunday"]);
    assert.deepEqual(visible("future"), ["king", "advent"]);
  }));
test("automatic selection promotion replaces old media with only the selected rehearsal", () =>
  fixture(async (window, document, paused) => {
    let url = "";
    await prepareSelectionBrowser(
      document,
      () => new Date("2026-11-22T01:00:00Z"),
      async (requested) => {
        url = String(requested);
        return new Response(lineup("king"));
      },
    );
    assert.equal(url, "/songs/selections/king");
    assert.equal(
      document.querySelector("[data-featured-rehearsal]").dataset.featuredId,
      "king",
    );
    assert.equal(document.querySelectorAll("iframe,audio").length, 0);
    assert.equal(paused(), 1);
  }));
test("a failed refresh retains the old rehearsal with an explicit direct link, then retries", () =>
  fixture(async (window, document) => {
    let succeeds = false;
    const fetcher = async () => {
      if (!succeeds) throw new Error("Offline");
      return new Response(lineup("king"));
    };
    await prepareSelectionBrowser(
      document,
      () => new Date("2026-11-22T01:00:00Z"),
      fetcher,
    );
    const error = document.querySelector("[data-lineup-error]");
    assert.equal(error.hidden, false);
    assert.match(error.textContent, /previously loaded selection/);
    assert.equal(
      error.querySelector("a").getAttribute("href"),
      "/songs/selections/king",
    );
    assert.equal(
      document.querySelector("[data-featured-rehearsal]").dataset.featuredId,
      "sunday",
    );
    succeeds = true;
    document.dispatchEvent(new window.Event("visibilitychange"));
    await flush();
    assert.equal(error.hidden, true);
    assert.equal(
      document.querySelector("[data-featured-rehearsal]").dataset.featuredId,
      "king",
    );
  }));
test("a late network response cannot update the page after Astro navigation", () =>
  fixture(async (window, document) => {
    let resolve;
    const request = prepareSelectionBrowser(
      document,
      () => new Date("2026-11-22T01:00:00Z"),
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    document.dispatchEvent(new window.Event("astro:before-swap"));
    resolve(new Response(lineup("king")));
    await request;
    assert.equal(
      document.querySelector("[data-featured-rehearsal]").dataset.featuredId,
      "sunday",
    );
  }));
