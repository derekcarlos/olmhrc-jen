import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { parse } from "node-html-parser";
import { validateSnapshot } from "../src/lib/readings.mjs";

const snapshot = JSON.parse(
  readFileSync("dist/readings-data/index.json", "utf8"),
);
assert.ok(validateSnapshot(snapshot));
const page = parse(readFileSync("dist/readings/index.html", "utf8"));
assert.ok(
  page.querySelector("[data-readings]"),
  "dedicated readings interface exists",
);
assert.ok(page.querySelector("[lang=fil]"));
assert.ok(page.querySelector(".reading-window"));
assert.ok(page.querySelector("[data-readings-stale]"));
assert.equal(
  page.querySelector(".reading-celebrations"),
  null,
  "the Sunday reader has no celebration dropdown",
);
assert.equal(page.querySelectorAll("h1").length, 1);
const fontCss = page
  .querySelectorAll("style")
  .map((style) => style.textContent)
  .join("\n");
const readingFontSources = [
  ...fontCss.matchAll(/@font-face\s*\{[^}]*Gentium Plus[^}]*\}/g),
].flatMap((face) =>
  [...face[0].matchAll(/url\(["']?([^"')]+\.woff2)/g)].map((match) => match[1]),
);
assert.ok(
  readingFontSources.length > 0,
  "Gentium Plus font faces are generated",
);
assert.ok(
  page
    .querySelectorAll('link[rel="preload"]')
    .some((link) =>
      readingFontSources.includes(link.getAttribute("href") || ""),
    ),
  "reading page preloads Gentium Plus assets",
);
const home = parse(readFileSync("dist/index.html", "utf8"));
assert.ok(
  !home
    .querySelectorAll('link[rel="preload"]')
    .some((link) =>
      readingFontSources.includes(link.getAttribute("href") || ""),
    ),
  "home does not preload the reading-only font",
);
for (const date of snapshot.dates) {
  assert.ok(
    existsSync(`dist/readings/${date}/index.html`),
    "target dates include unavailable-state pages",
  );
}
for (const record of snapshot.records) {
  const dated = parse(
    readFileSync(`dist/readings/${record.date}/index.html`, "utf8"),
  );
  const reader = record.selected_mass
    ? dated.querySelector(`[data-reading-mass="${record.selected_mass}"]`)
    : dated;
  assert.ok(reader, "the selected Mass is present");
  const options = record.sections.flatMap((section) => [
    section,
    ...(section.alternatives || []),
  ]);
  assert.equal(
    reader.querySelectorAll(".reading-section").length,
    record.sections.length,
  );
  assert.equal(
    reader.querySelectorAll(".reading-text").length,
    options.length,
  );
  assert.ok(dated.querySelector(`a[href="${record.source_url}"]`));
  assert.equal(dated.querySelectorAll("iframe, audio").length, 0);
  const responses = options.flatMap((section) =>
    section.blocks.filter((block) => block.type === "response"),
  );
  assert.equal(
    reader.querySelectorAll("blockquote.reading-response").length,
    responses.length,
    "psalm responses use the existing blockquote presentation",
  );
  for (const [index, section] of record.sections.entries()) {
    const text = reader.querySelectorAll(".reading-section")[index].textContent;
    for (const option of [section, ...(section.alternatives || [])])
      for (const block of option.blocks)
        assert.ok(text.includes(block.text), "all source text is preserved");
  }
}
console.log(
  `PASS: readings entry, ${snapshot.dates.length} date pages, source attribution, semantic sections and complete text.`,
);
