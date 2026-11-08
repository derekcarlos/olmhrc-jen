import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { JSDOM } from "jsdom";
import { searchSite } from "../src/lib/site-search.mjs";
import { prepareSearchPage } from "../src/lib/site-search-client.ts";
import { prepareSearchDialog } from "../src/lib/site-search-dialog.ts";

const live = process.argv.includes("--live");
async function read(path) {
  if (!live)
    return readFileSync(
      `dist${path.includes(".json") ? path : path === "/" ? "/index.html" : `${path}/index.html`}`,
      "utf8",
    );
  const response = await fetch(`http://localhost:4321${path}`);
  assert.equal(response.status, 200, path);
  return response.text();
}
const index = JSON.parse(await read("/search-data/index.json"));
assert.ok(index.length > 10);
assert.equal(new Set(index.map((document) => document.url)).size, index.length);
assert.equal(
  index.filter((document) => document.url === "/songs/magnificat").length,
  1,
);
assert.ok(
  index.every(
    (document) =>
      !/^\/(?:blog|authors|categories|tags|elements|contact|privacy-policy)(?:\/|$)/.test(
        document.url,
      ),
  ),
);
assert.equal(
  searchSite(index, "Salve Regina")[0].document.url,
  "/songs/salve-regina",
);
assert.equal(
  searchSite(index, "magnifcat")[0].document.url,
  "/songs/magnificat",
);
assert.ok(
  searchSite(index, "napupuno ang langit", { type: "songs" }).some(
    (hit) => hit.document.url === "/songs/santo-missa-magnificat",
  ),
);
assert.ok(
  searchSite(index, "Lester Delgado", { type: "songs" }).some(
    (hit) => hit.document.url === "/songs/santo-missa-magnificat",
  ),
);
assert.ok(
  searchSite(index, "Sinasamba ka namin", { type: "prayers" }).some(
    (hit) => hit.document.url === "/prayers/ang-bagong-daan-ng-krus",
  ),
);
assert.ok(
  searchSite(index, "Stations of the Cross", { type: "prayers" }).some(
    (hit) => hit.document.url === "/prayers/ang-bagong-daan-ng-krus",
  ),
);
assert.ok(
  searchSite(index, "Simbang Gabi").some((hit) => hit.document.url === "/mass"),
);
if (!live)
  for (const document of index)
    assert.ok(
      existsSync(
        `dist${document.url === "/" ? "/index.html" : `${document.url}/index.html`}`,
      ),
      document.url,
    );

const html = await read("/search");
const dom = new JSDOM(html, {
  url: "http://localhost:4321/search?q=magnificat&type=songs",
});
const { document } = dom.window;
assert.equal(document.querySelectorAll("h1").length, 1);
assert.ok(
  document.querySelector('meta[name="robots"]').content.includes("noindex"),
);
assert.ok(document.querySelector('noscript a[href="/songs/salve-regina"]'));
const root = document.querySelector("[data-site-search-page]");
const cleanup = prepareSearchPage(root, async () => index);
try {
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.ok(
    root.querySelector('[data-search-results] a[href="/songs/magnificat"]'),
  );
  assert.ok(root.querySelector("mark"));
  assert.equal(root.querySelector("[data-search-input]").value, "magnificat");
  assert.ok(root.querySelector(".site-search-result-byline"));
  const form = root.querySelector("form");
  root.querySelector("input").value = "Salve Regina";
  form.dispatchEvent(
    new dom.window.Event("submit", { bubbles: true, cancelable: true }),
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(root.querySelectorAll("[data-search-results] > li").length, 1);
  assert.equal(
    root.querySelector("[data-search-results] a").getAttribute("href"),
    "/songs/salve-regina",
  );
  assert.equal(
    new URL(dom.window.location.href).searchParams.get("q"),
    "Salve Regina",
  );
} finally {
  cleanup();
  dom.window.close();
}

for (const path of [
  "/",
  "/songs/salve-regina",
  "/prayers/ang-bagong-daan-ng-krus",
  "/readings",
]) {
  const dom = new JSDOM(await read(path), {
    url: `http://localhost:4321${path}`,
  });
  const document = dom.window.document;
  const trigger = document.querySelector(
    'header a[data-site-search-open][href="/search"]',
  );
  assert.ok(trigger, `search is available outside the mobile menu: ${path}`);
  assert.equal(trigger.closest("#nav-menu"), null);
  assert.equal(trigger.getAttribute("aria-controls"), "site-search-dialog");
  assert.equal(document.querySelectorAll("#site-search-dialog").length, 1);
  const root = document.querySelector("site-search-dialog");
  const dialog = root.querySelector("dialog");
  dialog.showModal = () => {
    dialog.open = true;
  };
  dialog.close = () => {
    dialog.open = false;
  };
  const cleanup = prepareSearchDialog(root);
  try {
    trigger.click();
    assert.equal(dialog.open, true);
    assert.equal(document.activeElement, dialog.querySelector("input"));
    assert.equal(
      dialog.querySelector("form").getAttribute("action"),
      "/search",
    );
    assert.equal(dialog.querySelector("input").name, "q");
  } finally {
    cleanup();
    dom.window.close();
  }
}
console.log(
  `PASS: ${index.length} searchable documents, canonical routes, real song lyrics/composers, typo matching, prayers, search results/query URLs, safe highlighting, and global header search on four pages.`,
);
