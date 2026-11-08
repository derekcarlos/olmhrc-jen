import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { JSDOM } from "jsdom";
import { prayerHubState, preparePrayerHub } from "../src/lib/prayer-hub.mjs";

const html = process.argv.includes("--live")
  ? await (await fetch("http://localhost:4321/prayers")).text()
  : readFileSync("dist/prayers/index.html", "utf8");
const dom = new JSDOM(html, { url: "http://localhost:4321/prayers" });
const doc = dom.window.document;
const root = doc.querySelector("prayer-hub");
assert(root);
assert.equal(doc.querySelectorAll("h1").length, 1);
assert.deepEqual(
  [...root.querySelectorAll(".devotion-card h3")].map(
    (node) => node.textContent,
  ),
  ["Stations of the Cross", "Block Rosary", "Flores de Maria", "Rosary Novena"],
);
assert.equal(root.querySelectorAll("[data-prayer-hub-mystery]").length, 5);
for (const link of root.querySelectorAll(".prayer-language-links a")) {
  assert.equal(
    new URL(link.href).hash,
    "#prayer-guide",
    "guide links must open the prayer panel",
  );
}
let now = new Date("2026-11-04T15:59:00Z");
const stop = preparePrayerHub(root, () => now);
try {
  assert.equal(
    root.querySelector("[data-prayer-hub-title]").textContent,
    "Glorious Mysteries",
  );
  Object.defineProperty(doc, "visibilityState", { value: "visible" });
  now = new Date("2026-11-04T16:00:00Z");
  doc.dispatchEvent(new dom.window.Event("visibilitychange"));
  const model = prayerHubState(now);
  assert.equal(
    root.querySelector("[data-prayer-hub-title]").textContent,
    model.title,
  );
  assert.equal(
    root.querySelector("[data-prayer-hub-tagalog-title]").textContent,
    model.tagalogTitle,
  );
  assert.equal(root.querySelector("time").getAttribute("datetime"), model.date);
  assert.equal(
    root.querySelector("[data-prayer-hub-tagalog]").getAttribute("href"),
    model.tagalogHref,
  );
  assert.equal(
    root.querySelector("[data-prayer-hub-english]").getAttribute("href"),
    model.englishHref,
  );
  assert.deepEqual(
    [...root.querySelectorAll("[data-prayer-hub-mystery]")].map(
      (node) => node.textContent,
    ),
    model.mysteries,
  );
  for (const link of root.querySelectorAll("a[href]")) {
    const pathname = new URL(link.href).pathname.replace(/\/$/, "");
    assert(existsSync(`dist${pathname}/index.html`), link.href);
  }
} finally {
  stop();
  dom.window.close();
}
console.log(
  "PASS: Prayers invitation, both language links, five shared mysteries, Philippine date rollover and devotion routes.",
);
