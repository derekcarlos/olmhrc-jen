import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { navigationCurrent, footerNavigation } from "../src/lib/navigation.mjs";
const menu = JSON.parse(readFileSync("src/config/menu.json", "utf8"));

test("navigation identifies the current page and nested sections without matching unrelated prefixes", () => {
  assert.equal(navigationCurrent("/", "/"), "page");
  assert.equal(navigationCurrent("/prayers/", "/prayers"), "page");
  assert.equal(
    navigationCurrent("/prayers/ang-banal-na-rosaryo", "/prayers"),
    "location",
  );
  assert.equal(
    navigationCurrent("/songs/selections/ot-sunday", "/songs"),
    "location",
  );
  assert.equal(navigationCurrent("/news/chapel-news", "/news"), "location");
  assert.equal(navigationCurrent("/about", "/"), undefined);
  assert.equal(navigationCurrent("/newsletter", "/news"), undefined);
  assert.equal(navigationCurrent("/mass", ""), undefined);
});

test("the footer uses every existing header destination once and preserves About and Mass", () => {
  const groups = footerNavigation(menu.main);
  const links = [...groups.chapel, ...groups.prayer];
  const expected = menu.main.flatMap((item) =>
    item.hasChildren ? item.children : [item],
  );
  assert.deepEqual(
    links.map((link) => link.url).sort(),
    expected.map((link) => link.url).sort(),
  );
  assert.equal(new Set(links.map((link) => link.url)).size, links.length);
  assert(groups.chapel.some((link) => link.name === "About"));
  assert(groups.chapel.some((link) => link.name === "Mass"));
  assert.deepEqual(
    groups.prayer.map((link) => link.name),
    ["Readings", "Prayers", "Songs"],
  );
});
