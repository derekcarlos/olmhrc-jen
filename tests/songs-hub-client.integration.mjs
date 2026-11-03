import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { prepareSongsHub } from "../src/lib/songs-hub-client.ts";
const tracks = [
  {
    key: "first:a",
    id: "a",
    anchor: "song-first",
    title: "First test song",
    part: "Processional",
    composer: "Test composer",
    audio: "",
    audioCredit: "",
    videoId: "kRzRejLZquY",
  },
  {
    key: "second:b",
    id: "b",
    anchor: "song-second",
    title: "Second test song",
    part: "Gloria",
    composer: "Second composer",
    audio: "/audio/example.mp3",
    audioCredit: "",
    videoId: null,
  },
];
function fixture(run) {
  const dom = new JSDOM(
    `<main data-songs-hub data-progress-key="test-selection" data-initial-key="first:a"><a data-hub-resume><span data-hub-resume-label></span></a><div data-hub-progress-area hidden><span data-hub-count></span><progress data-hub-progress max="2"></progress><span data-hub-storage></span></div><div data-hub-player><h2 data-hub-title></h2><p data-hub-part></p><p data-hub-composer></p><div data-hub-media></div><div data-hub-source-controls><button data-hub-source="audio"></button><button data-hub-source="video"></button></div><a data-hub-open></a><a data-hub-external></a><a data-hub-back></a><p data-hub-status></p></div>${tracks.map((t) => `<li data-hub-track data-key="${t.key}"><button data-hub-preview data-key="${t.key}" hidden></button><label data-hub-mark-wrap hidden><input data-hub-mark value="${t.key}" type="checkbox" disabled></label></li>`).join("")}</main>`,
    { url: "http://localhost:4321/songs" },
  );
  const old = globalThis.window;
  globalThis.window = dom.window;
  dom.window.document.querySelector("[data-songs-hub]").dataset.tracks =
    JSON.stringify(tracks);
  try {
    run(dom.window, dom.window.document);
  } finally {
    dom.window.close();
    globalThis.window = old;
  }
}
test("lineup links preserve celebration context and repeated songs have independent progress", () =>
  fixture((window, document) => {
    const root = document.querySelector("[data-songs-hub]");
    root.dataset.selectionId = "christ-the-king-2026";
    root.dataset.progressKey =
      "rosarium-practice:christ-the-king-2026:2026-11-22";
    prepareSongsHub(document);
    assert.equal(
      root.querySelector("[data-hub-open]").getAttribute("href"),
      "/songs/selections/christ-the-king-2026/a",
    );
    const mark = root.querySelector("[data-hub-mark]");
    mark.checked = true;
    mark.dispatchEvent(new window.Event("change"));
    assert.equal(
      root.querySelector("[data-hub-resume]").getAttribute("href"),
      "/songs/selections/christ-the-king-2026/b",
    );
    const other = root.cloneNode(true);
    delete other.dataset.hubReady;
    other.dataset.selectionId = "first-sunday-of-advent-2026";
    other.dataset.progressKey =
      "rosarium-practice:first-sunday-of-advent-2026:2026-11-29";
    document.body.append(other);
    prepareSongsHub(document);
    assert.equal(other.querySelector("[data-hub-mark]").checked, false);
    assert.equal(
      other.querySelector("[data-hub-count]").textContent,
      "0 of 2 practised",
    );
    assert.equal(
      other.querySelector("[data-hub-open]").getAttribute("href"),
      "/songs/selections/first-sunday-of-advent-2026/a",
    );
  }));
test("selecting another track replaces media and points to its full lyrics", () =>
  fixture((window, document) => {
    prepareSongsHub(document);
    assert.ok(
      document.querySelector("iframe").src.includes("youtube-nocookie.com"),
    );
    document.querySelectorAll("[data-hub-preview]")[1].click();
    assert.equal(document.querySelector("iframe"), null);
    assert.ok(
      document.querySelector("audio").src.endsWith("/audio/example.mp3"),
    );
    assert.equal(
      document.querySelector("[data-hub-title]").textContent,
      "Second test song",
    );
    assert.equal(
      document.querySelector("[data-hub-open]").getAttribute("href"),
      "/songs/b",
    );
  }));
test("practice progress persists and resume moves to the first unfinished song", () =>
  fixture((window, document) => {
    prepareSongsHub(document);
    prepareSongsHub(document);
    const mark = document.querySelector("[data-hub-mark]");
    mark.checked = true;
    mark.dispatchEvent(new window.Event("change"));
    assert.equal(
      document.querySelector("[data-hub-count]").textContent,
      "1 of 2 practised",
    );
    assert.equal(
      document.querySelector("[data-hub-resume]").getAttribute("href"),
      "/songs/b",
    );
    assert.deepEqual(
      JSON.parse(window.localStorage.getItem("test-selection")),
      ["first:a"],
    );
  }));
test("preview and progress still work when local storage is unavailable", () =>
  fixture((window, document) => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Blocked");
      },
    });
    prepareSongsHub(document);
    const mark = document.querySelector("[data-hub-mark]");
    mark.checked = true;
    mark.dispatchEvent(new window.Event("change"));
    assert.equal(
      document.querySelector("[data-hub-count]").textContent,
      "1 of 2 practised",
    );
    assert.match(
      document.querySelector("[data-hub-storage]").textContent,
      /temporary/i,
    );
  }));
test("saved practice marks select the first unfinished song on return", () =>
  fixture((window, document) => {
    window.localStorage.setItem("test-selection", '["first:a"]');
    prepareSongsHub(document);
    assert.equal(
      document.querySelector("[data-hub-title]").textContent,
      "Second test song",
    );
    assert.equal(
      document.querySelector("[data-hub-count]").textContent,
      "1 of 2 practised",
    );
  }));
test("switching source replaces the old player without changing the selected song", () =>
  fixture((window, document) => {
    const data = structuredClone(tracks);
    data[0].audio = "/audio/example.mp3";
    document.querySelector("[data-songs-hub]").dataset.tracks =
      JSON.stringify(data);
    prepareSongsHub(document);
    assert.ok(document.querySelector("audio"));
    document.querySelector('[data-hub-source="video"]').click();
    assert.equal(document.querySelector("audio"), null);
    assert.ok(document.querySelector("iframe"));
    assert.equal(
      document.querySelector("[data-hub-title]").textContent,
      "First test song",
    );
  }));
test("mobile preview moves keyboard focus into the player", () =>
  fixture((window, document) => {
    window.innerWidth = 390;
    let scrolled = 0;
    document.querySelector("[data-hub-player]").scrollIntoView = () =>
      scrolled++;
    prepareSongsHub(document);
    document.querySelectorAll("[data-hub-preview]")[1].click();
    assert.equal(
      document.activeElement,
      document.querySelector("[data-hub-title]"),
    );
    assert.equal(scrolled, 1);
  }));
