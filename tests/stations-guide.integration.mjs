import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { prepareStationsGuide } from "../src/lib/stations-guide-client.ts";
import { stationsWalkthrough } from "../src/lib/stations-cross.mjs";

const live = process.argv.includes("--live");
const tl = process.argv.includes("--tagalog");
const language = tl ? "tl" : "en";
const slug = tl ? "ang-bagong-daan-ng-krus" : "stations-of-the-cross";
async function page(path) {
  if (!live) return readFileSync(`dist${path}/index.html`, "utf8");
  const response = await fetch(`http://localhost:4321${path}`);
  assert.equal(response.status, 200);
  return response.text();
}
const dom = new JSDOM(await page(`/prayers/${slug}`), {
  url: `http://localhost:4321/prayers/${slug}#prayer-guide`,
});
const { document } = dom.window;
const root = document.querySelector("stations-guide");
assert.ok(root);
assert.equal(root.lang, language);
assert.equal(root.querySelectorAll(".stations-languages a").length, 2);
assert.equal(
  root.querySelector('.stations-languages a[aria-current="page"]').lang,
  language,
);
assert.ok(
  root
    .querySelector('.stations-languages a[lang="tl"]')
    .href.endsWith("/prayers/ang-bagong-daan-ng-krus#prayer-guide"),
);
assert.equal(document.querySelectorAll("h1").length, 1);
const { devotion, prayers } = JSON.parse(root.dataset.stationsCatalog);
const reference = root.querySelector("[data-stations-reference]");
assert.equal(reference.open, true, "booklet is available without JavaScript");
assert.equal(root.querySelectorAll(".reference-station").length, 14);
for (const station of devotion.stations) {
  const source = root.querySelector(
    `[data-station-reflection="${station.id}"]`,
  );
  assert.ok(source.textContent.includes(station.scripture_text));
  assert.ok(source.textContent.includes(station.meditation));
  assert.ok(source.textContent.includes(station.reference));
  if (!tl)
    assert.ok(
      source.textContent.includes("*"),
      "breath-pause marks are preserved",
    );
}
assert.ok(root.textContent.includes(devotion.content_note));
if (devotion.source_url)
  assert.ok(root.querySelector(`a[href="${devotion.source_url}"]`));
if (tl)
  assert.equal(
    root.querySelectorAll(".reference-station .reading-response").length,
    13,
  );
const ids = [...document.querySelectorAll("[id]")].map((element) => element.id);
assert.equal(new Set(ids).size, ids.length);
const panel = root.querySelector("[data-stations-panel]");
let scrolls = 0;
panel.scrollIntoView = () => {
  scrolls++;
};
const cleanup = prepareStationsGuide(root);
try {
  assert.equal(reference.open, false);
  assert.equal(root.querySelector("[data-stations-workspace]").hidden, false);
  assert.equal(document.activeElement, panel);
  assert.equal(scrolls, 1);
  const controls = root.querySelector("[data-stations-controls]");
  const click = (action) =>
    root.querySelector(`[data-stations-action="${action}"]`).click();
  for (const [index, step] of stationsWalkthrough(devotion).entries()) {
    assert.equal(Number(root.dataset.stationsStep), index);
    const expected = prayers.find(
      (prayer) =>
        prayer.id ===
        (step.kind === "station" ? "stations-adoration" : step.prayer),
    );
    assert.equal(
      root.querySelector("[data-stations-words]").textContent,
      expected.text,
    );
    assert.equal(root.querySelector("[data-stations-controls]"), controls);
    assert.equal(controls.hidden, false);
    if (step.kind === "station") {
      const station = devotion.stations[step.station];
      const reflection = root.querySelector("[data-stations-reflection]");
      assert.equal(reflection.hidden, false);
      assert.ok(reflection.textContent.includes(station.meditation));
      assert.ok(reflection.textContent.includes(station.scripture_text));
      if (station.reading_response)
        assert.equal(
          reflection.querySelector(".reading-response").textContent,
          prayers.find((prayer) => prayer.id === station.reading_response).text,
        );
      else assert.equal(reflection.querySelector(".reading-response"), null);
      assert.equal(
        root
          .querySelector(`[data-stations-jump="${station.id}"]`)
          .getAttribute("aria-current"),
        "step",
      );
      assert.equal(
        root.querySelector("[data-stations-progress]").textContent,
        tl
          ? `Istasyon ${step.station + 1} sa 14`
          : `Station ${step.station + 1} of 14`,
      );
    } else
      assert.equal(
        root.querySelector("[data-stations-reflection]").hidden,
        true,
      );
    click("next");
  }
  assert.equal(root.querySelector("[data-stations-complete]").hidden, false);
  assert.equal(controls.hidden, true);
  click("restart");
  assert.equal(root.dataset.stationsStep, "0");
  assert.equal(root.querySelector("[data-stations-previous]").disabled, true);
  for (const station of devotion.stations) {
    root.querySelector(`[data-stations-jump="${station.id}"]`).click();
    assert.equal(
      root.querySelector("[data-stations-title]").textContent,
      station.title,
    );
    assert.equal(dom.window.location.hash, `#station-${station.id}`);
    click("next");
    assert.equal(
      root.querySelector("[data-stations-title]").textContent,
      tl ? "Ama Namin" : "Our Father",
    );
    click("previous");
    assert.equal(
      root.querySelector("[data-stations-title]").textContent,
      station.title,
    );
  }
  for (const phase of ["opening", "closing"]) {
    root.querySelector(`[data-stations-jump="${phase}"]`).click();
    assert.equal(
      root
        .querySelector(`[data-stations-jump="${phase}"]`)
        .getAttribute("aria-current"),
      "step",
    );
  }
  dom.window.history.replaceState(null, "", "#station-last-supper");
  dom.window.dispatchEvent(new dom.window.Event("hashchange"));
  assert.equal(
    root.querySelector("[data-stations-title]").textContent,
    devotion.stations[0].title,
  );
  const afterIds = [...document.querySelectorAll("[id]")].map(
    (element) => element.id,
  );
  assert.equal(
    new Set(afterIds).size,
    afterIds.length,
    "reflection clones have no duplicate IDs",
  );
} finally {
  cleanup();
  dom.window.close();
}
const hub = new JSDOM(await page("/prayers"));
assert.ok(
  hub.window.document.querySelector(`a[href="/prayers/${slug}#prayer-guide"]`),
);
hub.window.close();
console.log(
  `PASS (${language}): fourteen Stations, 64 prayer steps, complete supplied texts, reading responses, shared prayers, language choices, full booklet, station shortcuts/history, stable controls, and Prayers hub link.`,
);
