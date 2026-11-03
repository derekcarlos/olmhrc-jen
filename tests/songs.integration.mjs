import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { JSDOM } from "jsdom";
import matter from "gray-matter";

const page = (path) =>
  new JSDOM(readFileSync(`dist/${path}/index.html`, "utf8")).window.document;
const data = JSON.parse(
  readFileSync("src/config/song-selections.json", "utf8"),
);
const published = data.filter((selection) => selection.status === "published");
const hub = page("songs");
assert.equal(hub.querySelectorAll("h1").length, 1);
assert.ok(hub.querySelector("#future-lineups-title"));
assert.ok(hub.querySelector('a[href="#future-lineups-title"]'));
const summaries = JSON.parse(
  hub.querySelector("[data-selection-browser]").dataset.selections,
);
assert.deepEqual(
  summaries.map((s) => s.id).sort(),
  published.map((s) => s.id).sort(),
);
const progressKeys = new Set();
let contextualSongs = 0;
for (const selection of published) {
  const route = `songs/selections/${selection.id}`;
  const document = page(route);
  assert.equal(document.querySelectorAll("h1").length, 1, route);
  const rehearsal = document.querySelector("[data-selection-rehearsal]");
  assert.equal(rehearsal.dataset.selectionId, selection.id);
  assert.equal(
    rehearsal.dataset.progressKey,
    `rosarium-practice:${selection.id}:${selection.date}`,
  );
  assert.ok(!progressKeys.has(rehearsal.dataset.progressKey));
  progressKeys.add(rehearsal.dataset.progressKey);
  assert.equal(rehearsal.querySelectorAll(".hub-track").length, 13);
  assert.ok(
    rehearsal.querySelector(`.lineup-readiness.${selection.readiness}`),
  );
  assert.ok(rehearsal.querySelector("time").textContent);
  assert.ok(rehearsal.querySelectorAll("audio,iframe").length <= 1);
  assert.equal(rehearsal.querySelectorAll("[autoplay]").length, 0);
  for (const link of rehearsal.querySelectorAll(
    ".hub-track-title,[data-hub-open],[data-hub-resume]",
  ))
    assert.ok(
      link.getAttribute("href").startsWith(`/${route}/`),
      link.outerHTML,
    );
  const songIds = [
    ...new Set(
      selection.items
        .filter((item) => item.used && item.song)
        .map((item) => item.song),
    ),
  ];
  for (const id of songIds) {
    const lyric = page(`${route}/${id}`);
    const canonical = page(`songs/${id}`);
    assert.ok(
      lyric.querySelector(".lyrics-copy").textContent.trim().length > 0,
      id,
    );
    assert.equal(
      lyric.querySelector("h1").textContent,
      canonical.querySelector("h1").textContent,
    );
    assert.ok(
      lyric
        .querySelector('link[rel="canonical"]')
        .href.endsWith(`/songs/${id}`),
    );
    assert.equal(
      lyric.querySelector(".lyrics-copy").textContent,
      canonical.querySelector(".lyrics-copy").textContent,
    );
    assert.equal(
      lyric.querySelector(".rehearsal-breadcrumb a").getAttribute("href"),
      `/${route}`,
    );
    for (const link of lyric.querySelectorAll(
      ".song-steps a,.practice-setlist ol a",
    ))
      assert.ok(
        link.getAttribute("href").startsWith(`/${route}/`),
        link.outerHTML,
      );
    assert.equal(
      lyric.querySelector(".practice-setlist-heading a").getAttribute("href"),
      `/${route}`,
    );
    contextualSongs++;
  }
}
for (const selection of data.filter((s) => s.status === "draft")) {
  assert.ok(!existsSync(`dist/songs/selections/${selection.id}/index.html`));
  assert.ok(!summaries.some((s) => s.id === selection.id));
}
for (const filename of readdirSync("src/content/songs").filter((file) =>
  /\.mdx?$/.test(file),
)) {
  const song = matter(readFileSync(`src/content/songs/${filename}`, "utf8"));
  if (song.data.draft) continue;
  assert.ok(
    existsSync(`dist/songs/${filename.replace(/\.mdx?$/, "")}/index.html`),
  );
}
assert.ok(
  page("songs/selections").querySelector(
    '[data-lineup-collection][data-mode="past"]',
  ),
);
assert.ok(page("songs/mass").querySelector("h1"));
assert.ok(page("songs/marian").querySelector("h1"));
console.log(
  `PASS: ${published.length} public rehearsal pages, ${contextualSongs} contextual lyric pages, scoped navigation, shared lyrics, independent progress keys, future/archive collections and canonical libraries.`,
);

if (process.argv.includes("--live")) {
  const { prepareSelectionBrowser } =
    await import("../src/lib/selection-browser.ts");
  const { prepareSongsHub } = await import("../src/lib/songs-hub-client.ts");
  const origin = process.env.ROSARIUM_PREVIEW_URL || "http://localhost:4321";
  const response = await fetch(`${origin}/songs`);
  assert.equal(response.status, 200);
  const html = await response.text();
  const sundays = [...published]
    .filter(
      (selection) => new Date(`${selection.date}T12:00:00Z`).getUTCDay() === 0,
    )
    .sort((a, b) => a.id.localeCompare(b.id))
    .filter(
      (selection, index, array) =>
        array.findIndex((item) => item.date === selection.date) === index,
    );
  for (const selection of sundays) {
    const dom = new JSDOM(html, {
      url: `${origin}/songs`,
      pretendToBeVisual: true,
    });
    const previousWindow = globalThis.window;
    globalThis.window = dom.window;
    try {
      const document = dom.window.document;
      prepareSongsHub(document);
      await prepareSelectionBrowser(
        document,
        () => new Date(`${selection.date}T01:00:00+08:00`),
        (url, options) => fetch(new URL(url, origin), options),
      );
      const host = document.querySelector("[data-featured-rehearsal]");
      assert.equal(
        host.dataset.featuredId,
        selection.id,
        `${selection.id}: real HTTP rollover request must succeed`,
      );
      const rehearsal = host.querySelector("[data-selection-rehearsal]");
      assert.equal(rehearsal.dataset.selectionId, selection.id);
      assert.ok(rehearsal.querySelectorAll("audio,iframe").length <= 1);
      const lyric = rehearsal.querySelector("[data-hub-open]");
      if (lyric) {
        assert.ok(
          lyric
            .getAttribute("href")
            .startsWith(`/songs/selections/${selection.id}/`),
        );
        assert.equal((await fetch(lyric.href)).status, 200);
      }
    } finally {
      dom.window.document.dispatchEvent(
        new dom.window.Event("astro:before-swap"),
      );
      dom.window.close();
      globalThis.window = previousWindow;
    }
  }
  console.log(
    `PASS: Actual localhost HTTP promotion and contextual lyric links for ${sundays.length} dated Sunday lineups, using the site's configured URL format.`,
  );
}
